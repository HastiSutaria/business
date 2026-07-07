import axios, { AxiosError } from 'axios';
import { ApiErrorShape } from '@/types';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
});

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export class ApiRequestError extends Error {
  code: string;
  details?: unknown;
  status?: number;

  constructor(shape: ApiErrorShape, status?: number) {
    super(shape.message);
    this.code = shape.code;
    this.details = shape.details;
    this.status = status;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: ApiErrorShape }>) => {
    const shape = error.response?.data?.error ?? { message: error.message, code: 'NETWORK_ERROR' };
    return Promise.reject(new ApiRequestError(shape, error.response?.status));
  }
);

export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}
