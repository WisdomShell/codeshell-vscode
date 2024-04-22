import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { l10n } from "vscode";

export interface RequestData {
    uri: string;
    body: any;
}

export const axiosInstance: AxiosInstance = axios.create({
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