import axios, { type AxiosResponse } from "axios";
import endpoint from './endpoints-config';

const apiClient = axios.create({
    baseURL: endpoint.API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiRequest = async <T>(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: any): Promise<T> => {
    const response: AxiosResponse<T> = await apiClient({
        method,
        url,
        data,
    });

    return response.data;
};