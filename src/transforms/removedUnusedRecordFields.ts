import ts from 'typescript';
import {InlineMode} from "./inlineListFromArray";

export const createRemoveUnusedRecordFieldsTransform: ts.TransformerFactory<ts.SourceFile> = context => {
    return sourceFile => {
        const knownFields = new Set();
        const usedFields = new Set();

        const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            if (ts.isObjectLiteralExpression(node)) {
                node.properties.forEach((it) =>
                    knownFields.add((it.name as ts.Identifier).text)
                );
            } else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier((node.name))) {
                usedFields.add(node.name.text);
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