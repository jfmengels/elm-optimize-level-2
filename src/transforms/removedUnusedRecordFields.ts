import ts from 'typescript';

const SHOULD_LOG = true;

export const createRemoveUnusedRecordFieldsTransform: ts.TransformerFactory<ts.SourceFile> = context => {
    return sourceFile => {
        const usedFields = new Set();
        let currentPropertyAssignments : Array<string> = [];

        const fieldsCollectorVisitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            if (ts.isPropertyAssignment(node) && ts.isIdentifier((node.name))) {
                currentPropertyAssignments.push(node.name.text);
                const newNode = ts.visitEachChild(node, fieldsCollectorVisitor, context);
                currentPropertyAssignments.pop();
                return newNode;
            }
            else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier((node.name)) && !currentPropertyAssignments.includes(node.name.text)) {
                if (!currentPropertyAssignments.includes(node.name.text)) {
                    usedFields.add(node.name.text);
                }
            }

            return ts.visitEachChild(node, fieldsCollectorVisitor, context);
        };

        ts.visitNode(sourceFile, fieldsCollectorVisitor);

        const fieldsRemoved = new Set();

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
                                const name = (it.name as ts.Identifier).text;
                                const keep = usedFields.has(name);
                                if (!keep) {
                                    fieldsRemoved.add(name);
                                }
                                return keep;
                            })
                        );
                    return ts.visitEachChild(newNode, fieldsRemoverVisitor, context);
                }
            }

            return ts.visitEachChild(node, fieldsRemoverVisitor, context);
        };

        const newAst = ts.visitNode(sourceFile, fieldsRemoverVisitor);

        if (SHOULD_LOG) {
            const formattedRemovedFields = [...fieldsRemoved]
                .map(field => `    ${field}`)
                .join("\n");

            console.log(`\nI have removed the following fields:\n${formattedRemovedFields}\n`)
        }

        return newAst;
    };
};

function shouldBeAvoided(node: ts.Node): boolean {
    return (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "_Platform_export")
        || (ts.isFunctionDeclaration(node) && node.name && node.name.text.startsWith("_"))
        || (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text.startsWith("_"))
        || ts.isTryStatement(node)
}