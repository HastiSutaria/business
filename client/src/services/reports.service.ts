import { apiClient, unwrap } from './apiClient';
import { ClientReport, DashboardStats, MetalReport, ProfitReport } from '@/types';

export type ReportPreset = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year';

export interface ReportRangeParams {
  preset?: ReportPreset;
  from?: string;
  to?: string;
}

export const reportsApi = {
  dashboard: () => unwrap<DashboardStats>(apiClient.get('/reports/dashboard')),
  profit: (params?: ReportRangeParams) => unwrap<ProfitReport>(apiClient.get('/reports/profit', { params })),
  metal: (params?: ReportRangeParams) => unwrap<MetalReport>(apiClient.get('/reports/metal', { params })),
  client: (id: string, params?: ReportRangeParams) =>
    unwrap<ClientReport>(apiClient.get(`/reports/client/${id}`, { params })),
};
