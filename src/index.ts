import { Command } from 'commander';
import { Project } from 'ts-morph';
import { generateDocsForProject } from './generators/documentGenerator';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();

program
  .action(() => {
    const currentDirectory = process.cwd();
    const tsconfigPath = path.join(currentDirectory, 'tsconfig.json');

    if (!fs.existsSync(tsconfigPath)) {
      console.log('Error: tsconfig.json not found in the current directory.');
      return;
    }

    const project = new Project({
      tsConfigFilePath: tsconfigPath,
    });

    const documentation = generateDocsForProject(tsconfigPath);
    console.log(documentation);
  });

program.parse(process.argv);