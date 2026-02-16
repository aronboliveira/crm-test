describe("mobile tasks dashboard wiring", () => {
  it("has a dedicated tasks screen and navigator wiring", () => {
    cy.readFile("src/pages/DashboardTasksScreen.tsx").should(
      "contain",
      "DashboardTasksScreen",
    );
    cy.readFile("src/hooks/useDashboardTasksPage.ts").should(
      "contain",
      "AdminApiService.tasksList",
    );
    cy.readFile("src/navigation/AppNavigator.tsx")
      .should("contain", "NAV_ROUTES.DASHBOARD.TASKS")
      .and("contain", "DashboardTasksScreen");
  });
});
