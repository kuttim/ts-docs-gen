import { Project, SourceFile } from "ts-morph";

export function parseFile(filePath: string): SourceFile {
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(filePath);
    
    return sourceFile;
}
