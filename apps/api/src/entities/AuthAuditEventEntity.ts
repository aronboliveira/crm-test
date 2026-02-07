import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

// PODE SER CABEÇA ~600 REAIS

// TRANSPORTE ADIANTADO
// TRANSPORTE ~80 REAIS ADIANTADO
// TAXA 80 REAIS
// SERVIÇO EM X2
// PEÇAS À PARTE
// SERVIÇO -250 REAIS
// PODE SER DESENTUPIMENTO
// PEÇAS À PARTE

export type AuditKind =
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.password_reset.requested'
  | 'auth.password_reset.completed'
  | 'auth.password.changed'
  | 'auth.email.change_requested'
  | 'admin.user.role_changed'
  | 'admin.user.role_updated'
  | 'admin.user.force_reset'
  | 'admin.user.locked'
  | 'admin.user.unlocked'
  | 'admin.user.created'
  | 'admin.user.invite_issued'
  | 'admin.user.invite_reissued';

@Entity('auth_audit_events')
export default class AuthAuditEventEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index()
  @Column()
  kind!: AuditKind;

  @Index()
  @Column()
  createdAt!: string;

  @Index()
  @Column()
  actorUserId?: string;

  @Index()
  @Column()
  targetUserId?: string;

  @Index()
  @Column()
  actorEmailMasked?: string;

  @Index()
  @Column()
  targetEmailMasked?: string;

  @Index()
  @Column()
  actorEmailHash?: string;

  @Index()
  @Column()
  targetEmailHash?: string;

  @Index()
  @Column()
  ipHash?: string;

  @Column()
  userAgent?: string;

  @Column()
  meta?: Record<string, any>;
}
