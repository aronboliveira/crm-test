import { computed } from "vue";
import { useRouter } from "vue-router";
import PolicyService from "../../../services/PolicyService";
import type { PermissionKey } from "../../../types/permissions.types";
import type { MenuSection } from "../../../types/menu.types";
import ObjectDeep, { type DeepReadonly } from "../../../utils/ObjectDeep";
import { usePolicyStore } from "../../../pinia/stores/policy.store";

export function useAsideMenu() {
  const _policy = usePolicyStore();

  const MENU: DeepReadonly<readonly MenuSection[]> = ObjectDeep.freeze([
    {
      id: "dash",
      label: "Dashboard",
      items: [
        {
          id: "projects",
          label: "Projects",
          to: "/dashboard/projects",
          perm: "projects.read",
        },
        {
          id: "tasks",
          label: "Tasks",
          to: "/dashboard/tasks",
          perm: "tasks.read",
        },
      ],
    },
    {
      id: "admin",
      label: "Admin",
      items: [
        {
          id: "users",
          label: "Users",
          to: "/admin/users",
          perm: "users.manage",
        },
        { id: "audit", label: "Audit", to: "/admin/audit", perm: "audit.read" },
        {
          id: "mailOutbox",
          label: "Mock Mail",
          to: "/admin/mail-outbox",
          perm: "users.manage",
        },
      ],
    },
  ] as const);

  const router = useRouter();

  const sections = computed(() =>
    MENU.map((s) => ({
      ...s,
      items: (s.items ?? []).filter((i) =>
        i.perm ? PolicyService.can(i.perm as PermissionKey) : true,
      ),
    })).filter((s) => s.items.length),
  );

  const go = async (to: string) => {
    try {
      if (!to?.trim()) {
        console.warn("[AsideMenu] go: empty route");
        return;
      }
      await router.push(to);
    } catch (e) {
      console.error("[AsideMenu] go failed:", e);
    }
  };

  return { sections, go, _policy };
}
