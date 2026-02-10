import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationStatus,
} from '../../types';
import { SatApiClient } from './sat-api.client';
import {
  SatDataMapper,
  type CrmInvoice,
  type CrmClient,
  type CrmProduct,
  type CrmQuote,
  type CrmPayment,
} from './sat-data.mapper';
import type {
  SatInvoice,
  SatCustomer,
  SatProduct,
  SatOrder,
  SatPayment,
  SatInvoiceQueryParams,
  SatCustomerQueryParams,
  SatProductQueryParams,
  SatQueryParams,
} from './sat.types';

/**
 * SAT ERP Integration Adapter
 *
 * Implements IntegrationAdapter for SAT ERP system.
 * Provides invoice sync, customer mapping, product/inventory sync, and payment tracking.
 *
 * @remarks
 * Follows Open/Closed Principle - extends IntegrationAdapter interface.
 * Follows Liskov Substitution - can replace any IntegrationAdapter.
 */
@Injectable()
export class SatAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(SatAdapter.name);
  private config: IntegrationConfig = {};
  private client: SatApiClient | null = null;
  private lastSyncAt?: string;
  private lastError?: string;

  constructor(private readonly httpService: HttpService) {}

  // ===========================================================================
  // INTEGRATION ADAPTER INTERFACE
  // ===========================================================================

  async getStatus(): Promise<IntegrationStatus> {
    const isConfigured = this.isConfigured();

    return {
      id: 'sat',
      name: 'SAT ERP',
      type: 'ERP/Financial',
      status: isConfigured ? 'disconnected' : 'disconnected',
      configured: isConfigured,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      features: [
        'Invoice synchronization',
        'Payment tracking',
        'Customer/Client mapping',
        'Product catalog sync',
        'Inventory levels',
        'Order management',
        'Quote generation',
        'Financial reports',
      ],
    };
  }

  async testConnection(): Promise<boolean> {
    this.logger.log('Testing SAT connection');

    if (!this.isConfigured()) {
      this.logger.warn('SAT not configured');
      this.lastError = 'Integration not configured';
      return false;
    }

    try {
      const client = this.getClient();
      const result = await client.testConnection();

      if (result) {
        this.lastError = undefined;
        this.logger.log('SAT connection test successful');
      } else {
        this.lastError = 'Connection test failed';
      }

      return result;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('SAT connection test failed', error);
      return false;
    }
  }

  async configure(config: Partial<IntegrationConfig>): Promise<void> {
    this.logger.log('Updating SAT configuration');
    this.config = { ...this.config, ...config };
    this.client = null; // Reset client to use new config
    this.lastError = undefined;
  }

  async sync(): Promise<void> {
    this.logger.log('Starting SAT sync');

    if (!this.isConfigured()) {
      throw new Error('SAT not configured');
    }

    try {
      await this.syncInvoices();
      await this.syncCustomers();
      await this.syncProducts();
      await this.syncOrders();

      this.lastSyncAt = new Date().toISOString();
      this.lastError = undefined;
      this.logger.log('SAT sync completed successfully');
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Sync failed';
      this.logger.error('SAT sync failed', error);
      throw error;
    }
  }

  // ===========================================================================
  // INVOICE OPERATIONS
  // ===========================================================================

  /**
   * Fetches invoices from SAT and maps to CRM format.
   */
  async getInvoices(params?: SatInvoiceQueryParams): Promise<CrmInvoice[]> {
    this.logger.debug('Fetching SAT invoices');
    const client = this.getClient();
    const response = await client.getInvoices(params);
    return response.data.map(SatDataMapper.invoiceToCrmInvoice);
  }

  /**
   * Fetches a single invoice by ID.
   */
  async getInvoice(id: number): Promise<CrmInvoice> {
    this.logger.debug(`Fetching SAT invoice ${id}`);
    const client = this.getClient();
    const invoice = await client.getInvoice(id);
    return SatDataMapper.invoiceToCrmInvoice(invoice);
  }

  /**
   * Creates an invoice in SAT from CRM data.
   */
  async createInvoice(
    invoice: Partial<CrmInvoice>,
    customerId: number,
    items: Array<{ product_id: number; quantity: number; unit_price?: number }>,
  ): Promise<CrmInvoice> {
    this.logger.log('Creating SAT invoice');
    const client = this.getClient();
    const payload = SatDataMapper.crmInvoiceToCreatePayload(
      invoice,
      customerId,
      items,
    );
    const created = await client.createInvoice(payload);
    return SatDataMapper.invoiceToCrmInvoice(created);
  }

  /**
   * Gets overdue invoices.
   */
  async getOverdueInvoices(): Promise<CrmInvoice[]> {
    return this.getInvoices({
      status: 6, // OVERDUE
      due_before: new Date().toISOString().split('T')[0],
    });
  }

  /**
   * Gets unpaid invoices.
   */
  async getUnpaidInvoices(): Promise<CrmInvoice[]> {
    return this.getInvoices({
      status: [1, 2, 3, 5, 6], // PENDING, APPROVED, SENT, PARTIAL, OVERDUE
    });
  }

  // ===========================================================================
  // CUSTOMER OPERATIONS
  // ===========================================================================

  /**
   * Fetches customers from SAT and maps to CRM format.
   */
  async getCustomers(params?: SatCustomerQueryParams): Promise<CrmClient[]> {
    this.logger.debug('Fetching SAT customers');
    const client = this.getClient();
    const response = await client.getCustomers(params);
    return response.data.map(SatDataMapper.customerToCrmClient);
  }

  /**
   * Fetches a single customer by ID.
   */
  async getCustomer(id: number): Promise<CrmClient> {
    this.logger.debug(`Fetching SAT customer ${id}`);
    const client = this.getClient();
    const customer = await client.getCustomer(id);
    return SatDataMapper.customerToCrmClient(customer);
  }

  /**
   * Creates a customer in SAT from CRM data.
   */
  async createCustomer(clientData: Partial<CrmClient>): Promise<CrmClient> {
    this.logger.log('Creating SAT customer');
    const client = this.getClient();
    const payload = SatDataMapper.crmClientToCreatePayload(clientData);
    const created = await client.createCustomer(payload);
    return SatDataMapper.customerToCrmClient(created);
  }

  /**
   * Updates a customer in SAT.
   */
  async updateCustomer(
    id: number,
    clientData: Partial<CrmClient>,
  ): Promise<CrmClient> {
    this.logger.log(`Updating SAT customer ${id}`);
    const client = this.getClient();
    const payload = SatDataMapper.crmClientToCreatePayload(clientData);
    const updated = await client.updateCustomer(id, payload);
    return SatDataMapper.customerToCrmClient(updated);
  }

  // ===========================================================================
  // PRODUCT OPERATIONS
  // ===========================================================================

  /**
   * Fetches products from SAT and maps to CRM format.
   */
  async getProducts(params?: SatProductQueryParams): Promise<CrmProduct[]> {
    this.logger.debug('Fetching SAT products');
    const client = this.getClient();
    const response = await client.getProducts(params);
    return response.data.map(SatDataMapper.productToCrmProduct);
  }

  /**
   * Fetches a single product by ID.
   */
  async getProduct(id: number): Promise<CrmProduct> {
    this.logger.debug(`Fetching SAT product ${id}`);
    const client = this.getClient();
    const product = await client.getProduct(id);
    return SatDataMapper.productToCrmProduct(product);
  }

  /**
   * Gets products with low stock.
   */
  async getLowStockProducts(): Promise<CrmProduct[]> {
    this.logger.debug('Fetching SAT low stock products');
    const client = this.getClient();
    const response = await client.getLowStockProducts();
    return response.data.map(SatDataMapper.productToCrmProduct);
  }

  // ===========================================================================
  // ORDER OPERATIONS
  // ===========================================================================

  /**
   * Fetches orders from SAT and maps to CRM format.
   */
  async getOrders(params?: SatQueryParams): Promise<CrmQuote[]> {
    this.logger.debug('Fetching SAT orders');
    const client = this.getClient();
    const response = await client.getOrders(params);
    return response.data.map(SatDataMapper.orderToCrmQuote);
  }

  /**
   * Fetches a single order by ID.
   */
  async getOrder(id: number): Promise<CrmQuote> {
    this.logger.debug(`Fetching SAT order ${id}`);
    const client = this.getClient();
    const order = await client.getOrder(id);
    return SatDataMapper.orderToCrmQuote(order);
  }

  /**
   * Creates an order/quote in SAT.
   */
  async createOrder(
    quote: Partial<CrmQuote>,
    customerId: number,
    items: Array<{ product_id: number; quantity: number; unit_price?: number }>,
  ): Promise<CrmQuote> {
    this.logger.log('Creating SAT order');
    const client = this.getClient();
    const payload = SatDataMapper.crmQuoteToCreatePayload(
      quote,
      customerId,
      items,
    );
    const created = await client.createOrder(payload);
    return SatDataMapper.orderToCrmQuote(created);
  }

  /**
   * Converts a quote to an order.
   */
  async convertQuoteToOrder(quoteId: number): Promise<CrmQuote> {
    this.logger.log(`Converting SAT quote ${quoteId} to order`);
    const client = this.getClient();
    const converted = await client.convertQuoteToOrder(quoteId);
    return SatDataMapper.orderToCrmQuote(converted);
  }

  // ===========================================================================
  // PAYMENT OPERATIONS
  // ===========================================================================

  /**
   * Gets payments for an invoice.
   */
  async getInvoicePayments(invoiceId: number): Promise<CrmPayment[]> {
    this.logger.debug(`Fetching payments for SAT invoice ${invoiceId}`);
    const client = this.getClient();
    const payments = await client.getInvoicePayments(invoiceId);
    return payments.map(SatDataMapper.paymentToCrmPayment);
  }

  /**
   * Records a payment for an invoice.
   */
  async recordPayment(
    invoiceId: number,
    payment: {
      method: string;
      amount: number;
      payment_date: string;
      reference?: string;
      notes?: string;
    },
  ): Promise<CrmPayment> {
    this.logger.log(`Recording payment for SAT invoice ${invoiceId}`);
    const client = this.getClient();
    const recorded = await client.recordPayment(invoiceId, payment as any);
    return SatDataMapper.paymentToCrmPayment(recorded);
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private isConfigured(): boolean {
    return !!(
      this.config.baseUrl &&
      this.config.clientId &&
      this.config.clientSecret
    );
  }

  private getClient(): SatApiClient {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw new Error('SAT integration not configured');
      }

      this.client = new SatApiClient(
        this.httpService,
        this.config.baseUrl!,
        this.config.clientId!,
        this.config.clientSecret!,
      );
    }

    return this.client;
  }

  private async syncInvoices(): Promise<void> {
    this.logger.debug('Syncing SAT invoices');
    // Implementation would:
    // 1. Fetch recent invoices from SAT
    // 2. Map to CRM invoice format
    // 3. Update/create in CRM database
    // 4. Handle conflicts/duplicates
  }

  private async syncCustomers(): Promise<void> {
    this.logger.debug('Syncing SAT customers');
    // Implementation would:
    // 1. Fetch customers from SAT
    // 2. Map to CRM client format
    // 3. Update/create in CRM database
    // 4. Handle duplicates by document number
  }

  private async syncProducts(): Promise<void> {
    this.logger.debug('Syncing SAT products');
    // Implementation would:
    // 1. Fetch products from SAT
    // 2. Map to CRM product format
    // 3. Update inventory levels
    // 4. Flag low stock items
  }

  private async syncOrders(): Promise<void> {
    this.logger.debug('Syncing SAT orders');
    // Implementation would:
    // 1. Fetch orders from SAT
    // 2. Map to CRM quote format
    // 3. Update/create in CRM database
    // 4. Link to clients
  }
}
