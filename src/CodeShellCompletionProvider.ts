import { CancellationToken, InlineCompletionContext, InlineCompletionItem, InlineCompletionItemProvider, InlineCompletionList, Position, ProviderResult, Range, TextDocument, window, workspace, StatusBarItem, InlineCompletionTriggerKind } from "vscode";
import { postCompletion } from "./request/inline-completion";
import { sleep } from "./Utils";
import { CODESHELL_CONFIG } from "./consts";

export class CodeShellCompletionProvider implements InlineCompletionItemProvider {

    private statusBar: StatusBarItem;

    constructor(statusBar: StatusBarItem) {
        this.statusBar = statusBar;
    }

    //@ts-ignore
    // because ASYNC and PROMISE
    public async provideInlineCompletionItems(document: TextDocument, position: Position, context: InlineCompletionContext, token: CancellationToken): ProviderResult<InlineCompletionItem[] | InlineCompletionList> {
        let autoTriggerEnabled = CODESHELL_CONFIG.get("AutoTriggerCompletion") as boolean;
        if (context.triggerKind === InlineCompletionTriggerKind.Automatic) {
            if (!autoTriggerEnabled) {
                return Promise.resolve(([] as InlineCompletionItem[]));
            }
            let delay = CODESHELL_CONFIG.get("AutoCompletionDelay") as number;
            await sleep(1000 * delay);
            if (token.isCancellationRequested) {
                return Promise.resolve(([] as InlineCompletionItem[]));
            }
        }

        const fimPrefixCode = this.getFimPrefixCode(document, position);
        const fimSuffixCode = this.getFimSuffixCode(document, position);
        if (this.isNil(fimPrefixCode) && this.isNil(fimSuffixCode)) {
            return Promise.resolve(([] as InlineCompletionItem[]));
        }

        this.statusBar.text = "$(loading~spin)";
        this.statusBar.tooltip = "CodeShell - Working";
        return postCompletion(fimPrefixCode, fimSuffixCode).then((response) => {
            this.statusBar.text = "$(light-bulb)";
            this.statusBar.tooltip = `CodeShell - Ready`;
            if (token.isCancellationRequested || !response || this.isNil(response.trim())) {
                return Promise.resolve(([] as InlineCompletionItem[]));
            }
            return [new InlineCompletionItem(response, new Range(position, position))];
        }).catch((error) => {
            console.error(error);
            this.statusBar.text = "$(alert)";
            this.statusBar.tooltip = "CodeShell - Error";
            window.setStatusBarMessage(`${error}`, 10000);
            return Promise.resolve(([] as InlineCompletionItem[]));
        }).finally(() => {
        });
    }

    private getFimPrefixCode(document: TextDocument, position: Position): string {
        const firstLine = Math.max(position.line - 100, 0);
        const range = new Range(firstLine, 0, position.line, position.character);
        return document.getText(range).trim();
    }

    private getFimSuffixCode(document: TextDocument, position: Position): string {
        const startLine = position.line + 1;
        const endLine = Math.min(startLine + 10, document.lineCount);
        const range = new Range(position.line, position.character, endLine, 0);
        return document.getText(range).trim();
    }

    private isNil(value: String | undefined | null): boolean {
        return value === undefined || value === null || value.length === 0;
    }
    
}
