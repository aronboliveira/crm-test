import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import DashboardDevicesScreen from "../../src/pages/DashboardDevicesScreen";
import DevicesService from "../../src/services/DevicesService";
import AlertService from "../../src/services/AlertService";

jest.mock("../../src/services/DevicesService");
jest.mock("../../src/services/AlertService");

describe("DashboardDevicesScreen", () => {
  const mockDevice = {
    id: "dev-1",
    name: "Router Core",
    kind: "physical" as const,
    status: "online" as const,
    vendor: "Cisco",
    model: "XR500",
    operatingSystem: "IOS-XR",
    host: "router-core",
    ipAddress: "10.0.0.1",
    serialNumber: "SN123",
    ownerEmail: "ops@example.com",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (DevicesService.list as jest.Mock).mockResolvedValue({
      rows: [mockDevice],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    (DevicesService.create as jest.Mock).mockResolvedValue(mockDevice);
    (DevicesService.update as jest.Mock).mockResolvedValue(mockDevice);
    (DevicesService.delete as jest.Mock).mockResolvedValue(undefined);

    (AlertService.success as jest.Mock).mockResolvedValue(undefined);
    (AlertService.error as jest.Mock).mockResolvedValue(undefined);
    (AlertService.confirm as jest.Mock).mockResolvedValue(true);
  });

  it("loads and renders devices with stats", async () => {
    render(<DashboardDevicesScreen />);

    await waitFor(() => {
      expect(DevicesService.list).toHaveBeenCalledWith({
        page: 1,
        pageSize: 100,
        sortBy: "updatedAt",
        sortDir: "desc",
      });
    });

    expect(await screen.findByText("Router Core")).toBeTruthy();
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getAllByText("Online").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Offline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("applies filters and reloads list", async () => {
    render(<DashboardDevicesScreen />);

    await screen.findByText("Router Core");

    fireEvent.changeText(
      screen.getByPlaceholderText("Buscar dispositivos..."),
      "router",
    );

    fireEvent.press(screen.getByText("Filtros"));
    const onlineOptions = screen.getAllByText("Online");
    fireEvent.press(onlineOptions[onlineOptions.length - 1]);
    fireEvent.press(screen.getByText("Virtual"));
    fireEvent.press(screen.getByText("Aplicar"));

    await waitFor(() => {
      expect(DevicesService.list).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 100,
        sortBy: "updatedAt",
        sortDir: "desc",
        q: "router",
        status: "online",
        kind: "virtual",
      });
    });
  });

  it("validates required fields before saving", async () => {
    render(<DashboardDevicesScreen />);

    await screen.findByText("Router Core");

    fireEvent.press(screen.getByText("+ Novo"));
    fireEvent.press(screen.getByText("Salvar"));

    expect(await screen.findByText("Nome é obrigatório")).toBeTruthy();
    expect(DevicesService.create).not.toHaveBeenCalled();
  });

  it("creates a new device", async () => {
    render(<DashboardDevicesScreen />);

    await screen.findByText("Router Core");

    fireEvent.press(screen.getByText("+ Novo"));
    fireEvent.changeText(
      screen.getByPlaceholderText("Nome do dispositivo"),
      "Server Edge",
    );
    fireEvent.press(screen.getByText("Salvar"));

    await waitFor(() => {
      expect(DevicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Server Edge" }),
      );
    });

    expect(AlertService.success).toHaveBeenCalledWith(
      "Dispositivo criado com sucesso!",
    );
  });

  it("deletes a device after confirmation", async () => {
    render(<DashboardDevicesScreen />);

    await screen.findByText("Router Core");

    fireEvent.press(screen.getByText("Excluir"));

    await waitFor(() => {
      expect(AlertService.confirm).toHaveBeenCalledWith(
        "Confirmar exclusão",
        'Tem certeza que deseja excluir o dispositivo "Router Core"?',
      );
      expect(DevicesService.delete).toHaveBeenCalledWith("dev-1");
    });

    expect(AlertService.success).toHaveBeenCalledWith(
      "Dispositivo excluído com sucesso!",
    );
  });
});
