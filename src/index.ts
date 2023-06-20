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
    // TODO: Implement logic to read the file and generate documentation.
    return '';
  }

  private outputDoc(fileName: string, doc: string) {
    // TODO: Implement logic to output the generated documentation.
  }
}

const generator = new TsDocsGen('./project-directory');
generator.generateDocs();
