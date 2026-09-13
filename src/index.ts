import { Command } from "commander";
import { Project } from "ts-morph";
import { generateDocsForProject, GenerateOptions } from "./generators/documentGenerator";
import * as path from "path";
import * as fs from "fs";

interface ConfigFile {
  input?: string;
  output?: string;
  exclude?: string[];
  includeNonExported?: boolean;
  frontmatter?: boolean;
  singleFile?: boolean;
}

interface ResolvedConfig {
  input: string;
  output: string;
  exclude: string[];
  includeNonExported: boolean;
  frontmatter: boolean;
  singleFile: boolean;
}

const DEFAULT_CONFIG: ResolvedConfig = {
  input: "./src",
  output: "./docs",
  exclude: ["**/*.spec.ts"],
  includeNonExported: false,
  frontmatter: true,
  singleFile: false,
};

const DEFAULT_CONFIG_FILENAME = "ts-docs-gen.json";

function readPackageVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function loadConfigFile(configPath: string): ConfigFile {
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

interface CliOptions {
  input?: string;
  output?: string;
  config?: string;
  exclude?: string[];
  includeNonExported?: boolean;
  frontmatter?: boolean;
  singleFile?: boolean;
}

function resolveConfig(options: CliOptions): ResolvedConfig {
  const configPath = path.resolve(process.cwd(), options.config ?? DEFAULT_CONFIG_FILENAME);
  const fileConfig = loadConfigFile(configPath);

  return {
    input: options.input ?? fileConfig.input ?? DEFAULT_CONFIG.input,
    output: options.output ?? fileConfig.output ?? DEFAULT_CONFIG.output,
    exclude: options.exclude ?? fileConfig.exclude ?? DEFAULT_CONFIG.exclude,
    includeNonExported: options.includeNonExported ?? fileConfig.includeNonExported ?? DEFAULT_CONFIG.includeNonExported,
    frontmatter: options.frontmatter ?? fileConfig.frontmatter ?? DEFAULT_CONFIG.frontmatter,
    singleFile: options.singleFile ?? fileConfig.singleFile ?? DEFAULT_CONFIG.singleFile,
  };
}

function runGenerate(options: CliOptions): void {
  const config = resolveConfig(options);
  const inputDir = path.resolve(process.cwd(), config.input);
  const outputDir = path.resolve(process.cwd(), config.output);

  if (!fs.existsSync(inputDir)) {
    console.error(`Error: input directory not found: ${inputDir}`);
    process.exitCode = 1;
    return;
  }

  const tsConfigFilePath = path.join(process.cwd(), "tsconfig.json");
  if (!fs.existsSync(tsConfigFilePath)) {
    console.error(`Error: tsconfig.json not found at ${tsConfigFilePath}`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const project = new Project({ tsConfigFilePath });

  const generateOptions: GenerateOptions = {
    excludePatterns: config.exclude,
    rootDir: inputDir,
    includeNonExported: config.includeNonExported,
    frontmatter: config.frontmatter,
    singleFile: config.singleFile,
  };

  const files = generateDocsForProject(project, generateOptions);

  for (const file of files) {
    const destination = path.join(outputDir, file.outputPath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, file.content);
  }

  console.info(`Successfully wrote ${files.length} file(s) to ${outputDir}`);
}

function runInit(): void {
  const configPath = path.join(process.cwd(), DEFAULT_CONFIG_FILENAME);

  if (fs.existsSync(configPath)) {
    console.error(`Error: ${DEFAULT_CONFIG_FILENAME} already exists in ${process.cwd()}`);
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(configPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  console.info(`Created ${DEFAULT_CONFIG_FILENAME}`);
}

function collectExclude(value: string, previous: string[]): string[] {
  return [...previous, ...value.split(",").map((pattern) => pattern.trim()).filter(Boolean)];
}

const program = new Command();

program
  .name("ts-docs-gen")
  .description("Generate API documentation for a TypeScript project")
  .version(readPackageVersion());

program
  .option("-i, --input <path>", "input directory containing TypeScript source files")
  .option("-o, --output <path>", "output directory for generated documentation")
  .option("-c, --config <path>", "path to a ts-docs-gen.json config file")
  .option("-e, --exclude <patterns>", "comma-separated glob pattern(s) to exclude (repeatable)", collectExclude, [])
  .option("--include-non-exported", "include declarations that are not exported")
  .option("--no-frontmatter", "disable YAML frontmatter in generated markdown")
  .option("--single-file", "write a single documentation.md instead of one file per source file")
  .action((options: CliOptions, command: Command) => {
    runGenerate({
      ...options,
      exclude: options.exclude && options.exclude.length > 0 ? options.exclude : undefined,
      // --no-frontmatter always carries a default of `true`, so only forward it when
      // the user actually passed the flag — otherwise it would always beat the config file.
      frontmatter: command.getOptionValueSource("frontmatter") === "cli" ? options.frontmatter : undefined,
    });
  });

program
  .command("init")
  .description(`create a ${DEFAULT_CONFIG_FILENAME} config file with default settings`)
  .action(() => runInit());

program.parse(process.argv);
