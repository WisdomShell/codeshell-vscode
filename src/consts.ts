import { extensions, workspace } from "vscode";

export const EXTENSION_ID = "WisdomShell.codeshell-vscode";
export const EXTENSION_PATH = extensions.getExtension(EXTENSION_ID)?.extensionPath;


export const END_OF_TEXT = "<|endoftext|>";
export const STOP_WORDS = [END_OF_TEXT, "|<end>|", "|<end", "|end|", "## human"];


export const CODESHELL_CONFIG = workspace.getConfiguration("CodeShell");
export const SERVER_ADDR_CHAT = CODESHELL_CONFIG.get("ServerAddress");
export const SERVER_COMPLETION = CODESHELL_CONFIG.get("ServerAddress");
export const MAX_TOKENS_CHAT =  CODESHELL_CONFIG.get("ChatMaxTokens");
export const MAX_TOKENS_COMPLETION = CODESHELL_CONFIG.get("CompletionMaxTokens");
export const MODEL_ENV = CODESHELL_CONFIG.get("RunEnvForLLMs");