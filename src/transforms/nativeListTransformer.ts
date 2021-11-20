import ts, { SourceFile } from 'typescript';
import { ast } from './utils/create';

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
  "$elm$core$List$map": "_nativeMutatingMap",
  "$elm$core$List$filter": "_nativeMutatingFilter",
};

const nativeFunctions: {[key: string]: string} = {
  "_nativeMutatingMap": `var _nativeMutatingMap = () => "ok";`,
  "_nativeMutatingFilter": `var _nativeMutatingFilter = () => "ok";`,
};

export const createNativeListTransformer = (forTests: boolean): ts.TransformerFactory<ts.SourceFile> => (context) => {
  return (sourceFile) => {
    const nativeFunctionsToInsert: Set<string> = new Set();

    const visitor = (originalNode: ts.Node): ts.VisitResult<ts.Node> => {
      const node = ts.visitEachChild(originalNode, visitor, context);

      if (ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text == "A2"
      ) {
        const [fn, firstArg, secondArg] = node.arguments;

        if (ts.isIdentifier(fn)
          && transformations.hasOwnProperty(fn.text)
          && ts.isCallExpression(secondArg)
          && ts.isIdentifier(secondArg.expression)
          && secondArg.expression.text == LIST_FROM_ARRAY_F_NAME
        ) {

          nativeFunctionsToInsert.add(transformations[fn.text]);
          return ts.createCall(
            ts.createIdentifier(LIST_FROM_ARRAY_F_NAME),
            undefined,
            [
              ts.createCall(
                ts.createIdentifier(transformations[fn.text]),
                undefined,
                [ firstArg, secondArg.arguments[0] ]
              )
            ]
          );
        }
      }
      return node;
    };

    const newSourceFile = ts.visitNode(sourceFile, visitor);
console.log(nativeFunctionsToInsert)
    let nativeFunctionNodes: ts.Node[] = [];
    for (const nativeFunction of nativeFunctionsToInsert) {
      console.log(nativeFunctions[nativeFunction])
      nativeFunctionNodes.push(ast(nativeFunctions[nativeFunction]));
    }

    return ts.visitNode(newSourceFile, prependNodes(nativeFunctionNodes, context, forTests));
  };
};

/* Taken from recordUpdate.ts and updated, maybe mutualize these? */
function prependNodes(nodes: ts.Node[], context: ts.TransformationContext, forTests: boolean) {
  if (forTests) {
    const visitorHelp = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
          return nodes.concat(node);
      }

      return ts.visitEachChild(node, visitorHelp, context);
    }

    return visitorHelp;
  }

  const visitorHelp = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (isFirstFWrapper(node)) {
          return nodes.concat(node);
      }

      return ts.visitEachChild(node, visitorHelp, context);
  }

  return visitorHelp;
}

function isFirstFWrapper(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node) && node?.name?.text === 'F';
}
