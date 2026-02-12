import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';

const fakeOid = '507f1f77bcf86cd799439011';

const mockRepo = {
  find: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

function createService() {
  return new (ClientsService as any)(mockRepo) as ClientsService;
}

describe('ClientsService', () => {
  let service: ClientsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
  });

  describe('create', () => {
    it('throws when name is empty', async () => {
      await expect(service.create({ name: '   ' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when tipo empresa does not include CNPJ', async () => {
      await expect(
        service.create({
          name: 'Empresa sem CNPJ',
          type: 'empresa',
          cep: '01310-100',
        }),
      ).rejects.toThrow('CNPJ is required');
    });

    it('throws when tipo empresa does not include CEP', async () => {
      await expect(
        service.create({
          name: 'Empresa sem CEP',
          type: 'empresa',
          cnpj: '12.345.678/0001-90',
        }),
      ).rejects.toThrow('CEP is required');
    });

    it('normalizes CNPJ and CEP before saving', async () => {
      mockRepo.save.mockImplementation(async (payload) => payload);

      const result = await service.create({
        name: 'Empresa A',
        type: 'empresa',
        cnpj: '12345678000190',
        cep: '01310100',
      });

      expect(result.type).toBe('empresa');
      expect(result.cnpj).toBe('12.345.678/0001-90');
      expect(result.cep).toBe('01310-100');
    });

    it('defaults type to pessoa when omitted', async () => {
      mockRepo.save.mockImplementation(async (payload) => payload);

      const result = await service.create({ name: 'Cliente Pessoa' });
      expect(result.type).toBe('pessoa');
      expect(result.cnpj).toBeUndefined();
      expect(result.cep).toBeUndefined();
    });
  });

  describe('update', () => {
    it('throws for invalid object id', async () => {
      await expect(service.update('invalid-id', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws not found when client does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update(fakeOid, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when switching to empresa without CNPJ and CEP', async () => {
      mockRepo.findOne.mockResolvedValue({
        _id: fakeOid,
        name: 'Cliente B',
        type: 'pessoa',
      });

      await expect(
        service.update(fakeOid, {
          type: 'empresa',
        }),
      ).rejects.toThrow('CNPJ is required');
    });

    it('accepts switch to empresa when CNPJ and CEP are provided', async () => {
      const existing = {
        _id: fakeOid,
        id: fakeOid,
        name: 'Cliente C',
        type: 'pessoa',
      };
      const updated = {
        ...existing,
        type: 'empresa',
        cnpj: '12.345.678/0001-90',
        cep: '01310-100',
      };

      mockRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(fakeOid, {
        type: 'empresa',
        cnpj: '12345678000190',
        cep: '01310100',
      });

      expect(mockRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'empresa',
          cnpj: '12.345.678/0001-90',
          cep: '01310-100',
        }),
      );
      expect(result.type).toBe('empresa');
    });
  });
});
