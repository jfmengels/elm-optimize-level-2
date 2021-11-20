import ts from 'typescript';

import { createNativeListTransformer } from '../src/transforms/nativeListTransformer';

test('it can  process nested calls of A2 with non identifiers as the first arg ', () => {
  const initialCode = `
  var $author$project$Api$someValue = A2(
    $elm$core$List$map,
    fn,
    _List_fromArray(
      ['1', '2']));
  `;

  const expectedOutputCode = `
  var $author$project$Api$someValue =
    _List_fromArray(['1', '2'].map(fn));
  `;

  const { actual, expected } = transformCode(
    initialCode,
    expectedOutputCode,
    createNativeListTransformer()
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
