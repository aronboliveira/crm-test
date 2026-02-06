import DeepFreeze from '../utils/deepFreeze';
import type { PermissionKey } from '../types/permissions';

export type PermissionSpec = Readonly<{
  key: PermissionKey;
  description: string;
}>;

const catalog: readonly PermissionSpec[] = [
  { key: 'projects.read', description: 'Read projects' },
  { key: 'projects.write', description: 'Create/update projects' },
  { key: 'projects.manage', description: 'Administrative project actions' },

  { key: 'tasks.read', description: 'Read tasks' },
  { key: 'tasks.write', description: 'Create/update tasks' },
  { key: 'tasks.manage', description: 'Administrative task actions' },

  { key: 'users.read', description: 'Read users' },
  { key: 'users.write', description: 'Create/update users' },
  { key: 'users.manage', description: 'Administrative user actions' },

  { key: 'roles.read', description: 'Read roles' },
  { key: 'roles.write', description: 'Create/update roles' },
  { key: 'roles.manage', description: 'Administrative role actions' },

  { key: 'permissions.read', description: 'Read permission catalog' },
  {
    key: 'permissions.manage',
    description: 'Administrative permission actions',
  },

  { key: 'audit.read', description: 'Read audit logs' },
  { key: 'audit.write', description: 'Create audit entries' },
  { key: 'audit.manage', description: 'Administrative audit actions' },
] as const;

export default DeepFreeze.apply(catalog);
