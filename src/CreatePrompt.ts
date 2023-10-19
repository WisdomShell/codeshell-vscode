export function createPromptCodeExplain(language: string, functionCode: string): string {
	return `请解释以下${language}代码：\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCodeImprove(language: string, functionCode: string): string {
	return `请优化并重写以下${language}代码：\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCodeClean(language: string, functionCode: string): string {
	return `请清理并重写以下${language}代码：\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptGenerateComment(language: string, functionCode: string): string {
	return `请为以下${language}代码生成注释：\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptGenerateUnitTest(language: string, functionCode: string): string {
	return `请为以下${language}代码生成单元测试：\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCheckPerformance(language: string, functionCode: string): string {
	return `检查以下${language}代码，是否存在性能问题，请给出优化建议：\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}

export function createPromptCheckSecurity(language: string, functionCode: string): string {
	return `检查以下${language}代码，是否存在安全性问题，请给出优化建议：\n\`\`\`${language}\n${functionCode}\n\`\`\`\n`;
}