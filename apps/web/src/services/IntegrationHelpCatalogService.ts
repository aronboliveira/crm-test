import ObjectDeep, { type DeepReadonly } from "../utils/ObjectDeep";

export interface IntegrationHelpCapability {
  readonly key: string;
  readonly term: string;
  readonly abbreviation?: string;
  readonly abbreviationTitle?: string;
  readonly highlight: string;
  readonly description: string;
}

export interface IntegrationHelpAdvantage {
  readonly key: string;
  readonly title: string;
  readonly detail: string;
}

export interface IntegrationHelpStep {
  readonly key: string;
  readonly title: string;
  readonly detail: string;
}

export interface IntegrationHelpEntry {
  readonly integrationId: string;
  readonly integrationName: string;
  readonly contextDefinition: string;
  readonly capabilities: readonly IntegrationHelpCapability[];
  readonly advantages: readonly IntegrationHelpAdvantage[];
  readonly howTo: readonly IntegrationHelpStep[];
}

const FALLBACK_INTEGRATION_ID = "glpi";

/**
 * Bootstrap Icons: question-circle (fetched from icons.getbootstrap.com).
 */
export const BOOTSTRAP_QUESTION_CIRCLE_ICON_PATHS = ObjectDeep.freeze([
  "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16",
  "M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113 .266-.25 .09-.656 .54-1.134 1.342-1.134 .686 0 1.314 .343 1.314 1.168 0 .635-.374 .927-.965 1.371-.673 .489-1.206 1.06-1.168 1.987l.003 .217a.25.25 0 0 0 .25 .246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718 .273-.927 1.01-1.486 .609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655 .59-2.75 2.286",
  "M7.557 11.667a.667.667 0 1 0 1.334 0 .667.667 0 0 0-1.334 0",
]) as readonly string[];

const INTEGRATION_HELP_CATALOG: DeepReadonly<
  Record<string, IntegrationHelpEntry>
> = ObjectDeep.freeze({
  glpi: {
    integrationId: "glpi",
    integrationName: "GLPI",
    contextDefinition:
      "GLPI significa Gestionnaire Libre de Parc Informatique e atua como central de service desk.",
    capabilities: [
      {
        key: "ticket-sync",
        term: "Fluxo de chamados",
        abbreviation: "SLA",
        abbreviationTitle: "Service Level Agreement",
        highlight:
          "Sincroniza abertura, status e prioridade dos tickets no mesmo fluxo operacional.",
        description:
          "Permite que equipes de suporte acompanhem pendencias sem alternar entre telas.",
      },
      {
        key: "inventory-map",
        term: "Inventario tecnico",
        abbreviation: "CMDB",
        abbreviationTitle: "Configuration Management Database",
        highlight:
          "Relaciona ativos e historico tecnico ao contexto de atendimento no CRM.",
        description:
          "Facilita diagnostico de incidente com evidencias operacionais e ownership definido.",
      },
      {
        key: "api-governance",
        term: "Conectividade segura",
        abbreviation: "API",
        abbreviationTitle: "Application Programming Interface",
        highlight:
          "Usa credenciais dedicadas para sincronizacao auditavel entre GLPI e CRM.",
        description:
          "Reduz falhas manuais e melhora rastreabilidade de eventos administrativos.",
      },
    ],
    advantages: [
      {
        key: "ops-visibility",
        title: "Visibilidade operacional",
        detail:
          "o time ve backlog, gargalos e filas com menos latencia de contexto.",
      },
      {
        key: "triage-speed",
        title: "Triagem acelerada",
        detail:
          "dados de suporte chegam com prioridade consistente para decisoes de escalonamento.",
      },
      {
        key: "audit-trail",
        title: "Auditoria integrada",
        detail:
          "mudancas de status e ownership ficam registradas no mesmo ciclo de trabalho.",
      },
    ],
    howTo: [
      {
        key: "glpi-step-1",
        title: "Mapeie endpoint e token de aplicacao",
        detail:
          "valide URL base e escopos antes de salvar; isso evita erros de autenticacao ja no primeiro teste.",
      },
      {
        key: "glpi-step-2",
        title: "Defina metodo de autenticacao",
        detail:
          "escolha user-token ou usuario/senha conforme sua politica de seguranca e rotacao.",
      },
      {
        key: "glpi-step-3",
        title: "Execute teste de conexao",
        detail:
          "confirme handshake com retorno saudavel antes de liberar sync para operacao.",
      },
      {
        key: "glpi-step-4",
        title: "Monitore sincronizacoes recorrentes",
        detail:
          "acompanhe falhas em jobs e trate divergencias de ticket com prioridade definida.",
      },
    ],
  },
  sat: {
    integrationId: "sat",
    integrationName: "SAT ERP",
    contextDefinition:
      "SAT ERP concentra faturamento e catalogo financeiro para sincronizacao com o CRM.",
    capabilities: [
      {
        key: "invoice-sync",
        term: "Notas e faturamento",
        abbreviation: "ERP",
        abbreviationTitle: "Enterprise Resource Planning",
        highlight:
          "Importa ciclo fiscal para apoiar previsao de receita e follow-up comercial.",
        description:
          "evita que cobranca e operacao trabalhem com bases divergentes.",
      },
      {
        key: "oauth-flow",
        term: "Autenticacao delegada",
        abbreviation: "OAuth2",
        abbreviationTitle: "Open Authorization 2.0",
        highlight:
          "credenciais por aplicacao isolam acesso e facilitam rotacao de segredo.",
        description:
          "mantem segregacao de responsabilidade entre time tecnico e financeiro.",
      },
      {
        key: "catalog-sync",
        term: "Produto e estoque",
        abbreviation: "SKU",
        abbreviationTitle: "Stock Keeping Unit",
        highlight:
          "sincroniza catalogo para propostas e analises comerciais com menor retrabalho.",
        description:
          "reduz erros de precificacao quando equipes trabalham em paralelo.",
      },
    ],
    advantages: [
      {
        key: "forecast",
        title: "Previsibilidade",
        detail:
          "funis de venda incorporam sinal fiscal real em vez de estimativa manual.",
      },
      {
        key: "billing-alignment",
        title: "Alinhamento financeiro",
        detail:
          "comercial e financeiro operam sobre o mesmo estado de nota e pagamento.",
      },
      {
        key: "product-cohesion",
        title: "Coesao de catalogo",
        detail:
          "times de atendimento e vendas usam referencia unica de produto.",
      },
    ],
    howTo: [
      {
        key: "sat-step-1",
        title: "Preencha URL, Client ID e Company ID",
        detail:
          "garanta que os identificadores pertencem ao ambiente correto (homologacao ou producao).",
      },
      {
        key: "sat-step-2",
        title: "Insira Client Secret com cuidado",
        detail:
          "mantenha segredo em cofre e evite log/local storage fora de ambiente controlado.",
      },
      {
        key: "sat-step-3",
        title: "Escolha escopo de sync inicial",
        detail:
          "ative notas e/ou produtos conforme sua janela operacional para reduzir carga inicial.",
      },
      {
        key: "sat-step-4",
        title: "Valide teste e health",
        detail:
          "somente apos retorno saudavel execute sincronizacao completa de dados.",
      },
    ],
  },
  nextcloud: {
    integrationId: "nextcloud",
    integrationName: "Nextcloud",
    contextDefinition:
      "Nextcloud fornece repositório de documentos para processos colaborativos do CRM.",
    capabilities: [
      {
        key: "folder-map",
        term: "Estrutura documental",
        abbreviation: "DAV",
        abbreviationTitle: "Web Distributed Authoring and Versioning",
        highlight:
          "organiza pastas por cliente/projeto para acesso padronizado e rastreavel.",
        description:
          "facilita compartilhamento sem romper governanca de arquivo.",
      },
      {
        key: "app-password",
        term: "Credencial dedicada",
        abbreviation: "MFA",
        abbreviationTitle: "Multi-Factor Authentication",
        highlight: "suporta app password para cenarios com autenticacao forte.",
        description: "reduz exposicao de senha principal de usuario.",
      },
      {
        key: "file-context",
        term: "Contexto de evidencias",
        abbreviation: "URL",
        abbreviationTitle: "Uniform Resource Locator",
        highlight: "anexa referencias de arquivo ao fluxo operacional do CRM.",
        description: "diminui perda de contexto em handoff entre squads.",
      },
    ],
    advantages: [
      {
        key: "knowledge-retention",
        title: "Retencao de conhecimento",
        detail:
          "arquivos relevantes permanecem vinculados a cliente e projeto.",
      },
      {
        key: "secure-collab",
        title: "Colaboracao segura",
        detail:
          "controle de pasta e credenciais reduz risco de acesso indevido.",
      },
      {
        key: "faster-onboarding",
        title: "Onboarding tecnico mais rapido",
        detail:
          "novos membros encontram trilha documental com menos dependencias tacitas.",
      },
    ],
    howTo: [
      {
        key: "nextcloud-step-1",
        title: "Defina URL base e usuario",
        detail:
          "use endpoint oficial do servidor e confirme permissao de leitura/escrita no destino.",
      },
      {
        key: "nextcloud-step-2",
        title: "Escolha app password ou senha",
        detail:
          "prefira app password quando politica de seguranca exigir segregacao.",
      },
      {
        key: "nextcloud-step-3",
        title: "Padronize pasta base",
        detail:
          "defina nomenclatura consistente para facilitar automacoes futuras.",
      },
      {
        key: "nextcloud-step-4",
        title: "Valide conectividade e sincronizacao",
        detail:
          "confira health e logs para garantir fluxo de documentos sem falhas recorrentes.",
      },
    ],
  },
  zimbra: {
    integrationId: "zimbra",
    integrationName: "Zimbra",
    contextDefinition:
      "Zimbra integra caixas corporativas para operacoes de comunicacao e notificacao.",
    capabilities: [
      {
        key: "smtp-profile",
        term: "Envio transacional",
        abbreviation: "SMTP",
        abbreviationTitle: "Simple Mail Transfer Protocol",
        highlight:
          "habilita entrega de notificacoes com perfil dedicado para operacao.",
        description:
          "ajuda a separar trafego transacional do uso pessoal de email.",
      },
      {
        key: "mail-trace",
        term: "Rastreio de envio",
        abbreviation: "TLS",
        abbreviationTitle: "Transport Layer Security",
        highlight:
          "permite auditar fluxo de envio com politicas de seguranca de transporte.",
        description:
          "reforca confianca em alertas criticos e mensagens de sistema.",
      },
      {
        key: "account-context",
        term: "Conta operacional",
        abbreviation: "IAM",
        abbreviationTitle: "Identity and Access Management",
        highlight:
          "usa credencial de servico para reduzir dependencias de contas pessoais.",
        description: "simplifica governanca de acesso e rotacao.",
      },
    ],
    advantages: [
      {
        key: "delivery-consistency",
        title: "Consistencia de entrega",
        detail: "alertas e notificacoes seguem perfil tecnico previsivel.",
      },
      {
        key: "security-baseline",
        title: "Base de seguranca",
        detail:
          "credenciais e transporte obedecem padroes de compliance institucional.",
      },
      {
        key: "ops-handoff",
        title: "Handoff operacional",
        detail:
          "times conseguem depurar fluxo de email sem ambiguidades de ownership.",
      },
    ],
    howTo: [
      {
        key: "zimbra-step-1",
        title: "Cadastre URL, usuario e senha de servico",
        detail:
          "evite conta pessoal para manter isolamento de responsabilidade.",
      },
      {
        key: "zimbra-step-2",
        title: "Valide perfil SMTP",
        detail:
          "confira que o perfil selecionado atende porta, criptografia e autenticao exigidas.",
      },
      {
        key: "zimbra-step-3",
        title: "Execute teste de conexao",
        detail:
          "trate resposta de erro antes de depender da integracao em notificacoes criticas.",
      },
      {
        key: "zimbra-step-4",
        title: "Acompanhe eventos de envio",
        detail:
          "monitore logs e caixas de destino para confirmar entrega fim-a-fim.",
      },
    ],
  },
  outlook: {
    integrationId: "outlook",
    integrationName: "Microsoft Outlook",
    contextDefinition:
      "Outlook integra fluxo de comunicacao Microsoft 365 ao CRM com credenciais de aplicativo.",
    capabilities: [
      {
        key: "azure-app",
        term: "App registration",
        abbreviation: "AAD",
        abbreviationTitle: "Azure Active Directory",
        highlight:
          "usa tenant/client ID para autenticar servico de forma controlada.",
        description:
          "diminui fragilidade de login manual em tarefas automatizadas.",
      },
      {
        key: "graph-access",
        term: "Permissoes granulares",
        abbreviation: "API",
        abbreviationTitle: "Application Programming Interface",
        highlight:
          "limita escopo conforme necessidade real de envio e leitura.",
        description: "reduz superficie de risco e facilita auditoria.",
      },
      {
        key: "mail-governance",
        term: "Governanca de mensagens",
        abbreviation: "RBAC",
        abbreviationTitle: "Role-Based Access Control",
        highlight:
          "aplica regras por papel para preservar consistencia de operacao.",
        description: "evita acesso excessivo em ambientes compartilhados.",
      },
    ],
    advantages: [
      {
        key: "enterprise-ready",
        title: "Pronto para ambiente enterprise",
        detail:
          "integra-se ao ecossistema Microsoft com padroes de seguranca corporativa.",
      },
      {
        key: "access-control",
        title: "Controle de acesso",
        detail: "escopos e papeis permitem evolucao sem quebrar compliance.",
      },
      {
        key: "operational-reliability",
        title: "Confiabilidade operacional",
        detail:
          "fluxos de notificacao permanecem consistentes em cenarios multi-time.",
      },
    ],
    howTo: [
      {
        key: "outlook-step-1",
        title: "Preencha Tenant ID e Client ID",
        detail:
          "confirme que a aplicacao esta no tenant correto para o ambiente atual.",
      },
      {
        key: "outlook-step-2",
        title: "Informe Client Secret vigente",
        detail:
          "acompanhe expiracao do segredo para nao interromper automacoes.",
      },
      {
        key: "outlook-step-3",
        title: "Valide conexao com teste dedicado",
        detail:
          "somente promova para producao apos retorno estavel e sem warnings criticos.",
      },
      {
        key: "outlook-step-4",
        title: "Monitore rotacao e health",
        detail:
          "rotacione segredo periodicamente e acompanhe sinais de degradacao.",
      },
    ],
  },
  whatsapp: {
    integrationId: "whatsapp",
    integrationName: "WhatsApp Business",
    contextDefinition:
      "WhatsApp Business conecta templates e analytics do canal de mensageria ao CRM.",
    capabilities: [
      {
        key: "template-sync",
        term: "Catalogo de templates",
        abbreviation: "WABA",
        abbreviationTitle: "WhatsApp Business Account",
        highlight:
          "sincroniza modelos aprovados para governanca de comunicacao.",
        description: "padroniza linguagem operacional e reduz inconsistencias.",
      },
      {
        key: "health-check",
        term: "Diagnostico orientado",
        abbreviation: "API",
        abbreviationTitle: "Application Programming Interface",
        highlight:
          "mostra pendencias obrigatorias e proximo passo para estabilizar integracao.",
        description:
          "encurta tempo de troubleshooting em configuracao inicial.",
      },
      {
        key: "sync-jobs",
        term: "Sincronizacao com polling",
        abbreviation: "JSON",
        abbreviationTitle: "JavaScript Object Notation",
        highlight:
          "acompanha status de job ate estado terminal com resumo de resultado.",
        description:
          "evita incerteza operacional sobre progresso de ingestao de dados.",
      },
    ],
    advantages: [
      {
        key: "channel-consistency",
        title: "Consistencia de canal",
        detail:
          "mensagens seguem padrao aprovado para atendimento e campanhas.",
      },
      {
        key: "analytics-visibility",
        title: "Visibilidade analitica",
        detail: "dados de template e uso apoiam decisao de melhoria continua.",
      },
      {
        key: "guided-ops",
        title: "Operacao guiada",
        detail: "checklist e health reduzem risco de configuracao incompleta.",
      },
    ],
    howTo: [
      {
        key: "whatsapp-step-1",
        title: "Informe Access Token e Business Account ID",
        detail:
          "sem esses campos a integracao nao fica apta para teste ou sync.",
      },
      {
        key: "whatsapp-step-2",
        title: "Opcionalmente adicione Phone Number ID",
        detail:
          "melhora leitura de analytics por numero quando houver multiplos canais.",
      },
      {
        key: "whatsapp-step-3",
        title: "Teste conexao e revise diagnostico",
        detail:
          "trate itens pendentes do checklist antes de iniciar sincronizacao.",
      },
      {
        key: "whatsapp-step-4",
        title: "Execute sync e acompanhe job",
        detail:
          "confirme status final e resumo processado para validar ingestao.",
      },
    ],
  },
  openai: {
    integrationId: "openai",
    integrationName: "OpenAI",
    contextDefinition:
      "OpenAI habilita o chatbot do CRM com respostas em linguagem natural e contexto operacional.",
    capabilities: [
      {
        key: "llm-provider",
        term: "Provedor LLM",
        abbreviation: "API",
        abbreviationTitle: "Application Programming Interface",
        highlight:
          "permite configurar modelo, limite de tokens e temperatura para o assistente.",
        description:
          "ajusta qualidade, custo e latencia sem alterar o fluxo do chat.",
      },
      {
        key: "prompt-control",
        term: "System Prompt",
        abbreviation: "UX",
        abbreviationTitle: "User Experience",
        highlight:
          "define tom, limites e orientacao funcional das respostas do chatbot.",
        description:
          "mantem consistencia de suporte e reduz respostas fora de contexto.",
      },
      {
        key: "connection-test",
        term: "Teste de conexao",
        abbreviation: "SLA",
        abbreviationTitle: "Service Level Agreement",
        highlight:
          "valida credenciais e disponibilidade antes do uso em producao.",
        description:
          "antecipa falhas de autenticacao e reduz tempo de troubleshooting.",
      },
    ],
    advantages: [
      {
        key: "assistant-readiness",
        title: "Pronto para assistente",
        detail:
          "chatbot passa a operar com respostas inteligentes e parametrizaveis.",
      },
      {
        key: "governed-config",
        title: "Configuracao governada",
        detail:
          "segredos ficam mascarados e voce controla modelo/limites por ambiente.",
      },
      {
        key: "scalable-architecture",
        title: "Arquitetura escalavel",
        detail:
          "padrao de estrategia facilita adicionar novos provedores LLM no futuro.",
      },
    ],
    howTo: [
      {
        key: "openai-step-1",
        title: "Informe API Key e modelo",
        detail:
          "use chave valida (sk-...) e escolha um modelo adequado ao seu caso de uso.",
      },
      {
        key: "openai-step-2",
        title: "Ajuste temperature e max tokens",
        detail:
          "balanceie criatividade e custo para manter previsibilidade do chatbot.",
      },
      {
        key: "openai-step-3",
        title: "Defina o system prompt",
        detail:
          "oriente o comportamento do assistente com regras de tom e foco em CRM.",
      },
      {
        key: "openai-step-4",
        title: "Salve e teste conexao",
        detail:
          "somente libere uso operacional apos validacao positiva do teste.",
      },
    ],
  },
}) as DeepReadonly<Record<string, IntegrationHelpEntry>>;

const normalizeIntegrationId = (
  integrationId: string | null | undefined,
): string => {
  if (!integrationId) return "";
  return integrationId.trim().toLowerCase();
};

const lookupCatalogEntry = (
  integrationId: string,
): IntegrationHelpEntry | null => {
  if (!integrationId) {
    return null;
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      INTEGRATION_HELP_CATALOG,
      integrationId,
    )
  ) {
    return null;
  }

  const entry = (
    INTEGRATION_HELP_CATALOG as Record<string, IntegrationHelpEntry | undefined>
  )[integrationId];
  return entry ?? null;
};

const getRequiredCatalogEntry = (
  integrationId: string,
): IntegrationHelpEntry => {
  const entry = lookupCatalogEntry(integrationId);
  if (!entry) {
    throw new Error(
      `[IntegrationHelpCatalogService] Missing help entry for "${integrationId}"`,
    );
  }
  return entry;
};

const FALLBACK_HELP_ENTRY = getRequiredCatalogEntry(FALLBACK_INTEGRATION_ID);

export default class IntegrationHelpCatalogService {
  static listAll(): readonly IntegrationHelpEntry[] {
    return Object.keys(INTEGRATION_HELP_CATALOG).map((integrationId) =>
      getRequiredCatalogEntry(integrationId),
    );
  }

  static has(integrationId: string | null | undefined): boolean {
    const normalized = normalizeIntegrationId(integrationId);
    return Boolean(normalized && lookupCatalogEntry(normalized));
  }

  static get(
    integrationId: string | null | undefined,
  ): IntegrationHelpEntry | null {
    const normalized = normalizeIntegrationId(integrationId);
    if (!normalized) return null;
    return lookupCatalogEntry(normalized);
  }

  static resolve(
    integrationId: string | null | undefined,
    fallbackIntegrationId = FALLBACK_INTEGRATION_ID,
  ): IntegrationHelpEntry {
    const normalized = normalizeIntegrationId(integrationId);
    const directEntry = normalized ? lookupCatalogEntry(normalized) : null;
    if (directEntry) {
      return directEntry;
    }

    const fallbackNormalized = normalizeIntegrationId(fallbackIntegrationId);
    return lookupCatalogEntry(fallbackNormalized) ?? FALLBACK_HELP_ENTRY;
  }
}
