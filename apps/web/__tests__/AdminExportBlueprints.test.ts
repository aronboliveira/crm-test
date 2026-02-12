import { describe, expect, it } from "vitest";
import {
  AdminAuditCsvBlueprint,
  AdminMailOutboxCsvBlueprint,
  AdminUsersCsvBlueprint,
} from "../src/utils/export";

describe("Admin export blueprints", () => {
  it("AdminUsersCsvBlueprint should export selected admin columns", () => {
    const blueprint = new AdminUsersCsvBlueprint({
      columns: ["nome", "email", "bloqueado"],
    });

    const aoa = blueprint.toAoa([
      {
        nome: "Alice Rip",
        email: "alice@corp.local",
        perfil: "Administrador",
        tokenVersion: 4,
        senhaAtualizada: "12/02/2026 15:00",
        criadoEm: "10/02/2026 11:10",
        bloqueado: "Não",
      },
    ]);

    expect(blueprint.getColumnKeys()).toEqual(["nome", "email", "bloqueado"]);
    expect(aoa[0]).toEqual(["Nome", "E-mail", "Bloqueado"]);
    expect(aoa[1]).toEqual(["Alice Rip", "alice@corp.local", "Não"]);
  });

  it("AdminAuditCsvBlueprint should preserve meta JSON text", () => {
    const blueprint = new AdminAuditCsvBlueprint({
      columns: ["data", "tipo", "meta"],
    });

    const aoa = blueprint.toAoa([
      {
        data: "2026-02-12T10:00:00.000Z",
        tipo: "auth.login.failure",
        ator: "masked@corp.local",
        alvo: "—",
        meta: "{\n  \"ip\": \"127.0.0.1\"\n}",
      },
    ]);

    expect(blueprint.getColumnKeys()).toEqual(["data", "tipo", "meta"]);
    expect(aoa[0]).toEqual(["Data", "Tipo", "Meta"]);
    expect(aoa[1]).toEqual([
      "2026-02-12T10:00:00.000Z",
      "auth.login.failure",
      "{\n  \"ip\": \"127.0.0.1\"\n}",
    ]);
  });

  it("AdminMailOutboxCsvBlueprint should fallback to default columns when empty", () => {
    const blueprint = new AdminMailOutboxCsvBlueprint({ columns: [] });

    const aoa = blueprint.toAoa([
      {
        data: "12/02/2026 14:00",
        para: "bob@corp.local",
        tipo: "password_invite",
        assunto: "Convite",
        texto: "Acesse o link para criar sua senha.",
        meta: "{\"template\":\"invite\"}",
      },
    ]);

    expect(blueprint.getColumnKeys()).toEqual([
      "data",
      "para",
      "tipo",
      "assunto",
      "texto",
      "meta",
    ]);
    expect(aoa[0]).toEqual(["Data", "Para", "Tipo", "Assunto", "Texto", "Meta"]);
  });
});
