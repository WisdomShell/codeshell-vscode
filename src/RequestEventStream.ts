/* eslint-disable */
import { FetchStream } from "./FetchStream";
import { MAX_TOKENS_CHAT, MODEL_ENV, SERVER_ADDR_CHAT, STOP_WORDS } from "./consts";


let abortController = new AbortController();

export async function stopEventStream() {
    abortController.abort();
}

export async function postEventStream(prompt: string, msgCallback: (data: string) => any, doneCallback: () => void, errorCallback: (err: any) => void) {
    var uri = "";
    var body = {};
    if ("CPU with llama.cpp" == MODEL_ENV) {
        uri = "/completion"
        body = {
            "prompt": "|<end>|" + prompt, "n_predict": MAX_TOKENS_CHAT,
            "temperature": 0.8, "repetition_penalty": 1.2, "top_k": 40, "top_p": 0.95, "stream": true,
            "stop": STOP_WORDS
        };
    }
    if ("GPU with TGI toolkit" == MODEL_ENV) {
        uri = "/generate_stream"
        // uri = "/codeshell-code/assistants"
        body = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": MAX_TOKENS_CHAT,
                "temperature": 0.6, "repetition_penalty": 1.2, "top_p": 0.95, "do_sample": true,
                "stop": STOP_WORDS
            }
        };
    }
    abortController = new AbortController();
    new FetchStream({
        url: SERVER_ADDR_CHAT + uri,
        requestInit: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: abortController.signal
        },
        onmessage: msgCallback,
        ondone: doneCallback,
        onerror: errorCallback
    });

}