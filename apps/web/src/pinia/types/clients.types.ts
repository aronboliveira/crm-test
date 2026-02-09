export interface ClientRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto extends Omit<
  ClientRow,
  "id" | "createdAt" | "updatedAt"
> {}
export interface UpdateClientDto extends Partial<CreateClientDto> {}
