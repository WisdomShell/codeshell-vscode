// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { CodeShellCompletionProvider } from "./CodeShellCompletionProvider";
import { CodeShellWebviewViewProvider } from "./CodeShellWebviewViewProvider";
import { translate } from "./LanguageHelper";
import { CODESHELL_CONFIG } from "./consts";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	registerCompleteionExtension(context);
	registerWebviewViewExtension(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }


function registerWebviewViewExtension(context: vscode.ExtensionContext) {
	const provider = new CodeShellWebviewViewProvider(context);

	// Register the provider with the extension's context

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CodeShellWebviewViewProvider.viewId, provider, {
			webviewOptions: { retainContextWhenHidden: true }
		}),
		vscode.commands.registerCommand("codeshell.explain_this_code", () => provider.executeCommand("codeshell.explain_this_code")),
		vscode.commands.registerCommand("codeshell.improve_this_code", () => provider.executeCommand("codeshell.improve_this_code")),
		vscode.commands.registerCommand("codeshell.clean_this_code", () => provider.executeCommand("codeshell.clean_this_code")),
		vscode.commands.registerCommand("codeshell.generate_comment", () => provider.executeCommand("codeshell.generate_comment")),
		vscode.commands.registerCommand("codeshell.generate_unit_test", () => provider.executeCommand("codeshell.generate_unit_test")),
		vscode.commands.registerCommand("codeshell.check_performance", () => provider.executeCommand("codeshell.check_performance")),
		vscode.commands.registerCommand("codeshell.check_security", () => provider.executeCommand("codeshell.check_security")),
	);
}

function registerCompleteionExtension(context: vscode.ExtensionContext) {
	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	statusBar.text = "$(lightbulb)";
	statusBar.tooltip = `CodeShell - Ready`;

	const completionStatusCallback = (enabled: boolean) => async () => {
		const configuration = vscode.workspace.getConfiguration();
		const target = vscode.ConfigurationTarget.Global;
		configuration.update("CodeShell.AutoTriggerCompletion", enabled, target, false).then(console.error);
		var msg = enabled ? translate("auto_completion") : translate("disable_auto_completion");
		vscode.window.showInformationMessage(msg);
		statusBar.show();
	};

	context.subscriptions.push(
		vscode.languages.registerInlineCompletionItemProvider(
			{ pattern: "**" }, new CodeShellCompletionProvider(statusBar)
		),

		vscode.commands.registerCommand("codeshell.auto_completion_enable", completionStatusCallback(true)),
		vscode.commands.registerCommand("codeshell.auto_completion_disable", completionStatusCallback(false)),
		statusBar
	);

	if (CODESHELL_CONFIG.get("AutoTriggerCompletion")) {
		vscode.commands.executeCommand("codeshell.auto_completion_enable");
	} else {
		vscode.commands.executeCommand("codeshell.auto_completion_disable");
	}
}

