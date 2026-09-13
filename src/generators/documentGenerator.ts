import {
  Project,
  SourceFile,
  Node,
  ParameterDeclaration,
  MethodDeclaration,
  ClassDeclaration,
  FunctionDeclaration,
  InterfaceDeclaration,
  EnumDeclaration,
  TypeAliasDeclaration,
  VariableStatement,
  ExportDeclaration,
  JSDoc,
  Scope,
  Type,
} from "ts-morph";
import { minimatch } from "minimatch";
import * as path from "path";

export interface GenerateOptions {
  /** Glob patterns matched against normalized file paths to exclude from documentation. */
  excludePatterns?: string[];
  /** Root directory used to compute output paths that mirror the input tree. Defaults to `process.cwd()`. */
  rootDir?: string;
  /** Include declarations that are not exported (and class members that are `private`). Defaults to `false`. */
  includeNonExported?: boolean;
  /** Prefix generated files with YAML frontmatter (a `title`) for static site generators. Defaults to `true`. */
  frontmatter?: boolean;
  /** Emit a single `documentation.md` instead of one file per source file plus an index. Defaults to `false`. */
  singleFile?: boolean;
}

export interface GeneratedFile {
  /** Path of the generated file, relative to the configured output directory. Always uses forward slashes. */
  outputPath: string;
  content: string;
}

interface JsDocInfo {
  description: string;
  params: Map<string, string>;
  returns?: string;
  examples: string[];
  deprecated?: string;
}

const NO_DOCS_MARKER = "_No documented declarations found in this file._";

/** Ambient JS/TS generic containers whose *own* declaration lives in a lib.d.ts (or gets
 * augmented by @types/node), but whose text (e.g. `GeneratedFile[]`, `Map<string, Foo>`)
 * is exactly what a reader wants to see — never collapse these to "External". */
const BUILTIN_GENERIC_NAMES = new Set([
  "Array", "ReadonlyArray", "Promise", "Map", "ReadonlyMap", "Set", "ReadonlySet",
  "WeakMap", "WeakSet", "Record", "Partial", "Required", "Readonly", "Pick", "Omit",
  "Exclude", "Extract", "NonNullable", "ReturnType", "Parameters", "Awaited",
  "Iterable", "IterableIterator", "Generator", "Date", "RegExp", "Error", "Function",
]);

function isTypeFromNodeModules(type: Type): boolean {
  const symbol = type.getSymbol();
  if (!symbol) return false;
  if (BUILTIN_GENERIC_NAMES.has(symbol.getName())) return false;

  const declarations = symbol.getDeclarations();
  return declarations.some((declaration) => declaration.getSourceFile().getFilePath().includes("node_modules"));
}

function cleanType(type: Type, contextNode?: Node, options: { isOptional?: boolean } = {}): string {
  // Unwrap arrays so `GeneratedFile[]` reads as itself instead of being judged by the
  // ambient `Array` symbol (which pulls in an @types/node declaration and would otherwise
  // look "external").
  if (type.isArray()) {
    const elementType = type.getArrayElementType();
    if (elementType) return `${cleanType(elementType, contextNode)}[]`;
  }

  if (isTypeFromNodeModules(type)) return "External";

  // Passing the declaring node as context avoids TypeScript printing locally-declared types
  // as a fully-qualified `import("/abs/path").Name` instead of just `Name`.
  const text = type.getText(contextNode);

  // An optional property/parameter (`foo?: string`) already carries a `?`, so TypeScript's
  // `string | undefined` for its type would just be redundant noise here.
  return options.isOptional ? text.replace(/\s*\|\s*undefined$/, "") : text;
}

/** Appends a new section after normalizing the existing content to end in exactly one blank line. */
function appendSection(docs: string, section: string): string {
  return docs.replace(/\n*$/, "\n\n") + section;
}

function cleanComment(text: string | undefined): string {
  if (!text) return "";
  return text.replace(/^-\s*/, "").trim();
}

function extractJsDocInfo(jsDocs: JSDoc[]): JsDocInfo {
  const params = new Map<string, string>();
  const examples: string[] = [];
  let description = "";
  let returns: string | undefined;
  let deprecated: string | undefined;

  for (const jsDoc of jsDocs) {
    const desc = jsDoc.getDescription().trim();
    if (desc) description = description ? `${description}\n${desc}` : desc;

    for (const tag of jsDoc.getTags()) {
      const tagName = tag.getTagName();
      if (tagName === "param" && Node.isJSDocParameterTag(tag)) {
        params.set(tag.getName(), cleanComment(tag.getCommentText()));
      } else if (tagName === "returns" || tagName === "return") {
        returns = cleanComment(tag.getCommentText());
      } else if (tagName === "example") {
        const example = tag.getCommentText();
        if (example) examples.push(example.trim());
      } else if (tagName === "deprecated") {
        deprecated = cleanComment(tag.getCommentText()) || "This API is deprecated.";
      }
    }
  }

  return { description, params, returns, examples, deprecated };
}

function generateCallableDocs(
  fn: FunctionDeclaration | MethodDeclaration,
  options: { kind: "Function" | "Method"; isInternal?: boolean },
): string {
  const { kind, isInternal = false } = options;
  const name = fn.getName() ?? "(anonymous)";
  const jsDocInfo = extractJsDocInfo(fn.getJsDocs());

  let docs = `### ${kind}: \`${name}\`${isInternal ? " _(internal)_" : ""}\n\n`;

  if (jsDocInfo.deprecated) {
    docs += `> ⚠️ **Deprecated:** ${jsDocInfo.deprecated}\n\n`;
  }
  if (jsDocInfo.description) {
    docs += `${jsDocInfo.description}\n\n`;
  }

  docs += `- **Returns:** \`${cleanType(fn.getReturnType(), fn)}\`${jsDocInfo.returns ? ` — ${jsDocInfo.returns}` : ""}\n`;

  const parameters = fn.getParameters();
  if (parameters.length > 0) {
    docs += "- **Parameters:**\n";
    parameters.forEach((parameter: ParameterDeclaration) => {
      const paramName = parameter.getName();
      const isOptional = parameter.hasQuestionToken() || parameter.hasInitializer();
      const paramDescription = jsDocInfo.params.get(paramName);
      const typeText = cleanType(parameter.getType(), parameter, { isOptional });
      docs += `  - \`${paramName}${isOptional ? "?" : ""}\`: \`${typeText}\`${paramDescription ? ` — ${paramDescription}` : ""}\n`;
    });
  }

  if (jsDocInfo.examples.length > 0) {
    let examplesSection = `**Example${jsDocInfo.examples.length > 1 ? "s" : ""}:**\n\n`;
    for (const example of jsDocInfo.examples) {
      examplesSection += `\`\`\`ts\n${example}\n\`\`\`\n\n`;
    }
    docs = appendSection(docs, examplesSection);
  }

  docs = appendSection(docs, "---\n\n");
  return docs;
}

function generateInterfaceDocs(interfaceDeclaration: InterfaceDeclaration, isInternal = false): string {
  const name = interfaceDeclaration.getName();
  const jsDocInfo = extractJsDocInfo(interfaceDeclaration.getJsDocs());

  let docs = `## Interface: \`${name}\`${isInternal ? " _(internal)_" : ""}\n\n`;

  if (jsDocInfo.description) docs += `${jsDocInfo.description}\n\n`;

  const extendsExpressions = interfaceDeclaration.getExtends();
  if (extendsExpressions.length > 0) {
    docs += `- **Extends:** ${extendsExpressions.map((e) => `\`${e.getText()}\``).join(", ")}\n`;
  }

  const properties = interfaceDeclaration.getProperties();
  if (properties.length > 0) {
    let propertiesSection = "**Properties:**\n\n";
    properties.forEach((property) => {
      const isOptional = property.hasQuestionToken();
      const optional = isOptional ? "?" : "";
      propertiesSection += `- \`${property.getName()}${optional}\`: \`${cleanType(property.getType(), property, { isOptional })}\`\n`;
    });
    docs = appendSection(docs, propertiesSection);
  }

  docs = appendSection(docs, "---\n\n");
  return docs;
}

function generateEnumDocs(enumDeclaration: EnumDeclaration, isInternal = false): string {
  const name = enumDeclaration.getName();
  const jsDocInfo = extractJsDocInfo(enumDeclaration.getJsDocs());

  let docs = `## Enum: \`${name}\`${isInternal ? " _(internal)_" : ""}\n\n`;

  if (jsDocInfo.description) docs += `${jsDocInfo.description}\n\n`;

  let membersSection = "**Members:**\n\n";
  enumDeclaration.getMembers().forEach((member) => {
    membersSection += `- \`${member.getName()}\` = \`${JSON.stringify(member.getValue())}\`\n`;
  });
  docs = appendSection(docs, membersSection);

  docs = appendSection(docs, "---\n\n");
  return docs;
}

function generateTypeAliasDocs(typeAliasDeclaration: TypeAliasDeclaration, isInternal = false): string {
  const name = typeAliasDeclaration.getName();
  const jsDocInfo = extractJsDocInfo(typeAliasDeclaration.getJsDocs());

  let docs = `## Type Alias: \`${name}\`${isInternal ? " _(internal)_" : ""}\n\n`;

  if (jsDocInfo.description) docs += `${jsDocInfo.description}\n\n`;

  // Prefer the literal type-node text over the resolved type: a resolved TypeAliasDeclaration
  // type can come back as a self-referential `import("...").Name`, whereas the type node
  // reflects exactly what was written (and reads better for generics, unions, etc.).
  const typeNode = typeAliasDeclaration.getTypeNode();
  const typeText = typeNode ? typeNode.getText() : cleanType(typeAliasDeclaration.getType(), typeAliasDeclaration);
  docs += `\`\`\`ts\ntype ${name} = ${typeText}\n\`\`\`\n`;

  docs = appendSection(docs, "---\n\n");
  return docs;
}

function generateVariableStatementDocs(variableStatement: VariableStatement, isInternal = false): string {
  const jsDocInfo = extractJsDocInfo(variableStatement.getJsDocs());
  let docs = "";

  variableStatement.getDeclarations().forEach((declaration) => {
    docs += `- \`${declaration.getName()}\`: \`${cleanType(declaration.getType(), declaration)}\`${isInternal ? " _(internal)_" : ""}`;
    if (jsDocInfo.description) docs += ` — ${jsDocInfo.description}`;
    docs += "\n";
  });

  return docs;
}

function generateClassDocs(classDeclaration: ClassDeclaration, includeNonExported: boolean, isInternal = false): string {
  const name = classDeclaration.getName() ?? "(anonymous)";
  const jsDocInfo = extractJsDocInfo(classDeclaration.getJsDocs());

  let docs = `## Class: \`${name}\`${isInternal ? " _(internal)_" : ""}\n\n`;

  if (jsDocInfo.description) docs += `${jsDocInfo.description}\n\n`;

  const extendsExpression = classDeclaration.getExtends();
  if (extendsExpression) docs += `- **Extends:** \`${extendsExpression.getText()}\`\n`;

  const implementsExpressions = classDeclaration.getImplements();
  if (implementsExpressions.length > 0) {
    docs += `- **Implements:** ${implementsExpressions.map((i) => `\`${i.getText()}\``).join(", ")}\n`;
  }

  const properties = classDeclaration
    .getProperties()
    .filter((property) => includeNonExported || property.getScope() !== Scope.Private);
  if (properties.length > 0) {
    let propertiesSection = "**Properties:**\n\n";
    properties.forEach((property) => {
      const isOptional = property.hasQuestionToken();
      const scopeNote = property.getScope() !== Scope.Public ? ` _(${property.getScope()})_` : "";
      propertiesSection += `- \`${property.getName()}${isOptional ? "?" : ""}\`: \`${cleanType(property.getType(), property, { isOptional })}\`${scopeNote}\n`;
    });
    docs = appendSection(docs, propertiesSection);
  }

  const methods = classDeclaration
    .getMethods()
    .filter((method) => includeNonExported || method.getScope() !== Scope.Private);
  if (methods.length > 0) {
    let methodsSection = "**Methods:**\n\n";
    methods.forEach((method) => {
      methodsSection += generateCallableDocs(method, { kind: "Method", isInternal: includeNonExported && method.getScope() === Scope.Private });
    });
    docs = appendSection(docs, methodsSection);
  }

  docs = appendSection(docs, "---\n\n");
  return docs;
}

function generateReExportDocs(exportDeclaration: ExportDeclaration): string {
  const moduleSpecifier = exportDeclaration.getModuleSpecifierValue();
  if (!moduleSpecifier) return "";

  const namedExports = exportDeclaration.getNamedExports();
  if (namedExports.length === 0) {
    const namespaceExport = exportDeclaration.getNamespaceExport();
    const label = namespaceExport ? `* as ${namespaceExport.getName()}` : "*";
    return `- \`export ${label} from '${moduleSpecifier}'\`\n`;
  }

  const names = namedExports
    .map((specifier) => {
      const alias = specifier.getAliasNode();
      return alias ? `${specifier.getName()} as ${alias.getText()}` : specifier.getName();
    })
    .join(", ");

  return `- \`export { ${names} } from '${moduleSpecifier}'\`\n`;
}

function isExcluded(filePath: string, excludePatterns: string[]): boolean {
  if (excludePatterns.length === 0) return false;

  const normalized = filePath.replace(/\\/g, "/");
  return excludePatterns.some((pattern) => minimatch(normalized, pattern, { dot: true, matchBase: true }));
}

function getOutputRelativePath(sourceFile: SourceFile, rootDir: string): string {
  const filePath = sourceFile.getFilePath();
  let relative = path.relative(rootDir, filePath);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    relative = path.basename(filePath);
  }

  return relative.replace(/\\/g, "/").replace(/\.tsx?$/, ".md");
}

function withFrontmatter(title: string, useFrontmatter: boolean): string {
  return useFrontmatter ? `---\ntitle: ${title}\n---\n\n` : "";
}

/** Picks a file name for the generated table of contents that doesn't collide with a
 * source file already mirrored to that path (e.g. a top-level `index.ts` → `index.md`). */
function pickIndexOutputPath(takenOutputPaths: ReadonlySet<string>): string {
  const candidates = ["index.md", "README.md"];
  for (const candidate of candidates) {
    if (!takenOutputPaths.has(candidate)) return candidate;
  }
  let suffix = 0;
  while (takenOutputPaths.has(`_index-${suffix}.md`)) suffix += 1;
  return `_index-${suffix}.md`;
}

/**
 * Generates the documentation body for a single source file: its re-exports, its
 * top-level declarations (functions, classes, interfaces, enums, type aliases), and
 * its variables. Only top-level statements are considered, so helpers declared inside
 * function bodies are intentionally not documented.
 */
export function generateFileDocs(sourceFile: SourceFile, includeNonExported = false): string {
  let declarationsDocs = "";
  let variablesDocs = "";
  let reExportsDocs = "";

  for (const statement of sourceFile.getStatements()) {
    if (Node.isFunctionDeclaration(statement)) {
      if (includeNonExported || statement.isExported()) {
        declarationsDocs += generateCallableDocs(statement, { kind: "Function", isInternal: !statement.isExported() });
      }
    } else if (Node.isClassDeclaration(statement)) {
      if (includeNonExported || statement.isExported()) {
        declarationsDocs += generateClassDocs(statement, includeNonExported, !statement.isExported());
      }
    } else if (Node.isInterfaceDeclaration(statement)) {
      if (includeNonExported || statement.isExported()) {
        declarationsDocs += generateInterfaceDocs(statement, !statement.isExported());
      }
    } else if (Node.isEnumDeclaration(statement)) {
      if (includeNonExported || statement.isExported()) {
        declarationsDocs += generateEnumDocs(statement, !statement.isExported());
      }
    } else if (Node.isTypeAliasDeclaration(statement)) {
      if (includeNonExported || statement.isExported()) {
        declarationsDocs += generateTypeAliasDocs(statement, !statement.isExported());
      }
    } else if (Node.isVariableStatement(statement)) {
      if (includeNonExported || statement.isExported()) {
        variablesDocs += generateVariableStatementDocs(statement, !statement.isExported());
      }
    } else if (Node.isExportDeclaration(statement)) {
      reExportsDocs += generateReExportDocs(statement);
    }
  }

  let content = "";
  if (reExportsDocs) {
    content += `## Re-exports\n\n${reExportsDocs}\n`;
  }
  content += declarationsDocs;
  if (variablesDocs.trim()) {
    content += `## Variables\n\n${variablesDocs}\n`;
  }

  return content.trim() ? content : `${NO_DOCS_MARKER}\n`;
}

/**
 * Generates documentation for every (non-excluded) source file in the project.
 *
 * By default this returns one {@link GeneratedFile} per source file that has anything
 * to document, plus an `index.md` linking to all of them, mirroring the input directory
 * structure. Pass `singleFile: true` to get a single `documentation.md` instead.
 */
export function generateDocsForProject(project: Project, options: GenerateOptions = {}): GeneratedFile[] {
  const excludePatterns = options.excludePatterns ?? [];
  const includeNonExported = options.includeNonExported ?? false;
  const frontmatter = options.frontmatter ?? true;
  const singleFile = options.singleFile ?? false;
  const rootDir = options.rootDir ?? process.cwd();

  const sourceFiles = project
    .getSourceFiles()
    .filter((sourceFile) => !isExcluded(sourceFile.getFilePath(), excludePatterns))
    .sort((a, b) => a.getFilePath().localeCompare(b.getFilePath()));

  if (singleFile) {
    let combined = withFrontmatter("API Documentation", frontmatter);
    combined += "# API Documentation\n\n";

    for (const sourceFile of sourceFiles) {
      const title = getOutputRelativePath(sourceFile, rootDir).replace(/\.md$/, "");
      const body = generateFileDocs(sourceFile, includeNonExported);
      if (body.trim() === NO_DOCS_MARKER) continue;

      combined += `## ${title}\n\n${body}\n`;
    }

    return [{ outputPath: "documentation.md", content: combined }];
  }

  const files: GeneratedFile[] = [];
  const indexEntries: { title: string; outputPath: string }[] = [];

  for (const sourceFile of sourceFiles) {
    const outputPath = getOutputRelativePath(sourceFile, rootDir);
    const title = outputPath.replace(/\.md$/, "");
    const body = generateFileDocs(sourceFile, includeNonExported);
    if (body.trim() === NO_DOCS_MARKER) continue;

    const content = `${withFrontmatter(title, frontmatter)}# ${title}\n\n${body}`;
    files.push({ outputPath, content });
    indexEntries.push({ title, outputPath });
  }

  indexEntries.sort((a, b) => a.outputPath.localeCompare(b.outputPath));

  let indexContent = withFrontmatter("API Documentation", frontmatter);
  indexContent += "# API Documentation\n\n";
  indexContent +=
    indexEntries.length === 0
      ? "_No documented files found._\n"
      : indexEntries.map((entry) => `- [${entry.title}](${entry.outputPath})`).join("\n") + "\n";

  // A source file mirrored straight to "index.md" (e.g. a top-level `index.ts`) would
  // otherwise collide with the table of contents below and silently overwrite it.
  const takenOutputPaths = new Set(files.map((file) => file.outputPath));
  const indexOutputPath = pickIndexOutputPath(takenOutputPaths);

  files.unshift({ outputPath: indexOutputPath, content: indexContent });

  return files;
}
