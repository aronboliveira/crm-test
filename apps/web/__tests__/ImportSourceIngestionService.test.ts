import { describe, expect, it, vi } from "vitest";
import {
  ClientImportBlueprint,
  ImportSourceIngestionService,
  ProjectImportBlueprint,
  UserImportBlueprint,
  type CepLookupGateway,
  type ImportSourceFileLike,
} from "../src/utils/import";

const createFile = (name: string, type: string, content: string): ImportSourceFileLike => ({
  name,
  type,
  text: vi.fn().mockResolvedValue(content),
});

describe("ImportSourceIngestionService", () => {
  it("ingests CSV clients and maps known headers", async () => {
    const service = new ImportSourceIngestionService();
    const cepGateway: CepLookupGateway = {
      lookup: vi.fn().mockResolvedValue({ ok: true, cep: "01310-100" }),
    };
    const blueprint = new ClientImportBlueprint(cepGateway);
    const file = createFile(
      "clientes.csv",
      "text/csv",
      "Nome;Tipo;E-mail;Empresa\nAna Silva;pessoa;ana@corp.local;Nexo",
    );

    const result = await service.ingest("clients", file, blueprint);

    expect(result.format).toBe("csv");
    expect(result.totalRows).toBe(1);
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.accepted[0]?.payload.name).toBe("Ana Silva");
    expect(result.accepted[0]?.payload.type).toBe("pessoa");
  });

  it("rejects invalid JSON rows and keeps field-level reasons", async () => {
    const service = new ImportSourceIngestionService();
    const blueprint = new UserImportBlueprint();
    const file = createFile(
      "usuarios.json",
      "application/json",
      JSON.stringify([{ email: "invalid-email", perfil: "admin" }]),
    );

    const result = await service.ingest("users", file, blueprint);

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.fieldErrors.email).toContain("E-mail inválido");
  });

  it("parses XML records and separates valid/invalid drafts", async () => {
    const service = new ImportSourceIngestionService();
    const blueprint = new ProjectImportBlueprint();
    const file = createFile(
      "projetos.xml",
      "application/xml",
      "<projects><project><name>Projeto Orion</name><status>active</status></project><project><name></name><status>done</status></project></projects>",
    );

    const result = await service.ingest("projects", file, blueprint);

    expect(result.format).toBe("xml");
    expect(result.totalRows).toBe(2);
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
  });

  it("supports Markdown table parsing", async () => {
    const service = new ImportSourceIngestionService();
    const blueprint = new ProjectImportBlueprint();
    const file = createFile(
      "projetos.md",
      "text/markdown",
      [
        "| name | status | owner_email | tags |",
        "| --- | --- | --- | --- |",
        "| Projeto Atlas | active | atlas@corp.local | growth,priority |",
      ].join("\n"),
    );

    const result = await service.ingest("projects", file, blueprint);

    expect(result.format).toBe("md");
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]?.payload.name).toBe("Projeto Atlas");
  });

  it("supports PDF in assisted key:value mode", async () => {
    const service = new ImportSourceIngestionService();
    const blueprint = new UserImportBlueprint();
    const file = createFile(
      "users.pdf",
      "application/pdf",
      "email: gerente@corp.local\nrole: manager\n\nemail: sem-email-valido\nrole: member",
    );

    const result = await service.ingest("users", file, blueprint);

    expect(result.format).toBe("pdf");
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
    expect(result.warnings[0]).toContain("modo assistido");
  });

  it("analyzes source columns before ingestion", async () => {
    const service = new ImportSourceIngestionService();
    const file = createFile(
      "clients.csv",
      "text/csv",
      "Nome;Email;Telefone\nAlice;alice@corp.local;11999999999",
    );

    const analysis = await service.analyze(file);

    expect(analysis.format).toBe("csv");
    expect(analysis.totalRows).toBe(1);
    expect(analysis.columns).toEqual(["Nome", "Email", "Telefone"]);
  });

  it("ingests rows using explicit column mapping", async () => {
    const service = new ImportSourceIngestionService();
    const cepGateway: CepLookupGateway = {
      lookup: vi.fn().mockResolvedValue({ ok: true, cep: "01310-100" }),
    };
    const blueprint = new ClientImportBlueprint(cepGateway);
    const file = createFile(
      "clientes-custom.csv",
      "text/csv",
      "full_name;mail;company_name;kind\nPaula Lima;paula@corp.local;Nexo;pessoa",
    );

    const withoutMapping = await service.ingest("clients", file, blueprint);
    expect(withoutMapping.accepted).toHaveLength(0);

    const withMapping = await service.ingest("clients", file, blueprint, {
      columnMapping: {
        name: "full_name",
        email: "mail",
        company: "company_name",
        type: "kind",
      },
    });

    expect(withMapping.accepted).toHaveLength(1);
    expect(withMapping.accepted[0]?.payload.name).toBe("Paula Lima");
  });

  it("applies default values when mapped/parsed field is empty", async () => {
    const service = new ImportSourceIngestionService();
    const blueprint = new UserImportBlueprint();
    const file = createFile(
      "users-defaults.csv",
      "text/csv",
      "email\ncolaborador@corp.local",
    );

    const result = await service.ingest("users", file, blueprint, {
      defaultValues: {
        roleKey: "member",
        department: "Operações",
      },
    });

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]?.payload.roleKey).toBe("member");
    expect(result.accepted[0]?.payload.department).toBe("Operações");
  });

  it("moves unmapped columns to notes when draft supports notes", async () => {
    const service = new ImportSourceIngestionService();
    const blueprint = new ProjectImportBlueprint();
    const file = createFile(
      "projects-extra.csv",
      "text/csv",
      "name,status,owner_email,legacy_phase,legacy_owner\nProjeto Neo,active,neo@corp.local,Fase Delta,Joao",
    );

    const result = await service.ingest("projects", file, blueprint);

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]?.payload.notes).toContain("legacy_phase");
    expect(result.accepted[0]?.payload.notes).toContain("legacy_owner");
  });

  it("throws for unsupported file format", async () => {
    const service = new ImportSourceIngestionService();
    const blueprint = new UserImportBlueprint();
    const file = createFile("users.bin", "application/octet-stream", "email,name");

    await expect(service.ingest("users", file, blueprint)).rejects.toThrow(
      "Formato não suportado",
    );
  });
});
