import { Project } from "ts-morph";
import { generateDocsForProject } from "../src/generators/documentGenerator";

describe("Documentation Generator", () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
    });
  });

  test("should generate documentation for basic function", () => {
    const sourceCode = `
      /**
       * Adds two numbers
       * @param a - first number
       * @param b - second number
       * @returns the sum of a and b
       */
      function add(a: number, b: number): number {
        return a + b;
      }
    `;
    
    project.createSourceFile("example.ts", sourceCode);
    const docs = generateDocsForProject(project);
  
    expect(docs).toContain("Function: **add**");
    expect(docs).toContain("* **Return Type:** `number`");
    expect(docs).toContain("* **Parameters:**");
    expect(docs).toContain("**a**: `number`");
    expect(docs).toContain("**b**: `number`");
    expect(docs).toContain("Adds two numbers");
  });
  

  test("should generate documentation for an interface", () => {
    const sourceCode = `
      /**
       * Interface for a person
       */
      interface Person {
        name: string;
        age: number;
      }
    `;
    
    project.createSourceFile("example.ts", sourceCode);

    const docs = generateDocsForProject(project);

    expect(docs).toContain("Interface Name: Person");
    expect(docs).toContain("Name: name, Type: string");
    expect(docs).toContain("Name: age, Type: number");
  });

  test("should handle enums properly", () => {
    const sourceCode = `
      enum Colors {
        Red = "red",
        Green = "green",
        Blue = "blue"
      }
    `;
    
    project.createSourceFile("example.ts", sourceCode);

    const docs = generateDocsForProject(project);

    expect(docs).toContain("Enum Name: Colors");
    expect(docs).toContain("Name: Red, Value: red");
    expect(docs).toContain("Name: Green, Value: green");
    expect(docs).toContain("Name: Blue, Value: blue");
  });
});
