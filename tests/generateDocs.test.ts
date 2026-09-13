import { Project } from "ts-morph";
import { generateDocsForProject, generateFileDocs, GeneratedFile } from "../src/generators/documentGenerator";

function contentFor(files: GeneratedFile[], outputPath: string): string {
  const file = files.find((f) => f.outputPath === outputPath);
  if (!file) throw new Error(`No generated file with outputPath "${outputPath}". Got: ${files.map((f) => f.outputPath).join(", ")}`);
  return file.content;
}

describe("Documentation Generator", () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
    });
  });

  test("should generate documentation for an exported function with JSDoc", () => {
    project.createSourceFile(
      "add.ts",
      `
      /**
       * Adds two numbers.
       * @param a - first number
       * @param b - second number
       * @returns the sum of a and b
       * @example
       * add(1, 2);
       */
      export function add(a: number, b: number): number {
        return a + b;
      }
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("Function: `add`");
    expect(docs).toContain("Adds two numbers.");
    expect(docs).toContain("**Returns:** `number` — the sum of a and b");
    expect(docs).toContain("`a`: `number` — first number");
    expect(docs).toContain("`b`: `number` — second number");
    expect(docs).toContain("add(1, 2);");
  });

  test("should mark a @deprecated function", () => {
    project.createSourceFile(
      "legacy.ts",
      `
      /**
       * @deprecated Use newFn instead.
       */
      export function oldFn(): void {}
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("Deprecated:** Use newFn instead.");
  });

  test("should generate documentation for an interface", () => {
    project.createSourceFile(
      "person.ts",
      `
      /**
       * Represents a person.
       */
      export interface Person {
        name: string;
        age: number;
        nickname?: string;
      }
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("Interface: `Person`");
    expect(docs).toContain("Represents a person.");
    expect(docs).toContain("`name`: `string`");
    expect(docs).toContain("`age`: `number`");
    expect(docs).toContain("`nickname?`: `string`");
  });

  test("should handle enums properly", () => {
    project.createSourceFile(
      "colors.ts",
      `
      export enum Colors {
        Red = "red",
        Green = "green",
        Blue = "blue"
      }
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("Enum: `Colors`");
    expect(docs).toContain('`Red` = `"red"`');
    expect(docs).toContain('`Green` = `"green"`');
    expect(docs).toContain('`Blue` = `"blue"`');
  });

  test("should document type aliases", () => {
    project.createSourceFile(
      "id.ts",
      `
      /** A unique identifier. */
      export type Id = string | number;
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("Type Alias: `Id`");
    expect(docs).toContain("A unique identifier.");
    expect(docs).toContain("type Id = string | number");
  });

  test("should document exported variables", () => {
    project.createSourceFile(
      "constants.ts",
      `
      /** The answer. */
      export const ANSWER = 42;
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("## Variables");
    // A `const` without a type annotation gets TypeScript's inferred literal type (42), not
    // the widened `number` — that matches what editors show on hover for the same declaration.
    expect(docs).toContain("`ANSWER`: `42` — The answer.");
  });

  test("should document a class, its public methods and properties, and skip private members", () => {
    project.createSourceFile(
      "calculator.ts",
      `
      export class Calculator {
        public total: number = 0;
        private secret: string = "shh";

        /**
         * Adds a value to the running total.
         * @param value - amount to add
         */
        public add(value: number): number {
          return this.total += value;
        }

        private reset(): void {
          this.total = 0;
        }
      }
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("Class: `Calculator`");
    expect(docs).toContain("`total`: `number`");
    expect(docs).not.toContain("`secret`");
    expect(docs).toContain("Method: `add`");
    expect(docs).not.toContain("Method: `reset`");
  });

  test("should include private members and mark them internal when includeNonExported is set", () => {
    project.createSourceFile(
      "widget.ts",
      `
      export class Widget {
        private hidden(): void {}
      }

      function helper(): void {}
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true, includeNonExported: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("Method: `hidden` _(internal)_");
    expect(docs).toContain("Function: `helper` _(internal)_");
  });

  test("should not document non-exported declarations by default", () => {
    project.createSourceFile(
      "internal.ts",
      `
      function helper(): void {}
      export function publicFn(): void {}
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).not.toContain("helper");
    expect(docs).toContain("Function: `publicFn`");
  });

  test("should respect exclude patterns", () => {
    project.createSourceFile("keep.ts", "export function keepMe(): void {}");
    project.createSourceFile("keep.spec.ts", "export function excludeMe(): void {}");

    const files = generateDocsForProject(project, { singleFile: true, excludePatterns: ["**/*.spec.ts"] });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("keepMe");
    expect(docs).not.toContain("excludeMe");
  });

  test("should document re-exports from other modules", () => {
    project.createSourceFile(
      "barrel.ts",
      `
      export * from "./a";
      export { b as bAlias } from "./b";
    `,
    );

    const files = generateDocsForProject(project, { singleFile: true });
    const docs = contentFor(files, "documentation.md");

    expect(docs).toContain("## Re-exports");
    expect(docs).toContain("export * from './a'");
    expect(docs).toContain("export { b as bAlias } from './b'");
  });

  test("should generate one file per source file plus an index by default", () => {
    project.createSourceFile("a.ts", "export function fnA(): void {}");
    project.createSourceFile("b.ts", "export function fnB(): void {}");

    const files = generateDocsForProject(project);
    const outputPaths = files.map((f) => f.outputPath).sort();

    expect(outputPaths).toEqual(["a.md", "b.md", "index.md"]);
    expect(contentFor(files, "a.md")).toContain("Function: `fnA`");
    expect(contentFor(files, "b.md")).toContain("Function: `fnB`");
    expect(contentFor(files, "index.md")).toContain("[a](a.md)");
    expect(contentFor(files, "index.md")).toContain("[b](b.md)");
  });

  test("should skip files with nothing to document", () => {
    project.createSourceFile("empty.ts", "const notExported = 1;");
    project.createSourceFile("real.ts", "export const value = 1;");

    const files = generateDocsForProject(project);
    const outputPaths = files.map((f) => f.outputPath).sort();

    expect(outputPaths).toEqual(["index.md", "real.md"]);
  });

  test("should add frontmatter by default and allow disabling it", () => {
    project.createSourceFile("frontmatter.ts", "export const value = 1;");

    const withFrontmatter = generateDocsForProject(project);
    expect(contentFor(withFrontmatter, "frontmatter.md")).toMatch(/^---\ntitle: frontmatter\n---\n\n/);

    const withoutFrontmatter = generateDocsForProject(project, { frontmatter: false });
    expect(contentFor(withoutFrontmatter, "frontmatter.md").startsWith("---")).toBe(false);
  });

  test("should not let a top-level index.ts overwrite the generated table of contents", () => {
    project.createSourceFile("index.ts", "export function main(): void {}");
    project.createSourceFile("other.ts", "export function other(): void {}");

    const files = generateDocsForProject(project);
    const outputPaths = files.map((f) => f.outputPath).sort();

    // "index.ts" claims "index.md" for itself, so the table of contents must live elsewhere.
    expect(outputPaths).toEqual(["README.md", "index.md", "other.md"]);
    expect(contentFor(files, "index.md")).toContain("Function: `main`");
    expect(contentFor(files, "README.md")).toContain("[index](index.md)");
    expect(contentFor(files, "README.md")).toContain("[other](other.md)");
  });

  test("generateFileDocs reports when a file has nothing documented", () => {
    const sourceFile = project.createSourceFile("blank.ts", "const x = 1;");
    expect(generateFileDocs(sourceFile)).toContain("No documented declarations");
  });
});
