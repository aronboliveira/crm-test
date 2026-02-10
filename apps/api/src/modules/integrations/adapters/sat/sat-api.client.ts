import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, of } from 'rxjs';
import type {
  SatAuthResponse,
  SatInvoice,
  SatCustomer,
  SatProduct,
  SatOrder,
  SatPayment,
  SatStockMovement,
  SatPaginatedResponse,
  SatInvoiceQueryParams,
  SatCustomerQueryParams,
  SatProductQueryParams,
  SatQueryParams,
  SatCreateInvoicePayload,
  SatCreateCustomerPayload,
  SatCreateOrderPayload,
} from './sat.types';

/**
 * SAT ERP API Client
 *
 * Low-level HTTP client for SAT ERP REST API.
 * Handles authentication, session management, and raw API calls.
 *
 * @remarks
 * Follows Single Responsibility - only handles HTTP communication.
 */
@Injectable()
export class SatApiClient {
  private readonly logger = new Logger(SatApiClient.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshToken: string | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly baseUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  // ===========================================================================
  // AUTHENTICATION
  // ===========================================================================

  /**
   * Authenticates with SAT API using OAuth2 client credentials.
   */
  async authenticate(): Promise<boolean> {
    this.logger.log('Authenticating with SAT API');

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<SatAuthResponse>(
            `${this.baseUrl}/oauth/token`,
            {
              grant_type: 'client_credentials',
              client_id: this.clientId,
              client_secret: this.clientSecret,
              scope: 'read write',
            },
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          )
          .pipe(
            catchError((error) => {
              this.logger.error('SAT authentication failed', error.message);
              return of(null);
            }),
          ),
      );

      if (response?.data) {
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token || null;
        this.tokenExpiry = new Date(
          Date.now() + response.data.expires_in * 1000,
        );
        this.logger.log('SAT authentication successful');
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('SAT authentication error', error);
      return false;
    }
  }

  /**
   * Refreshes the access token if expired.
   */
  private async ensureAuthenticated(): Promise<void> {
    if (
      !this.accessToken ||
      !this.tokenExpiry ||
      this.tokenExpiry <= new Date()
    ) {
      const success = await this.authenticate();
      if (!success) {
        throw new Error('SAT authentication failed');
      }
    }
  }

  /**
   * Gets authorization headers for API requests.
   */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Tests connection to SAT API.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();

      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/health`, {
            headers: this.getHeaders(),
          })
          .pipe(
            catchError(() => {
              return of(null);
            }),
          ),
      );

      return !!response?.data;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // INVOICES
  // ===========================================================================

  /**
   * Lists invoices with optional filters.
   */
  async getInvoices(
    params?: SatInvoiceQueryParams,
  ): Promise<SatPaginatedResponse<SatInvoice>> {
    await this.ensureAuthenticated();
    this.logger.debug('Fetching SAT invoices', params);

    const response = await firstValueFrom(
      this.httpService.get<SatPaginatedResponse<SatInvoice>>(
        `${this.baseUrl}/invoices`,
        {
          headers: this.getHeaders(),
          params: this.buildQueryParams(params),
        },
      ),
    );

    return response.data;
  }

  /**
   * Gets a single invoice by ID.
   */
  async getInvoice(id: number): Promise<SatInvoice> {
    await this.ensureAuthenticated();
    this.logger.debug(`Fetching SAT invoice ${id}`);

    const response = await firstValueFrom(
      this.httpService.get<SatInvoice>(`${this.baseUrl}/invoices/${id}`, {
        headers: this.getHeaders(),
      }),
    );

    return response.data;
  }

  /**
   * Creates a new invoice.
   */
  async createInvoice(payload: SatCreateInvoicePayload): Promise<SatInvoice> {
    await this.ensureAuthenticated();
    this.logger.log('Creating SAT invoice');

    const response = await firstValueFrom(
      this.httpService.post<SatInvoice>(`${this.baseUrl}/invoices`, payload, {
        headers: this.getHeaders(),
      }),
    );

    return response.data;
  }

  /**
   * Cancels an invoice.
   */
  async cancelInvoice(id: number, reason: string): Promise<SatInvoice> {
    await this.ensureAuthenticated();
    this.logger.log(`Cancelling SAT invoice ${id}`);

    const response = await firstValueFrom(
      this.httpService.post<SatInvoice>(
        `${this.baseUrl}/invoices/${id}/cancel`,
        { reason },
        { headers: this.getHeaders() },
      ),
    );

    return response.data;
  }

  // ===========================================================================
  // CUSTOMERS
  // ===========================================================================

  /**
   * Lists customers with optional filters.
   */
  async getCustomers(
    params?: SatCustomerQueryParams,
  ): Promise<SatPaginatedResponse<SatCustomer>> {
    await this.ensureAuthenticated();
    this.logger.debug('Fetching SAT customers', params);

    const response = await firstValueFrom(
      this.httpService.get<SatPaginatedResponse<SatCustomer>>(
        `${this.baseUrl}/customers`,
        {
          headers: this.getHeaders(),
          params: this.buildQueryParams(params),
        },
      ),
    );

    return response.data;
  }

  /**
   * Gets a single customer by ID.
   */
  async getCustomer(id: number): Promise<SatCustomer> {
    await this.ensureAuthenticated();
    this.logger.debug(`Fetching SAT customer ${id}`);

    const response = await firstValueFrom(
      this.httpService.get<SatCustomer>(`${this.baseUrl}/customers/${id}`, {
        headers: this.getHeaders(),
      }),
    );

    return response.data;
  }

  /**
   * Creates a new customer.
   */
  async createCustomer(payload: SatCreateCustomerPayload): Promise<SatCustomer> {
    await this.ensureAuthenticated();
    this.logger.log('Creating SAT customer');

    const response = await firstValueFrom(
      this.httpService.post<SatCustomer>(`${this.baseUrl}/customers`, payload, {
        headers: this.getHeaders(),
      }),
    );

    return response.data;
  }

  /**
   * Updates a customer.
   */
  async updateCustomer(
    id: number,
    payload: Partial<SatCreateCustomerPayload>,
  ): Promise<SatCustomer> {
    await this.ensureAuthenticated();
    this.logger.log(`Updating SAT customer ${id}`);

    const response = await firstValueFrom(
      this.httpService.patch<SatCustomer>(
        `${this.baseUrl}/customers/${id}`,
        payload,
        { headers: this.getHeaders() },
      ),
    );

    return response.data;
  }

  // ===========================================================================
  // PRODUCTS
  // ===========================================================================

  /**
   * Lists products with optional filters.
   */
  async getProducts(
    params?: SatProductQueryParams,
  ): Promise<SatPaginatedResponse<SatProduct>> {
    await this.ensureAuthenticated();
    this.logger.debug('Fetching SAT products', params);

    const response = await firstValueFrom(
      this.httpService.get<SatPaginatedResponse<SatProduct>>(
        `${this.baseUrl}/products`,
        {
          headers: this.getHeaders(),
          params: this.buildQueryParams(params),
        },
      ),
    );

    return response.data;
  }

  /**
   * Gets a single product by ID.
   */
  async getProduct(id: number): Promise<SatProduct> {
    await this.ensureAuthenticated();
    this.logger.debug(`Fetching SAT product ${id}`);

    const response = await firstValueFrom(
      this.httpService.get<SatProduct>(`${this.baseUrl}/products/${id}`, {
        headers: this.getHeaders(),
      }),
    );

    return response.data;
  }

  /**
   * Gets low stock products.
   */
  async getLowStockProducts(): Promise<SatPaginatedResponse<SatProduct>> {
    return this.getProducts({ low_stock: true });
  }

  // ===========================================================================
  // ORDERS
  // ===========================================================================

  /**
   * Lists orders with optional filters.
   */
  async getOrders(
    params?: SatQueryParams,
  ): Promise<SatPaginatedResponse<SatOrder>> {
    await this.ensureAuthenticated();
    this.logger.debug('Fetching SAT orders', params);

    const response = await firstValueFrom(
      this.httpService.get<SatPaginatedResponse<SatOrder>>(
        `${this.baseUrl}/orders`,
        {
          headers: this.getHeaders(),
          params: this.buildQueryParams(params),
        },
      ),
    );

    return response.data;
  }

  /**
   * Gets a single order by ID.
   */
  async getOrder(id: number): Promise<SatOrder> {
    await this.ensureAuthenticated();
    this.logger.debug(`Fetching SAT order ${id}`);

    const response = await firstValueFrom(
      this.httpService.get<SatOrder>(`${this.baseUrl}/orders/${id}`, {
        headers: this.getHeaders(),
      }),
    );

    return response.data;
  }

  /**
   * Creates a new order/quote.
   */
  async createOrder(payload: SatCreateOrderPayload): Promise<SatOrder> {
    await this.ensureAuthenticated();
    this.logger.log('Creating SAT order');

    const response = await firstValueFrom(
      this.httpService.post<SatOrder>(`${this.baseUrl}/orders`, payload, {
        headers: this.getHeaders(),
      }),
    );

    return response.data;
  }

  /**
   * Converts a quote to an order.
   */
  async convertQuoteToOrder(quoteId: number): Promise<SatOrder> {
    await this.ensureAuthenticated();
    this.logger.log(`Converting SAT quote ${quoteId} to order`);

    const response = await firstValueFrom(
      this.httpService.post<SatOrder>(
        `${this.baseUrl}/orders/${quoteId}/convert`,
        {},
        { headers: this.getHeaders() },
      ),
    );

    return response.data;
  }

  // ===========================================================================
  // PAYMENTS
  // ===========================================================================

  /**
   * Gets payments for an invoice.
   */
  async getInvoicePayments(invoiceId: number): Promise<SatPayment[]> {
    await this.ensureAuthenticated();
    this.logger.debug(`Fetching payments for SAT invoice ${invoiceId}`);

    const response = await firstValueFrom(
      this.httpService.get<SatPayment[]>(
        `${this.baseUrl}/invoices/${invoiceId}/payments`,
        { headers: this.getHeaders() },
      ),
    );

    return response.data;
  }

  /**
   * Records a payment for an invoice.
   */
  async recordPayment(
    invoiceId: number,
    payment: Omit<SatPayment, 'id' | 'invoice_id' | 'invoice_number' | 'created_at'>,
  ): Promise<SatPayment> {
    await this.ensureAuthenticated();
    this.logger.log(`Recording payment for SAT invoice ${invoiceId}`);

    const response = await firstValueFrom(
      this.httpService.post<SatPayment>(
        `${this.baseUrl}/invoices/${invoiceId}/payments`,
        payment,
        { headers: this.getHeaders() },
      ),
    );

    return response.data;
  }

  // ===========================================================================
  // STOCK
  // ===========================================================================

  /**
   * Gets stock movements for a product.
   */
  async getStockMovements(
    productId: number,
    params?: SatQueryParams,
  ): Promise<SatPaginatedResponse<SatStockMovement>> {
    await this.ensureAuthenticated();
    this.logger.debug(`Fetching stock movements for product ${productId}`);

    const response = await firstValueFrom(
      this.httpService.get<SatPaginatedResponse<SatStockMovement>>(
        `${this.baseUrl}/products/${productId}/stock-movements`,
        {
          headers: this.getHeaders(),
          params: this.buildQueryParams(params),
        },
      ),
    );

    return response.data;
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Builds query parameters object, filtering out undefined values.
   */
  private buildQueryParams(
    params?: object,
  ): Record<string, string | number | boolean> | undefined {
    if (!params) return undefined;

    const result: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          result[key] = value.join(',');
        } else {
          result[key] = value as string | number | boolean;
        }
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }
}
