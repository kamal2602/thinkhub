import { z } from 'zod';

export const SalesInvoiceItemSchema = z.object({
  id: z.string().uuid().optional(),
  sales_invoice_id: z.string().uuid().optional(),
  asset_id: z.string().uuid().optional().nullable(),
  component_sale_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  tax_rate: z.number().min(0).max(100).optional().nullable(),
  discount_rate: z.number().min(0).max(100).optional().nullable(),
  total_price: z.number().min(0)
});

export type SalesInvoiceItem = z.infer<typeof SalesInvoiceItemSchema>;

export const SalesInvoiceSchema = z.object({
  id: z.string().uuid().optional(),
  invoice_number: z.string().optional(),
  customer_id: z.string().uuid('Invalid customer ID'),
  company_id: z.string().uuid(),
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'void', 'overdue']).default('draft'),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().nullable(),
  subtotal: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  amount_paid: z.number().min(0).default(0),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(1000).optional().nullable(),
  items: z.array(SalesInvoiceItemSchema).min(1, 'At least one item is required')
});

export type SalesInvoice = z.infer<typeof SalesInvoiceSchema>;

export const CreateSalesInvoiceSchema = SalesInvoiceSchema.omit({
  id: true,
  invoice_number: true,
  status: true,
  subtotal: true,
  tax_amount: true,
  discount_amount: true,
  total_amount: true,
  amount_paid: true
});

export type CreateSalesInvoiceInput = z.infer<typeof CreateSalesInvoiceSchema>;

export const UpdateSalesInvoiceSchema = SalesInvoiceSchema.partial().omit({
  id: true,
  company_id: true,
  invoice_number: true
});

export type UpdateSalesInvoiceInput = z.infer<typeof UpdateSalesInvoiceSchema>;

export const PaymentRecordSchema = z.object({
  amount: z.number().min(0.01, 'Payment amount must be positive'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  payment_method: z.string().min(1, 'Payment method is required'),
  reference_number: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;
