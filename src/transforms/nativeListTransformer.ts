import ts from 'typescript';

/*

Split out function definitions so that the raw version of the function can be called.

This only shows benefit with the `createFuncInlineTransformer`, which will detect when an F3 is being called with 3 arguments and skip the F3 call

initial

var $elm$core$String$join = F2(function (sep, chunks) {
  return A2(_String_join, sep, _List_toArray(chunks));
});


transformed

var $elm$core$String$join_fn = function (sep, chunks) {
  return A2(_String_join, sep, _List_toArray(chunks));
}, $elm$core$String$join = F2($elm$core$String$join_fn);


*/


export const createNativeListTransformer = (): ts.TransformerFactory<ts.SourceFile> => (context) => {
  return (sourceFile) => {
    // todo hack to only inline top level functions
    // const { topScope } = matchElmSource(sourceFile)!;

    const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
      let newNode = node;

      if (ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text == "A2"
      ) {
        const [fn, firstArg, secondArg] = node.arguments;
        console.log("A2", node)

        if (ts.isCallExpression(secondArg)
          && ts.isIdentifier(secondArg.expression)
          && secondArg.expression.text == "_List_fromArray"
        ) {

          console.log("2nd arg", secondArg)
          
          if (ts.isIdentifier(fn) && fn.text == "$elm$core$List$map") {
            console.log("fn arg", fn)
            newNode = ts.createCall(
              ts.createIdentifier('_List_fromArray'),
              undefined,
              [
                ts.createCall(
                  ts.createPropertyAccess(
                    secondArg.arguments[0],
                    'map'
                  ),
                  undefined,
                  [firstArg],
                )
              ]
            );
          }
        }
      }
      return ts.visitEachChild(newNode, visitor, context);
    };

    return ts.visitNode(sourceFile, visitor);
  };
};