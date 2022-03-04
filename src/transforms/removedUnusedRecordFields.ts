import ts from 'typescript';

export const createRemoveUnusedRecordFieldsTransform: ts.TransformerFactory<ts.SourceFile> = context => {
    return sourceFile => {
        const usedFields = new Set();

        const fieldsCollectorVisitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            if (shouldBeAvoided(node)) {
                return node;
            }
            else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier((node.name))) {
                usedFields.add(node.name.text);
            }

            return ts.visitEachChild(node, fieldsCollectorVisitor, context);
        };

        ts.visitNode(sourceFile, fieldsCollectorVisitor);

        const fieldsRemoverVisitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            if (shouldBeAvoided(node)) {
                return node;
            }
            else if (ts.isObjectLiteralExpression(node)) {
                if (node.properties.some(it => !usedFields.has((it.name as ts.Identifier).text))) {
                    const newNode =
                        ts.updateObjectLiteral(
                            node,
                            node.properties.filter(it => {
                                return usedFields.has((it.name as ts.Identifier).text)
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

function shouldBeAvoided(node: ts.Node): boolean {
    return (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "_Platform_export")
        || (ts.isFunctionDeclaration(node) && node.name && node.name.text.startsWith("_"))
        || ts.isTryStatement(node)
}