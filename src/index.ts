import { Command } from 'commander';
import { Project } from 'ts-morph';
import { generateDocsForProject } from './generators/documentGenerator';
import * as path from 'path';
import * as fs from 'fs';

interface ConfigOptions {
  input: string;
  output: string;
  exclude?: string[];
}

const program = new Command();

program
  .action(() => {
    const configFilePath = path.join(process.cwd(), 'ts-docs-gen.json');
    let config: ConfigOptions;
    if (fs.existsSync(configFilePath)) {
      config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    } else {
      config = {
        input: './src',
        output: './docs',
        exclude: ['**/*.spec.ts']
      };
    }

    if (!fs.existsSync(config.input)) {
      console.log('Error: Input directory not found.');
      return;
    }

    if (!fs.existsSync(config.output)) {
      fs.mkdirSync(config.output, { recursive: true });
    }

    const project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),  
    });

    const documentation = generateDocsForProject(project, config.exclude);
    
    fs.writeFileSync(path.join(config.output, 'documentation.md'), documentation);
    console.info("Successfully wrote documentation to" + config.output, 'documentation.md');
  });

program.parse(process.argv);
