export interface ClientRow {
  id: string;
  name: string;
  type?: "pessoa" | "empresa";
  email?: string;
  phone?: string;
  cellPhone?: string;
  whatsappNumber?: string;
  hasWhatsapp?: boolean;
  preferredContact?: "email" | "phone" | "whatsapp" | "cellphone";
  whatsappAnalytics?: {
    sent?: number;
    delivered?: number;
    read?: number;
    replied?: number;
    lastMessageAt?: string;
  };
  emailAnalytics?: {
    sent?: number;
    opened?: number;
    clicked?: number;
    replied?: number;
    lastEmailAt?: string;
  };
  company?: string;
  cnpj?: string;
  cep?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto extends Omit<
  ClientRow,
  "id" | "createdAt" | "updatedAt"
> {}
export interface UpdateClientDto extends Partial<CreateClientDto> {}
