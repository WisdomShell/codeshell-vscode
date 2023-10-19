/* eslint-disable */
import { workspace } from "vscode";
import { FetchStream } from "./FetchStream";
import AbortController from "abort-controller";

let abortController = new AbortController();

export async function stopEventStream() {
    abortController.abort();
}

export async function postEventStream(prompt: string, msgCallback: (data: string) => any, doneCallback: () => void, errorCallback: (err: any) => void) {
    let maxtokens = workspace.getConfiguration("CodeShell").get("ChatMaxTokens") as number;
    let body = {
        "prompt": "|<end>|" + prompt,
        "temperature": 0.2,
        "frequency_penalty": 1.2,
        "stream": true,
        "stop": ["|<end>|"],
        "n_predict": maxtokens
    };
    let jsonBody = JSON.stringify(body);

    let address = workspace.getConfiguration("CodeShell").get("ServerAddress") as string;
    abortController = new AbortController();
    new FetchStream({
        url: address + "/completion",
        requestInit: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: jsonBody,
            signal: abortController.signal
        },
        onmessage: msgCallback,
        ondone: doneCallback,
        onerror: errorCallback
    });

}