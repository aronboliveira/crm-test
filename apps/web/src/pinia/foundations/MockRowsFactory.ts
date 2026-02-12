import type { ClientRow } from "../types/clients.types";
import type { LeadRow, LeadStatus, LeadSource } from "../types/leads.types";
import type { ProjectRow, ProjectStatus } from "../types/projects.types";
import type { TaskPriority, TaskRow, TaskStatus } from "../types/tasks.types";

export default class MockRowsFactory {
  static #SALT = "corp-admin-v1";

  static clients(count: number): readonly ClientRow[] {
    try {
      const n = MockRowsFactory.#clamp(count, 50, 1, 150);
      const firstNames = [
        "Ana",
        "Bruno",
        "Carla",
        "Daniel",
        "Eduarda",
        "Felipe",
        "Giovana",
        "Henrique",
        "Isabela",
        "João",
        "Kamila",
        "Lucas",
        "Marina",
        "Nicolas",
        "Otávio",
        "Paula",
        "Rafael",
        "Sofia",
        "Thiago",
        "Viviane",
        "Gabriel",
        "Júlia",
        "Ricardo",
        "Fernanda",
        "Marcelo",
        "Amanda",
        "Diego",
        "Letícia",
        "Rodrigo",
        "Patrícia",
      ];
      const lastNames = [
        "Almeida",
        "Barbosa",
        "Cardoso",
        "Dias",
        "Ferreira",
        "Gomes",
        "Lima",
        "Machado",
        "Oliveira",
        "Pereira",
        "Ramos",
        "Silva",
        "Souza",
        "Teixeira",
        "Costa",
        "Martins",
        "Rocha",
        "Ribeiro",
        "Carvalho",
        "Araújo",
      ];
      const companyPrefixes = [
        "Nova",
        "Prime",
        "Global",
        "Vértice",
        "Aurora",
        "Atlas",
        "Pulso",
        "Nexo",
        "Sigma",
        "Bridge",
        "Quantum",
        "Apex",
        "Zenith",
        "Omega",
        "Delta",
        "Horizon",
        "Fusion",
        "Catalyst",
        "Velocity",
        "Infinity",
      ];
      const companySuffixes = [
        "Tech",
        "Digital",
        "Labs",
        "Systems",
        "Solutions",
        "Cloud",
        "Analytics",
        "Studio",
        "Group",
        "Works",
        "Innovation",
        "Ventures",
        "Partners",
        "Consulting",
        "Services",
      ];
      const domains = [
        "empresa.com.br",
        "corp.com.br",
        "tech.io",
        "solutions.com",
        "business.net",
        "digital.com.br",
        "group.com",
        "global.net",
      ];
      const notesPool = [
        "Cliente estratégico com alto potencial de crescimento",
        "Renovação prevista este trimestre - prioridade alta",
        "Time técnico dedicado ao projeto",
        "Onboarding em andamento - acompanhamento próximo",
        "Contrato anual com cláusula de expansão",
        "Expansão planejada para Q3 2026",
        "Interessado em novas funcionalidades premium",
        "Feedback muito positivo sobre suporte técnico",
        "Solicitou reunião para discutir upsell",
        "Empresa em rápido crescimento no mercado",
        "Referência importante no setor",
        "Projeto piloto sendo avaliado",
      ];
      const out: ClientRow[] = [];
      for (let i = 0; i < n; i++) {
        const seed = MockRowsFactory.#hash(`${MockRowsFactory.#SALT}:c:${i}`);
        const s = parseInt(seed.slice(0, 6), 16) || i + 1;
        const first = MockRowsFactory.#pick(firstNames, s);
        const last = MockRowsFactory.#pick(lastNames, s + 3);
        const name = `${first} ${last}`;
        const company = `${MockRowsFactory.#pick(companyPrefixes, s + 5)} ${
          MockRowsFactory.#pick(companySuffixes, s + 2)
        }`;
        const domain = MockRowsFactory.#pick(domains, s + 7);
        const email = `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
        const phone = `+55 11 9${String(1000 + (s % 9000)).padStart(4, "0")}-${String(1000 + ((s * 7) % 9000)).padStart(4, "0")}`;
        const type: ClientRow["type"] = i % 3 === 0 ? "pessoa" : "empresa";
        const cnpjDigits = `${Math.abs(s).toString().padStart(6, "0")}${Math.abs(s * 7).toString().padStart(8, "0")}`.slice(
          0,
          14,
        );
        const cepDigits = `${Math.abs(s * 13).toString().padStart(8, "0")}`.slice(
          0,
          8,
        );
        const createdAt = MockRowsFactory.#isoDaysAgo(30 + (i % 40));
        const updatedAt = MockRowsFactory.#isoDaysAgo(i % 12);
        out.push({
          id: `c_${seed.slice(0, 10)}`,
          name,
          type,
          company: i % 9 === 0 ? undefined : company,
          email: i % 12 === 0 ? undefined : email,
          phone: i % 10 === 0 ? undefined : phone,
          cnpj:
            type === "empresa"
              ? MockRowsFactory.#toCnpjMask(cnpjDigits)
              : undefined,
          cep:
            type === "empresa" ? MockRowsFactory.#toCepMask(cepDigits) : undefined,
          notes: i % 2 === 0 ? MockRowsFactory.#pick(notesPool, s) : undefined,
          createdAt,
          updatedAt,
        });
      }
      return out;
    } catch (error) {
      console.error("[MockRowsFactory] Error generating clients:", error);
      return [];
    }
  }

  static leads(count: number): readonly LeadRow[] {
    try {
      const n = MockRowsFactory.#clamp(count, 24, 1, 200);

      const firstNames = [
        "Marcos",
        "Juliana",
        "Roberto",
        "Patrícia",
        "André",
        "Camila",
        "Fernando",
        "Letícia",
        "Gustavo",
        "Tatiane",
        "Ricardo",
        "Vanessa",
        "Diego",
        "Renata",
        "Leonardo",
        "Amanda",
        "César",
        "Beatriz",
        "Sérgio",
        "Cláudia",
      ];
      const lastNames = [
        "Mendes",
        "Costa",
        "Santos",
        "Pinto",
        "Nunes",
        "Araújo",
        "Ribeiro",
        "Moreira",
        "Cavalcanti",
        "Freitas",
      ];
      const companies = [
        "TechVision SA",
        "Inova Digital",
        "MegaSoft",
        "DataPrime",
        "CloudBridge",
        "NetPulse",
        "StartHub",
        "ByteForge",
        "AgileCorp",
        "SmartGrid",
        "CyberEdge",
        "FutureLabs",
      ];
      const statuses: LeadStatus[] = [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ];
      const sources: LeadSource[] = [
        "website",
        "referral",
        "social",
        "email_campaign",
        "cold_call",
        "event",
        "partner",
        "other",
      ];
      const tagPool = [
        "enterprise",
        "startup",
        "saas",
        "e-commerce",
        "fintech",
        "healthtech",
        "edtech",
        "govtech",
        "varejo",
        "indústria",
      ];
      const campaignNames = [
        "Black Friday 2025",
        "Webinar Q1",
        "Email Drip Nurture",
        "LinkedIn Outreach",
        "Google Ads Retarget",
        "Evento Presencial SP",
      ];
      const contractTitles = [
        "Contrato Piloto",
        "Assinatura Anual",
        "POC 30 dias",
        "Licença Enterprise",
        "Serviço Consultoria",
      ];
      const ctaChannels: Array<
        "email" | "whatsapp" | "sms" | "linkedin" | "call"
      > = ["email", "whatsapp", "sms", "linkedin", "call"];
      const ctaMessages = [
        "Olá {name}, temos uma proposta para a {company}!",
        "Oi {name}, vamos agendar uma demo?",
        "{name}, seu período de avaliação termina em breve.",
        "Olá {name}, novas funcionalidades disponíveis!",
        "{name}, você tem 15% off esperando por você.",
      ];

      const out: LeadRow[] = [];
      for (let i = 0; i < n; i++) {
        const seed = MockRowsFactory.#hash(`${MockRowsFactory.#SALT}:l:${i}`);
        const s = parseInt(seed.slice(0, 6), 16) || i + 1;
        const first = MockRowsFactory.#pick(firstNames, s);
        const last = MockRowsFactory.#pick(lastNames, s + 3);
        const name = `${first} ${last}`;
        const company = MockRowsFactory.#pick(companies, s + 2);
        const status = MockRowsFactory.#pick(statuses, s);
        const source = MockRowsFactory.#pick(sources, s + 4);
        const domain =
          company.toLowerCase().replace(/\s+/g, "").slice(0, 10) + ".com";
        const email =
          i % 8 === 0
            ? undefined
            : `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
        const phone =
          i % 6 === 0
            ? undefined
            : `+55 11 9${String(2000 + (s % 8000)).padStart(4, "0")}-${String(1000 + ((s * 3) % 9000)).padStart(4, "0")}`;

        const tags =
          i % 3 === 0
            ? [
                MockRowsFactory.#pick(tagPool, s),
                MockRowsFactory.#pick(tagPool, s + 5),
              ]
            : i % 2 === 0
              ? [MockRowsFactory.#pick(tagPool, s + 1)]
              : undefined;

        const campaigns =
          i % 4 === 0
            ? [
                {
                  id: `camp_${seed.slice(0, 6)}`,
                  name: MockRowsFactory.#pick(campaignNames, s),
                  channel: MockRowsFactory.#pick(ctaChannels, s),
                  attachedAt: MockRowsFactory.#isoDaysAgo(10 + (i % 20)),
                },
              ]
            : undefined;

        const contracts =
          i % 5 === 0
            ? [
                {
                  id: `ctr_${seed.slice(0, 6)}`,
                  title: MockRowsFactory.#pick(contractTitles, s),
                  value: Math.round(((s % 50) + 5) * 1000),
                  attachedAt: MockRowsFactory.#isoDaysAgo(5 + (i % 15)),
                },
              ]
            : undefined;

        const ctaSuggestions =
          i % 3 === 0
            ? [
                {
                  id: `cta_${seed.slice(0, 6)}`,
                  channel: MockRowsFactory.#pick(ctaChannels, s + 1),
                  message: MockRowsFactory.#pick(ctaMessages, s)
                    .replace(/\{name\}/g, first)
                    .replace(/\{company\}/g, company),
                  createdAt: MockRowsFactory.#isoDaysAgo(3),
                  used: i % 6 === 0,
                },
              ]
            : undefined;

        const estimatedValue =
          status === "lost" ? undefined : Math.round(((s % 100) + 10) * 500);
        const lastContactAt = ["new"].includes(status)
          ? undefined
          : MockRowsFactory.#isoDaysAgo(1 + (i % 14));
        const assignedTo =
          i % 5 === 0 ? undefined : `user${(s % 8) + 1}@corp.local`;
        const lostReason =
          status === "lost"
            ? MockRowsFactory.#pick(
                ["Orçamento", "Timing", "Concorrente escolhido", "Sem resposta"],
                s,
              )
            : undefined;

        out.push({
          id: `l_${seed.slice(0, 10)}`,
          name,
          email,
          phone,
          company,
          status,
          source,
          assignedTo,
          estimatedValue,
          notes: i % 4 === 0 ? "Lead de alto potencial" : undefined,
          tags,
          campaigns,
          contracts,
          ctaSuggestions,
          lastContactAt,
          convertedClientId:
            status === "won" ? `c_${seed.slice(2, 12)}` : undefined,
          lostReason,
          createdAt: MockRowsFactory.#isoDaysAgo(30 + (i % 60)),
          updatedAt: MockRowsFactory.#isoDaysAgo(i % 10),
        });
      }
      return out;
    } catch (error) {
      console.error("[MockRowsFactory] Error generating leads:", error);
      return [];
    }
  }

  static projects(count: number): readonly ProjectRow[] {
    try {
      const n = MockRowsFactory.#clamp(count, 25, 1, 200);
      const out: ProjectRow[] = [];
      for (let i = 0; i < n; i++) {
        const project = MockRowsFactory.#project(i);
        if (project) out.push(project);
      }
      return out;
    } catch (error) {
      console.error("[MockRowsFactory] Error generating projects:", error);
      return [];
    }
  }

  static tasks(
    projectIds: readonly string[],
    count: number,
  ): readonly TaskRow[] {
    try {
      const n = MockRowsFactory.#clamp(count, 60, 1, 400);
      const out: TaskRow[] = [];
      const safeProjectIds = projectIds ?? [];
      for (let i = 0; i < n; i++) {
        const task = MockRowsFactory.#task(i, safeProjectIds);
        if (task) out.push(task);
      }
      return out;
    } catch (error) {
      console.error("[MockRowsFactory] Error generating tasks:", error);
      return [];
    }
  }

  static #project(i: number): ProjectRow {
    const id = `p_${MockRowsFactory.#hash(`${MockRowsFactory.#SALT}:p:${i}`).slice(0, 10)}`;
    const code = `PRJ-${String(1000 + i)}`;
    const name = `Project ${i + 1}`;
    const ownerEmail = `owner${(i % 8) + 1}@corp.local`;
    const status = MockRowsFactory.#pick<ProjectStatus>(
      ["planned", "active", "blocked", "done"],
      i,
    );

    const createdAt = MockRowsFactory.#isoDaysAgo(18 + (i % 35));
    const updatedAt = MockRowsFactory.#isoDaysAgo(i % 9);
    const dueAt =
      i % 5 === 0 ? null : MockRowsFactory.#isoDaysFromNow((i % 40) + 2);
    const deadlineAt =
      i % 7 === 0 ? null : MockRowsFactory.#isoDaysFromNow((i % 50) + 3);
    const tags = i % 4 === 0 ? ["important"] : [];

    return {
      id,
      code,
      name,
      ownerEmail,
      status,
      dueAt,
      deadlineAt,
      tags,
      templateKey: null,
      createdAt,
      updatedAt,
    };
  }

  static #task(i: number, projectIds: readonly string[]): TaskRow {
    const id = `t_${MockRowsFactory.#hash(`${MockRowsFactory.#SALT}:t:${i}`).slice(0, 10)}`;
    const pid = projectIds.length
      ? MockRowsFactory.#pick(projectIds, i)
      : "p_unknown";

    const title = `Task ${i + 1}`;
    const assigneeEmail = `user${(i % 12) + 1}@corp.local`;
    const status = MockRowsFactory.#pick<TaskStatus>(
      ["todo", "doing", "blocked", "done"],
      i + 3,
    );
    const priority = MockRowsFactory.#pick<TaskPriority>(
      [1, 2, 3, 4, 5],
      i + 7,
    );

    const createdAt = MockRowsFactory.#isoDaysAgo(10 + (i % 25));
    const updatedAt = MockRowsFactory.#isoDaysAgo(i % 6);
    const dueAt =
      i % 6 === 0 ? null : MockRowsFactory.#isoDaysFromNow((i % 20) + 1);
    const deadlineAt =
      i % 8 === 0 ? null : MockRowsFactory.#isoDaysFromNow((i % 25) + 2);

    return {
      id,
      projectId: pid,
      title,
      assigneeEmail,
      assigneeId: null,
      milestoneId: null,
      tags: [],
      subtasks: [],
      status,
      priority,
      dueAt,
      deadlineAt,
      createdAt,
      updatedAt,
    };
  }

  static #pick<T>(arr: readonly T[], seed: number): T {
    if (arr.length === 0) {
      throw new Error("[MockRowsFactory] Cannot pick from an empty array");
    }
    const i = Math.abs(seed) % arr.length;
    return arr[i] as T;
  }

  static #isoDaysAgo(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
  }

  static #isoDaysFromNow(days: number): string {
    return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
  }

  static #hash(s: string): string {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  static #toCnpjMask(input: string): string {
    const digits = input.replace(/\D/g, "").padEnd(14, "0").slice(0, 14);
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }

  static #toCepMask(input: string): string {
    const digits = input.replace(/\D/g, "").padEnd(8, "0").slice(0, 8);
    return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  }

  static #clamp(v: number, fallback: number, min: number, max: number): number {
    const n = Number.isFinite(v) ? Math.trunc(v) : fallback;
    return n < min ? min : n > max ? max : n;
  }
}
