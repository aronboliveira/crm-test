/**
 * SAT ERP API Types
 *
 * Type definitions for SAT ERP REST API responses and requests.
 * SAT is a Brazilian ERP system for financial and inventory management.
 *
 * @remarks
 * Based on typical SAT ERP API structures.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Invoice status codes used by SAT */
export const SAT_INVOICE_STATUS = {
  DRAFT: 0,
  PENDING: 1,
  APPROVED: 2,
  SENT: 3,
  PAID: 4,
  PARTIAL: 5,
  OVERDUE: 6,
  CANCELLED: 7,
  REFUNDED: 8,
} as const;

export type SatInvoiceStatus =
  (typeof SAT_INVOICE_STATUS)[keyof typeof SAT_INVOICE_STATUS];

/** Order status codes */
export const SAT_ORDER_STATUS = {
  QUOTE: 0,
  CONFIRMED: 1,
  IN_PROGRESS: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  COMPLETED: 5,
  CANCELLED: 6,
} as const;

export type SatOrderStatus =
  (typeof SAT_ORDER_STATUS)[keyof typeof SAT_ORDER_STATUS];

/** Payment methods */
export const SAT_PAYMENT_METHODS = {
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  PIX: 'pix',
  BOLETO: 'boleto',
  CHECK: 'check',
} as const;

export type SatPaymentMethod =
  (typeof SAT_PAYMENT_METHODS)[keyof typeof SAT_PAYMENT_METHODS];

/** Tax regimes */
export const SAT_TAX_REGIMES = {
  SIMPLE_NATIONAL: 'simples_nacional',
  PRESUMED_PROFIT: 'lucro_presumido',
  REAL_PROFIT: 'lucro_real',
  MEI: 'mei',
} as const;

export type SatTaxRegime =
  (typeof SAT_TAX_REGIMES)[keyof typeof SAT_TAX_REGIMES];

// =============================================================================
// STATUS MAPS
// =============================================================================

/** Maps SAT invoice status to CRM-friendly strings */
export const SAT_INVOICE_STATUS_MAP: Record<SatInvoiceStatus, string> = {
  [SAT_INVOICE_STATUS.DRAFT]: 'draft',
  [SAT_INVOICE_STATUS.PENDING]: 'pending',
  [SAT_INVOICE_STATUS.APPROVED]: 'approved',
  [SAT_INVOICE_STATUS.SENT]: 'sent',
  [SAT_INVOICE_STATUS.PAID]: 'paid',
  [SAT_INVOICE_STATUS.PARTIAL]: 'partial',
  [SAT_INVOICE_STATUS.OVERDUE]: 'overdue',
  [SAT_INVOICE_STATUS.CANCELLED]: 'cancelled',
  [SAT_INVOICE_STATUS.REFUNDED]: 'refunded',
};

/** Maps SAT order status to CRM-friendly strings */
export const SAT_ORDER_STATUS_MAP: Record<SatOrderStatus, string> = {
  [SAT_ORDER_STATUS.QUOTE]: 'quote',
  [SAT_ORDER_STATUS.CONFIRMED]: 'confirmed',
  [SAT_ORDER_STATUS.IN_PROGRESS]: 'in_progress',
  [SAT_ORDER_STATUS.SHIPPED]: 'shipped',
  [SAT_ORDER_STATUS.DELIVERED]: 'delivered',
  [SAT_ORDER_STATUS.COMPLETED]: 'completed',
  [SAT_ORDER_STATUS.CANCELLED]: 'cancelled',
};

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/** SAT API authentication response */
export interface SatAuthResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/** SAT API error response */
export interface SatApiError {
  code: string;
  message: string;
  details?: string;
  field?: string;
}

/** Paginated response wrapper */
export interface SatPaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// =============================================================================
// ENTITY TYPES
// =============================================================================

/** SAT Invoice (Nota Fiscal) */
export interface SatInvoice {
  id: number;
  number: string;
  series?: string;
  type: 'NF' | 'NFe' | 'NFSe' | 'NFCe';
  status: SatInvoiceStatus;
  issue_date: string;
  due_date: string;
  customer_id: number;
  customer_name: string;
  customer_document: string; // CPF or CNPJ
  items: SatInvoiceItem[];
  subtotal: number;
  discount: number;
  tax_total: number;
  total: number;
  currency: string;
  payment_method?: SatPaymentMethod;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/** Invoice line item */
export interface SatInvoiceItem {
  id: number;
  product_id: number;
  product_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

/** SAT Customer */
export interface SatCustomer {
  id: number;
  type: 'PF' | 'PJ'; // Pessoa Física / Pessoa Jurídica
  name: string;
  trade_name?: string;
  document: string; // CPF or CNPJ
  state_registration?: string;
  municipal_registration?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address: SatAddress;
  tax_regime?: SatTaxRegime;
  is_active: boolean;
  credit_limit?: number;
  balance?: number;
  created_at: string;
  updated_at: string;
}

/** Address structure */
export interface SatAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

/** SAT Product */
export interface SatProduct {
  id: number;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  unit: string;
  category_id?: number;
  category_name?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  max_stock?: number;
  ncm?: string; // Tax classification
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** SAT Order / Quote */
export interface SatOrder {
  id: number;
  number: string;
  type: 'quote' | 'order';
  status: SatOrderStatus;
  customer_id: number;
  customer_name: string;
  salesperson_id?: number;
  salesperson_name?: string;
  items: SatOrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax_total: number;
  total: number;
  valid_until?: string;
  delivery_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/** Order line item */
export interface SatOrderItem {
  id: number;
  product_id: number;
  product_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

/** SAT Payment record */
export interface SatPayment {
  id: number;
  invoice_id: number;
  invoice_number: string;
  method: SatPaymentMethod;
  amount: number;
  payment_date: string;
  reference?: string;
  notes?: string;
  created_at: string;
}

/** Stock movement */
export interface SatStockMovement {
  id: number;
  product_id: number;
  product_code: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost?: number;
  reference_type?: 'invoice' | 'order' | 'manual';
  reference_id?: number;
  notes?: string;
  created_at: string;
}

// =============================================================================
// REQUEST PAYLOADS
// =============================================================================

/** Create invoice payload */
export interface SatCreateInvoicePayload {
  customer_id: number;
  type: 'NF' | 'NFe' | 'NFSe' | 'NFCe';
  due_date: string;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price?: number;
    discount?: number;
  }>;
  payment_method?: SatPaymentMethod;
  notes?: string;
}

/** Create customer payload */
export interface SatCreateCustomerPayload {
  type: 'PF' | 'PJ';
  name: string;
  trade_name?: string;
  document: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address: Partial<SatAddress>;
  tax_regime?: SatTaxRegime;
}

/** Create order payload */
export interface SatCreateOrderPayload {
  customer_id: number;
  type: 'quote' | 'order';
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price?: number;
    discount?: number;
  }>;
  valid_until?: string;
  delivery_date?: string;
  notes?: string;
}

// =============================================================================
// QUERY PARAMETERS
// =============================================================================

/** Common query parameters for list endpoints */
export interface SatQueryParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  created_after?: string;
  created_before?: string;
  updated_after?: string;
}

/** Invoice-specific query parameters */
export interface SatInvoiceQueryParams extends SatQueryParams {
  status?: SatInvoiceStatus | SatInvoiceStatus[];
  customer_id?: number;
  due_before?: string;
  due_after?: string;
  issue_before?: string;
  issue_after?: string;
  type?: 'NF' | 'NFe' | 'NFSe' | 'NFCe';
}

/** Customer-specific query parameters */
export interface SatCustomerQueryParams extends SatQueryParams {
  type?: 'PF' | 'PJ';
  is_active?: boolean;
  has_balance?: boolean;
}

/** Product-specific query parameters */
export interface SatProductQueryParams extends SatQueryParams {
  category_id?: number;
  is_active?: boolean;
  low_stock?: boolean;
}
