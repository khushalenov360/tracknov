"use strict";
/**
 * Tracknov Document Intelligence - Multi-Page Table Resolver
 * Identifies and stitches together single tables that split across physical page breaks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiPageTableResolver = void 0;
class MultiPageTableResolver {
    /**
     * Evaluates sequential tables and stitches them if they share structure, columns, and type context.
     */
    static resolve(tables) {
        if (tables.length <= 1)
            return tables;
        const resolved = [];
        let currentTable = Object.assign({}, tables[0]);
        for (let i = 1; i < tables.length; i++) {
            const nextTable = tables[i];
            // Stitches tables if they:
            // 1. Have identical columns counts
            // 2. Share the same semantic type
            // 3. Or have high similarity in header names or follow immediately sequentially
            const colMismatch = currentTable.headers.length !== nextTable.headers.length;
            const typeMismatch = currentTable.semanticType !== nextTable.semanticType;
            if (colMismatch || typeMismatch) {
                resolved.push(currentTable);
                currentTable = Object.assign({}, nextTable);
            }
            else {
                // Stitch tables together!
                currentTable.rows = [...currentTable.rows, ...nextTable.rows];
                currentTable.pageReferences = [
                    ...currentTable.pageReferences,
                    ...nextTable.pageReferences,
                ];
                // Average the confidence score
                currentTable.confidenceScore = (currentTable.confidenceScore + nextTable.confidenceScore) / 2;
            }
        }
        resolved.push(currentTable);
        return resolved;
    }
}
exports.MultiPageTableResolver = MultiPageTableResolver;
