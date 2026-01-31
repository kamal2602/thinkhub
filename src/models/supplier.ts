import { z } from 'zod';

export const SupplierSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid(),
  name: z.string().min(1, 'Supplier name is required').max(200),
  code: z.string().optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  tax_id: z.string().max(50).optional().nullable(),
  payment_terms: z.string().max(100).optional().nullable(),
  currency: z.string().length(3, 'Currency must be 3-letter code').optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().default(true)
});

export type Supplier = z.infer<typeof SupplierSchema>;

export const CreateSupplierSchema = SupplierSchema.omit({
  id: true,
  code: true,
  is_active: true
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

export const UpdateSupplierSchema = SupplierSchema.partial().omit({
  id: true,
  company_id: true,
  code: true
});

export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;

export const SupplierImportRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional()
});

export type SupplierImportRow = z.infer<typeof SupplierImportRowSchema>;
