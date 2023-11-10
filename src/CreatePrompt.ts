import { translate } from "./LanguageHelper";

export function createPromptCodeExplain(language: string, functionCode: string): string {
	return `${translate("explain")} ${language} ${translate("code")}：\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCodeImprove(language: string, functionCode: string): string {
	return `${translate("optimize_rewrite")} ${language} ${translate("code")}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCodeClean(language: string, functionCode: string): string {
	return `${translate("clean_up")} ${language} ${translate("code")}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptGenerateComment(language: string, functionCode: string): string {
	return `${translate("following")} ${language} ${translate("comment")}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptGenerateUnitTest(language: string, functionCode: string): string {
	return `${translate("following")} ${language} ${translate("unit_test")}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCheckPerformance(language: string, functionCode: string): string {
	return `${translate("check")} ${language} ${translate("code")}${translate("performance_issue")}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCheckSecurity(language: string, functionCode: string): string {
	return `${translate("check")} ${language} ${translate("code")}${translate("security_issue")}\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}