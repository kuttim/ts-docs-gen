import * as fs from 'fs';
import * as path from 'path';
import { Project } from "ts-morph";
import { generateDocs } from './documentGenerator';
class TsDocsGen {
    static generate(tsFilePath: string): void {
        const project = new Project();

        const sourceFile = project.addSourceFileAtPath(tsFilePath);
        const docs = generateDocs(sourceFile);
        const outputFilePath = path.join(__dirname, '..', 'docs', path.basename(tsFilePath, '.ts') + '.md');

        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
        fs.writeFileSync(outputFilePath, docs);

        console.log(`Documentation generated at ${outputFilePath}`);
    }
}
