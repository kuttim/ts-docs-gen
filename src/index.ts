import { Command } from 'commander';
import { Project } from 'ts-morph';
import { generateDocsForProject } from './generators/documentGenerator';

// Create a new command
const program = new Command();

program
  .argument('<tsconfigPath>', 'Path to tsconfig.json')
  .action((tsconfigPath) => {
    const project = new Project({
      compilerOptions: {
        allowJs: true,
      },
      tsConfigFilePath: tsconfigPath,
    });

    const documentation = generateDocsForProject(project);
    console.log(documentation);
  });

program.parse(process.argv);

