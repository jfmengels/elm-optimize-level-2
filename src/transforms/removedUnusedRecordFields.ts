import ts from 'typescript';
import {InlineMode} from "./inlineListFromArray";

export const createRemoveUnusedRecordFieldsTransform: ts.TransformerFactory<ts.SourceFile> = context => {
    return sourceFile => {
        const knownFields = new Set();
        const usedFields = new Set();

        const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            // detects [exp](..)
            if (ts.isCallExpression(node)) {
                const expression = node.expression;
                // detects _List_fromArray(..)
                if (
                    ts.isIdentifier(expression) &&
                    expression.text === LIST_FROM_ARRAY_F_NAME &&
                    node.arguments.length === 1
                ) {
                    const [arrayLiteral] = node.arguments;

                    // detects _List_fromArray([..])
                    if (ts.isArrayLiteralExpression(arrayLiteral)) {
                        return arrayLiteral.elements.reduceRight(
                            (list: ts.Expression, element: ts.Expression): ts.Expression => {
                                return InlineMode.match(inlineMode, {
                                    UsingConsFunc: (): ts.Expression =>
                                        ts.createCall(listConsCall, undefined, [
                                            ts.visitNode(element, visitor),
                                            list,
                                        ]),

                                    UsingLiteralObjects: mode =>
                                        ts.createObjectLiteral([
                                            ts.createPropertyAssignment('$', listElementMarker(mode)),
                                            ts.createPropertyAssignment('a', element),
                                            ts.createPropertyAssignment('b', list),
                                        ]),
                                });
                            },
                            listNil
                        );
                    }
                }
            }

            return ts.visitEachChild(node, visitor, context);
        };

        // TMP
        ts.visitNode(sourceFile, visitor);
        console.log("known", [...knownFields])
        console.log("used", [...usedFields])

        return ts.visitNode(sourceFile, visitor);
    };
};