import { describe, expect, it, vi } from "vitest";
import {
  ClientImportBlueprint,
  LeadImportBlueprint,
  ProjectImportBlueprint,
  TaskImportBlueprint,
  UserImportBlueprint,
  type CepLookupGateway,
} from "../src/utils/import";

describe("Import blueprints", () => {
  it("ClientImportBlueprint should enforce CNPJ/CEP for tipo empresa", () => {
    const gateway: CepLookupGateway = {
      lookup: vi.fn().mockResolvedValue({ ok: true, cep: "01310-100" }),
    };
    const blueprint = new ClientImportBlueprint(gateway);
    const draft = blueprint.createDraft();
    draft.name = "Cliente ACME";
    draft.type = "empresa";
    draft.email = "contato@acme.com";

    const errors = blueprint.validateDraftSync(draft);
    expect(errors.cnpj).toContain("CNPJ");
    expect(errors.cep).toContain("CEP");
  });

  it("ClientImportBlueprint should validate CEP through gateway", async () => {
    const gateway: CepLookupGateway = {
      lookup: vi.fn().mockResolvedValue({
        ok: false,
        cep: "01310-100",
        message: "CEP não encontrado na BrasilAPI.",
      }),
    };
    const blueprint = new ClientImportBlueprint(gateway);
    const draft = blueprint.createDraft();
    draft.name = "Empresa XPTO";
    draft.type = "empresa";
    draft.cnpj = "12.345.678/0001-90";
    draft.cep = "01310-100";

    const result = await blueprint.validateDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors.cep).toContain("CEP");
  });

  it("ProjectImportBlueprint should parse tags and normalize payload", () => {
    const blueprint = new ProjectImportBlueprint();
    const draft = blueprint.createDraft();
    draft.name = "Projeto Saturno";
    draft.status = "active";
    draft.code = "sat-100";
    draft.tags = "infra, backend; urgent";

    const payload = blueprint.toPayload(draft);
    expect(payload.name).toBe("Projeto Saturno");
    expect(payload.code).toBe("SAT-100");
    expect(payload.tags).toEqual(["infra", "backend", "urgent"]);
  });

  it("UserImportBlueprint should validate required email and role", () => {
    const blueprint = new UserImportBlueprint();
    const draft = blueprint.createDraft();
    draft.email = "invalid-email";
    draft.roleKey = "member";

    const errors = blueprint.validateDraftSync(draft);
    expect(errors.email).toContain("inválido");
  });

  it("TaskImportBlueprint should validate required title and normalize payload", () => {
    const blueprint = new TaskImportBlueprint();
    const draft = blueprint.createDraft();
    draft.title = "";
    draft.status = "doing";
    draft.priority = 4;
    draft.tags = "frontend, urgent; api";

    const errors = blueprint.validateDraftSync(draft);
    expect(errors.title).toContain("obrigatório");

    draft.title = "Implement import flow";
    const payload = blueprint.toPayload(draft);
    expect(payload.title).toBe("Implement import flow");
    expect(payload.status).toBe("doing");
    expect(payload.priority).toBe(4);
    expect(payload.tags).toEqual(["frontend", "urgent", "api"]);
  });

  it("LeadImportBlueprint should validate email and normalize payload", () => {
    const blueprint = new LeadImportBlueprint();
    const draft = blueprint.createDraft();
    draft.name = "Lead ACME";
    draft.email = "invalid";
    draft.source = "website";
    draft.status = "new";

    const errors = blueprint.validateDraftSync(draft);
    expect(errors.email).toContain("inválido");

    draft.email = "lead@acme.com";
    draft.tags = "enterprise, hot";
    draft.estimatedValue = "15000";
    const payload = blueprint.toPayload(draft);
    expect(payload.name).toBe("Lead ACME");
    expect(payload.email).toBe("lead@acme.com");
    expect(payload.tags).toEqual(["enterprise", "hot"]);
    expect(payload.estimatedValue).toBe(15000);
  });
});
