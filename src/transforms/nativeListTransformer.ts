import ts, { SourceFile } from 'typescript';
import { ast } from './utils/create';

/*

Use functions that deal with JS Arrays when encountering List functions applied on the result of `_List_fromArray` calls.

JS Arrays are denser, and therefore faster to iterate through.

TODO rest of documentation

initial

TODO
var $elm$core$String$join = F2(function (sep, chunks) {
  return A2(_String_join, sep, _List_toArray(chunks));
});


transformed

TODO
var $elm$core$String$join_fn = function (sep, chunks) {
  return A2(_String_join, sep, _List_toArray(chunks));
}, $elm$core$String$join = F2($elm$core$String$join_fn);


*/

// TODO Change `_List_toArray(_List_fromArray(x))` to `x`
// TODO Change `_List_fromArray(_List_toArray(x))` to `x`
// TODO Inline _List_sortBy / $elm$core$List$sortBy / $elm$core$List$sort
//      so that we can remove the `_List_toArray` and re-use the `_List_fromArray` when used with other functions.
// TODO Same for _List_sortWith / $elm$core$List$sortWith

const LIST_FROM_ARRAY_F_NAME = '_List_fromArray';

const transformations: {[key: string]: string} = {
  "$elm$core$List$map": "_nativeMutatingMap",
  "$elm$core$List$filter": "_nativeJsArrayFilter",
  "$elm$core$List$drop": "_nativeJsArrayDrop",
  "$elm$core$List$take": "_nativeJsArrayTake",
};

const nativeFunctions: {[key: string]: string} = {
  "_nativeMutatingMap":
    `function _mutatingJsArrayMap(mapper, arr) {
      var len = arr.length;
      for (var i = 0; i < len; i++) {
          arr[i] = mapper(arr[i]);
      }
      return arr;
    }`,

  "_nativeJsArrayFilter":
    `function _nativeJsArrayFilter(pred, arr) {
      var res = [];
      for (var i = 0; i < arr.length; i++) {
        if (pred(arr[i])) {
          res.push(arr[i]);
        }
      }
      return res;
    };`,

  "_nativeJsArrayDrop":
    `function _nativeJsArrayDrop(n, arr) {
      return arr.slice(n);
    };`,

  "_nativeJsArrayTake":
    `function _nativeJsArrayTake(n, arr) {
      return arr.slice(0, n);
    };`,
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

    let nativeFunctionNodes: ts.Node[] = [];
    for (const nativeFunction of nativeFunctionsToInsert) {
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
