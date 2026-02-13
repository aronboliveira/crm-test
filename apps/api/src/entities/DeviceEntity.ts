import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export type DeviceKind = 'physical' | 'virtual';
export type DeviceStatus = 'online' | 'offline' | 'maintenance';

@Entity('devices')
export default class DeviceEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  id!: string;

  @Index()
  @Column()
  ownerEmail!: string;

  @Index()
  @Column()
  name!: string;

  @Index()
  @Column()
  kind!: DeviceKind;

  @Column()
  vendor?: string;

  @Column()
  model?: string;

  @Column()
  operatingSystem?: string;

  @Column()
  host?: string;

  @Column()
  ipAddress?: string;

  @Column()
  serialNumber?: string;

  @Index()
  @Column()
  status!: DeviceStatus;

  @Column()
  tags?: string[];

  @Column()
  lastSeenAt?: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
