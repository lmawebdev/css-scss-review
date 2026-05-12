"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSSCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
class CSSCodeLensProvider {
    constructor() {
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
    }
    updateResults(results) {
        this.results = results;
        this._onDidChangeCodeLenses.fire();
    }
    provideCodeLenses(document, token) {
        if (!this.results) {
            return [];
        }
        const lenses = [];
        const filePath = document.uri.fsPath;
        // Combine used and unused
        const allSelectors = [...this.results.used, ...this.results.unused];
        // Remove duplicates based on line to avoid multiple codelenses for same line
        const seenLines = new Set();
        for (const selector of allSelectors) {
            if (selector.file.fsPath === filePath) {
                if (seenLines.has(selector.line)) {
                    continue;
                }
                seenLines.add(selector.line);
                const range = new vscode.Range(new vscode.Position(selector.line, 0), new vscode.Position(selector.line, selector.selector.length));
                const useCount = selector.useCount || 0;
                const title = useCount === 0 ? "⚠️ 0 referencias (no utilizado)" : `${useCount} referencia${useCount > 1 ? 's' : ''}`;
                const command = {
                    title: title,
                    command: "",
                    tooltip: title
                };
                lenses.push(new vscode.CodeLens(range, command));
            }
        }
        return lenses;
    }
}
exports.CSSCodeLensProvider = CSSCodeLensProvider;
//# sourceMappingURL=codelens.js.map