/* eslint-disable */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { workspace } from "vscode";

export interface CompletionResponse {
    "content"?: string;
}

export async function postCompletion(prompt: String): Promise<CompletionResponse> {
    let maxtokens = workspace.getConfiguration("CodeShell").get("CompletionMaxTokens") as number;
    let data = {
        "prompt": "|<end>|" + prompt,
        "temperature": 0.2,
        "frequency_penalty": 1.2,
        "stream": false,
        "stop": ["|<end>|"],
        "n_predict": maxtokens
    };
    const response = await axiosInstance.post<CompletionResponse>("/completion", data);
    return response.data;
}

const axiosInstance: AxiosInstance = axios.create({
    baseURL: workspace.getConfiguration("CodeShell").get("ServerAddress"),
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