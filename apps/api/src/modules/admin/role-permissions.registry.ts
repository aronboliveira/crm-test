type RoleKey = 'viewer' | 'member' | 'manager' | 'admin';

type RoleSpec = Readonly<{
  key: RoleKey;
  label: string;
  perms: readonly string[];
}>;

const R = {
  viewer: {
    key: 'viewer',
    label: 'Viewer',
    perms: ['projects.read', 'tasks.read'],
  },
  member: {
    key: 'member',
    label: 'Member',
    perms: ['projects.read', 'tasks.read', 'tasks.create', 'tasks.write'],
  },
  manager: {
    key: 'manager',
    label: 'Manager',
    perms: [
      'projects.read',
      'projects.create',
      'projects.write',
      'tasks.read',
      'tasks.create',
      'tasks.write',
    ],
  },
  admin: {
    key: 'admin',
    label: 'Admin',
    perms: [
      'users.manage',
      'audit.read',
      'projects.manage',
      'tasks.manage',
      'projects.read',
      'projects.create',
      'projects.write',
      'tasks.read',
      'tasks.create',
      'tasks.write',
    ],
  },
} as const satisfies Record<RoleKey, RoleSpec>;

export default class RolePermissionsRegistry {
  static readonly all = Object.freeze(R);

  static normalizeRoleKey(v: unknown): RoleKey {
    const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
    return s === 'viewer' || s === 'member' || s === 'manager' || s === 'admin'
      ? (s as RoleKey)
      : 'viewer';
  }

  static perms(role: RoleKey): readonly string[] {
    return RolePermissionsRegistry.all[role].perms;
  }
}
