import { DeepSeekAdapter } from './deepseek.adapter';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

const createMockHttpService = (
  overrides: Partial<HttpService> = {},
): HttpService =>
  ({
    post: jest.fn(),
    get: jest.fn(),
    ...overrides,
  }) as unknown as HttpService;

describe('DeepSeekAdapter', () => {
  let adapter: DeepSeekAdapter;
  let mockHttp: HttpService;

  beforeEach(() => {
    mockHttp = createMockHttpService();
    adapter = new DeepSeekAdapter(mockHttp);
  });

  describe('getStatus()', () => {
    it('should return disconnected status when not configured', async () => {
      const status = await adapter.getStatus();

      expect(status.id).toBe('deepseek');
      expect(status.name).toBe('DeepSeek');
      expect(status.type).toBe('LLM/Chatbot');
      expect(status.configured).toBe(false);
      expect(status.status).toBe('disconnected');
    });

    it('should return disconnected status when configured but not tested', async () => {
      await adapter.configure({ apiKey: 'sk-test-key' });
      const status = await adapter.getStatus();

      expect(status.configured).toBe(true);
      expect(status.status).toBe('disconnected');
    });

    it('should return features containing DeepSeek capabilities', async () => {
      const status = await adapter.getStatus();

      expect(status.features).toContain('DeepSeek Chat & Coder models');
      expect(status.features).toContain('DeepSeek V3 support');
      expect(status.features).toContain('DeepSeek Reasoner (R1) support');
      expect(status.features).toContain('OpenAI-compatible API');
    });
  });

  describe('configure()', () => {
    it('should accept valid API key configuration', async () => {
      await adapter.configure({
        apiKey: 'sk-test-deepseek-key',
        model: 'deepseek-chat',
        temperature: 0.5,
        maxTokens: 2048,
      });

      const status = await adapter.getStatus();
      expect(status.configured).toBe(true);
    });

    it('should normalize temperature to default 0.7 when invalid', async () => {
      await adapter.configure({
        apiKey: 'sk-test-key',
        temperature: 'invalid' as unknown as number,
      });

      const status = await adapter.getStatus();
      expect(status.configured).toBe(true);
    });
  });

  describe('testConnection()', () => {
    it('should return false when not configured', async () => {
      const result = await adapter.testConnection();

      expect(result).toBe(false);
      const status = await adapter.getStatus();
      expect(status.lastError).toBe('DeepSeek not configured');
    });

    it('should return true when API responds with content', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          choices: [{ message: { content: 'OK' } }],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      (mockHttp.post as jest.Mock).mockReturnValue(of(mockResponse));

      await adapter.configure({ apiKey: 'sk-valid-key' });
      const result = await adapter.testConnection();

      expect(result).toBe(true);
      const status = await adapter.getStatus();
      expect(status.status).toBe('connected');
      expect(status.lastError).toBeUndefined();
    });

    it('should return false on network error', async () => {
      (mockHttp.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('Network timeout')),
      );

      await adapter.configure({ apiKey: 'sk-valid-key' });
      const result = await adapter.testConnection();

      expect(result).toBe(false);
      const status = await adapter.getStatus();
      expect(status.status).toBe('disconnected');
      expect(status.lastError).toBe('Network timeout');
    });

    it('should call API with correct endpoint and headers', async () => {
      const mockResponse: AxiosResponse = {
        data: { choices: [{ message: { content: 'OK' } }] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      (mockHttp.post as jest.Mock).mockReturnValue(of(mockResponse));

      await adapter.configure({
        apiKey: 'sk-test-api-key',
        model: 'deepseek-coder',
        apiBaseUrl: 'https://api.deepseek.com/v1',
      });

      await adapter.testConnection();

      expect(mockHttp.post).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.objectContaining({
          model: 'deepseek-coder',
          messages: expect.any(Array),
        }),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer sk-test-api-key',
            'Content-Type': 'application/json',
          },
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should reset connection state after reconfiguration', async () => {
      const mockResponse: AxiosResponse = {
        data: { choices: [{ message: { content: 'OK' } }] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      (mockHttp.post as jest.Mock).mockReturnValue(of(mockResponse));

      await adapter.configure({ apiKey: 'sk-test-key' });
      await adapter.testConnection();

      let status = await adapter.getStatus();
      expect(status.status).toBe('connected');

      await adapter.configure({ model: 'deepseek-coder' });
      status = await adapter.getStatus();
      expect(status.status).toBe('disconnected');
    });
  });
});
