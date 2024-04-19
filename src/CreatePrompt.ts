import { l10n } from "vscode";
export function createPromptCodeExplain(language: string, functionCode: string): string {
	return `${l10n.t("Please explain the following {0} code", language)} \n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCodeImprove(language: string, functionCode: string): string {
	return `${l10n.t("Please optimize and rewrite the following {0} code", language)}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCodeClean(language: string, functionCode: string): string {
	return `${l10n.t("Please clean and rewrite the following {0} code", language)}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptGenerateComment(language: string, functionCode: string): string {
	return `${l10n.t("Please generate comments for the following {0} code", language)}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptGenerateUnitTest(language: string, functionCode: string): string {
	return `${l10n.t("Please generate unit tests for the following {0} code", language)}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCheckPerformance(language: string, functionCode: string): string {
	return `${l10n.t("Check the following {0} code for any performance issues, and please provide optimization suggestions", language)}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCheckSecurity(language: string, functionCode: string): string {
	return `${l10n.t("Check the following {0} code for any security issues, and please provide optimization suggestions", language)}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}
export function createPromptAskingQuestion(language: string, functionCode: string, inputText: string,): string {
	return `${inputText}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}
