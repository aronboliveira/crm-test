export type ResourceKey =
  | 'projects'
  | 'tasks'
  | 'clients'
  | 'leads'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'audit';
export type ActionKey = 'read' | 'write' | 'manage';

export type PermissionKey = `${ResourceKey}.${ActionKey}`;

export type RoleKey = 'admin' | 'manager' | 'member' | 'viewer';
