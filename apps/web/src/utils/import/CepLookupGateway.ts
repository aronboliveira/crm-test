import ImportFieldRules from "./ImportFieldRules";

export type CepLookupResult = Readonly<{
  ok: boolean;
  cep: string;
  city?: string;
  state?: string;
  street?: string;
  message?: string;
}>;

export interface CepLookupGateway {
  lookup(cep: string): Promise<CepLookupResult>;
}

type BrazilApiCepResponse = Readonly<{
  cep?: string;
  city?: string;
  state?: string;
  street?: string;
}>;

export class BrazilApiCepLookupGateway implements CepLookupGateway {
  private readonly cache = new Map<string, CepLookupResult>();

  async lookup(cep: string): Promise<CepLookupResult> {
    const normalizedCep = ImportFieldRules.normalizeCep(cep);
    if (!ImportFieldRules.isValidCep(normalizedCep)) {
      return {
        ok: false,
        cep: normalizedCep,
        message: "CEP inválido. Use o formato 00000-000.",
      };
    }

    if (this.cache.has(normalizedCep)) {
      return this.cache.get(normalizedCep)!;
    }

    const digits = normalizedCep.replace(/\D/g, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cep/v1/${digits}`,
        {
          method: "GET",
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const failed: CepLookupResult = {
          ok: false,
          cep: normalizedCep,
          message:
            response.status === 404
              ? "CEP não encontrado na BrasilAPI."
              : "Não foi possível validar o CEP agora.",
        };
        this.cache.set(normalizedCep, failed);
        return failed;
      }

      const payload = (await response.json()) as BrazilApiCepResponse;
      const success: CepLookupResult = {
        ok: true,
        cep: normalizedCep,
        city: payload.city,
        state: payload.state,
        street: payload.street,
      };
      this.cache.set(normalizedCep, success);
      return success;
    } catch (error) {
      const failed: CepLookupResult = {
        ok: false,
        cep: normalizedCep,
        message:
          error instanceof Error && error.name === "AbortError"
            ? "Timeout ao validar CEP."
            : "Falha ao consultar BrasilAPI para CEP.",
      };
      return failed;
    } finally {
      clearTimeout(timeout);
    }
  }
}
