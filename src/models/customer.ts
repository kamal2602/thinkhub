import { z } from 'zod';

export const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid(),
  name: z.string().min(1, 'Customer name is required').max(200),
  code: z.string().optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  billing_address: z.string().max(500).optional().nullable(),
  billing_city: z.string().max(100).optional().nullable(),
  billing_state: z.string().max(100).optional().nullable(),
  billing_postal_code: z.string().max(20).optional().nullable(),
  billing_country: z.string().max(100).optional().nullable(),
  shipping_address: z.string().max(500).optional().nullable(),
  shipping_city: z.string().max(100).optional().nullable(),
  shipping_state: z.string().max(100).optional().nullable(),
  shipping_postal_code: z.string().max(20).optional().nullable(),
  shipping_country: z.string().max(100).optional().nullable(),
  tax_id: z.string().max(50).optional().nullable(),
  payment_terms: z.string().max(100).optional().nullable(),
  credit_limit: z.number().min(0).optional().nullable(),
  currency: z.string().length(3, 'Currency must be 3-letter code').optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  customer_type: z.string().max(50).optional().nullable(),
  is_active: z.boolean().default(true)
});

export type Customer = z.infer<typeof CustomerSchema>;

export const CreateCustomerSchema = CustomerSchema.omit({
  id: true,
  code: true,
  is_active: true
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CustomerSchema.partial().omit({
  id: true,
  company_id: true,
  code: true
});

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const CustomerImportRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_country: z.string().optional(),
  shipping_address: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_country: z.string().optional(),
  payment_terms: z.string().optional(),
  customer_type: z.string().optional(),
  notes: z.string().optional()
});

export type CustomerImportRow = z.infer<typeof CustomerImportRowSchema>;
