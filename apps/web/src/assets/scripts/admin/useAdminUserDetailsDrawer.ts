import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Swal from "sweetalert2";
import AdminApiService from "../../../services/AdminApiService";
import AlertService from "../../../services/AlertService";
import KeybindCoordinatorService from "../../../services/KeybindCoordinatorService";
import type {
  AdminUserDetails,
  AdminUserRow,
} from "../../../types/admin.types";
import type { ResetResponse } from "../../../types/auth.types";

export interface UserProjectSummary {
  id: string;
  code: string;
  name: string;
  status: string;
  role: string;
}

export interface UserTaskSummary {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueAt: string | null;
}

export interface UserActivityEntry {
  id: string;
  action: string;
  target: string;
  when: string;
}

export interface AdminUserDetailsDrawerProps {
  open: boolean;
  userId: string | null;
}

export interface AdminUserDetailsDrawerEmits {
  (e: "close"): void;
  (e: "updated"): void;
}

/* ---- Mock data generators ---- */
function mockProjects(email: string): UserProjectSummary[] {
  const statuses = ["active", "planned", "done", "blocked"];
  const roles = ["Responsável", "Colaborador", "Revisor"];
  return Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, i) => ({
    id: `proj-${i}`,
    code: `PRJ-${String(100 + i).padStart(3, "0")}`,
    name: `Projeto ${["Alpha", "Beta", "Gamma", "Delta", "Epsilon"][i % 5]}`,
    status: statuses[i % statuses.length],
    role: roles[i % roles.length],
  }));
}

function mockTasks(email: string): UserTaskSummary[] {
  const statuses = ["todo", "doing", "done", "blocked"];
  const titles = [
    "Implementar autenticação OAuth",
    "Revisar módulo de relatórios",
    "Corrigir bug de paginação",
    "Atualizar documentação da API",
    "Otimizar consultas do banco",
  ];
  return Array.from({ length: Math.floor(Math.random() * 4) + 2 }, (_, i) => ({
    id: `task-${i}`,
    title: titles[i % titles.length],
    status: statuses[i % statuses.length],
    priority: (i % 5) + 1,
    dueAt:
      i % 3 === 0
        ? null
        : new Date(Date.now() + (i - 1) * 86400000 * 3).toISOString(),
  }));
}

function mockActivity(email: string): UserActivityEntry[] {
  const actions = [
    "Criou tarefa",
    "Atualizou projeto",
    "Concluiu tarefa",
    "Comentou em",
    "Alterou status de",
    "Atribuiu tarefa para",
  ];
  const targets = [
    "PRJ-101 / Módulo Auth",
    "TASK-204 / Integração API",
    "PRJ-103 / Dashboards",
    "TASK-311 / Testes E2E",
    "PRJ-105 / Migração DB",
  ];
  return Array.from({ length: 5 }, (_, i) => ({
    id: `act-${i}`,
    action: actions[i % actions.length],
    target: targets[i % targets.length],
    when: new Date(Date.now() - i * 3600000 * (i + 2)).toLocaleString("pt-BR"),
  }));
}

const MOCK_COMPETENCIES = [
  "TypeScript",
  "Vue.js",
  "NestJS",
  "MongoDB",
  "Docker",
  "CI/CD",
  "Testes",
  "REST APIs",
];

const MOCK_WORK_ROLES: Record<string, string> = {
  admin: "Administrador de Sistemas",
  manager: "Gerente de Projetos",
  member: "Desenvolvedor Full-Stack",
  viewer: "Analista / Observador",
};

export function useAdminUserDetailsDrawer(
  props: AdminUserDetailsDrawerProps,
  emit: AdminUserDetailsDrawerEmits,
) {
  const busy = ref(false);
  const details = ref<AdminUserDetails | null>(null);

  const user = computed(() => details.value?.user || null);
  const audit = computed(() => details.value?.audit || []);

  /* ---- Enriched data for expanded drawer ---- */
  const userProjects = ref<UserProjectSummary[]>([]);
  const userTasks = ref<UserTaskSummary[]>([]);
  const userActivity = ref<UserActivityEntry[]>([]);
  const userCompetencies = ref<string[]>([]);
  const userWorkRole = ref("");

  const load = async () => {
    try {
      if (!props.open) return;
      const id = props.userId ? String(props.userId) : "";
      if (!id || busy.value) {
        if (!id) {
          console.warn("[AdminUserDetailsDrawer] load: no userId provided");
        }
        return;
      }

      busy.value = true;
      details.value = await AdminApiService.userDetails(id);

      // Load enriched data (mock for portfolio demo)
      const email = details.value?.user?.email || "";
      const roleKey = details.value?.user?.roleKey || "member";
      userProjects.value = mockProjects(email);
      userTasks.value = mockTasks(email);
      userActivity.value = mockActivity(email);
      userCompetencies.value = MOCK_COMPETENCIES.slice(
        0,
        Math.floor(Math.random() * 4) + 3,
      );
      userWorkRole.value =
        MOCK_WORK_ROLES[roleKey] || "Colaborador";
    } catch (e) {
      console.error("[AdminUserDetailsDrawer] load failed:", e);
      await AlertService.error("Falha ao carregar detalhes do usuário", e);
      details.value = null;
    } finally {
      busy.value = false;
    }
  };

  const close = () => emit("close");

  const setRole = async (u: AdminUserRow) => {
    try {
      if (!u?.id) {
        console.error("[AdminUserDetailsDrawer] setRole: invalid user object");
        return;
      }

      const { value, isConfirmed } = await Swal.fire({
        title: "Alterar perfil",
        input: "select",
        inputOptions: {
          viewer: "Visualizador",
          member: "Membro",
          manager: "Gerente",
          admin: "Administrador",
        },
        inputValue: u.roleKey || "viewer",
        showCancelButton: true,
        confirmButtonText: "Aplicar",
        cancelButtonText: "Cancelar",
      });

      if (!isConfirmed) return;

      await AdminApiService.userSetRole(u.id, String(value || "viewer"));
      await AlertService.success("Perfil atualizado");
      emit("updated");
      await load();
    } catch (e) {
      console.error("[AdminUserDetailsDrawer] setRole failed:", e);
      await AlertService.error("Falha ao atualizar perfil", e);
    }
  };

  const forceReset = async (u: AdminUserRow) => {
    try {
      if (!u?.id) {
        console.error(
          "[AdminUserDetailsDrawer] forceReset: invalid user object",
        );
        return;
      }

      const { isConfirmed } = await Swal.fire({
        title: "Forçar redefinição de senha?",
        text: `Isso invalidará as sessões de "${u.email}".`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Forçar redefinição",
        cancelButtonText: "Cancelar",
      });

      if (!isConfirmed) return;

      const r: ResetResponse = await AdminApiService.userForceReset(u.id);

      if (r?.devResetToken) {
        await Swal.fire({
          title: "Token de redefinição (dev)",
          html: `<code style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${String(r.devResetToken)}</code>`,
          confirmButtonText: "OK",
        });
      } else {
        await AlertService.success("Redefinição forçada aplicada");
      }

      emit("updated");
      await load();
    } catch (e) {
      console.error("[AdminUserDetailsDrawer] forceReset failed:", e);
      await AlertService.error("Falha ao forçar redefinição", e);
    }
  };

  const kb = (ev: KeyboardEvent) => {
    if (!props.open) return;
    ev.key === "Escape" ? close() : void 0;
  };

  const lockUser = async (u: AdminUserRow) => {
    const { value, isConfirmed } = await Swal.fire({
      title: "Bloquear conta",
      input: "text",
      inputLabel: "Motivo (opcional)",
      inputPlaceholder: "ex.: conta possivelmente comprometida",
      showCancelButton: true,
      confirmButtonText: "Bloquear",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;

    try {
      await AdminApiService.userLock(u.id, String(value || "bloqueado"));
      await AlertService.success("Usuário bloqueado");
      emit("updated");
      await load();
    } catch (e) {
      await AlertService.error("Falha ao bloquear usuário", e);
    }
  };

  const unlockUser = async (u: AdminUserRow) => {
    const { isConfirmed } = await Swal.fire({
      title: "Desbloquear conta?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Desbloquear",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;

    try {
      await AdminApiService.userUnlock(u.id);
      await AlertService.success("Usuário desbloqueado");
      emit("updated");
      await load();
    } catch (e) {
      await AlertService.error("Falha ao desbloquear usuário", e);
    }
  };

  const reissueInvite = async (u: AdminUserRow) => {
    const { isConfirmed } = await Swal.fire({
      title: "Reenviar convite?",
      text: `Um novo token de redefinição será gerado para "${u.email}" (limitado por taxa).`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Reenviar",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;

    try {
      const r: any = await AdminApiService.userReissueInvite(u.id);
      const url = r?.invite?.resetUrl ? String(r.invite.resetUrl) : "";

      url
        ? await Swal.fire({
            title: "Convite enviado",
            html: `<div style="text-align:left">
                    <div><strong>URL de redefinição:</strong></div>
                    <code style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${url}</code>
                  </div>`,
            confirmButtonText: "OK",
          })
        : await AlertService.success(
            "Convite enviado",
            "Abra Admin → E-mails Mock para copiar a URL.",
          );

      emit("updated");
      await load();
    } catch (e) {
      await AlertService.error("Falha ao reenviar convite", e);
    }
  };

  onMounted(() => KeybindCoordinatorService.on(kb));
  onUnmounted(() => KeybindCoordinatorService.off(kb));

  watch(
    () => [props.open, props.userId],
    async () => {
      await load();
    },
    { immediate: true },
  );

  return {
    busy,
    details,
    user,
    audit,
    userProjects,
    userTasks,
    userActivity,
    userCompetencies,
    userWorkRole,
    close,
    setRole,
    forceReset,
    lockUser,
    unlockUser,
    reissueInvite,
  };
}
