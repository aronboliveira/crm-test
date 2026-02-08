import ROLES_CATALOG from './RolesCatalog';
import PERMISSIONS_CATALOG from './PermissionsCatalog';

describe('RolesCatalog', () => {
  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(ROLES_CATALOG)).toBe(true);
  });

  it('should have exactly 4 roles', () => {
    expect(ROLES_CATALOG).toHaveLength(4);
  });

  it('should contain admin, manager, member, viewer', () => {
    const keys = ROLES_CATALOG.map((r: any) => r.key);
    expect(keys).toContain('admin');
    expect(keys).toContain('manager');
    expect(keys).toContain('member');
    expect(keys).toContain('viewer');
  });

  it('each role should have key, name, description, permissions', () => {
    for (const role of ROLES_CATALOG as any) {
      expect(typeof role.key).toBe('string');
      expect(typeof role.name).toBe('string');
      expect(typeof role.description).toBe('string');
      expect(Array.isArray(role.permissions)).toBe(true);
      expect(role.permissions.length).toBeGreaterThan(0);
    }
  });

  it('admin should have all permissions', () => {
    const admin = (ROLES_CATALOG as any).find((r: any) => r.key === 'admin');
    expect(admin.permissions.length).toBeGreaterThanOrEqual(15);
    expect(admin.permissions).toContain('users.manage');
    expect(admin.permissions).toContain('projects.manage');
    expect(admin.permissions).toContain('tasks.manage');
  });

  it('viewer should have only read permissions', () => {
    const viewer = (ROLES_CATALOG as any).find((r: any) => r.key === 'viewer');
    for (const perm of viewer.permissions) {
      expect(perm).toMatch(/\.read$/);
    }
  });

  it('member should not have manage permissions', () => {
    const member = (ROLES_CATALOG as any).find((r: any) => r.key === 'member');
    const manages = member.permissions.filter((p: string) =>
      p.endsWith('.manage'),
    );
    expect(manages).toHaveLength(0);
  });
});

describe('PermissionsCatalog', () => {
  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(PERMISSIONS_CATALOG)).toBe(true);
  });

  it('should have permissions for all resource types', () => {
    const keys = (PERMISSIONS_CATALOG as any).map((p: any) => p.key);
    expect(keys).toContain('projects.read');
    expect(keys).toContain('tasks.read');
    expect(keys).toContain('users.read');
    expect(keys).toContain('roles.read');
    expect(keys).toContain('permissions.read');
    expect(keys).toContain('audit.read');
  });

  it('each permission should have key and description', () => {
    for (const perm of PERMISSIONS_CATALOG as any) {
      expect(typeof perm.key).toBe('string');
      expect(typeof perm.description).toBe('string');
      expect(perm.key).toMatch(/^[a-z]+\.(read|write|manage)$/);
    }
  });

  it('all role permissions should reference valid catalog entries', () => {
    const catalogKeys = new Set(
      (PERMISSIONS_CATALOG as any).map((p: any) => p.key),
    );
    for (const role of ROLES_CATALOG as any) {
      for (const perm of role.permissions) {
        expect(catalogKeys.has(perm)).toBe(true);
      }
    }
  });
});
