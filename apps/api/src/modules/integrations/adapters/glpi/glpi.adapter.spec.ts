import { GlpiAdapter } from './glpi.adapter';
import { GlpiDataMapper } from './glpi-data.mapper';
import type { GlpiTicket, GlpiUser, GlpiEntity } from './glpi.types';

describe('GlpiAdapter', () => {
  let adapter: GlpiAdapter;

  beforeEach(() => {
    adapter = new GlpiAdapter();
  });

  describe('getStatus', () => {
    it('should return disconnected status when not configured', async () => {
      const status = await adapter.getStatus();

      expect(status.id).toBe('glpi');
      expect(status.name).toBe('GLPI');
      expect(status.type).toBe('Helpdesk/ITSM');
      expect(status.status).toBe('disconnected');
      expect(status.configured).toBe(false);
      expect(status.features).toHaveLength(5);
    });

    it('should report configured when config is set', async () => {
      await adapter.configure({
        baseUrl: 'https://glpi.example.com',
        apiKey: 'test-api-key',
        username: 'admin',
      });

      const status = await adapter.getStatus();
      expect(status.configured).toBe(true);
    });
  });

  describe('configure', () => {
    it('should merge configuration', async () => {
      await adapter.configure({ baseUrl: 'https://glpi.example.com' });
      await adapter.configure({ apiKey: 'test-key' });

      const status = await adapter.getStatus();
      expect(status.configured).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return false when not configured', async () => {
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });
  });
});

describe('GlpiDataMapper', () => {
  describe('ticketToCrmLead', () => {
    it('should map GLPI ticket to CRM lead', () => {
      const ticket: GlpiTicket = {
        id: 123,
        name: 'Test Ticket',
        content: 'Test content',
        status: 2,
        urgency: 3,
        impact: 3,
        priority: 3,
        date_creation: '2026-02-09T10:00:00Z',
        date_mod: '2026-02-09T11:00:00Z',
        entities_id: 1,
        users_id_recipient: 1,
        users_id_lastupdater: 1,
        type: 2,
      };

      const lead = GlpiDataMapper.ticketToCrmLead(ticket);

      expect(lead.title).toBe('Test Ticket');
      expect(lead.description).toBe('Test content');
      expect(lead.status).toBe('in_progress');
      expect(lead.priority).toBe('medium');
      expect(lead.source).toBe('glpi');
      expect(lead.sourceId).toBe('123');
    });

    it('should map priority correctly', () => {
      const lowPriority = { ...createBaseTicket(), priority: 1 };
      const mediumPriority = { ...createBaseTicket(), priority: 3 };
      const highPriority = { ...createBaseTicket(), priority: 4 };
      const urgentPriority = { ...createBaseTicket(), priority: 5 };

      expect(GlpiDataMapper.ticketToCrmLead(lowPriority).priority).toBe('low');
      expect(GlpiDataMapper.ticketToCrmLead(mediumPriority).priority).toBe(
        'medium',
      );
      expect(GlpiDataMapper.ticketToCrmLead(highPriority).priority).toBe(
        'high',
      );
      expect(GlpiDataMapper.ticketToCrmLead(urgentPriority).priority).toBe(
        'urgent',
      );
    });

    it('should map status correctly', () => {
      const newTicket = { ...createBaseTicket(), status: 1 as const };
      const processingTicket = { ...createBaseTicket(), status: 2 as const };
      const pendingTicket = { ...createBaseTicket(), status: 4 as const };
      const solvedTicket = { ...createBaseTicket(), status: 5 as const };
      const closedTicket = { ...createBaseTicket(), status: 6 as const };

      expect(GlpiDataMapper.ticketToCrmLead(newTicket).status).toBe('new');
      expect(GlpiDataMapper.ticketToCrmLead(processingTicket).status).toBe(
        'in_progress',
      );
      expect(GlpiDataMapper.ticketToCrmLead(pendingTicket).status).toBe(
        'pending',
      );
      expect(GlpiDataMapper.ticketToCrmLead(solvedTicket).status).toBe(
        'resolved',
      );
      expect(GlpiDataMapper.ticketToCrmLead(closedTicket).status).toBe(
        'closed',
      );
    });
  });

  describe('userToCrmContact', () => {
    it('should map GLPI user to CRM contact', () => {
      const user: GlpiUser = {
        id: 1,
        name: 'johndoe',
        realname: 'Doe',
        firstname: 'John',
        email: 'john.doe@example.com',
        phone: '1234567890',
        mobile: '0987654321',
        is_active: true,
        entities_id: 1,
      };

      const contact = GlpiDataMapper.userToCrmContact(user);

      expect(contact.firstName).toBe('John');
      expect(contact.lastName).toBe('Doe');
      expect(contact.email).toBe('john.doe@example.com');
      expect(contact.phone).toBe('1234567890');
      expect(contact.mobile).toBe('0987654321');
      expect(contact.isActive).toBe(true);
      expect(contact.source).toBe('glpi');
      expect(contact.sourceId).toBe('1');
    });
  });

  describe('entityToCrmClient', () => {
    it('should map GLPI entity to CRM client', () => {
      const entity: GlpiEntity = {
        id: 1,
        name: 'Acme Corp',
        completename: 'Root > Acme Corp',
        entities_id: 0,
        comment: 'Main client',
        level: 1,
      };

      const client = GlpiDataMapper.entityToCrmClient(entity);

      expect(client.name).toBe('Acme Corp');
      expect(client.fullName).toBe('Root > Acme Corp');
      expect(client.description).toBe('Main client');
      expect(client.source).toBe('glpi');
      expect(client.sourceId).toBe('1');
    });
  });

  describe('crmLeadToTicketPayload', () => {
    it('should create GLPI ticket payload from CRM lead', () => {
      const lead = {
        title: 'New Issue',
        description: 'Issue description',
        status: 'new',
        priority: 'high' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const payload = GlpiDataMapper.crmLeadToTicketPayload(lead);

      expect(payload.input.name).toBe('New Issue');
      expect(payload.input.content).toBe('Issue description');
      expect(payload.input.urgency).toBe(4);
      expect(payload.input.impact).toBe(4);
      expect(payload.input.type).toBe(2);
    });
  });

  describe('mapCrmStatusToGlpiStatus', () => {
    it('should map CRM status to GLPI status', () => {
      expect(GlpiDataMapper.mapCrmStatusToGlpiStatus('new')).toBe(1);
      expect(GlpiDataMapper.mapCrmStatusToGlpiStatus('in_progress')).toBe(2);
      expect(GlpiDataMapper.mapCrmStatusToGlpiStatus('pending')).toBe(4);
      expect(GlpiDataMapper.mapCrmStatusToGlpiStatus('resolved')).toBe(5);
      expect(GlpiDataMapper.mapCrmStatusToGlpiStatus('closed')).toBe(6);
      expect(
        GlpiDataMapper.mapCrmStatusToGlpiStatus('unknown'),
      ).toBeUndefined();
    });
  });
});

function createBaseTicket(): GlpiTicket {
  return {
    id: 1,
    name: 'Test',
    content: 'Content',
    status: 1,
    urgency: 3,
    impact: 3,
    priority: 3,
    date_creation: '2026-02-09T10:00:00Z',
    date_mod: '2026-02-09T10:00:00Z',
    entities_id: 1,
    users_id_recipient: 1,
    users_id_lastupdater: 1,
    type: 1,
  };
}
