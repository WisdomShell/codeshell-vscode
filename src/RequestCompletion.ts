/* eslint-disable */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { l10n } from "vscode";
import { END_OF_TEXT, MAX_TOKENS_COMPLETION, MODEL_ENV, SERVER_COMPLETION, STOP_WORDS } from "./consts";
export interface CompletionResponse {
    "generated_text"?: string;
}

export async function postCompletion(fimPrefixCode: string, fimSuffixCode: string): Promise<string | undefined> {
    if ("CPU with llama.cpp" == MODEL_ENV) {
        let data = {
            "input_prefix": fimPrefixCode, "input_suffix": fimSuffixCode,
            "n_predict": MAX_TOKENS_COMPLETION, "temperature": 0.2, "repetition_penalty": 1.0, "top_k": 10, "top_p": 0.95,
            "stop": STOP_WORDS
        };
        console.debug("request.data:", data)
        const response = await axiosInstance.post(SERVER_COMPLETION + "/infill", data);
        var content = "";
        const respData = response.data as string;
        const dataList = respData.split("\n\n");
        for (var chunk of dataList) {
            if (chunk.startsWith("data:")) {
                content += JSON.parse(chunk.substring(5)).content
            }
        }
        console.debug("response.data:", content)
        return content.replace(END_OF_TEXT, "");
    }
    if ("GPU with TGI toolkit" == MODEL_ENV) {
        const prompt = `<fim_prefix>${fimPrefixCode}<fim_suffix>${fimSuffixCode}<fim_middle>`;
        let data = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": MAX_TOKENS_COMPLETION, "temperature": 0.2, "repetition_penalty": 1.2, "top_p": 0.99, "do_sample": true,
                "stop": STOP_WORDS
            }
        };
        console.debug("request.data:", data)
        const uri = "/generate"
        // const uri = "/codeshell-code/completion"
        const response = await axiosInstance.post<CompletionResponse>(SERVER_COMPLETION + uri, data);
        console.debug("response.data:", response.data)
        return response.data.generated_text?.replace(END_OF_TEXT, "");
    }
}

const axiosInstance: AxiosInstance = axios.create({
    timeout: 60000,
    timeoutErrorMessage: l10n.t("Request timeout, please try again later")
});

axiosInstance.interceptors.request.use(
    (config: AxiosRequestConfig) => {
        return config;
    },
    (error: any) => {
        return Promise.reject(error);
    },
);

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error: any) => {
        return Promise.reject(error);
    },
);