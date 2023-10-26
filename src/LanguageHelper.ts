import * as vscode from 'vscode';

// load translation from MultiLanguage.json
const translations = require('../l10n/MultiLanguage.json');

function getUserLanguagePreference(): string {
    const lang = vscode.workspace.getConfiguration('CodeShell').get('MultiLanguage') as string;
    return lang === 'English' ? 'en' : 'cn';
}

function translate(key: string): string{
    const userLang = getUserLanguagePreference();
    return translations[key] && translations[key][userLang] ? translations[key][userLang] : key;
}

export {translate};
