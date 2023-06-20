import * as ts from 'typescript';
import fs from 'fs';
import path from 'path';

class TsDocsGen {
  constructor(private projectDir: string) {}

  generateDocs() {
    const files = this.getTsFiles();

    files.forEach((file) => {
      const doc = this.processFile(file);
      this.outputDoc(file, doc);
    });
  }

  private getTsFiles(): string[] {
    // TODO: Implement logic to get all .ts files from the projectDir.
    return [];
  }

  private processFile(file: string): string {
    const sourceFile = ts.createSourceFile(
      file,
      fs.readFileSync(file).toString(),
      ts.ScriptTarget.ES2015,
      /*setParentNodes */ true
    );

    this.visitNode(sourceFile);

    // TODO: Implement logic to generate documentation based on the TypeScript AST.
    return '';
  }

  private visitNode(node: ts.Node) {
    console.log('Visiting node: ', ts.SyntaxKind[node.kind]);

    ts.forEachChild(node, (child) => this.visitNode(child));
  }

  private outputDoc(fileName: string, doc: string) {
    // TODO: Implement logic to output the generated documentation.
  }
}

const generator = new TsDocsGen('./project-directory');
generator.generateDocs();
