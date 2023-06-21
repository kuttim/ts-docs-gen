# ts-docs-gen

`ts-docs-gen` is a command-line documentation generation tool specifically designed for TypeScript projects. It simplifies the process of creating detailed, structured, and searchable documentation from your TypeScript source code.

## Features

- Automatically generates API documentation from TypeScript source files.
- Supports JSDoc annotations and TypeScript specific syntaxes.
- Generates markdown files to easily integrate with documentation sites like Docusaurus or MkDocs.
- CLI for easy integration into your development process.

## Getting Started

### Installation

You can install `ts-docs-gen` globally via npm:

```bash
npm install -g ts-docs-gen
```
or locally in your project
```bash
npm install --save-dev ts-docs-gen
```

### Usage
To generate the documentation, navigate to the root of your TypeScript project and run:

```bash
ts-docs-gen
```
By default, `ts-docs-gen` will create a docs/ directory at the root of your project and populate it with the generated documentation.

### Configuration
You can further customize `ts-docs-gen` by providing a configuration file in your project root. Here's an example `ts-docs-gen.json` file:

```json
{
  "input": "./src",
  "output": "./docs",
  "exclude": ["**/*.spec.ts"]
}
```
In this example, `ts-docs-gen` will read TypeScript files from the `./src` directory, generate documentation, and save it to the `./docs` directory. Any files matching the pattern `**/*.spec.ts` will be excluded from documentation generation.

### License

This project is licensed under the MIT license. See the [License](https://github.com/kuttim/ts-docs-gen/blob/master/LICENSE) file for more details.
