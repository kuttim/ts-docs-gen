import { Command } from 'commander';
import { generateDocsForProject } from './generators/documentGenerator';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .argument('<tsconfigPath>', 'Path to tsconfig.json')
  .action((tsconfigPath) => {
    const documentation = generateDocsForProject(tsconfigPath);
    const outputFilePath = path.join(__dirname, 'docs', 'documentation.md');
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    fs.writeFileSync(outputFilePath, documentation);
    console.log(`Documentation generated and saved at ${outputFilePath}`);
  });

program.parse(process.argv);

