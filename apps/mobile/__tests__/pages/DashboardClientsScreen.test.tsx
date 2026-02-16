import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import DashboardClientsScreen from "../../src/pages/DashboardClientsScreen";
import { useDashboardClientsPage } from "../../src/hooks/useDashboardClientsPage";

jest.mock("../../src/hooks/useDashboardClientsPage");

describe("DashboardClientsScreen", () => {
  const load = jest.fn();
  const more = jest.fn();
  const setQ = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useDashboardClientsPage as jest.Mock).mockReturnValue({
      rows: [
        {
          id: "client-1",
          name: "Acme Corp",
          email: "contact@acme.com",
          phone: "+55 11 98888-0000",
          company: "Acme",
          preferredContact: "email",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      loading: false,
      error: "",
      nextCursor: "next-1",
      q: "",
      setQ,
      load,
      more,
    });
  });

  it("renders clients data and triggers initial load", () => {
    render(<DashboardClientsScreen />);

    expect(screen.getByText("Clients")).toBeTruthy();
    expect(screen.getByText("Acme Corp")).toBeTruthy();
    expect(screen.getByText("contact@acme.com")).toBeTruthy();
    expect(load).toHaveBeenCalledWith(true);
  });

  it("handles search and reload actions", () => {
    render(<DashboardClientsScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("search clients"), "acme");
    fireEvent(screen.getByPlaceholderText("search clients"), "submitEditing");
    fireEvent.press(screen.getByText("Reload"));

    expect(setQ).toHaveBeenCalledWith("acme");
    expect(load).toHaveBeenCalledWith(true);
  });

  it("loads more when footer button is pressed", () => {
    render(<DashboardClientsScreen />);

    fireEvent.press(screen.getByText("Load more"));
    expect(more).toHaveBeenCalledTimes(1);
  });

  it("shows empty state message when there are no rows", () => {
    (useDashboardClientsPage as jest.Mock).mockReturnValue({
      rows: [],
      loading: false,
      error: "",
      nextCursor: null,
      q: "",
      setQ,
      load,
      more,
    });

    render(<DashboardClientsScreen />);

    expect(screen.getByText("No clients.")).toBeTruthy();
  });
});
