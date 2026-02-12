import { describe, expect, it } from "vitest";
import {
  DashboardProjectsCsvBlueprint,
  DashboardReportsCsvBlueprint,
  DashboardTasksCsvBlueprint,
} from "../src/utils/export";

describe("Dashboard export blueprints", () => {
  it("DashboardProjectsCsvBlueprint should honor selected column ordering", () => {
    const blueprint = new DashboardProjectsCsvBlueprint({
      columns: ["nome", "status"],
    });

    const aoa = blueprint.toAoa([
      {
        codigo: "PRJ-001",
        nome: "Portal Cliente",
        responsavel: "owner@corp.local",
        status: "Ativo",
        tags: "crm, web",
        prazo: "2026-02-28",
        entrega: "2026-03-08",
      },
    ]);

    expect(blueprint.getColumnKeys()).toEqual(["nome", "status"]);
    expect(aoa[0]).toEqual(["Nome", "Status"]);
    expect(aoa[1]).toEqual(["Portal Cliente", "Ativo"]);
  });

  it("DashboardTasksCsvBlueprint should fallback to all columns when selection is empty", () => {
    const blueprint = new DashboardTasksCsvBlueprint({ columns: [] });

    const aoa = blueprint.toAoa([
      {
        titulo: "Aprovar release",
        projeto: "Projeto X",
        responsavel: "alice@corp.local",
        status: "Bloqueado",
        prioridade: "P1",
        tags: "release, qa",
        entrega: "2026-02-20",
      },
    ]);

    expect(blueprint.getColumnKeys()).toEqual([
      "titulo",
      "projeto",
      "responsavel",
      "status",
      "prioridade",
      "tags",
      "entrega",
    ]);
    expect(aoa[0]).toEqual([
      "Título",
      "Projeto",
      "Responsável",
      "Status",
      "Prioridade",
      "Tags",
      "Entrega",
    ]);
  });

  it("DashboardReportsCsvBlueprint should keep numeric and empty mixed fields", () => {
    const blueprint = new DashboardReportsCsvBlueprint({
      columns: ["tipo", "item", "tarefas", "progresso"],
    });

    const aoa = blueprint.toAoa([
      {
        tipo: "Projeto",
        codigo: "PRJ-002",
        item: "Implantação",
        status: "Ativo",
        responsavel: "owner@corp.local",
        prioridade: "—",
        entrega: "11 fev. 2026",
        tarefas: 12,
        progresso: "67%",
      },
      {
        tipo: "Tarefa",
        codigo: "—",
        item: "Revisar contrato",
        status: "A Fazer",
        responsavel: "analyst@corp.local",
        prioridade: "Alta",
        entrega: "12 fev. 2026",
        tarefas: "",
        progresso: "—",
      },
    ]);

    expect(blueprint.getColumnKeys()).toEqual([
      "tipo",
      "item",
      "tarefas",
      "progresso",
    ]);
    expect(aoa[0]).toEqual(["Tipo", "Item", "Tarefas", "Progresso"]);
    expect(aoa[1]).toEqual(["Projeto", "Implantação", 12, "67%"]);
    expect(aoa[2]).toEqual(["Tarefa", "Revisar contrato", "", "—"]);
  });
});
