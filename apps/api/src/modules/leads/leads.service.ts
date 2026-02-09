import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import LeadEntity, {
  type CampaignRef,
  type ContractRef,
  type CtaSuggestion,
  type LeadSource,
  type LeadStatus,
} from '../../entities/LeadEntity';
import { ObjectId } from 'mongodb';

/** Valid lead statuses for pipeline progression. */
const VALID_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

/** Valid lead acquisition sources for tracking. */
const VALID_SOURCES: LeadSource[] = [
  'website',
  'referral',
  'social',
  'email_campaign',
  'cold_call',
  'event',
  'partner',
  'other',
];

/** Call-to-action message templates by channel. */
const CTA_TEMPLATES: Record<string, string[]> = {
  email: [
    'Olá {name}, notamos seu interesse em {company}. Podemos agendar uma demonstração?',
    'Oi {name}! Temos uma proposta exclusiva para a {company}. Vamos conversar?',
    '{name}, sua avaliação gratuita está pronta. Acesse agora!',
  ],
  whatsapp: [
    'Olá {name}! Sou do time comercial. Vi que você demonstrou interesse, posso ajudar?',
    'Oi {name}, tudo bem? Temos novidades que podem interessar a {company}!',
  ],
  sms: [
    '{name}, aproveite 15% off no plano empresarial. Responda SIM para saber mais.',
    'Sua demo está agendada para amanhã. Confirme respondendo OK.',
  ],
  linkedin: [
    'Olá {name}, adoraria conectar e compartilhar como ajudamos empresas como a {company}.',
    '{name}, temos um case de sucesso no seu setor. Posso compartilhar?',
  ],
  call: [
    'Roteiro: cumprimentar → perguntar sobre dores atuais → apresentar solução → agendar follow-up',
    'Roteiro: retomar última conversa → apresentar proposta → negociar termos',
  ],
};

/**
 * Service responsible for managing lead entities in the sales pipeline.
 * Provides CRUD operations, filtering, and CTA suggestion generation.
 *
 * @example
 * ```typescript
 * const leads = await leadsService.findAll('John', 'qualified');
 * const newLead = await leadsService.create({ name: 'Jane Doe', source: 'referral' });
 * ```
 */
@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly repo: MongoRepository<LeadEntity>,
  ) {}

  /**
   * Retrieves all leads, optionally filtered by name and status.
   * @param q - Optional search query for filtering by name (case-insensitive)
   * @param status - Optional status filter (new, contacted, qualified, etc.)
   * @returns Array of matching lead entities
   */
  async findAll(q?: string, status?: string): Promise<LeadEntity[]> {
    const where: any = {};
    if (q) {
      where.name = { $regex: new RegExp(q, 'i') };
    }
    if (status && VALID_STATUSES.includes(status as LeadStatus)) {
      where.status = status;
    }
    return this.repo.find({
      where: Object.keys(where).length ? where : undefined,
    });
  }

  /**
   * Retrieves a single lead by ID.
   * @param id - The MongoDB ObjectId string of the lead
   * @returns The lead entity
   * @throws BadRequestException if ID is invalid
   * @throws NotFoundException if lead doesn't exist
   */
  async findOne(id: string): Promise<LeadEntity> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    const lead = await this.repo.findOne({ where: { _id: oid } as any });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  /**
   * Creates a new lead in the pipeline.
   * @param dto - The lead data transfer object
   * @returns The newly created lead entity
   * @throws BadRequestException if name is missing
   */
  async create(dto: any): Promise<LeadEntity> {
    const name = typeof dto?.name === 'string' ? dto.name.trim() : '';
    if (!name) throw new BadRequestException('Name is required');

    const status: LeadStatus = VALID_STATUSES.includes(dto?.status)
      ? dto.status
      : 'new';

    const source: LeadSource = VALID_SOURCES.includes(dto?.source)
      ? dto.source
      : 'other';

    const now = new Date().toISOString();
    const id = new ObjectId().toHexString();

    return this.repo.save({
      id,
      name,
      email:
        typeof dto?.email === 'string' && dto.email.trim()
          ? dto.email.trim()
          : undefined,
      phone:
        typeof dto?.phone === 'string' && dto.phone.trim()
          ? dto.phone.trim()
          : undefined,
      company:
        typeof dto?.company === 'string' && dto.company.trim()
          ? dto.company.trim()
          : undefined,
      status,
      source,
      assignedTo:
        typeof dto?.assignedTo === 'string' && dto.assignedTo.trim()
          ? dto.assignedTo.trim()
          : undefined,
      estimatedValue:
        typeof dto?.estimatedValue === 'number'
          ? dto.estimatedValue
          : undefined,
      notes:
        typeof dto?.notes === 'string' && dto.notes.trim()
          ? dto.notes.trim()
          : undefined,
      tags: Array.isArray(dto?.tags)
        ? dto.tags.filter((t: any) => typeof t === 'string')
        : undefined,
      campaigns: [],
      contracts: [],
      ctaSuggestions: [],
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  async update(id: string, dto: any): Promise<LeadEntity> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');

    const cur = await this.repo.findOne({ where: { _id: oid } as any });
    if (!cur) throw new NotFoundException('Lead not found');

    const patch: any = { updatedAt: new Date().toISOString() };

    if (typeof dto?.name === 'string' && dto.name.trim())
      patch.name = dto.name.trim();
    if (dto?.status && VALID_STATUSES.includes(dto.status))
      patch.status = dto.status;
    if (dto?.source && VALID_SOURCES.includes(dto.source))
      patch.source = dto.source;
    if ('email' in (dto || {}))
      patch.email =
        typeof dto?.email === 'string' && dto.email.trim()
          ? dto.email.trim()
          : undefined;
    if ('phone' in (dto || {}))
      patch.phone =
        typeof dto?.phone === 'string' && dto.phone.trim()
          ? dto.phone.trim()
          : undefined;
    if ('company' in (dto || {}))
      patch.company =
        typeof dto?.company === 'string' && dto.company.trim()
          ? dto.company.trim()
          : undefined;
    if ('assignedTo' in (dto || {}))
      patch.assignedTo =
        typeof dto?.assignedTo === 'string' && dto.assignedTo.trim()
          ? dto.assignedTo.trim()
          : undefined;
    if ('estimatedValue' in (dto || {}))
      patch.estimatedValue =
        typeof dto?.estimatedValue === 'number'
          ? dto.estimatedValue
          : undefined;
    if ('notes' in (dto || {}))
      patch.notes =
        typeof dto?.notes === 'string' && dto.notes.trim()
          ? dto.notes.trim()
          : undefined;
    if (Array.isArray(dto?.tags))
      patch.tags = dto.tags.filter((t: any) => typeof t === 'string');
    if ('lostReason' in (dto || {}))
      patch.lostReason =
        typeof dto?.lostReason === 'string' && dto.lostReason.trim()
          ? dto.lostReason.trim()
          : undefined;
    if ('convertedClientId' in (dto || {}))
      patch.convertedClientId =
        typeof dto?.convertedClientId === 'string'
          ? dto.convertedClientId.trim()
          : undefined;
    if ('lastContactAt' in (dto || {}))
      patch.lastContactAt =
        typeof dto?.lastContactAt === 'string' ? dto.lastContactAt : undefined;

    await this.repo.update(oid as any, patch);
    return (await this.repo.findOne({ where: { _id: oid } as any })) as any;
  }

  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    const result = await this.repo.delete(oid as any);
    if (!result.affected) throw new NotFoundException('Lead not found');
  }

  /* ── Campaign attachment ──────────────────────────────── */

  async attachCampaign(
    id: string,
    campaign: Omit<CampaignRef, 'attachedAt'>,
  ): Promise<LeadEntity> {
    const lead = await this.findOne(id);
    const ref: CampaignRef = {
      ...campaign,
      attachedAt: new Date().toISOString(),
    };
    const campaigns = [...(lead.campaigns || []), ref];
    await this.repo.update(lead._id as any, {
      campaigns,
      updatedAt: new Date().toISOString(),
    });
    return (await this.repo.findOne({
      where: { _id: lead._id } as any,
    })) as any;
  }

  async detachCampaign(id: string, campaignId: string): Promise<LeadEntity> {
    const lead = await this.findOne(id);
    const campaigns = (lead.campaigns || []).filter((c) => c.id !== campaignId);
    await this.repo.update(lead._id as any, {
      campaigns,
      updatedAt: new Date().toISOString(),
    });
    return (await this.repo.findOne({
      where: { _id: lead._id } as any,
    })) as any;
  }

  /* ── Contract attachment ──────────────────────────────── */

  async attachContract(
    id: string,
    contract: Omit<ContractRef, 'attachedAt'>,
  ): Promise<LeadEntity> {
    const lead = await this.findOne(id);
    const ref: ContractRef = {
      ...contract,
      attachedAt: new Date().toISOString(),
    };
    const contracts = [...(lead.contracts || []), ref];
    await this.repo.update(lead._id as any, {
      contracts,
      updatedAt: new Date().toISOString(),
    });
    return (await this.repo.findOne({
      where: { _id: lead._id } as any,
    })) as any;
  }

  async detachContract(id: string, contractId: string): Promise<LeadEntity> {
    const lead = await this.findOne(id);
    const contracts = (lead.contracts || []).filter((c) => c.id !== contractId);
    await this.repo.update(lead._id as any, {
      contracts,
      updatedAt: new Date().toISOString(),
    });
    return (await this.repo.findOne({
      where: { _id: lead._id } as any,
    })) as any;
  }

  /* ── CTA suggestion generator ─────────────────────────── */

  generateCtaSuggestions(
    lead: LeadEntity,
    channels?: string[],
  ): CtaSuggestion[] {
    const targets = channels?.length
      ? channels.filter((c) => c in CTA_TEMPLATES)
      : Object.keys(CTA_TEMPLATES);

    const suggestions: CtaSuggestion[] = [];
    const name = lead.name || 'Cliente';
    const company = lead.company || 'sua empresa';

    for (const channel of targets) {
      const templates = CTA_TEMPLATES[channel] || [];
      const tpl = templates[Math.floor(Math.random() * templates.length)];
      if (!tpl) continue;

      suggestions.push({
        id: new ObjectId().toHexString(),
        channel: channel as CtaSuggestion['channel'],
        message: tpl
          .replace(/\{name\}/g, name)
          .replace(/\{company\}/g, company),
        createdAt: new Date().toISOString(),
        used: false,
      });
    }
    return suggestions;
  }

  async refreshCtaSuggestions(
    id: string,
    channels?: string[],
  ): Promise<LeadEntity> {
    const lead = await this.findOne(id);
    const newSuggestions = this.generateCtaSuggestions(lead, channels);
    const existing = (lead.ctaSuggestions || []).filter((s) => s.used);
    const ctaSuggestions = [...existing, ...newSuggestions];
    await this.repo.update(lead._id as any, {
      ctaSuggestions,
      updatedAt: new Date().toISOString(),
    });
    return (await this.repo.findOne({
      where: { _id: lead._id } as any,
    })) as any;
  }

  async markCtaUsed(id: string, ctaId: string): Promise<LeadEntity> {
    const lead = await this.findOne(id);
    const ctaSuggestions = (lead.ctaSuggestions || []).map((s) =>
      s.id === ctaId ? { ...s, used: true } : s,
    );
    await this.repo.update(lead._id as any, {
      ctaSuggestions,
      updatedAt: new Date().toISOString(),
    });
    return (await this.repo.findOne({
      where: { _id: lead._id } as any,
    })) as any;
  }
}
