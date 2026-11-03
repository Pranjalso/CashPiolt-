import { z } from 'zod';

const money = z.coerce.number().positive().multipleOf(0.01, 'Max 2 decimals');
const id = z.coerce.number().int().positive();
const optId = z.union([id, z.literal(''), z.null()]).optional().transform(v => (v ? Number(v) : null));
const optStr = z.string().trim().optional().nullable().transform(v => (v ? v : null));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const BUSINESS_TYPES = ['RETAIL', 'RESTAURANT', 'MANUFACTURING', 'TRADING', 'SERVICES', 'IT_SOFTWARE', 'CONSTRUCTION',
  'HEALTHCARE', 'EDUCATION', 'TRANSPORT', 'AGRICULTURE', 'FREELANCER', 'NGO', 'OTHER'] as const;
export const MODES = ['CASH', 'UPI', 'BANK', 'CARD', 'CHEQUE', 'OTHER'] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2), email: z.string().email(), phone: optStr, password: z.string().min(8),
  business_name: z.string().trim().min(2), business_type: z.enum(BUSINESS_TYPES),
});
export const businessSchema = z.object({
  name: z.string().trim().min(2), business_type: z.enum(BUSINESS_TYPES), currency: z.string().length(3).default('INR'),
  gstin: optStr, fy_start_month: z.coerce.number().int().min(1).max(12).default(4),
  low_cash_alert: z.coerce.number().min(0).default(0),
});
export const memberSchema = z.object({
  email: z.string().email(), name: z.string().trim().optional(), password: z.string().min(8).optional(),
  role: z.enum(['OWNER', 'ACCOUNTANT', 'EMPLOYEE', 'VIEWER']),
});
export const accountSchema = z.object({
  name: z.string().trim().min(1), type: z.enum(['CASH', 'BANK', 'UPI_WALLET', 'CREDIT_CARD', 'LOAN']),
  bank_name: optStr, account_no_last4: z.string().regex(/^\d{4}$/).optional().nullable().or(z.literal('')).transform(v => v || null),
  opening_balance: z.coerce.number().default(0), opening_date: date.optional(), active: z.coerce.boolean().default(true),
});
export const categorySchema = z.object({
  name: z.string().trim().min(1), direction: z.enum(['IN', 'OUT']),
  activity: z.enum(['OPERATING', 'INVESTING', 'FINANCING']).default('OPERATING'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3B4FE0'), active: z.coerce.boolean().default(true),
});
export const partySchema = z.object({
  name: z.string().trim().min(1), kind: z.enum(['CUSTOMER', 'VENDOR', 'EMPLOYEE', 'LENDER', 'BOTH']).default('BOTH'),
  phone: optStr, email: optStr, gstin: optStr,
});
export const txnSchema = z.object({
  txn_date: date, direction: z.enum(['IN', 'OUT']), amount: money, account_id: id, category_id: id,
  party_id: optId, payment_mode: z.enum(MODES).default('CASH'), reference: optStr, notes: optStr,
});
export const transferSchema = z.object({
  txn_date: date, amount: money, from_account_id: id, to_account_id: id, reference: optStr, notes: optStr,
}).refine(d => d.from_account_id !== d.to_account_id, 'Choose two different accounts');
export const dueSchema = z.object({
  kind: z.enum(['RECEIVABLE', 'PAYABLE']), party_id: optId, category_id: optId, doc_no: optStr, description: optStr,
  amount: money, issue_date: date, due_date: date,
}).refine(d => d.due_date >= d.issue_date, 'Due date cannot be before issue date');
export const settleSchema = z.object({
  amount: money, txn_date: date, account_id: id, payment_mode: z.enum(MODES).default('BANK'), reference: optStr,
});
export const recurringSchema = z.object({
  title: z.string().trim().min(1), direction: z.enum(['IN', 'OUT']), amount: money, account_id: id, category_id: id,
  party_id: optId, frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']), next_date: date,
  end_date: date.optional().nullable().or(z.literal('')).transform(v => v || null),
  auto_post: z.coerce.boolean().default(true), active: z.coerce.boolean().default(true),
});
export const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM'),
  items: z.array(z.object({ category_id: id, amount: z.coerce.number().min(0) })),
});
const RECEIPT_MAX = 2_800_000; // ~2 MB image as base64 data URL
export const claimSchema = z.object({
  title: z.string().trim().min(2),
  items: z.array(z.object({
    expense_date: date, category_id: id, description: z.string().trim().min(1), amount: money,
    receipt_url: z.string().max(RECEIPT_MAX, 'Receipt too large (max ~2 MB)').optional().nullable(),
    receipt_mime: optStr,
  })).min(1, 'Add at least one expense'),
  submit: z.coerce.boolean().default(false),
});
export const reviewSchema = z.object({ approved_amount: z.coerce.number().positive().optional(), note: optStr });
export const claimPaySchema = z.object({ account_id: id, payment_mode: z.enum(MODES).default('BANK'), reference: optStr, txn_date: date.optional() });
