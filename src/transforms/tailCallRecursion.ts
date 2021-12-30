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

// TODO Enable TCO for tail recursion modulo cons
// TODO Enable TCO for code like `rec n = if ... then False else condition n && rec (n - 1)`, using `&&` or `||`
// TODO Enable TCO for other kinds of data constructors 

type Context = any;

export const createTailCallRecursionTransformer : ts.TransformerFactory<ts.SourceFile> = (context : Context) => {
  return (sourceFile) => {
    const functionsToBeMadeRecursive : Record<string, boolean> = {};

    const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && node.initializer
        && ts.isCallExpression(node.initializer)) {
          const fn = isFCall(node.initializer);
          if (fn) {
            const parameterNames : Array<string> = fn.parameters.map(param => {
              return ts.isIdentifier(param.name) ? param.name.text : '';
            });
            const newBody = updateFunctionBody(functionsToBeMadeRecursive, node.name.text, parameterNames, fn.body, context);
            if (functionsToBeMadeRecursive[node.name.text] !== true) {
              return node;
            }
            functionsToBeMadeRecursive[node.name.text] = false;
            const newFn = ts.createFunctionExpression(
              fn.modifiers,
              undefined,
              fn.name,
              undefined,
              fn.parameters,
              undefined,
              newBody
            );

            const initializer = ts.updateCall(
              node.initializer,
              node.initializer.expression,
              undefined,
              [newFn]
            );

            return ts.updateVariableDeclaration(
              node,
              node.name,
              undefined,
              initializer
            );
          }
      }
      return ts.visitEachChild(node, visitor, context);
    };

    return ts.visitNode(sourceFile, visitor);
  };
};

function isFCall(node: ts.CallExpression): ts.FunctionExpression | null {
  if (ts.isIdentifier(node.expression)
    && node.expression.text.startsWith('F')
    && node.arguments.length > 0
  ) {
    const fn = node.arguments[0];
    if (ts.isFunctionExpression(fn)) {
      return fn;
    }

    return null;
  }

  return null;
}

function updateFunctionBody(functionsToBeMadeRecursive : Record<string, boolean>, functionName : string, parameterNames : Array<string>, body : ts.Block, context : Context) : ts.Block {
  const labelSplits = functionName.split("$");
  const label = labelSplits[labelSplits.length - 1] || functionName;
  const updatedBlock = ts.visitEachChild(body, updateRecursiveCallVisitor, context);

  function updateRecursiveCallVisitor(node: ts.Node): ts.VisitResult<ts.Node> {
    if (ts.isBlock(node) || ts.isLabeledStatement(node) || ts.isWhileStatement(node)) {
      return ts.visitEachChild(node, updateRecursiveCallVisitor, context);
    }

    if (ts.isIfStatement(node)) {
      return ts.updateIf(
        node,
        node.expression,
        ts.visitNode(node.thenStatement, updateRecursiveCallVisitor, context),
        ts.visitNode(node.elseStatement, updateRecursiveCallVisitor, context)
      )
    }

    if (ts.isReturnStatement(node)
      && node.expression
      && ts.isCallExpression(node.expression)
    ) {
      const newArguments = extractCallTo(functionName, node.expression);
      if (!newArguments) {
        return node;
      }

      functionsToBeMadeRecursive[functionName] = true;
      return createContinuation(label, parameterNames, newArguments);
    }

    return node;
  }

  if (functionsToBeMadeRecursive[functionName] !== true) {
    return body;
  }

  if (!ts.isLabeledStatement(updatedBlock.statements[0])) {
    return ts.createBlock(
      [ts.createLabel(label, ts.createWhile(ts.createTrue(), updatedBlock))]
    );
  }

  return updatedBlock;
}

function extractCallTo(functionName : string, node : ts.CallExpression) : Array<ts.Expression> | null {
  if (!ts.isIdentifier(node.expression)) {
    return null;
  }

  // Is "fn(...)"
  if (node.expression.text === functionName) {
    return [...node.arguments];
  }

  // Is "AX(fn, ...)"
  const firstArg = node.arguments[0];
  if (node.expression.text.startsWith("A")
    && ts.isIdentifier(firstArg)
    && firstArg.text === functionName
  ) {
    return node.arguments.slice(1);
  }

  return null;
}

function createContinuation(label : string, parameterNames : Array<string>, newArguments : Array<ts.Expression>) : Array<ts.Node> {
  let assignments : Array<ts.VariableDeclaration> = [];
  let reassignments : Array<ts.BinaryExpression> = [];

  parameterNames.forEach((name, index) => {
    const correspondingArg : ts.Expression = newArguments[index];
    if (ts.isIdentifier(correspondingArg)
      && name === correspondingArg.text
    ) {
      return;
    }
    const tempName = `$temp$${name}`;
    assignments.push(
      ts.createVariableDeclaration(
        tempName,
        undefined,
        newArguments[index]
      )
    );
    reassignments.push(
      ts.createAssignment(
        ts.createIdentifier(name),
        ts.createIdentifier(tempName)
      )
    );
  });

  return [
    ts.createVariableDeclarationList(assignments),
    ...reassignments,
    ts.createContinue(label)
  ];
}