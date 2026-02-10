import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('clients')
export default class ClientEntity {
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
  cellPhone?: string;

  @Column()
  whatsappNumber?: string;

  @Column()
  hasWhatsapp?: boolean;

  @Column()
  preferredContact?: string;

  @Column()
  whatsappAnalytics?: {
    sent?: number;
    delivered?: number;
    read?: number;
    replied?: number;
    lastMessageAt?: string;
  };

  @Column()
  emailAnalytics?: {
    sent?: number;
    opened?: number;
    clicked?: number;
    replied?: number;
    lastEmailAt?: string;
  };

  @Column()
  company?: string;

  @Column()
  notes?: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
