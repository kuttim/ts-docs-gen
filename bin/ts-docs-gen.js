#!/usr/bin/env node

const path = require('path');
const { generateDocsForProject } = require(path.join(__dirname, '../dist/index'));

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Please provide the path to the TypeScript project.');
    process.exit(1);
}

generateDocsForProject(args[0])
  .then(() => console.log('Documentation generation complete.'))
  .catch((err) => {
    console.error('Error during documentation generation:', err);
    process.exit(1);
  });

