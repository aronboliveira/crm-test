import { describe, expect, it, vi } from "vitest";
import {
  ImportExecutionService,
  type ImportSubmitGateway,
} from "../src/utils/import";

describe("ImportExecutionService", () => {
  it("submits client payloads and reports failures", async () => {
    const gateway: ImportSubmitGateway = {
      createClient: vi
        .fn()
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error("duplicate")),
      createProject: vi.fn(),
      createUser: vi.fn(),
    };

    const service = new ImportExecutionService(gateway);
    const result = await service.submit("clients", [
      {
        name: "Cliente A",
        type: "pessoa",
        hasWhatsapp: false,
        preferredContact: "email",
      },
      {
        name: "Cliente B",
        type: "empresa",
        cnpj: "12.345.678/0001-90",
        cep: "01310-100",
        hasWhatsapp: false,
        preferredContact: "email",
      },
    ]);

    expect(gateway.createClient).toHaveBeenCalledTimes(2);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.items[1]?.ok).toBe(false);
  });

  it("submits users through user gateway", async () => {
    const gateway: ImportSubmitGateway = {
      createClient: vi.fn(),
      createProject: vi.fn(),
      createUser: vi.fn().mockResolvedValue({ ok: true }),
    };
    const service = new ImportExecutionService(gateway);
    const result = await service.submit("users", [
      {
        email: "user@corp.local",
        roleKey: "member",
      },
    ]);

    expect(gateway.createUser).toHaveBeenCalledTimes(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
  });
});
