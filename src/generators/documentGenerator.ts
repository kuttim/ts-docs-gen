import { Project, SourceFile, Node, ParameterDeclaration, MethodDeclaration, ClassDeclaration, FunctionDeclaration, InterfaceDeclaration, EnumDeclaration, TypeAliasDeclaration, VariableDeclaration, SyntaxKind, PropertySignature, Type } from "ts-morph";
import { sync } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

function isTypeFromNodeModules(type: Type): boolean {
    const symbol = type.getSymbol();
    if (!symbol) return false;

    const declarations = symbol.getDeclarations();
    return declarations.some(declaration => declaration.getSourceFile().getFilePath().includes('node_modules'));
}

function cleanType(type: Type): string {
    return isTypeFromNodeModules(type) ? 'External' : type.getText();
}

function generateFunctionDocs(functionDeclaration: FunctionDeclaration | MethodDeclaration): string {
    let docs = '';

    docs += `### Function: **${functionDeclaration.getName()}**\n\n`;
    docs += `* **Return Type:** \`${cleanType(functionDeclaration.getReturnType())}\`\n`;
    docs += '* **Parameters:**\n';

    functionDeclaration.getParameters().forEach((parameter: ParameterDeclaration) => {
        docs += `  * **${parameter.getName()}**: \`${cleanType(parameter.getType())}\`\n`;
    });

    functionDeclaration.getJsDocs().forEach(jsDoc => {
        docs += `* **JSDoc:**\n\n\`\`\`${jsDoc.getDescription()}\`\`\`\n`;
    });

    docs += '\n---\n\n';
    return docs;
}

function generateInterfaceDocs(interfaceDeclaration: InterfaceDeclaration): string {
    let docs = '';

    const name = interfaceDeclaration.getName();
    docs += `Interface Name: ${name}\n`;

    const properties = interfaceDeclaration.getProperties();

    docs += 'Properties:\n';
    properties.forEach((property: PropertySignature) => {
        const propertyName = property.getName();
        const propertyType = cleanType(property.getType());

        docs += `\tName: ${propertyName}, Type: ${propertyType}\n`;
    });

    return docs;
}

function generateEnumDocs(enumDeclaration: EnumDeclaration): string {
    let docs = '';

    const name = enumDeclaration.getName();
    docs += `Enum Name: ${name}\n`;

    const members = enumDeclaration.getMembers();

    docs += 'Members:\n';
    members.forEach((member) => {
        const memberName = member.getName();
        const memberValue = member.getValue();

        docs += `\tName: ${memberName}, Value: ${memberValue}\n`;
    });

    return docs;
}

function generateTypeAliasDocs(typeAliasDeclaration: TypeAliasDeclaration): string {
    let docs = '';

    const name = typeAliasDeclaration.getName();
    const type = cleanType(typeAliasDeclaration.getType());

    docs += `Type Alias Name: ${name}, Type: ${type}\n`;

    return docs;
}

function generateVariableDocs(variableDeclaration: VariableDeclaration): string {
    let docs = '';

    const name = variableDeclaration.getName();
    const type = cleanType(variableDeclaration.getType());

    docs += `* **Variable Name:** \`${name}\`, **Type:** \`${type}\`\n`;

    return docs;
}

function generateClassDocs(classDeclaration: ClassDeclaration): string {
    let docs = '';

    const name = classDeclaration.getName();

    docs += `Class Name: ${name}\n`;
    docs += 'Methods:\n';

    const methods = classDeclaration.getMethods();

    methods.forEach((method) => {
        docs += generateFunctionDocs(method);
    });

    return docs;
}

export function generateDocsForProject(project: Project, excludePatterns: string[] = []): string {
    let docs = '';

    const combinedPattern = `**/*.{ts,tsx}`;

    const rootDirectory = process.cwd();

    const tsConfigPath = path.join(rootDirectory, 'tsconfig.json');

    if (!fs.existsSync(tsConfigPath)) {
        throw new Error(`tsconfig.json not found at ${tsConfigPath}`);
    }

    const globOptions = {
      cwd: rootDirectory, 
      ignore: ['node_modules/**', ...excludePatterns],
      absolute: true
    };

    const filePaths = sync(combinedPattern, globOptions);

    const sourceFiles = filePaths.map(filePath => project.getSourceFileOrThrow(filePath));

    for (const sourceFile of sourceFiles) {
      docs += generateDocs(sourceFile);
    }

    return docs;
}

export function generateDocs(sourceFile: SourceFile): string {
    let documentation = '# Documentation\n\n';
    let variablesDocumentation = '## Variables\n\n';

    sourceFile.forEachDescendant((node: Node) => {
        if (node.getKind() === SyntaxKind.FunctionDeclaration) {
            const functionDeclaration = node as FunctionDeclaration;
            documentation += generateFunctionDocs(functionDeclaration);
        }
        else if (node.getKind() === SyntaxKind.ClassDeclaration) {
            const classDeclaration = node as ClassDeclaration;
            documentation += generateClassDocs(classDeclaration);
        }
        else if (node.getKind() === SyntaxKind.InterfaceDeclaration) {
            const interfaceDeclaration = node as InterfaceDeclaration;
            documentation += generateInterfaceDocs(interfaceDeclaration);
        }
        else if (node.getKind() === SyntaxKind.EnumDeclaration) {
            const enumDeclaration = node as EnumDeclaration;
            documentation += generateEnumDocs(enumDeclaration);
        }
        else if (node.getKind() === SyntaxKind.TypeAliasDeclaration) {
            const typeAliasDeclaration = node as TypeAliasDeclaration;
            documentation += generateTypeAliasDocs(typeAliasDeclaration);
        }
        else if (node.getKind() === SyntaxKind.VariableDeclaration) {
            const variableDeclaration = node as VariableDeclaration;
            variablesDocumentation += generateVariableDocs(variableDeclaration);
        }
    });
    documentation += variablesDocumentation;

    return documentation;
}