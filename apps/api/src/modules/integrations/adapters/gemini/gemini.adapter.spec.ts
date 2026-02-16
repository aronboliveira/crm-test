import { GeminiAdapter } from './gemini.adapter';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosHeaders } from 'axios';

const mockResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: new AxiosHeaders() },
});

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;
  let mockHttp: jest.Mocked<HttpService>;

  beforeEach(() => {
    mockHttp = { post: jest.fn() } as unknown as jest.Mocked<HttpService>;
    adapter = new GeminiAdapter(mockHttp);
  });

  describe('getStatus()', () => {
    it('should return disconnected status when not configured', async () => {
      const status = await adapter.getStatus();
      expect(status.id).toBe('gemini');
      expect(status.name).toBe('Google Gemini');
      expect(status.configured).toBe(false);
      expect(status.status).toBe('disconnected');
    });

    it('should return disconnected status when configured but not tested', async () => {
      await adapter.configure({ apiKey: 'test-key' });
      const status = await adapter.getStatus();
      expect(status.configured).toBe(true);
      expect(status.status).toBe('disconnected');
    });

    it('should return features containing Gemini capabilities', async () => {
      const status = await adapter.getStatus();
      expect(status.features).toContain('Gemini 1.5 Pro & Flash models');
      expect(status.features).toContain('Multimodal capabilities');
    });
  });

  describe('configure()', () => {
    it('should accept valid API key configuration', async () => {
      await adapter.configure({ apiKey: 'AIza-test-key-12345' });
      expect(adapter.isConfigured()).toBe(true);
    });

    it('should normalize temperature to default 0.7 when invalid', async () => {
      await adapter.configure({
        apiKey: 'test-key',
        temperature: 'invalid' as unknown as number,
      });
      const config = adapter.resolveConfig();
      expect(config.temperature).toBe(0.7);
    });
  });

  describe('testConnection()', () => {
    it('should return false when not configured', async () => {
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });

    it('should return true when API responds with content', async () => {
      await adapter.configure({ apiKey: 'valid-key' });
      mockHttp.post.mockReturnValue(
        of(
          mockResponse({
            candidates: [
              {
                content: {
                  parts: [{ text: 'OK' }],
                },
              },
            ],
          }),
        ),
      );
      const result = await adapter.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on network error', async () => {
      await adapter.configure({ apiKey: 'valid-key' });
      mockHttp.post.mockReturnValue(
        throwError(() => new Error('Network timeout')),
      );
      const result = await adapter.testConnection();
      expect(result).toBe(false);
      const status = await adapter.getStatus();
      expect(status.lastError).toBe('Network timeout');
    });

    it('should call Gemini API with correct endpoint structure', async () => {
      await adapter.configure({
        apiKey: 'test-api-key',
        model: 'gemini-1.5-pro',
      });
      mockHttp.post.mockReturnValue(
        of(
          mockResponse({
            candidates: [{ content: { parts: [{ text: 'OK' }] } }],
          }),
        ),
      );
      await adapter.testConnection();
      expect(mockHttp.post).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          contents: expect.any(Array),
          systemInstruction: expect.any(Object),
        }),
        expect.any(Object),
      );
    });
  });

  describe('edge cases', () => {
    it('should reset connection state after reconfiguration', async () => {
      await adapter.configure({ apiKey: 'key-1' });
      mockHttp.post.mockReturnValue(
        of(
          mockResponse({
            candidates: [{ content: { parts: [{ text: 'OK' }] } }],
          }),
        ),
      );
      await adapter.testConnection();
      let status = await adapter.getStatus();
      expect(status.status).toBe('connected');

      await adapter.configure({ apiKey: 'key-2' });
      status = await adapter.getStatus();
      expect(status.status).toBe('disconnected');
    });
  });
});
