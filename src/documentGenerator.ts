import { Node, SourceFile, FunctionDeclaration, SyntaxKind, ParameterDeclaration } from "ts-morph";

function generateFunctionDocs(functionDeclaration: FunctionDeclaration): string {
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

export function generateDocs(sourceFile: SourceFile): string {
    let documentation = '';

    sourceFile.forEachDescendant((node: Node) => {
        if (node.getKind() === SyntaxKind.FunctionDeclaration) {
            const functionDeclaration = node as FunctionDeclaration;
            documentation += generateFunctionDocs(functionDeclaration);
        }
    });

    return documentation;
}
