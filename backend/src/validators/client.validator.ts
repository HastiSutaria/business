import { z } from 'zod';

export const clientSchema = z.object({
  clientName: z.string().trim().min(1, 'Client name is required').max(120),
  businessName: z.string().trim().max(120).optional().default(''),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, 'Enter a valid mobile number')
    .optional()
    .or(z.literal(''))
    .transform((v) => v ?? ''),
  address: z.string().trim().max(500).optional().default(''),
  gst: z
    .string()
    .trim()
    .regex(/^[0-9A-Z]{15}$/i, 'Enter a valid 15-character GST number')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  openingBalance: z.number().finite().default(0),
  notes: z.string().trim().max(1000).optional().default(''),
});

export const clientUpdateSchema = clientSchema.partial();

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
