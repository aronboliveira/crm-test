/**
 * SAT Data Mapper Unit Tests
 *
 * Tests the bidirectional mapping between SAT API entities
 * and CRM internal entities.
 */

import { SatDataMapper } from './sat-data.mapper';
import { SAT_INVOICE_STATUS, SAT_ORDER_STATUS } from './sat.types';
import type {
  SatInvoice,
  SatCustomer,
  SatProduct,
  SatOrder,
  SatPayment,
} from './sat.types';

describe('SatDataMapper', () => {
  describe('Invoice Mapping', () => {
    const mockSatInvoice: SatInvoice = {
      id: 1001,
      number: 'NFe-2024-001',
      type: 'NFe',
      status: SAT_INVOICE_STATUS.PAID,
      issue_date: '2024-01-15T10:00:00Z',
      due_date: '2024-02-15T10:00:00Z',
      customer_id: 500,
      customer_name: 'Acme Corp',
      customer_document: '12.345.678/0001-90',
      items: [
        {
          id: 1,
          product_id: 100,
          product_code: 'PROD-001',
          description: 'Product A',
          quantity: 10,
          unit_price: 50.0,
          discount: 0,
          tax_rate: 0.1,
          tax_amount: 50.0,
          total: 550.0,
        },
      ],
      subtotal: 500.0,
      discount: 0,
      tax_total: 50.0,
      total: 550.0,
      currency: 'BRL',
      payment_method: 'credit_card',
      payment_date: '2024-02-10T10:00:00Z',
      notes: 'Test invoice',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    };

    it('should map SAT invoice to CRM invoice', () => {
      const result = SatDataMapper.invoiceToCrmInvoice(mockSatInvoice);

      expect(result.number).toBe('NFe-2024-001');
      expect(result.type).toBe('NFe');
      expect(result.status).toBe('paid');
      expect(result.clientName).toBe('Acme Corp');
      expect(result.subtotal).toBe(500.0);
      expect(result.tax).toBe(50.0);
      expect(result.total).toBe(550.0);
      expect(result.source).toBe('sat');
      expect(result.sourceId).toBe('1001');
    });

    it('should map multiple SAT invoices', () => {
      const invoices = [mockSatInvoice, { ...mockSatInvoice, id: 1002 }];
      const result = SatDataMapper.invoicesToCrmInvoices(invoices);

      expect(result).toHaveLength(2);
      expect(result[0].sourceId).toBe('1001');
      expect(result[1].sourceId).toBe('1002');
    });

    it('should map CRM invoice to SAT create payload', () => {
      const crmInvoice = {
        type: 'NFe',
        dueDate: new Date('2024-02-15'),
        paymentMethod: 'pix',
        notes: 'Test',
      };
      const items = [{ product_id: 100, quantity: 5 }];

      const result = SatDataMapper.crmInvoiceToCreatePayload(
        crmInvoice,
        500,
        items,
      );

      expect(result.customer_id).toBe(500);
      expect(result.type).toBe('NFe');
      expect(result.due_date).toBe('2024-02-15');
      expect(result.items).toEqual(items);
      expect(result.payment_method).toBe('pix');
    });

    it('should map invoice status correctly', () => {
      expect(SatDataMapper.mapInvoiceStatus(SAT_INVOICE_STATUS.DRAFT)).toBe(
        'draft',
      );
      expect(SatDataMapper.mapInvoiceStatus(SAT_INVOICE_STATUS.PENDING)).toBe(
        'pending',
      );
      expect(SatDataMapper.mapInvoiceStatus(SAT_INVOICE_STATUS.PAID)).toBe(
        'paid',
      );
      expect(SatDataMapper.mapInvoiceStatus(SAT_INVOICE_STATUS.OVERDUE)).toBe(
        'overdue',
      );
      expect(SatDataMapper.mapInvoiceStatus(SAT_INVOICE_STATUS.CANCELLED)).toBe(
        'cancelled',
      );
    });
  });

  describe('Customer Mapping', () => {
    const mockSatCustomer: SatCustomer = {
      id: 500,
      type: 'PJ',
      name: 'Acme Corp',
      trade_name: 'Acme Corporation',
      document: '12.345.678/0001-90',
      state_registration: '123456789',
      email: 'contact@acme.com',
      phone: '(11) 1234-5678',
      mobile: '(11) 98765-4321',
      address: {
        street: 'Rua das Flores',
        number: '100',
        complement: 'Sala 5',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        postal_code: '01310-100',
        country: 'Brasil',
      },
      tax_regime: 'simples_nacional',
      is_active: true,
      credit_limit: 10000.0,
      balance: 5000.0,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
    };

    it('should map SAT customer to CRM client', () => {
      const result = SatDataMapper.customerToCrmClient(mockSatCustomer);

      expect(result.name).toBe('Acme Corp');
      expect(result.tradeName).toBe('Acme Corporation');
      expect(result.type).toBe('company');
      expect(result.document).toBe('12.345.678/0001-90');
      expect(result.email).toBe('contact@acme.com');
      expect(result.address?.city).toBe('São Paulo');
      expect(result.creditLimit).toBe(10000.0);
      expect(result.source).toBe('sat');
    });

    it('should map individual customer type correctly', () => {
      const individual = { ...mockSatCustomer, type: 'PF' as const };
      const result = SatDataMapper.customerToCrmClient(individual);

      expect(result.type).toBe('individual');
    });

    it('should map CRM client to SAT create payload', () => {
      const crmClient = {
        name: 'Test Company',
        type: 'company' as const,
        document: '00.000.000/0001-00',
        email: 'test@company.com',
        taxRegime: 'simples_nacional',
      };

      const result = SatDataMapper.crmClientToCreatePayload(crmClient);

      expect(result.type).toBe('PJ');
      expect(result.name).toBe('Test Company');
      expect(result.document).toBe('00.000.000/0001-00');
      expect(result.tax_regime).toBe('simples_nacional');
    });
  });

  describe('Product Mapping', () => {
    const mockSatProduct: SatProduct = {
      id: 100,
      code: 'PROD-001',
      barcode: '7891234567890',
      name: 'Product A',
      description: 'Test product',
      unit: 'UN',
      category_id: 10,
      category_name: 'Electronics',
      cost_price: 30.0,
      sale_price: 50.0,
      stock_quantity: 100,
      min_stock: 10,
      max_stock: 500,
      is_active: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
    };

    it('should map SAT product to CRM product', () => {
      const result = SatDataMapper.productToCrmProduct(mockSatProduct);

      expect(result.code).toBe('PROD-001');
      expect(result.barcode).toBe('7891234567890');
      expect(result.name).toBe('Product A');
      expect(result.costPrice).toBe(30.0);
      expect(result.salePrice).toBe(50.0);
      expect(result.stockQuantity).toBe(100);
      expect(result.categoryName).toBe('Electronics');
      expect(result.source).toBe('sat');
    });

    it('should map multiple products', () => {
      const products = [mockSatProduct, { ...mockSatProduct, id: 101 }];
      const result = SatDataMapper.productsToCrmProducts(products);

      expect(result).toHaveLength(2);
    });
  });

  describe('Order Mapping', () => {
    const mockSatOrder: SatOrder = {
      id: 200,
      number: 'ORD-2024-001',
      type: 'order',
      status: SAT_ORDER_STATUS.CONFIRMED,
      customer_id: 500,
      customer_name: 'Acme Corp',
      salesperson_id: 10,
      salesperson_name: 'John Doe',
      items: [],
      subtotal: 1000.0,
      discount: 100.0,
      shipping: 50.0,
      tax_total: 95.0,
      total: 1045.0,
      currency: 'BRL',
      valid_until: '2024-02-01T10:00:00Z',
      delivery_date: '2024-02-15T10:00:00Z',
      notes: 'Rush order',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    };

    it('should map SAT order to CRM quote', () => {
      const result = SatDataMapper.orderToCrmQuote(mockSatOrder);

      expect(result.number).toBe('ORD-2024-001');
      expect(result.status).toBe('confirmed');
      expect(result.clientName).toBe('Acme Corp');
      expect(result.salespersonName).toBe('John Doe');
      expect(result.subtotal).toBe(1000.0);
      expect(result.discount).toBe(100.0);
      expect(result.shipping).toBe(50.0);
      expect(result.total).toBe(1045.0);
      expect(result.source).toBe('sat');
    });

    it('should map order status correctly', () => {
      expect(SatDataMapper.mapOrderStatus(SAT_ORDER_STATUS.QUOTE)).toBe(
        'quote',
      );
      expect(SatDataMapper.mapOrderStatus(SAT_ORDER_STATUS.CONFIRMED)).toBe(
        'confirmed',
      );
      expect(SatDataMapper.mapOrderStatus(SAT_ORDER_STATUS.SHIPPED)).toBe(
        'shipped',
      );
      expect(SatDataMapper.mapOrderStatus(SAT_ORDER_STATUS.DELIVERED)).toBe(
        'delivered',
      );
    });
  });

  describe('Payment Mapping', () => {
    const mockSatPayment: SatPayment = {
      id: 300,
      invoice_id: 1001,
      invoice_number: 'NFe-2024-001',
      method: 'pix',
      amount: 550.0,
      currency: 'BRL',
      payment_date: '2024-02-10T10:00:00Z',
      reference: 'PIX-123456',
      notes: 'Paid via PIX',
      created_at: '2024-02-10T10:00:00Z',
    };

    it('should map SAT payment to CRM payment', () => {
      const result = SatDataMapper.paymentToCrmPayment(mockSatPayment);

      expect(result.invoiceId).toBe('1001');
      expect(result.invoiceNumber).toBe('NFe-2024-001');
      expect(result.method).toBe('pix');
      expect(result.amount).toBe(550.0);
      expect(result.reference).toBe('PIX-123456');
      expect(result.source).toBe('sat');
    });
  });

  describe('Reverse Status Mapping', () => {
    it('should map CRM status to SAT invoice status', () => {
      expect(SatDataMapper.mapCrmStatusToInvoiceStatus('draft')).toBe(
        SAT_INVOICE_STATUS.DRAFT,
      );
      expect(SatDataMapper.mapCrmStatusToInvoiceStatus('paid')).toBe(
        SAT_INVOICE_STATUS.PAID,
      );
      expect(SatDataMapper.mapCrmStatusToInvoiceStatus('cancelled')).toBe(
        SAT_INVOICE_STATUS.CANCELLED,
      );
    });

    it('should map CRM status to SAT order status', () => {
      expect(SatDataMapper.mapCrmStatusToOrderStatus('quote')).toBe(
        SAT_ORDER_STATUS.QUOTE,
      );
      expect(SatDataMapper.mapCrmStatusToOrderStatus('confirmed')).toBe(
        SAT_ORDER_STATUS.CONFIRMED,
      );
      expect(SatDataMapper.mapCrmStatusToOrderStatus('shipped')).toBe(
        SAT_ORDER_STATUS.SHIPPED,
      );
    });
  });
});
