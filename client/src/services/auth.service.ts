import { apiClient, unwrap } from './apiClient';
import { LoginResponse } from '@/types';

export const authApi = {
  login: (loginId: string, password: string) =>
    unwrap<LoginResponse>(apiClient.post('/auth/login', { loginId, password })),
  me: () => unwrap<{ loginId: string }>(apiClient.get('/auth/me')),
};
