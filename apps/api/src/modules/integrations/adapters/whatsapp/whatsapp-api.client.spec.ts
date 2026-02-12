import { of } from 'rxjs';
import { WhatsAppApiClient } from './whatsapp-api.client';

describe('WhatsAppApiClient', () => {
  let httpService: { get: jest.Mock };
  let client: WhatsAppApiClient;

  beforeEach(() => {
    httpService = { get: jest.fn() };
    client = new WhatsAppApiClient(httpService as never);
    client.configure({
      accessToken: 'test-token',
      businessAccountId: 'waba-123',
      phoneNumberId: 'phone-123',
      apiVersion: 'v18.0',
    });
  });

  it('serializes conversation analytics array params safely', async () => {
    httpService.get.mockReturnValue(
      of({
        data: {
          data: [{ data_points: [] }],
        },
      }),
    );

    await client.getConversationAnalytics({
      start: 1700000000,
      end: 1700003600,
      granularity: 'DAY',
      phone_numbers: ['15551234567'],
      country_codes: ['BR'],
    });

    const [, options] = httpService.get.mock.calls[0];
    expect(options.params.phone_numbers).toBe('["15551234567"]');
    expect(options.params.country_codes).toBe('["BR"]');
  });

  it('skips non-serializable template_ids query param without throwing', async () => {
    const warnSpy = jest
      .spyOn((client as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const circular: unknown[] = [];
    circular.push(circular);

    httpService.get.mockReturnValue(
      of({
        data: {
          data: [],
        },
      }),
    );

    await expect(
      client.getTemplateAnalytics({
        start: 1700000000,
        end: 1700003600,
        granularity: 'DAY',
        template_ids: circular as unknown as string[],
      }),
    ).resolves.toEqual([]);

    const [, options] = httpService.get.mock.calls[0];
    expect(options.params.template_ids).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('template_ids'),
    );
  });
});
