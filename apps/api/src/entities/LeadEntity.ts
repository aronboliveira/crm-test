import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type LeadSource =
  | 'website'
  | 'referral'
  | 'social'
  | 'email_campaign'
  | 'cold_call'
  | 'event'
  | 'partner'
  | 'other';

export interface CampaignRef {
  id: string;
  name: string;
  channel: string;
  attachedAt: string;
}

export interface ContractRef {
  id: string;
  title: string;
  value?: number;
  attachedAt: string;
}

export interface CtaSuggestion {
  id: string;
  channel: 'email' | 'whatsapp' | 'sms' | 'linkedin' | 'call';
  message: string;
  createdAt: string;
  used: boolean;
}

@Entity('leads')
export default class LeadEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  id!: string;

  @Index()
  @Column()
  name!: string;

  @Column()
  email?: string;

  @Column()
  phone?: string;

  @Column()
  company?: string;

  @Index()
  @Column()
  status!: LeadStatus;

  @Index()
  @Column()
  source!: LeadSource;

  @Column()
  assignedTo?: string;

  @Column()
  estimatedValue?: number;

  @Column()
  notes?: string;

  @Column()
  tags?: string[];

  @Column()
  campaigns?: CampaignRef[];

  @Column()
  contracts?: ContractRef[];

  @Column()
  ctaSuggestions?: CtaSuggestion[];

  @Column()
  lastContactAt?: string;

  @Column()
  convertedClientId?: string;

  @Column()
  lostReason?: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
