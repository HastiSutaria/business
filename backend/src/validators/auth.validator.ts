import { z } from 'zod';

export const loginSchema = z.object({
  loginId: z.string().trim().min(1, 'Login ID is required').max(64),
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
