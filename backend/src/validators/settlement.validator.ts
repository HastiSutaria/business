import { z } from 'zod';

export const settlementSchema = z.object({
  clientId: z.string().trim().min(1, 'Client is required'),
  amount: z.number({ invalid_type_error: 'Amount is required' }).positive('Settlement amount must be greater than 0'),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE'], {
    errorMap: () => ({ message: 'Invalid payment mode' }),
  }),
  referenceNumber: z.string().trim().max(120).optional().default(''),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  remarks: z.string().trim().max(1000).optional().default(''),
});

export type SettlementInput = z.infer<typeof settlementSchema>;
