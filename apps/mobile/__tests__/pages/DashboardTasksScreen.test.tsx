import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import DashboardTasksScreen from "../../src/pages/DashboardTasksScreen";
import { useDashboardTasksPage } from "../../src/hooks/useDashboardTasksPage";

jest.mock("../../src/hooks/useDashboardTasksPage");

describe("DashboardTasksScreen", () => {
  const mockedUseDashboardTasksPage = useDashboardTasksPage as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders task rows from hook data", () => {
    const load = jest.fn();
    const more = jest.fn();
    const setQ = jest.fn();

    mockedUseDashboardTasksPage.mockReturnValue({
      rows: [
        {
          id: "task-1",
          title: "Follow up client",
          projectId: "PRJ-001",
          assigneeEmail: "user@corp.local",
          status: "todo",
          priority: 3,
          dueAt: "2026-03-01",
        },
      ],
      q: "",
      setQ,
      loading: false,
      error: "",
      nextCursor: null,
      load,
      more,
    });

    render(<DashboardTasksScreen />);

    expect(screen.getByText("Tasks")).toBeTruthy();
    expect(screen.getByText("Follow up client")).toBeTruthy();
    expect(screen.getByText("PRJ-001")).toBeTruthy();
    expect(load).toHaveBeenCalledWith(true);
  });

  it("submits search and triggers reload", () => {
    const load = jest.fn();
    const more = jest.fn();
    const setQ = jest.fn();

    mockedUseDashboardTasksPage.mockReturnValue({
      rows: [],
      q: "",
      setQ,
      loading: false,
      error: "",
      nextCursor: "cursor-1",
      load,
      more,
    });

    render(<DashboardTasksScreen />);

    fireEvent.changeText(screen.getByLabelText("Search tasks"), "abc");
    expect(setQ).toHaveBeenCalledWith("abc");

    fireEvent.press(screen.getByLabelText("Reload"));
    expect(load).toHaveBeenCalledWith(true);

    fireEvent.press(screen.getByLabelText("Load more"));
    expect(more).toHaveBeenCalledTimes(1);
  });

  it("shows empty message when no rows are available", () => {
    mockedUseDashboardTasksPage.mockReturnValue({
      rows: [],
      q: "",
      setQ: jest.fn(),
      loading: false,
      error: "",
      nextCursor: null,
      load: jest.fn(),
      more: jest.fn(),
    });

    render(<DashboardTasksScreen />);

    expect(screen.getByText("No tasks.")).toBeTruthy();
  });
});
