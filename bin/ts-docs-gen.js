#!/usr/bin/env node

const path = require('path');
const { generateDocsForProject } = require('../dist/generators/documentGenerator');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Please provide the path to the TypeScript project.');
  process.exit(1);
}

const projectPath = args[0];
const tsConfigPath = path.join(projectPath, 'tsconfig.json');

console.log(generateDocsForProject(tsConfigPath));



