import { z } from 'zod';

export const createUrlSchema = z.object({
  url: z.string().url('Please provide a valid URL (including http:// or https://)'),
});

export type CreateUrlInput = z.infer<typeof createUrlSchema>;
