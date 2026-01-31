import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Full name is required').max(200).optional().nullable(),
  role: z.enum(['admin', 'processor', 'sales', 'warehouse', 'viewer']),
  company_id: z.string().uuid().optional().nullable(),
  is_super_admin: z.boolean().default(false),
  is_active: z.boolean().default(true),
  phone: z.string().max(50).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  job_title: z.string().max(100).optional().nullable()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z.string().min(1, 'Full name is required').max(200),
  role: z.enum(['admin', 'processor', 'sales', 'warehouse', 'viewer']),
  company_id: z.string().uuid().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  job_title: z.string().max(100).optional().nullable()
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = UserProfileSchema.partial().omit({
  id: true,
  email: true,
  is_super_admin: true
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'processor', 'sales', 'warehouse', 'viewer']),
  full_name: z.string().min(1, 'Full name is required').max(200).optional(),
  department: z.string().max(100).optional(),
  job_title: z.string().max(100).optional()
});

export type InviteUserInput = z.infer<typeof InviteUserSchema>;
