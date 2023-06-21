import { Project, SourceFile, Node, ParameterDeclaration, MethodDeclaration, ClassDeclaration, FunctionDeclaration, InterfaceDeclaration, EnumDeclaration, TypeAliasDeclaration, VariableDeclaration, SyntaxKind, PropertySignature } from "ts-morph";

function generateFunctionDocs(functionDeclaration: FunctionDeclaration | MethodDeclaration): string {
    let docs = '';

    docs += `### Function: **${functionDeclaration.getName()}**\n\n`;
    docs += `* **Return Type:** \`${functionDeclaration.getReturnType().getText()}\`\n`;
    docs += '* **Parameters:**\n';

    functionDeclaration.getParameters().forEach((parameter: ParameterDeclaration) => {
        docs += `  * **${parameter.getName()}**: \`${parameter.getType().getText()}\`\n`;
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
        const propertyType = property.getType().getText();

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
    const type = typeAliasDeclaration.getType().getText();

    docs += `Type Alias Name: ${name}, Type: ${type}\n`;

    return docs;
}

function generateVariableDocs(variableDeclaration: VariableDeclaration): string {
    let docs = '';

    const name = variableDeclaration.getName();
    const type = variableDeclaration.getType().getText();

    docs += `Variable Name: ${name}, Type: ${type}\n`;

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

export function generateDocsForProject(project: Project): string {
    let documentation = '';

    const sourceFiles = project.getSourceFiles();

    sourceFiles.forEach((sourceFile) => {
        documentation += `# Source File: ${sourceFile.getBaseName()}\n\n`;
        documentation += generateDocs(sourceFile); 
        documentation += '\n---\n\n';
    });

    return documentation;
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