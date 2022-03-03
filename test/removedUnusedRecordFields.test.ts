import ts from 'typescript';
import { createRemoveUnusedRecordFieldsTransform } from '../src/transforms/removedUnusedRecordFields';

test('it can remove definitions of record fields that are never used anywhere', () => {
    const initialCode = `
(function () {
  var a = {
    used: 1,
    unused: 2
  }
  console.log(a.used);
})()`;

    const expectedOutputCode = `
(function (){
  var a = {
    used: 1
  }
  console.log(a.used);
})()`;
    const { actual, expected } = transformCode(
        initialCode,
        expectedOutputCode,
        createRemoveUnusedRecordFieldsTransform
    );

    expect(actual).toBe(expected);
});

export function transformCode(
    initialCode: string,
    expectedCode: string,
    transformer: ts.TransformerFactory<ts.SourceFile>
): {
    actual: string;
    expected: string;
} {
    const source = ts.createSourceFile(
        'elm.js',
        initialCode,
        ts.ScriptTarget.ES2018
    );

    const printer = ts.createPrinter();

    const [output] = ts.transform(source, [transformer]).transformed;

    const expectedOutput = printer.printFile(
        ts.createSourceFile('elm.js', expectedCode, ts.ScriptTarget.ES2018)
    );

    const printedOutput = printer.printFile(output);

    return {
        actual: printedOutput,
        expected: expectedOutput,
    };
}
