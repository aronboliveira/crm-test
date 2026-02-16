describe("mobile clients route contract", () => {
  it("exposes dashboard clients route and validates it", () => {
    cy.readFile("src/constants/nav-routes.constants.ts").then((content) => {
      expect(content).to.include('CLIENTS: "DashboardClients"');
    });

    cy.readFile("src/navigation/AppNavigator.tsx").then((content) => {
      expect(content).to.include("NAV_ROUTES.DASHBOARD.CLIENTS");
      expect(content).to.include("DashboardClientsScreen");
    });
  });
});
