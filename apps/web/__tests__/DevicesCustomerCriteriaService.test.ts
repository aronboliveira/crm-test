import { beforeEach, describe, expect, it } from "vitest";
import DevicesCustomerCriteriaService from "../src/services/DevicesCustomerCriteriaService";

describe("DevicesCustomerCriteriaService", () => {
  const STORAGE_KEY = "corp.admin.devices.customer.criteria.v1";

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it("loads default criterion when storage is empty", () => {
    expect(DevicesCustomerCriteriaService.load()).toBe("same-domain");
  });

  it("saves and loads exclude-self criterion", () => {
    const saved = DevicesCustomerCriteriaService.save("exclude-self");
    expect(saved).toBe("exclude-self");
    expect(DevicesCustomerCriteriaService.load()).toBe("exclude-self");
  });

  it("normalizes invalid criterion to default", () => {
    const saved = DevicesCustomerCriteriaService.save("invalid-value");
    expect(saved).toBe("same-domain");
    expect(DevicesCustomerCriteriaService.load()).toBe("same-domain");
  });
});
