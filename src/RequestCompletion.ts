/* eslint-disable */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { workspace } from "vscode";

export interface CompletionResponse {
    "generated_text"?: string;
}

export async function postCompletion(fimPrefixCode: string, fimSuffixCode: string): Promise<string | undefined> {
    const serverAddress = workspace.getConfiguration("CodeShell").get("ServerAddress") as string;
    let maxtokens = workspace.getConfiguration("CodeShell").get("CompletionMaxTokens") as number;

    const modelEnv = workspace.getConfiguration("CodeShell").get("RunEnvForLLMs") as string;
    if ("CPU with llama.cpp" == modelEnv) {
        let data = {
            "input_prefix": fimPrefixCode, "input_suffix": fimSuffixCode,
            "n_predict": maxtokens, "temperature": 0.2, "repetition_penalty": 1.0, "top_k": 10, "top_p": 0.95,
            "stop": ["|<end>|", "|end|", "<|endoftext|>", "## human"]
        };
        console.debug("request.data:", data)
        const response = await axiosInstance.post(serverAddress + "/infill", data);
        var content = "";
        const respData = response.data as string;
        const dataList = respData.split("\n\n");
        for (var chunk of dataList) {
            if (chunk.startsWith("data:")) {
                content += JSON.parse(chunk.substring(5)).content
            }
        }
        console.debug("response.data:", content)
        return content.replace("<|endoftext|>", "");
    }
    if ("GPU with TGI toolkit" == modelEnv) {
        const prompt = `<fim_prefix>${fimPrefixCode}<fim_suffix>${fimSuffixCode}<fim_middle>`;
        let data = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": maxtokens, "temperature": 0.2, "repetition_penalty": 1.2, "top_p": 0.99, "do_sample": true,
                "stop": ["|<end>|", "|end|", "<|endoftext|>", "## human"]
            }
        };
        console.debug("request.data:", data)
        const uri = "/generate"
        // const uri = "/codeshell-code/completion"
        const response = await axiosInstance.post<CompletionResponse>(serverAddress + uri, data);
        console.debug("response.data:", response.data)
        return response.data.generated_text?.replace("<|endoftext|>", "");
    }
}

const axiosInstance: AxiosInstance = axios.create({
    timeout: 60000,
    timeoutErrorMessage: "请求超时，请稍后重试。"
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