import { z } from 'zod';

export const transactionSchema = z.object({
  clientId: z.string().trim().min(1, 'Client is required'),
  metal: z.enum(['GOLD', 'SILVER'], { errorMap: () => ({ message: 'Metal must be GOLD or SILVER' }) }),
  type: z.enum(['BUY', 'SELL'], { errorMap: () => ({ message: 'Type must be BUY or SELL' }) }),
  quantity: z.number({ invalid_type_error: 'Quantity is required' }).positive('Quantity must be greater than 0'),
  rate: z.number({ invalid_type_error: 'Rate is required' }).positive('Rate must be greater than 0'),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
  remarks: z.string().trim().max(1000).optional().default(''),
  createdBy: z.string().trim().max(120).optional().default('Admin'),
});

export const transactionUpdateSchema = transactionSchema.partial();

export const transactionBulkSchema = transactionSchema
  .omit({ quantity: true, rate: true })
  .extend({
    rows: z
      .array(
        z.object({
          quantity: z.number({ invalid_type_error: 'Quantity is required' }).positive('Quantity must be greater than 0'),
          rate: z.number({ invalid_type_error: 'Rate is required' }).positive('Rate must be greater than 0'),
        })
      )
      .min(1, 'At least one row is required'),
  });

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type TransactionBulkInput = z.infer<typeof transactionBulkSchema>;
