import { describe, it, expect } from "vitest";
import type { PermissionKey } from "../src/types/permissions.types";
import type {
  SessionUser,
  UserProfile,
  LoginResponse,
  ResetResponse,
} from "../src/types/auth.types";
import type {
  MainViewKey,
  MainViewSpec,
  MainViewRegistry,
} from "../src/types/views.types";
import type { CreateDTO, UpdateDTO } from "../src/types/api.types";
import type { MenuItem, MenuSection, NavItem } from "../src/types/menu.types";

describe("Type declarations", () => {
  describe("permissions.types", () => {
    it("should allow valid PermissionKey values", () => {
      const key: PermissionKey = "projects.read";
      expect(key).toBe("projects.read");
    });

    it("should cover all permission categories", () => {
      const keys: PermissionKey[] = [
        "projects.read",
        "projects.write",
        "projects.manage",
        "tasks.read",
        "tasks.write",
        "tasks.manage",
        "users.read",
        "users.write",
        "users.manage",
        "roles.read",
        "roles.write",
        "roles.manage",
        "permissions.read",
        "permissions.manage",
        "audit.read",
      ];
      expect(keys).toHaveLength(15);
    });
  });

  describe("auth.types", () => {
    it("SessionUser should have required fields", () => {
      const user: SessionUser = {
        sub: "user-id",
        email: "a@b.com",
        roles: ["admin"],
        perms: ["projects.read"],
      };
      expect(user.sub).toBe("user-id");
      expect(user.roles).toContain("admin");
    });

    it("UserProfile should have required fields", () => {
      const profile: UserProfile = {
        id: "123",
        email: "a@b.com",
      };
      expect(profile.id).toBe("123");
      expect(profile.name).toBeUndefined();
    });

    it("LoginResponse should contain accessToken and user", () => {
      const resp: LoginResponse = {
        accessToken: "tok",
        user: { sub: "1", email: "a@b.com", roles: [], perms: [] },
      };
      expect(resp.accessToken).toBe("tok");
    });

    it("ResetResponse should allow devResetToken", () => {
      const resp: ResetResponse = { devResetToken: "abc" };
      expect(resp.devResetToken).toBe("abc");
    });

    it("ResetResponse should work without devResetToken", () => {
      const resp: ResetResponse = {};
      expect(resp.devResetToken).toBeUndefined();
    });
  });

  describe("views.types", () => {
    it("MainViewKey should accept known values", () => {
      const keys: MainViewKey[] = ["dashboard", "projects", "tasks"];
      expect(keys).toHaveLength(3);
    });

    it("MainViewSpec should carry key, label, ariaLabel, and component", () => {
      const spec: MainViewSpec<"dashboard"> = {
        key: "dashboard",
        label: "Dashboard",
        ariaLabel: "Open dashboard",
        component: {} as any,
      };
      expect(spec.key).toBe("dashboard");
    });

    it("MainViewRegistry should have order and byKey", () => {
      const reg: MainViewRegistry<"a" | "b"> = {
        order: ["a", "b"],
        byKey: {
          a: {
            key: "a",
            label: "A",
            ariaLabel: "A view",
            component: {} as any,
          },
          b: {
            key: "b",
            label: "B",
            ariaLabel: "B view",
            component: {} as any,
          },
        },
      };
      expect(reg.order).toHaveLength(2);
      expect(reg.byKey.a.label).toBe("A");
    });
  });

  describe("api.types", () => {
    it("CreateDTO should accept arbitrary keys", () => {
      const dto: CreateDTO = { name: "test", value: 42 };
      expect(dto.name).toBe("test");
    });

    it("UpdateDTO should accept arbitrary keys", () => {
      const dto: UpdateDTO = { status: "done" };
      expect(dto.status).toBe("done");
    });
  });

  describe("menu.types", () => {
    it("MenuItem should have id, label, and to", () => {
      const item: MenuItem = { id: "x", label: "X", to: "/x" };
      expect(item.perm).toBeUndefined();
    });

    it("MenuItem can have an optional perm", () => {
      const item: MenuItem = {
        id: "y",
        label: "Y",
        to: "/y",
        perm: "users.read",
      };
      expect(item.perm).toBe("users.read");
    });

    it("MenuSection should hold readonly items array", () => {
      const section: MenuSection = {
        id: "s",
        label: "Section",
        items: [{ id: "a", label: "A", to: "/a" }],
      };
      expect(section.items).toHaveLength(1);
    });

    it("NavItem should have to, label, and key", () => {
      const nav: NavItem = { to: "/tasks", label: "Tasks", key: "tasks" };
      expect(nav.key).toBe("tasks");
    });
  });
});
