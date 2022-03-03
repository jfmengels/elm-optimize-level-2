import ts from 'typescript';

export const createRemoveUnusedRecordFieldsTransform: ts.TransformerFactory<ts.SourceFile> = context => {
    return sourceFile => {
        const knownFields = new Set();
        const usedFields = new Set();

        const fieldsCollectorVisitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "_Platform_export") {
                return node;
            }
            else if (ts.isObjectLiteralExpression(node)) {
                node.properties.forEach((it) =>
                    knownFields.add((it.name as ts.Identifier).text)
                );
            } else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier((node.name))) {
                usedFields.add(node.name.text);
            }

            return ts.visitEachChild(node, fieldsCollectorVisitor, context);
        };

        ts.visitNode(sourceFile, fieldsCollectorVisitor);

        const fieldsToRemove = new Set([...knownFields].filter(x => !usedFields.has(x)));

        const fieldsRemoverVisitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            if (ts.isObjectLiteralExpression(node)) {
                if (node.properties.some(it => fieldsToRemove.has((it.name as ts.Identifier).text))) {
                    const newNode =
                        ts.updateObjectLiteral(
                            node,
                            node.properties.filter(it => {
                                return !fieldsToRemove.has((it.name as ts.Identifier).text)
                            })
                        );
                    return ts.visitEachChild(newNode, fieldsRemoverVisitor, context);
                }
            }

            return ts.visitEachChild(node, fieldsRemoverVisitor, context);
        };

        return ts.visitNode(sourceFile, fieldsRemoverVisitor);
    };
};