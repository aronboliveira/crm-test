describe("mobile cypress scaffold", () => {
  it("runs within the mobile workspace", () => {
    cy.wrap(true).should("eq", true);
  });
});
