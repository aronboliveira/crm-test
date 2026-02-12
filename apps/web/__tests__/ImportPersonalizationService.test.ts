import { describe, expect, it } from "vitest";
import {
  ImportPersonalizationService,
  type ImportMappingTemplate,
} from "../src/utils/import";

class MemoryStorage {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const createService = () =>
  new ImportPersonalizationService({
    storage: new MemoryStorage(),
  });

describe("ImportPersonalizationService", () => {
  it("saves and lists templates by kind", () => {
    const service = createService();
    service.save({
      kind: "clients",
      name: "ERP Clientes",
      columnMapping: { name: "Nome", email: "Email" },
      defaultValues: { preferredContact: "email" },
    });
    service.save({
      kind: "projects",
      name: "ERP Projetos",
      columnMapping: { name: "Projeto", status: "Situação" },
    });

    const clientTemplates = service.list("clients");
    const projectTemplates = service.list("projects");

    expect(clientTemplates).toHaveLength(1);
    expect(projectTemplates).toHaveLength(1);
    expect(clientTemplates[0]?.name).toBe("ERP Clientes");
  });

  it("updates template with same name (case-insensitive)", () => {
    const service = createService();
    const first = service.save({
      kind: "users",
      name: "Padrão RH",
      columnMapping: { email: "email" },
    });
    const second = service.save({
      kind: "users",
      name: "padrão rh",
      columnMapping: { email: "mail", roleKey: "perfil" },
      defaultValues: { roleKey: "member" },
    });

    const templates = service.list("users");
    expect(templates).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(templates[0]?.columnMapping.roleKey).toBe("perfil");
    expect(templates[0]?.defaultValues.roleKey).toBe("member");
  });

  it("tracks usage and resolves last used template", () => {
    const service = createService();
    const one = service.save({
      kind: "clients",
      name: "Template A",
      columnMapping: { name: "Nome" },
    });
    const two = service.save({
      kind: "clients",
      name: "Template B",
      columnMapping: { name: "Cliente" },
    });

    service.markAsUsed("clients", two.id);
    service.markAsUsed("clients", two.id);
    service.markAsUsed("clients", one.id);

    const listed = service.list("clients");
    expect((listed[0] as ImportMappingTemplate).id).toBe(two.id);
    expect((listed[0] as ImportMappingTemplate).usageCount).toBe(2);
    expect(service.getLastUsed("clients")?.id).toBe(one.id);
  });

  it("deletes template and clears stale last-used reference", () => {
    const service = createService();
    const template = service.save({
      kind: "projects",
      name: "Template Remover",
      columnMapping: { name: "Projeto" },
    });
    service.markAsUsed("projects", template.id);
    expect(service.getLastUsed("projects")?.id).toBe(template.id);

    service.delete("projects", template.id);

    expect(service.list("projects")).toHaveLength(0);
    expect(service.getLastUsed("projects")).toBeNull();
  });
});
