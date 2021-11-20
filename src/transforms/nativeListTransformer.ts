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

const LIST_FROM_ARRAY_F_NAME = '_List_fromArray';

const transformations: {[key: string]: string} = {
  "$elm$core$List$map": "map",
  "$elm$core$List$filter": "filter",
};

export const createNativeListTransformer = (): ts.TransformerFactory<ts.SourceFile> => (context) => {
  return (sourceFile) => {
    const visitor = (originalNode: ts.Node): ts.VisitResult<ts.Node> => {
      const node = ts.visitEachChild(originalNode, visitor, context);

      if (ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text == "A2"
      ) {
        const [fn, firstArg, secondArg] = node.arguments;

        if (ts.isIdentifier(fn) && transformations.hasOwnProperty(fn.text)) {
          
          if (ts.isCallExpression(secondArg)
            && ts.isIdentifier(secondArg.expression)
            && secondArg.expression.text == LIST_FROM_ARRAY_F_NAME
          ) {
            return ts.createCall(
              ts.createIdentifier(LIST_FROM_ARRAY_F_NAME),
              undefined,
              [
                ts.createCall(
                  ts.createPropertyAccess(
                    secondArg.arguments[0],
                    transformations[fn.text]
                  ),
                  undefined,
                  [firstArg],
                )
              ]
            );
          }
        }
      }
      return node;
    };

    return ts.visitNode(sourceFile, visitor);
  };
};