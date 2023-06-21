import { Node, SourceFile, ParameterDeclaration, MethodDeclaration, ClassDeclaration, FunctionDeclaration, InterfaceDeclaration, EnumDeclaration, TypeAliasDeclaration, VariableDeclaration, SyntaxKind, PropertySignature } from "ts-morph";

function generateFunctionDocs(functionDeclaration: FunctionDeclaration | MethodDeclaration): string {
    let docs = '';

    const name = functionDeclaration.getName();
    const returnType = functionDeclaration.getReturnType().getText();
    const parameters = functionDeclaration.getParameters();

    docs += `Function Name: ${name}\n`;
    docs += `Return Type: ${returnType}\n`;
    docs += 'Parameters:\n';

    parameters.forEach((parameter: ParameterDeclaration) => {
        const parameterName = parameter.getName();
        const parameterType = parameter.getType().getText();
        
        docs += `\tName: ${parameterName}, Type: ${parameterType}\n`;
    });

    const jsDocs = functionDeclaration.getJsDocs();

    if (jsDocs.length > 0) {
        docs += 'JSDoc:\n';
        jsDocs.forEach(jsDoc => {
            docs += `\t${jsDoc.getDescription()}\n`;
        });
    }

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


export function generateDocs(sourceFile: SourceFile): string {
    let documentation = '';

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
            documentation += generateVariableDocs(variableDeclaration);
        }
    });

    return documentation;
}