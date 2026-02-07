import DeepFreeze from '../utils/deepFreeze';
import type { PermissionKey, RoleKey } from '../types/permissions';

export type RoleSpec = Readonly<{
  key: RoleKey;
  name: string;
  description: string;
  permissions: readonly PermissionKey[];
}>;

const roles: readonly RoleSpec[] = [
  {
    key: 'admin',
    name: 'Administrator',
    description: 'Full access',
    permissions: [
      'projects.read',
      'projects.write',
      'projects.manage',
      'tasks.read',
      'tasks.write',
      'tasks.manage',
      'users.read',
      'users.write',
      'users.manage',
      'roles.read',
      'roles.write',
      'roles.manage',
      'permissions.read',
      'permissions.manage',
      'audit.read',
      'audit.write',
      'audit.manage',
    ],
  },
  {
    key: 'manager',
    name: 'Manager',
    description: 'Manage projects and tasks; no user/role admin',
    permissions: [
      'projects.read',
      'projects.write',
      'tasks.read',
      'tasks.write',
      'users.read',
      'roles.read',
      'permissions.read',
    ],
  },
  {
    key: 'member',
    name: 'Member',
    description: 'Work on tasks; read projects',
    permissions: [
      'projects.read',
      'tasks.read',
      'tasks.write',
      'permissions.read',
    ],
  },
  {
    key: 'viewer',
    name: 'Viewer',
    description: 'Read-only',
    permissions: ['projects.read', 'tasks.read', 'permissions.read'],
  },
] as const;

export default DeepFreeze.apply(roles);
