import ApiClientService from "../../services/ApiClientService";
import AdminApiService from "../../services/AdminApiService";
import type { ClientImportPayload } from "./blueprints/ClientImportBlueprint";
import type { LeadImportPayload } from "./blueprints/LeadImportBlueprint";
import type { ProjectImportPayload } from "./blueprints/ProjectImportBlueprint";
import type { TaskImportPayload } from "./blueprints/TaskImportBlueprint";
import type { UserImportPayload } from "./blueprints/UserImportBlueprint";
import type { ImportEntityKind, ImportExecutionResult } from "./ImportTypes";

export interface ImportSubmitGateway {
  createClient(payload: ClientImportPayload): Promise<unknown>;
  createProject(payload: ProjectImportPayload): Promise<unknown>;
  createUser(payload: UserImportPayload): Promise<unknown>;
  createTask(payload: TaskImportPayload): Promise<unknown>;
  createLead(payload: LeadImportPayload): Promise<unknown>;
}

export class ApiImportSubmitGateway implements ImportSubmitGateway {
  async createClient(payload: ClientImportPayload): Promise<unknown> {
    return ApiClientService.clients.create(payload);
  }

  async createProject(payload: ProjectImportPayload): Promise<unknown> {
    return ApiClientService.projects.create(payload);
  }

  async createUser(payload: UserImportPayload): Promise<unknown> {
    return AdminApiService.userCreate(payload);
  }

  async createTask(payload: TaskImportPayload): Promise<unknown> {
    return ApiClientService.tasks.create(payload as Record<string, unknown>);
  }

  async createLead(payload: LeadImportPayload): Promise<unknown> {
    return ApiClientService.leads.create(payload as Record<string, unknown>);
  }
}

type ImportPayloadByKind = {
  clients: ClientImportPayload;
  projects: ProjectImportPayload;
  users: UserImportPayload;
  tasks: TaskImportPayload;
  leads: LeadImportPayload;
};

export class ImportExecutionService {
  private readonly gateway: ImportSubmitGateway;

  constructor(gateway: ImportSubmitGateway) {
    this.gateway = gateway;
  }

  async submit<TKind extends ImportEntityKind>(
    kind: TKind,
    payloads: readonly ImportPayloadByKind[TKind][],
  ): Promise<ImportExecutionResult> {
    const results: Array<{ index: number; ok: boolean; error?: string }> = [];

    for (let index = 0; index < payloads.length; index += 1) {
      const payload = payloads[index];
      try {
        if (kind === "clients") {
          await this.gateway.createClient(payload as ClientImportPayload);
        } else if (kind === "projects") {
          await this.gateway.createProject(payload as ProjectImportPayload);
        } else if (kind === "tasks") {
          await this.gateway.createTask(payload as TaskImportPayload);
        } else if (kind === "leads") {
          await this.gateway.createLead(payload as LeadImportPayload);
        } else {
          await this.gateway.createUser(payload as UserImportPayload);
        }
        results.push({ index, ok: true });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Falha ao importar registro";
        results.push({ index, ok: false, error: message });
      }
    }

    const successCount = results.filter((item) => item.ok).length;
    const failureCount = results.length - successCount;
    return {
      successCount,
      failureCount,
      items: results,
    };
  }
}
