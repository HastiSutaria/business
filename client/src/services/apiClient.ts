import axios, { AxiosError } from 'axios';
import { ApiErrorShape } from '@/types';
import { clearAuthSession, readAuthSession } from '@/utils/authStorage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const session = readAuthSession();
  if (session) {
    config.headers.set('Authorization', `Bearer ${session.token}`);
  }
  return config;
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

    if (error.response?.status === 401 && !error.config?.url?.endsWith('/auth/login')) {
      clearAuthSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(new ApiRequestError(shape, error.response?.status));
  }
);

export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}
