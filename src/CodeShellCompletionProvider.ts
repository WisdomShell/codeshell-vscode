import { CancellationToken, InlineCompletionContext, InlineCompletionItem, InlineCompletionItemProvider, InlineCompletionList, Position, ProviderResult, Range, TextDocument, window, workspace, StatusBarItem, InlineCompletionTriggerKind } from "vscode";
import { postCompletion } from "./RequestCompletion";

export class CodeShellCompletionProvider implements InlineCompletionItemProvider {

    private statusBar: StatusBarItem;

    constructor(statusBar: StatusBarItem) {
        this.statusBar = statusBar;
    }

    //@ts-ignore
    // because ASYNC and PROMISE
    public async provideInlineCompletionItems(document: TextDocument, position: Position, context: InlineCompletionContext, token: CancellationToken): ProviderResult<InlineCompletionItem[] | InlineCompletionList> {
        let autoTriggerEnabled = workspace.getConfiguration("CodeShell").get("AutoTriggerCompletion") as boolean;
        if (context.triggerKind === InlineCompletionTriggerKind.Automatic) {
            if (!autoTriggerEnabled) {
                return Promise.resolve(([] as InlineCompletionItem[]));
            }
            let delay = workspace.getConfiguration("CodeShell").get("AutoCompletionDelay") as number;
            await this.sleep(1000 * delay);
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
        const prompt = `<fim_prefix>${fimPrefixCode}<fim_suffix>${fimSuffixCode}<fim_middle>`;
        // console.debug("Requesting completion for prompt:\n", prompt);

        return postCompletion(prompt as String).then((response) => {
            this.statusBar.text = "$(light-bulb)";
            this.statusBar.tooltip = `CodeShell - Ready`;
            if (token.isCancellationRequested || !response.content) {
                return Promise.resolve(([] as InlineCompletionItem[]));
            }
            window.setStatusBarMessage(JSON.stringify(response.content));
            let text = response.content.replace("<|endoftext|>", "");
            return [new InlineCompletionItem(text, new Range(position, position))];
        }).catch((error) => {
            console.error(error);
            this.statusBar.text = "$(alert)";
            this.statusBar.tooltip = "CodeShell - Error";
            window.setStatusBarMessage(`${error}`);
            return Promise.resolve(([] as InlineCompletionItem[]));
        }).finally(() => {
        });
    }

    private getFimPrefixCode(document: TextDocument, position: Position): String | undefined {
        const firstLine = Math.max(position.line - 100, 0);
        const range = new Range(firstLine, 0, position.line, position.character);
        var text = document.getText(range);
        return text;
    }

    private getFimSuffixCode(document: TextDocument, position: Position): String | undefined {
        const startLine = position.line + 1;
        const endLine = Math.min(startLine + 100, document.lineCount);
        const range = new Range(position.line, position.character, endLine, 0);
        var text = document.getText(range);
        return text;
    }

    private isNil(value: String | undefined | null): boolean {
        return value === undefined || value === null || value.length === 0;
    }

    private sleep(milliseconds: number) {
        return new Promise(r => setTimeout(r, milliseconds));
    };

}
