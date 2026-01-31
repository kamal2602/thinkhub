import { z } from 'zod';

export const CreateAssetSchema = z.object({
  company_id: z.string().uuid('Invalid company ID'),
  serial_number: z.string()
    .min(1, 'Serial number is required')
    .max(100, 'Serial number too long')
    .trim(),
  brand: z.string()
    .min(1, 'Brand is required')
    .trim(),
  model: z.string()
    .min(1, 'Model is required')
    .trim(),
  product_type_id: z.string().uuid('Invalid product type'),
  purchase_price: z.number()
    .min(0, 'Price must be positive')
    .optional()
    .nullable(),
  cosmetic_grade: z.string().optional().nullable(),
  functional_status: z.string().optional().nullable(),
  status: z.string().optional().default('received'),
  processing_stage: z.string().optional().nullable(),
  cpu: z.string().trim().optional().nullable(),
  ram: z.string().trim().optional().nullable(),
  storage: z.string().trim().optional().nullable(),
  screen_size: z.string().trim().optional().nullable(),
  purchase_lot_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  processing_notes: z.string().max(1000).optional().nullable(),
  refurbishment_cost: z.number().min(0).optional().nullable(),
  sale_price: z.number().min(0).optional().nullable()
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;

export const UpdateAssetSchema = CreateAssetSchema.partial().omit({
  company_id: true
});

export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;

export const BulkImportRowSchema = z.object({
  serial_number: z.string().min(1, 'Serial number required'),
  brand: z.string().min(1, 'Brand required'),
  model: z.string().min(1, 'Model required'),
  product_type: z.string().min(1, 'Product type required'),
  purchase_price: z.union([
    z.string().refine(val => !isNaN(parseFloat(val)), 'Invalid price').transform(val => parseFloat(val)),
    z.number()
  ]).optional(),
  quantity: z.union([
    z.string().refine(val => !isNaN(parseInt(val)), 'Invalid quantity').transform(val => parseInt(val)),
    z.number()
  ]).refine(val => val > 0, 'Quantity must be positive').optional().default(1),
  cosmetic_grade: z.string().optional(),
  functional_status: z.string().optional(),
  cpu: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  screen_size: z.string().optional(),
  condition: z.string().optional(),
  notes: z.string().optional()
});

export type BulkImportRow = z.infer<typeof BulkImportRowSchema>;

export const PurchaseOrderLineSchema = z.object({
  product_type: z.string().min(1, 'Product type required'),
  brand: z.string().min(1, 'Brand required'),
  model: z.string().min(1, 'Model required'),
  serial_number: z.string().optional(),
  quantity: z.union([
    z.string().refine(val => !isNaN(parseInt(val)), 'Invalid quantity').transform(val => parseInt(val)),
    z.number()
  ]).refine(val => val > 0, 'Quantity must be positive'),
  unit_price: z.union([
    z.string().refine(val => !isNaN(parseFloat(val)), 'Invalid price').transform(val => parseFloat(val)),
    z.number()
  ]).refine(val => val >= 0, 'Price must be positive'),
  specifications: z.record(z.string()).optional()
});

export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLineSchema>;
