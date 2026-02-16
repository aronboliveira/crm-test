import type { CepLookupGateway } from "./CepLookupGateway";
import type { ImportBlueprint } from "./ImportBlueprint";
import { ClientImportBlueprint } from "./blueprints/ClientImportBlueprint";
import { LeadImportBlueprint } from "./blueprints/LeadImportBlueprint";
import { ProjectImportBlueprint } from "./blueprints/ProjectImportBlueprint";
import { TaskImportBlueprint } from "./blueprints/TaskImportBlueprint";
import { UserImportBlueprint } from "./blueprints/UserImportBlueprint";
import type { ImportEntityKind } from "./ImportTypes";

export class ImportBlueprintRegistry {
  private readonly clientBlueprint: ClientImportBlueprint;
  private readonly leadBlueprint: LeadImportBlueprint;
  private readonly projectBlueprint: ProjectImportBlueprint;
  private readonly taskBlueprint: TaskImportBlueprint;
  private readonly userBlueprint: UserImportBlueprint;

  constructor(cepLookupGateway: CepLookupGateway) {
    this.clientBlueprint = new ClientImportBlueprint(cepLookupGateway);
    this.leadBlueprint = new LeadImportBlueprint();
    this.projectBlueprint = new ProjectImportBlueprint();
    this.taskBlueprint = new TaskImportBlueprint();
    this.userBlueprint = new UserImportBlueprint();
  }

  getClientBlueprint(): ClientImportBlueprint {
    return this.clientBlueprint;
  }

  resolve(
    kind: ImportEntityKind,
  ): ImportBlueprint<Record<string, unknown>, Record<string, unknown>> {
    if (kind === "clients") {
      return this.clientBlueprint as unknown as ImportBlueprint<
        Record<string, unknown>,
        Record<string, unknown>
      >;
    }
    if (kind === "projects") {
      return this.projectBlueprint as unknown as ImportBlueprint<
        Record<string, unknown>,
        Record<string, unknown>
      >;
    }
    if (kind === "tasks") {
      return this.taskBlueprint as unknown as ImportBlueprint<
        Record<string, unknown>,
        Record<string, unknown>
      >;
    }
    if (kind === "leads") {
      return this.leadBlueprint as unknown as ImportBlueprint<
        Record<string, unknown>,
        Record<string, unknown>
      >;
    }
    return this.userBlueprint as unknown as ImportBlueprint<
      Record<string, unknown>,
      Record<string, unknown>
    >;
  }
}
