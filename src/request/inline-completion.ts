/* eslint-disable @typescript-eslint/naming-convention */
import { END_OF_TEXT, MAX_TOKENS_COMPLETION, MODEL_ENV, SERVER_COMPLETION, STOP_WORDS } from "../consts";
import { RequestData, axiosInstance } from "./commons";

interface GenerateResponse {
    generated_text: string;
}

function getRequestDataCPU(fimPrefixCode: string, fimSuffixCode: string): RequestData {
    return {
        uri: "/infill",
        body: {
            "input_prefix": fimPrefixCode,
            "input_suffix": fimSuffixCode,
            "n_predict": MAX_TOKENS_COMPLETION,
            "temperature": 0.2,
            "repetition_penalty": 1.0,
            "top_k": 10,
            "top_p": 0.95,
            "stop": STOP_WORDS
        }
    };
}

function getRequestDataGPU(fimPrefixCode: string, fimSuffixCode: string): RequestData {
    const prompt = `<fim_prefix>${fimPrefixCode}<fim_suffix>${fimSuffixCode}<fim_middle>`;
    return {
        uri: "/generate",
        // uri: "/codeshell-code/completion",
        body: {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": MAX_TOKENS_COMPLETION,
                "temperature": 0.2,
                "repetition_penalty": 1.2,
                "top_p": 0.99,
                "do_sample": true,
                "stop": STOP_WORDS
            }
        }
    };
}

export async function postCompletion(fimPrefixCode: string, fimSuffixCode: string): Promise<string | undefined> {
    if ("CPU with llama.cpp" === MODEL_ENV) {
        const requestData = getRequestDataCPU(fimPrefixCode, fimSuffixCode);
        const response = await axiosInstance.post(SERVER_COMPLETION + requestData.uri, requestData.body);
        const content = extractContent(response.data);
        console.debug("response.data:", content);
        return content.replace(END_OF_TEXT, "");
    }
    if ("GPU with TGI toolkit" === MODEL_ENV) {
        const requestData = getRequestDataGPU(fimPrefixCode, fimSuffixCode);
        const response = await axiosInstance.post<GenerateResponse>(SERVER_COMPLETION + requestData.uri, requestData.body);
        console.debug("response.data:", response.data);
        return response.data.generated_text?.replace(END_OF_TEXT, "");
    }
}

function extractContent(responseData: string): string {
    let content = "";
    const dataList = responseData.split("\n\n");
    for (const chunk of dataList) {
        if (chunk.startsWith("data:")) {
            content += JSON.parse(chunk.substring(5)).content;
        }
    }
    return content;
}
