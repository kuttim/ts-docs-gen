# ts-docs-gen

`ts-docs-gen` is a command-line documentation generator for TypeScript projects. It walks
your project with the TypeScript compiler API (via [ts-morph](https://ts-morph.com/)) and
turns your exported functions, classes, interfaces, enums, type aliases, and variables —
plus their JSDoc comments — into Markdown that's ready to drop into a static docs site.

## Features

- Generates Markdown documentation from your TypeScript source, one file per module by
  default, mirroring your input directory structure, plus an `index.md`/`README.md` table
  of contents linking to all of them.
- Understands JSDoc: `@param`, `@returns`/`@return`, `@example`, and `@deprecated` are
  parsed out individually instead of being dumped as a single blob.
- Documents classes (with `extends`/`implements`, properties, and methods — `private`
  members are skipped by default), interfaces, enums, type aliases, and variables.
- Follows re-exports (`export * from './x'`, `export { a as b } from './y'`) and lists
  them so barrel files aren't silently undocumented.
- Only documents exported declarations by default, so implementation details don't leak
  into your public docs (opt in to everything with `--include-non-exported`).
- Adds YAML frontmatter (a `title`) to each generated file, so the output can be dropped
  straight into Docusaurus, MkDocs, or any other frontmatter-aware static site generator.
- Ships as both a CLI and a small programmatic API (`generateDocsForProject`), and as a
  reusable [GitHub Action](#github-action) for other repos' CI.

## Getting Started

### Installation

```bash
npm install --save-dev @kuttim/ts-docs-gen
```

or globally:

```bash
npm install -g @kuttim/ts-docs-gen
```

### Usage

From the root of your TypeScript project (where your `tsconfig.json` lives):

```bash
ts-docs-gen
```

By default this reads TypeScript files from `./src`, generates one Markdown file per
source file plus an index, and writes them to `./docs`.

### CLI options

CLI flags always take priority over a `ts-docs-gen.json` config file.

| Flag | Description | Default |
| --- | --- | --- |
| `-i, --input <path>` | Input directory to scan | `./src` |
| `-o, --output <path>` | Output directory for generated docs | `./docs` |
| `-c, --config <path>` | Path to a config file | `./ts-docs-gen.json` |
| `-e, --exclude <patterns>` | Comma-separated glob pattern(s) to exclude (repeatable) | `**/*.spec.ts` |
| `--include-non-exported` | Also document non-exported declarations and `private` class members | `false` |
| `--no-frontmatter` | Disable YAML frontmatter in generated files | frontmatter on |
| `--single-file` | Write one `documentation.md` instead of one file per source file | `false` |
| `-V, --version` | Print the installed version | |
| `-h, --help` | Print usage | |

Run `ts-docs-gen init` to scaffold a `ts-docs-gen.json` with the defaults above.

### Configuration

`ts-docs-gen.json` example:

```json
{
  "input": "./src",
  "output": "./docs",
  "exclude": ["**/*.spec.ts"],
  "includeNonExported": false,
  "frontmatter": true,
  "singleFile": false
}
```

All fields are optional and fall back to the defaults shown above.

### GitHub Action

Other repositories can generate their docs in CI using this project as a composite action:

```yaml
- uses: kuttim/ts-docs-gen@master
  with:
    input: ./src
    output: ./docs
    exclude: '**/*.spec.ts'
```

See [`action.yml`](./action.yml) for the full list of inputs.

### Programmatic API

```ts
import { Project } from "ts-morph";
import { generateDocsForProject } from "@kuttim/ts-docs-gen/dist/generators/documentGenerator";

const project = new Project({ tsConfigFilePath: "./tsconfig.json" });
const files = generateDocsForProject(project, { excludePatterns: ["**/*.spec.ts"] });
// files: { outputPath: string; content: string }[]
```

### License

This project is licensed under the MIT license. See the [License](https://github.com/kuttim/ts-docs-gen/blob/master/LICENSE) file for more details.
