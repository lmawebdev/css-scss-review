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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSSAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const postcss_1 = __importDefault(require("postcss"));
const postcss_scss_1 = __importDefault(require("postcss-scss"));
const postcss_selector_parser_1 = __importDefault(require("postcss-selector-parser"));
class CSSAnalyzer {
    constructor() {
        this.cssFiles = [];
        this.codeFiles = [];
        this.selectors = new Map();
    }
    async analyzeWorkspace(workspaceFolder) {
        this.selectors.clear();
        // Find all CSS/SCSS files and code files
        await this.findFiles(workspaceFolder);
        // Extract selectors from CSS files
        await this.extractSelectors();
        // Check usage in code files
        await this.checkUsage();
        // Return results
        return this.getResults();
    }
    async findFiles(workspaceFolder) {
        const exclude = '**/node_modules/**,**/.git/**,**/dist/**,**/build/**';
        // Find CSS/SCSS files
        this.cssFiles = await vscode.workspace.findFiles('**/*.{css,scss,sass}', exclude);
        // Find code files
        const jsFiles = await vscode.workspace.findFiles('**/*.{js,jsx,ts,tsx,vue,html,astro}', exclude);
        const htmlFiles = await vscode.workspace.findFiles('**/*.html', exclude);
        this.codeFiles = [...new Set([...jsFiles, ...htmlFiles])];
    }
    async extractSelectors() {
        for (const file of this.cssFiles) {
            try {
                const content = await vscode.workspace.fs.readFile(file);
                const text = new TextDecoder().decode(content);
                // Parse CSS/SCSS
                const isSCSS = file.fsPath.endsWith('.scss') || file.fsPath.endsWith('.sass');
                const root = postcss_1.default.parse(text, {
                    syntax: isSCSS ? postcss_scss_1.default : undefined
                });
                let lineNumber = 0;
                root.each((rule) => {
                    if (rule.type === 'rule') {
                        const selector = rule.selector;
                        const line = rule.source?.start?.line ?? lineNumber;
                        // Parse selectors to extract individual classes and IDs
                        const extracted = this.extractSelectorsFromRule(selector);
                        for (const ext of extracted) {
                            const key = `${ext.type}:${ext.value}`;
                            if (!this.selectors.has(key)) {
                                this.selectors.set(key, []);
                            }
                            this.selectors.get(key).push({
                                selector: selector,
                                file: file,
                                line: line,
                                used: false
                            });
                        }
                    }
                    lineNumber++;
                });
            }
            catch (error) {
                console.error(`Error parsing file ${file.fsPath}:`, error);
            }
        }
    }
    extractSelectorsFromRule(selector) {
        const extracted = [];
        try {
            (0, postcss_selector_parser_1.default)(selectors => {
                selectors.walkClasses(sel => {
                    extracted.push({
                        type: 'class',
                        value: sel.value
                    });
                });
                selectors.walkIds(sel => {
                    extracted.push({
                        type: 'id',
                        value: sel.value
                    });
                });
            }).processSync(selector);
        }
        catch (error) {
            console.error(`Error extracting selectors from "${selector}":`, error);
        }
        return extracted;
    }
    async checkUsage() {
        // Create regex patterns for all selectors
        for (const [key, selectorsList] of this.selectors) {
            const [type, value] = key.split(':');
            // Create patterns to search for the selector in code
            const patterns = this.createSearchPatterns(type, value);
            for (const codeFile of this.codeFiles) {
                try {
                    const content = await vscode.workspace.fs.readFile(codeFile);
                    const text = new TextDecoder().decode(content);
                    let fileUseCount = 0;
                    for (const pattern of patterns) {
                        const matches = [...text.matchAll(pattern)];
                        fileUseCount += matches.length;
                    }
                    if (fileUseCount > 0) {
                        for (const selector of selectorsList) {
                            selector.used = true;
                            if (!selector.usedIn) {
                                selector.usedIn = [];
                            }
                            if (!selector.useCount) {
                                selector.useCount = 0;
                            }
                            if (!selector.usedIn.includes(codeFile.fsPath)) {
                                selector.usedIn.push(codeFile.fsPath);
                            }
                            selector.useCount += fileUseCount;
                        }
                    }
                }
                catch (error) {
                    console.error(`Error reading file ${codeFile.fsPath}:`, error);
                }
            }
        }
    }
    createSearchPatterns(type, value) {
        const patterns = [];
        if (type === 'class') {
            // Search for class names in className, class attributes, and tailwind-like usage
            patterns.push(new RegExp(`className\\s*=\\s*["\`][^"}\`]*\\b${value}\\b`, 'g'));
            patterns.push(new RegExp(`className\\s*=\\s*{[^}]*\\b${value}\\b`, 'g'));
            patterns.push(new RegExp(`class\\s*=\\s*["\`][^"}\`]*\\b${value}\\b`, 'g'));
            patterns.push(new RegExp(`class:\\s*\\b${value}\\b`, 'g'));
            patterns.push(new RegExp(`\\.${value}`, 'g')); // CSS reference
            patterns.push(new RegExp(`'${value}'`, 'g')); // String reference
            patterns.push(new RegExp(`"${value}"`, 'g')); // String reference
        }
        else if (type === 'id') {
            // Search for ID usage
            patterns.push(new RegExp(`id\\s*=\\s*["\`][^"}\`]*\\b${value}\\b`, 'g'));
            patterns.push(new RegExp(`id:\\s*\\b${value}\\b`, 'g'));
            patterns.push(new RegExp(`#${value}`, 'g')); // CSS reference
            patterns.push(new RegExp(`'${value}'`, 'g')); // String reference
            patterns.push(new RegExp(`"${value}"`, 'g')); // String reference
        }
        return patterns;
    }
    getResults() {
        const unused = [];
        const used = [];
        let total = 0;
        for (const selectorsList of this.selectors.values()) {
            for (const selector of selectorsList) {
                total++;
                if (selector.used) {
                    used.push(selector);
                }
                else {
                    unused.push(selector);
                }
            }
        }
        // Remove duplicates
        const unusedUnique = Array.from(new Map(unused.map(s => [s.selector, s])).values());
        return {
            unused: unusedUnique,
            used: used,
            total: total
        };
    }
}
exports.CSSAnalyzer = CSSAnalyzer;
//# sourceMappingURL=analyzer.js.map