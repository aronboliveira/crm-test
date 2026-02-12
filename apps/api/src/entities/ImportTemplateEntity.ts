import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export type ImportTemplateKind = 'clients' | 'projects' | 'users';

export type ImportTemplateVersionSnapshot = Readonly<{
  version: number;
  createdAt: string;
  createdByEmail: string;
  changeNote?: string;
  profileKey?: string;
  columnMapping: Readonly<Record<string, string>>;
  defaultValues: Readonly<Record<string, string>>;
}>;

@Entity('import_templates')
export default class ImportTemplateEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  kind!: ImportTemplateKind;

  @Column()
  @Index()
  name!: string;

  @Column()
  @Index()
  nameNormalized!: string;

  @Column()
  description?: string;

  @Column()
  profileKey?: string;

  @Column()
  latestVersion!: number;

  @Column()
  usageCount!: number;

  @Column()
  columnMapping!: Record<string, string>;

  @Column()
  defaultValues!: Record<string, string>;

  @Column()
  versions!: ImportTemplateVersionSnapshot[];

  @Column()
  createdByEmail!: string;

  @Column()
  updatedByEmail!: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
