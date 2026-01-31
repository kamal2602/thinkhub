import { z } from 'zod';

export const PurchaseOrderLineItemSchema = z.object({
  id: z.string().uuid().optional(),
  purchase_order_id: z.string().uuid().optional(),
  product_type_id: z.string().uuid('Invalid product type'),
  serial_number: z.string().max(100).optional().nullable(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  total_price: z.number().min(0),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(200).optional().nullable(),
  condition: z.string().max(100).optional().nullable(),
  specifications: z.record(z.string()).optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});

export type PurchaseOrderLineItem = z.infer<typeof PurchaseOrderLineItemSchema>;

export const PurchaseOrderSchema = z.object({
  id: z.string().uuid().optional(),
  po_number: z.string().optional(),
  supplier_id: z.string().uuid('Invalid supplier ID'),
  company_id: z.string().uuid(),
  status: z.enum(['draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled']).default('draft'),
  total_amount: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  expected_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lines: z.array(PurchaseOrderLineItemSchema).min(1, 'At least one line item is required')
});

export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

export const CreatePurchaseOrderSchema = PurchaseOrderSchema.omit({
  id: true,
  po_number: true,
  status: true,
  total_amount: true
});

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;

export const UpdatePurchaseOrderSchema = PurchaseOrderSchema.partial().omit({
  id: true,
  company_id: true,
  po_number: true
});

export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderSchema>;

export const ReceivingItemSchema = z.object({
  purchase_order_line_id: z.string().uuid(),
  serial_number: z.string().min(1, 'Serial number is required'),
  condition: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
});

export type ReceivingItem = z.infer<typeof ReceivingItemSchema>;
