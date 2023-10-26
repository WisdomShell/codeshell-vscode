import * as vscode from 'vscode';

// load translation from MultiLanguage.json
const translations = require('../l10n/MultiLanguage.json');

function getUserLanguagePreference(): string {
    const lang = vscode.env.language;
    // const lang = vscode.workspace.getConfiguration('CodeShell').get('MultiLanguage') as string;
    if (!lang) { return 'en'; }
    return lang;
}

function translate(key: string): string {
    const userLang = getUserLanguagePreference();
    return translations[key] && translations[key][userLang] ? translations[key][userLang] : key;
}

export { translate };
