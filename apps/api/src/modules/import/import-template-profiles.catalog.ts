import type { ImportTemplateKind } from '../../entities/ImportTemplateEntity';

export type ImportSourceProfile = Readonly<{
  key: string;
  label: string;
  description: string;
  kind: ImportTemplateKind;
  columnMapping: Readonly<Record<string, string>>;
  defaultValues: Readonly<Record<string, string>>;
}>;

const PROFILES: readonly ImportSourceProfile[] = [
  {
    key: 'erp-a-clients',
    label: 'ERP A (Clientes)',
    description: 'Layout típico ERP A para base de clientes.',
    kind: 'clients',
    columnMapping: {
      name: 'Razao Social',
      type: 'Tipo Cliente',
      company: 'Razao Social',
      cnpj: 'CNPJ',
      cep: 'CEP',
      email: 'E-mail',
      phone: 'Telefone',
      whatsappNumber: 'Whatsapp',
      preferredContact: 'Canal Preferido',
    },
    defaultValues: {
      type: 'empresa',
      preferredContact: 'email',
    },
  },
  {
    key: 'erp-b-clients',
    label: 'ERP B (Clientes)',
    description: 'Integração padrão ERP B com nomenclaturas em inglês.',
    kind: 'clients',
    columnMapping: {
      name: 'customer_name',
      type: 'customer_type',
      company: 'company_name',
      cnpj: 'tax_id',
      cep: 'postal_code',
      email: 'email_address',
      phone: 'phone_number',
      cellPhone: 'mobile_number',
      whatsappNumber: 'whatsapp_number',
      preferredContact: 'preferred_channel',
      notes: 'notes',
    },
    defaultValues: {
      preferredContact: 'email',
    },
  },
  {
    key: 'planilha-x-clients',
    label: 'Planilha X (Clientes)',
    description: 'Planilha manual simplificada para importação rápida.',
    kind: 'clients',
    columnMapping: {
      name: 'Nome',
      company: 'Empresa',
      type: 'Tipo',
      email: 'Email',
      phone: 'Telefone',
      whatsappNumber: 'Whatsapp',
    },
    defaultValues: {
      type: 'pessoa',
      preferredContact: 'email',
    },
  },
  {
    key: 'erp-a-projects',
    label: 'ERP A (Projetos)',
    description: 'Modelo ERP A para projetos e cronograma.',
    kind: 'projects',
    columnMapping: {
      name: 'Projeto',
      code: 'Codigo',
      status: 'Status',
      ownerEmail: 'Responsavel Email',
      dueAt: 'Previsao',
      deadlineAt: 'Entrega',
      tags: 'Tags',
      description: 'Descricao',
    },
    defaultValues: {
      status: 'planned',
    },
  },
  {
    key: 'erp-b-projects',
    label: 'ERP B (Projetos)',
    description: 'Modelo ERP B com cabeçalhos em inglês.',
    kind: 'projects',
    columnMapping: {
      name: 'project_name',
      code: 'project_code',
      status: 'stage',
      ownerEmail: 'owner_email',
      dueAt: 'forecast_date',
      deadlineAt: 'deadline_date',
      tags: 'labels',
      description: 'details',
    },
    defaultValues: {
      status: 'active',
    },
  },
  {
    key: 'planilha-x-projects',
    label: 'Planilha X (Projetos)',
    description: 'Planilha padrão para backlog de projetos.',
    kind: 'projects',
    columnMapping: {
      name: 'Nome Projeto',
      status: 'Status',
      ownerEmail: 'Responsavel',
      tags: 'Tags',
      description: 'Descricao',
    },
    defaultValues: {
      status: 'planned',
    },
  },
  {
    key: 'erp-a-users',
    label: 'ERP A (Usuários)',
    description: 'Cadastro de usuários do ERP A.',
    kind: 'users',
    columnMapping: {
      email: 'Email',
      roleKey: 'Perfil',
      firstName: 'Nome',
      lastName: 'Sobrenome',
      department: 'Departamento',
      phone: 'Telefone',
    },
    defaultValues: {
      roleKey: 'member',
    },
  },
  {
    key: 'erp-b-users',
    label: 'ERP B (Usuários)',
    description: 'Dados de colaboradores com nomenclatura em inglês.',
    kind: 'users',
    columnMapping: {
      email: 'email_address',
      roleKey: 'role',
      firstName: 'first_name',
      lastName: 'last_name',
      department: 'team',
      phone: 'phone',
    },
    defaultValues: {
      roleKey: 'member',
    },
  },
  {
    key: 'planilha-x-users',
    label: 'Planilha X (Usuários)',
    description: 'Planilha simples para provisionamento de usuários.',
    kind: 'users',
    columnMapping: {
      email: 'Email',
      roleKey: 'Perfil',
      firstName: 'Nome',
      lastName: 'Sobrenome',
    },
    defaultValues: {
      roleKey: 'viewer',
    },
  },
];

export default class ImportTemplateProfilesCatalog {
  static list(kind?: ImportTemplateKind): ImportSourceProfile[] {
    if (!kind) return [...PROFILES];
    return PROFILES.filter((profile) => profile.kind === kind);
  }
}
