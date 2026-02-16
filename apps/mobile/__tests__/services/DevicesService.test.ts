import DevicesService from "../../src/services/DevicesService";
import ApiClientService from "../../src/services/ApiClientService";

jest.mock("../../src/services/ApiClientService");

describe("DevicesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists devices without query params", async () => {
    const mockResponse = {
      data: { rows: [], total: 0, page: 1, pageSize: 100 },
    };

    (ApiClientService.raw.get as jest.Mock).mockResolvedValue(mockResponse);

    const result = await DevicesService.list();

    expect(ApiClientService.raw.get).toHaveBeenCalledWith("/admin/devices");
    expect(result).toEqual(mockResponse.data);
  });

  it("builds list query params and skips 'all' filters", async () => {
    const mockResponse = {
      data: { rows: [], total: 0, page: 2, pageSize: 20 },
    };

    (ApiClientService.raw.get as jest.Mock).mockResolvedValue(mockResponse);

    await DevicesService.list({
      q: "router",
      status: "online",
      kind: "all",
      page: 2,
      pageSize: 20,
      sortBy: "name",
      sortDir: "asc",
    });

    expect(ApiClientService.raw.get).toHaveBeenCalledWith(
      "/admin/devices?q=router&status=online&page=2&pageSize=20&sortBy=name&sortDir=asc",
    );
  });

  it("gets a device by id", async () => {
    const mockDevice = {
      id: "dev-1",
      name: "Router",
      kind: "physical",
      status: "online",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    (ApiClientService.raw.get as jest.Mock).mockResolvedValue({
      data: mockDevice,
    });

    const result = await DevicesService.getById("dev-1");

    expect(ApiClientService.raw.get).toHaveBeenCalledWith(
      "/admin/devices/dev-1",
    );
    expect(result).toEqual(mockDevice);
  });

  it("creates a device", async () => {
    const payload = {
      name: "Server A",
      kind: "virtual",
      status: "offline",
      vendor: "Dell",
      model: "R740",
      operatingSystem: "Ubuntu",
      host: "srv-a",
      ipAddress: "10.0.0.10",
      serialNumber: "XYZ123",
    } as const;
    const created = {
      ...payload,
      id: "dev-2",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    (ApiClientService.raw.post as jest.Mock).mockResolvedValue({
      data: created,
    });

    const result = await DevicesService.create(payload);

    expect(ApiClientService.raw.post).toHaveBeenCalledWith(
      "/admin/devices",
      payload,
    );
    expect(result).toEqual(created);
  });

  it("updates a device", async () => {
    const payload = { status: "maintenance" };
    const updated = {
      id: "dev-3",
      name: "Switch",
      kind: "physical",
      status: "maintenance",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    };

    (ApiClientService.raw.patch as jest.Mock).mockResolvedValue({
      data: updated,
    });

    const result = await DevicesService.update("dev-3", payload);

    expect(ApiClientService.raw.patch).toHaveBeenCalledWith(
      "/admin/devices/dev-3",
      payload,
    );
    expect(result).toEqual(updated);
  });

  it("deletes a device", async () => {
    (ApiClientService.raw.delete as jest.Mock).mockResolvedValue({});

    await DevicesService.delete("dev-4");

    expect(ApiClientService.raw.delete).toHaveBeenCalledWith(
      "/admin/devices/dev-4",
    );
  });
});
