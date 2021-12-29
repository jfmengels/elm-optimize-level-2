import ts from 'typescript';

/*

Applies tail-call recursion when possible, where the compiler didn't.

This function gets tail-call optimized.

    tco : (a -> b) -> List a -> List b -> List b
    tco mapper list acc =
        case list of
            [] ->
                acc

            x :: xs ->
                tco mapper xs (mapper x :: acc)

but this version doesn't (because of the additional `<|`):

    nonTco : (a -> b) -> List a -> List b -> List b
    nonTco mapper list acc =
        case list of
            [] ->
                acc

            x :: xs ->
                nonTco mapper xs <| (mapper x :: acc)

*/

// TODO Enable TCO when it should have been enabled but not triggered because of `<|` or `|>`
// TODO Re-use the existing loop and goto label if there is already one
// TODO Enable TCO for tail recursion modulo cons
// TODO Enable TCO for code like `rec n = if ... then False else condition n && rec (n - 1)`, using `&&` or `||`
// TODO Enable TCO for other kinds of data constructors 

export const createTailCallRecursionTransformer = (forTests: boolean): ts.TransformerFactory<ts.SourceFile> => (context) => {
  return (sourceFile) => {
    const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (ts.isVariableDeclaration(node)
        && node.initializer) {
          const fn = isFCall(node.initializer);
          if (fn) {
            return ts.createLiteral("ok");
          }
      }
      return ts.visitEachChild(node, visitor, context);
    };
    console.log(forTests);

    return ts.visitNode(sourceFile, visitor);
  };
};

function isFCall(node: ts.Expression): ts.Expression | null {
  if (ts.isCallExpression(node)
    && ts.isIdentifier(node.expression)
    && node.expression.text.startsWith('F')) {
    return node.arguments[0];
  }

  return null;
}