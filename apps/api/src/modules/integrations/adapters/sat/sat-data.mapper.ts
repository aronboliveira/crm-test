import {
  SAT_INVOICE_STATUS,
  SAT_ORDER_STATUS,
  SAT_INVOICE_STATUS_MAP,
  SAT_ORDER_STATUS_MAP,
} from './sat.types';
import type {
  SatInvoice,
  SatCustomer,
  SatProduct,
  SatOrder,
  SatPayment,
  SatInvoiceStatus,
  SatOrderStatus,
} from './sat.types';

// =============================================================================
// CRM ENTITY TYPES
// =============================================================================

export interface CrmInvoice {
  id?: string;
  number: string;
  type: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  clientId?: string;
  clientName: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  paidAt?: Date;
  notes?: string;
  source: string;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrmClient {
  id?: string;
  name: string;
  tradeName?: string;
  type: 'individual' | 'company';
  document: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  taxRegime?: string;
  isActive: boolean;
  creditLimit?: number;
  balance?: number;
  source: string;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrmProduct {
  id?: string;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  unit: string;
  categoryId?: string;
  categoryName?: string;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStock: number;
  maxStock?: number;
  isActive: boolean;
  source: string;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrmQuote {
  id?: string;
  number: string;
  type: 'quote' | 'order';
  status: string;
  clientId?: string;
  clientName: string;
  salespersonId?: string;
  salespersonName?: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  validUntil?: Date;
  deliveryDate?: Date;
  notes?: string;
  source: string;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrmPayment {
  id?: string;
  invoiceId: string;
  invoiceNumber: string;
  method: string;
  amount: number;
  paidAt: Date;
  reference?: string;
  notes?: string;
  source: string;
  sourceId: string;
  createdAt: Date;
}

// =============================================================================
// DATA MAPPER
// =============================================================================

/**
 * SAT Data Mapper
 *
 * Transforms data between SAT ERP API format and CRM entities.
 * Follows Single Responsibility - only handles data transformation.
 */
export class SatDataMapper {
  // ===========================================================================
  // INVOICE MAPPING
  // ===========================================================================

  /**
   * Maps SAT invoice to CRM invoice.
   */
  static invoiceToCrmInvoice(invoice: SatInvoice): CrmInvoice {
    return {
      number: invoice.number,
      type: invoice.type,
      status: this.mapInvoiceStatus(invoice.status),
      issueDate: new Date(invoice.issue_date),
      dueDate: new Date(invoice.due_date),
      clientName: invoice.customer_name,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax: invoice.tax_total,
      total: invoice.total,
      currency: invoice.currency,
      paymentMethod: invoice.payment_method,
      paidAt: invoice.payment_date ? new Date(invoice.payment_date) : undefined,
      notes: invoice.notes,
      source: 'sat',
      sourceId: String(invoice.id),
      createdAt: new Date(invoice.created_at),
      updatedAt: new Date(invoice.updated_at),
    };
  }

  /**
   * Maps multiple SAT invoices to CRM invoices.
   */
  static invoicesToCrmInvoices(invoices: SatInvoice[]): CrmInvoice[] {
    return invoices.map((invoice) => this.invoiceToCrmInvoice(invoice));
  }

  /**
   * Maps CRM invoice to SAT invoice create payload.
   */
  static crmInvoiceToCreatePayload(
    invoice: Partial<CrmInvoice>,
    customerId: number,
    items: Array<{ product_id: number; quantity: number; unit_price?: number }>,
  ): import('./sat.types').SatCreateInvoicePayload {
    return {
      customer_id: customerId,
      type: (invoice.type as 'NF' | 'NFe' | 'NFSe' | 'NFCe') || 'NFe',
      due_date: invoice.dueDate?.toISOString().split('T')[0] || '',
      items,
      payment_method: invoice.paymentMethod as import('./sat.types').SatPaymentMethod | undefined,
      notes: invoice.notes,
    };
  }

  // ===========================================================================
  // CUSTOMER MAPPING
  // ===========================================================================

  /**
   * Maps SAT customer to CRM client.
   */
  static customerToCrmClient(customer: SatCustomer): CrmClient {
    return {
      name: customer.name,
      tradeName: customer.trade_name,
      type: customer.type === 'PJ' ? 'company' : 'individual',
      document: customer.document,
      email: customer.email,
      phone: customer.phone,
      mobile: customer.mobile,
      address: customer.address
        ? {
            street: customer.address.street,
            number: customer.address.number,
            complement: customer.address.complement,
            neighborhood: customer.address.neighborhood,
            city: customer.address.city,
            state: customer.address.state,
            postalCode: customer.address.postal_code,
            country: customer.address.country,
          }
        : undefined,
      taxRegime: customer.tax_regime,
      isActive: customer.is_active,
      creditLimit: customer.credit_limit,
      balance: customer.balance,
      source: 'sat',
      sourceId: String(customer.id),
      createdAt: new Date(customer.created_at),
      updatedAt: new Date(customer.updated_at),
    };
  }

  /**
   * Maps CRM client to SAT customer create payload.
   */
  static crmClientToCreatePayload(client: Partial<CrmClient>): import('./sat.types').SatCreateCustomerPayload {
    return {
      type: (client.type === 'company' ? 'PJ' : 'PF') as 'PF' | 'PJ',
      name: client.name || '',
      trade_name: client.tradeName,
      document: client.document || '',
      email: client.email,
      phone: client.phone,
      mobile: client.mobile,
      address: client.address
        ? {
            street: client.address.street,
            number: client.address.number,
            complement: client.address.complement,
            neighborhood: client.address.neighborhood,
            city: client.address.city,
            state: client.address.state,
            postal_code: client.address.postalCode,
            country: client.address.country,
          }
        : {},
      tax_regime: client.taxRegime as import('./sat.types').SatTaxRegime | undefined,
    };
  }

  // ===========================================================================
  // PRODUCT MAPPING
  // ===========================================================================

  /**
   * Maps SAT product to CRM product.
   */
  static productToCrmProduct(product: SatProduct): CrmProduct {
    return {
      code: product.code,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      unit: product.unit,
      categoryId: product.category_id ? String(product.category_id) : undefined,
      categoryName: product.category_name,
      costPrice: product.cost_price,
      salePrice: product.sale_price,
      stockQuantity: product.stock_quantity,
      minStock: product.min_stock,
      maxStock: product.max_stock,
      isActive: product.is_active,
      source: 'sat',
      sourceId: String(product.id),
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at),
    };
  }

  /**
   * Maps multiple SAT products to CRM products.
   */
  static productsToCrmProducts(products: SatProduct[]): CrmProduct[] {
    return products.map((product) => this.productToCrmProduct(product));
  }

  // ===========================================================================
  // ORDER MAPPING
  // ===========================================================================

  /**
   * Maps SAT order to CRM quote/order.
   */
  static orderToCrmQuote(order: SatOrder): CrmQuote {
    return {
      number: order.number,
      type: order.type,
      status: this.mapOrderStatus(order.status),
      clientName: order.customer_name,
      salespersonId: order.salesperson_id
        ? String(order.salesperson_id)
        : undefined,
      salespersonName: order.salesperson_name,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      tax: order.tax_total,
      total: order.total,
      validUntil: order.valid_until ? new Date(order.valid_until) : undefined,
      deliveryDate: order.delivery_date
        ? new Date(order.delivery_date)
        : undefined,
      notes: order.notes,
      source: 'sat',
      sourceId: String(order.id),
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
    };
  }

  /**
   * Maps CRM quote to SAT order create payload.
   */
  static crmQuoteToCreatePayload(
    quote: Partial<CrmQuote>,
    customerId: number,
    items: Array<{ product_id: number; quantity: number; unit_price?: number }>,
  ) {
    return {
      customer_id: customerId,
      type: quote.type || 'quote',
      items,
      valid_until: quote.validUntil?.toISOString().split('T')[0],
      delivery_date: quote.deliveryDate?.toISOString().split('T')[0],
      notes: quote.notes,
    };
  }

  // ===========================================================================
  // PAYMENT MAPPING
  // ===========================================================================

  /**
   * Maps SAT payment to CRM payment.
   */
  static paymentToCrmPayment(payment: SatPayment): CrmPayment {
    return {
      invoiceId: String(payment.invoice_id),
      invoiceNumber: payment.invoice_number,
      method: payment.method,
      amount: payment.amount,
      paidAt: new Date(payment.payment_date),
      reference: payment.reference,
      notes: payment.notes,
      source: 'sat',
      sourceId: String(payment.id),
      createdAt: new Date(payment.created_at),
    };
  }

  // ===========================================================================
  // STATUS MAPPING
  // ===========================================================================

  /**
   * Maps SAT invoice status to CRM status string.
   */
  static mapInvoiceStatus(status: SatInvoiceStatus): string {
    return SAT_INVOICE_STATUS_MAP[status] || 'unknown';
  }

  /**
   * Maps CRM status string to SAT invoice status.
   */
  static mapCrmStatusToInvoiceStatus(
    status: string,
  ): SatInvoiceStatus | undefined {
    const reverseMap: Record<string, SatInvoiceStatus> = {
      draft: SAT_INVOICE_STATUS.DRAFT,
      pending: SAT_INVOICE_STATUS.PENDING,
      approved: SAT_INVOICE_STATUS.APPROVED,
      sent: SAT_INVOICE_STATUS.SENT,
      paid: SAT_INVOICE_STATUS.PAID,
      partial: SAT_INVOICE_STATUS.PARTIAL,
      overdue: SAT_INVOICE_STATUS.OVERDUE,
      cancelled: SAT_INVOICE_STATUS.CANCELLED,
      refunded: SAT_INVOICE_STATUS.REFUNDED,
    };
    return reverseMap[status];
  }

  /**
   * Maps SAT order status to CRM status string.
   */
  static mapOrderStatus(status: SatOrderStatus): string {
    return SAT_ORDER_STATUS_MAP[status] || 'unknown';
  }

  /**
   * Maps CRM status string to SAT order status.
   */
  static mapCrmStatusToOrderStatus(
    status: string,
  ): SatOrderStatus | undefined {
    const reverseMap: Record<string, SatOrderStatus> = {
      quote: SAT_ORDER_STATUS.QUOTE,
      confirmed: SAT_ORDER_STATUS.CONFIRMED,
      in_progress: SAT_ORDER_STATUS.IN_PROGRESS,
      shipped: SAT_ORDER_STATUS.SHIPPED,
      delivered: SAT_ORDER_STATUS.DELIVERED,
      completed: SAT_ORDER_STATUS.COMPLETED,
      cancelled: SAT_ORDER_STATUS.CANCELLED,
    };
    return reverseMap[status];
  }

  // ===========================================================================
  // PAYMENT METHOD MAPPING
  // ===========================================================================

  /** Maps SAT payment method to display string */
  static mapPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      cash: 'Cash',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      bank_transfer: 'Bank Transfer',
      pix: 'PIX',
      boleto: 'Boleto',
      check: 'Check',
    };
    return methodMap[method] || method;
  }
}
