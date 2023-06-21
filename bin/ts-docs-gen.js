#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { generateDocsForProject } = require('../dist/generators/documentGenerator');

const projectPath = process.cwd();
const tsConfigPath = path.join(projectPath, 'tsconfig.json');

if (!fs.existsSync(tsConfigPath)) {
  console.log(`Error: tsconfig.json not found at the provided path: ${tsConfigPath}`);
  process.exit(1);
}

const documentation = generateDocsForProject(tsConfigPath);

const docsDirectoryPath = path.join(projectPath, 'docs');
if (!fs.existsSync(docsDirectoryPath)) {
  fs.mkdirSync(docsDirectoryPath);
}

const docsFilePath = path.join(docsDirectoryPath, 'documentation.md');
fs.writeFileSync(docsFilePath, documentation);

console.log(`Documentation has been written to ${docsFilePath}`);



