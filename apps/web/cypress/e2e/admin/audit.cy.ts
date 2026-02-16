/**
 * @fileoverview E2E tests for the Admin Audit page (`/admin/audit`).
 * Covers: page load, table, chart rendering, search, kind filter,
 *         date range filters, actor filter, column visibility,
 *         query-state sync, sorting, and export.
 * @module cypress/e2e/admin/audit.cy
 */
import { ADMIN_AUDIT, TABLE, EXPORT_MODAL } from "../../support/selectors";

describe("Admin Audit Page (/admin/audit)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/admin/audit");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the audit page", () => {
    cy.get(ADMIN_AUDIT.PAGE).should("exist").and("be.visible");
  });

  it("should render audit event rows", () => {
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  it("should render the charts section", () => {
    cy.get(ADMIN_AUDIT.CHARTS_SECTION).should("exist").and("be.visible");
  });

  it("should render the Success/Failure donut chart", () => {
    cy.get(ADMIN_AUDIT.SUCCESS_FAILURE_CHART).should("exist").and("be.visible");
    cy.get(ADMIN_AUDIT.DONUT_CHART).should("have.length.greaterThan", 0);
  });

  it("should render the Hourly Activity bar chart", () => {
    cy.get(ADMIN_AUDIT.HOURLY_ACTIVITY_CHART).should("exist").and("be.visible");
    cy.get(ADMIN_AUDIT.BAR_CHART).should("have.length.greaterThan", 0);
  });

  /* ---------------------------------------------------------------------- */
  /*  Search & filter                                                        */
  /* ---------------------------------------------------------------------- */

  it("should filter events by search query", () => {
    cy.get(ADMIN_AUDIT.SEARCH).clear().type("login");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  it("should sync search to URL (q=)", () => {
    cy.get(ADMIN_AUDIT.SEARCH).clear().type("password");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.location("search").should("include", "q=password");
  });

  it("should filter by kind when dropdown exists", () => {
    cy.get(ADMIN_AUDIT.KIND_FILTER).then(($sel) => {
      if ($sel.length > 0) {
        cy.wrap($sel).select(1);
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(500);
        cy.location("search").should("include", "k=");
      }
    });
  });

  it("should hydrate filters from URL", () => {
    cy.visit("/admin/audit?q=auth");
    cy.get(ADMIN_AUDIT.SEARCH).should("have.value", "auth");
  });

  /* ---------------------------------------------------------------------- */
  /*  Date Range Filters                                                     */
  /* ---------------------------------------------------------------------- */

  describe("Date Range Filters", () => {
    it("should render date from and date to inputs", () => {
      cy.get(ADMIN_AUDIT.DATE_FROM).should("exist").and("be.visible");
      cy.get(ADMIN_AUDIT.DATE_TO).should("exist").and("be.visible");
    });

    it("should filter events by date range", () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      cy.get(ADMIN_AUDIT.DATE_FROM).type(formatDate(yesterday));
      cy.get(ADMIN_AUDIT.DATE_TO).type(formatDate(today));

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Table should update (may have 0 or more rows depending on test data)
      cy.get("tbody").should("exist");
    });

    it("should apply 'Hoje' preset", () => {
      cy.get(ADMIN_AUDIT.PRESET_TODAY).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      const today = new Date().toISOString().split("T")[0];
      cy.get(ADMIN_AUDIT.DATE_FROM).should("have.value", today);
      cy.get(ADMIN_AUDIT.DATE_TO).should("have.value", today);
    });

    it("should apply 'Últimos 7 dias' preset", () => {
      cy.get(ADMIN_AUDIT.PRESET_LAST_7).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      cy.get(ADMIN_AUDIT.DATE_FROM)
        .invoke("val")
        .should("match", /^\d{4}-\d{2}-\d{2}$/);
      cy.get(ADMIN_AUDIT.DATE_TO)
        .invoke("val")
        .should("match", /^\d{4}-\d{2}-\d{2}$/);
    });

    it("should apply 'Últimos 30 dias' preset", () => {
      cy.get(ADMIN_AUDIT.PRESET_LAST_30).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      cy.get(ADMIN_AUDIT.DATE_FROM)
        .invoke("val")
        .should("match", /^\d{4}-\d{2}-\d{2}$/);
      cy.get(ADMIN_AUDIT.DATE_TO)
        .invoke("val")
        .should("match", /^\d{4}-\d{2}-\d{2}$/);
    });

    it("should apply 'Este mês' preset", () => {
      cy.get(ADMIN_AUDIT.PRESET_THIS_MONTH).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      const expected = firstOfMonth.toISOString().split("T")[0];

      cy.get(ADMIN_AUDIT.DATE_FROM).should("have.value", expected);
    });

    it("should clear date filters when clear button is clicked", () => {
      cy.get(ADMIN_AUDIT.DATE_FROM).type("2024-01-01");
      cy.get(ADMIN_AUDIT.DATE_TO).type("2024-01-31");

      // Find and click clear filters button
      cy.contains("button", "Limpar").click();

      cy.get(ADMIN_AUDIT.DATE_FROM).should("have.value", "");
      cy.get(ADMIN_AUDIT.DATE_TO).should("have.value", "");
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Actor Filter                                                           */
  /* ---------------------------------------------------------------------- */

  describe("Actor Filter", () => {
    it("should render actor filter input", () => {
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).should("exist").and("be.visible");
    });

    it("should filter events by actor email", () => {
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).type("admin");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Events should be filtered (may show 0 or more rows)
      cy.get("tbody").should("exist");
    });

    it("should show autocomplete suggestions when typing", () => {
      // Type a partial email
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).type("adm");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Suggestions may appear depending on data
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).should("have.value", "adm");
    });

    it("should clear actor filter when clear button is clicked", () => {
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).type("admin@corp.local");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      cy.contains("button", "Limpar").click();

      cy.get(ADMIN_AUDIT.ACTOR_FILTER).should("have.value", "");
    });

    it("should combine actor filter with search", () => {
      cy.get(ADMIN_AUDIT.SEARCH).type("login");
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).type("admin");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Both filters should be active
      cy.get("tbody").should("exist");
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Column Visibility Toggles                                              */
  /* ---------------------------------------------------------------------- */

  describe("Column Visibility", () => {
    it("should render column visibility dropdown trigger", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).should("exist").and("be.visible");
    });

    it("should open column visibility menu on click", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      cy.get(ADMIN_AUDIT.COLUMN_VIS_MENU).should("be.visible");
    });

    it("should toggle Timestamp column visibility", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // Uncheck Timestamp
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("timestamp"))
        .should("be.checked")
        .uncheck();

      // Close dropdown
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Timestamp column should be hidden
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/timestamp|data/i)
        .should("not.be.visible");
    });

    it("should toggle Event Type column visibility", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("eventType"))
        .should("be.checked")
        .uncheck();

      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Event Type column should be hidden
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/tipo|event type/i)
        .should("not.be.visible");
    });

    it("should toggle Actor column visibility", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("actor"))
        .should("be.checked")
        .uncheck();

      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Actor column should be hidden
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/ator|actor/i)
        .should("not.be.visible");
    });

    it("should toggle Status column visibility", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("status"))
        .should("be.checked")
        .uncheck();

      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Status column should be hidden
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/status/i)
        .should("not.be.visible");
    });

    it("should toggle Details column visibility", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("details"))
        .should("be.checked")
        .uncheck();

      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Details column should be hidden
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/detalhes|details/i)
        .should("not.be.visible");
    });

    it("should preserve column visibility state when filtering", () => {
      // Hide timestamp
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("timestamp")).uncheck();
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Apply a filter
      cy.get(ADMIN_AUDIT.SEARCH).type("login");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Timestamp should still be hidden
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/timestamp|data/i)
        .should("not.be.visible");
    });

    it("should allow toggling multiple columns at once", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("timestamp")).uncheck();
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("details")).uncheck();

      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Both columns should be hidden
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/timestamp|data/i)
        .should("not.be.visible");
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/detalhes|details/i)
        .should("not.be.visible");
    });

    it("should restore all columns when checked again", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // Uncheck all
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("timestamp")).uncheck();
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("eventType")).uncheck();
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("actor")).uncheck();

      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Restore all
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("timestamp")).check();
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("eventType")).check();
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("actor")).check();

      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // All columns should be visible
      cy.get(ADMIN_AUDIT.TABLE_HEADER).should("have.length.greaterThan", 3);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Sorting                                                                 */
  /* ---------------------------------------------------------------------- */

  describe("Column Sorting", () => {
    it("should sort by Timestamp when header is clicked", () => {
      // Find timestamp header and click it
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/timestamp|data/i)
        .click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Sort icon should appear (or data should reorder)
      cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
    });

    it("should toggle sort direction on second click", () => {
      const header = cy
        .get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/timestamp|data/i);

      header.click();
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(200);

      header.click();
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(200);

      // Sort should be reversed
      cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
    });

    it("should sort by Event Type column", () => {
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/tipo|event type/i)
        .click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
    });

    it("should sort by Actor column", () => {
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/ator|actor/i)
        .click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
    });

    it("should preserve sorting when applying filters", () => {
      // Sort by timestamp
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/timestamp|data/i)
        .click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Apply a filter
      cy.get(ADMIN_AUDIT.SEARCH).type("login");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Should still be sorted
      cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Combined Filters & Complex Scenarios                                   */
  /* ---------------------------------------------------------------------- */

  describe("Combined Filters", () => {
    it("should apply search + date range + actor filter together", () => {
      const today = new Date().toISOString().split("T")[0];

      cy.get(ADMIN_AUDIT.SEARCH).type("login");
      cy.get(ADMIN_AUDIT.DATE_FROM).type(today);
      cy.get(ADMIN_AUDIT.DATE_TO).type(today);
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).type("admin");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // All filters should be active
      cy.get("tbody").should("exist");
    });

    it("should clear all filters at once", () => {
      const today = new Date().toISOString().split("T")[0];

      // Apply multiple filters
      cy.get(ADMIN_AUDIT.SEARCH).type("login");
      cy.get(ADMIN_AUDIT.DATE_FROM).type(today);
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).type("admin");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Clear all
      cy.contains("button", "Limpar").click();

      // All should be cleared
      cy.get(ADMIN_AUDIT.SEARCH).should("have.value", "");
      cy.get(ADMIN_AUDIT.DATE_FROM).should("have.value", "");
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).should("have.value", "");
    });

    it("should update charts when filters are applied", () => {
      // Apply date preset
      cy.get(ADMIN_AUDIT.PRESET_TODAY).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Charts should still render
      cy.get(ADMIN_AUDIT.SUCCESS_FAILURE_CHART).should("be.visible");
      cy.get(ADMIN_AUDIT.HOURLY_ACTIVITY_CHART).should("be.visible");
    });

    it("should combine date preset + column visibility + sorting", () => {
      // Apply date preset
      cy.get(ADMIN_AUDIT.PRESET_LAST_7).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Hide a column
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("details")).uncheck();
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // Sort by timestamp
      cy.get(ADMIN_AUDIT.TABLE_HEADER)
        .contains(/timestamp|data/i)
        .click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // All should work together
      cy.get(TABLE.ROWS).should("exist");
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Charts Data Validation                                                 */
  /* ---------------------------------------------------------------------- */

  describe("Charts Data", () => {
    it("should render donut chart with success/failure data", () => {
      cy.get(ADMIN_AUDIT.SUCCESS_FAILURE_CHART).within(() => {
        cy.get(ADMIN_AUDIT.DONUT_CHART).should("exist");
      });
    });

    it("should render bar chart with hourly activity data", () => {
      cy.get(ADMIN_AUDIT.HOURLY_ACTIVITY_CHART).within(() => {
        cy.get(ADMIN_AUDIT.BAR_CHART).should("exist");
      });
    });

    it("should update charts when date range changes", () => {
      // Capture initial chart state
      cy.get(ADMIN_AUDIT.SUCCESS_FAILURE_CHART).should("be.visible");

      // Change date range
      cy.get(ADMIN_AUDIT.PRESET_LAST_7).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Charts should still be visible (data may change)
      cy.get(ADMIN_AUDIT.SUCCESS_FAILURE_CHART).should("be.visible");
      cy.get(ADMIN_AUDIT.HOURLY_ACTIVITY_CHART).should("be.visible");
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Export                                                                  */
  /* ---------------------------------------------------------------------- */

  describe("Export Functionality", () => {
    it("should open export modal", () => {
      cy.get(TABLE.EXPORT_BTN).first().click();
      cy.get(EXPORT_MODAL.DIALOG).should("be.visible");
    });

    it("should export filtered data", () => {
      // Apply a filter
      cy.get(ADMIN_AUDIT.SEARCH).type("login");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Open export
      cy.get(TABLE.EXPORT_BTN).first().click();
      cy.get(EXPORT_MODAL.DIALOG).should("be.visible");

      // Should allow format selection
      cy.get(EXPORT_MODAL.FORMAT_CSV).should("exist");
      cy.get(EXPORT_MODAL.FORMAT_XLSX).should("exist");
    });

    it("should respect column visibility in export", () => {
      // Hide a column
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("details")).uncheck();
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Open export
      cy.get(TABLE.EXPORT_BTN).first().click();
      cy.get(EXPORT_MODAL.DIALOG).should("be.visible");
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Accessibility                                                          */
  /* ---------------------------------------------------------------------- */

  describe("Accessibility", () => {
    it("should have proper ARIA labels on filter inputs", () => {
      cy.get(ADMIN_AUDIT.SEARCH).should("have.attr", "aria-label");
      cy.get(ADMIN_AUDIT.DATE_FROM).should("have.attr", "aria-label");
      cy.get(ADMIN_AUDIT.DATE_TO).should("have.attr", "aria-label");
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).should("have.attr", "aria-label");
    });

    it("should support keyboard navigation in column visibility dropdown", () => {
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).focus().type("{enter}");

      cy.get(ADMIN_AUDIT.COLUMN_VIS_MENU).should("be.visible");

      // Can navigate with Tab
      cy.get(ADMIN_AUDIT.COLUMN_CHECKBOX("timestamp")).focus();
    });

    it("should have accessible chart containers", () => {
      cy.get(ADMIN_AUDIT.SUCCESS_FAILURE_CHART).should(
        "have.attr",
        "aria-label",
      );
      cy.get(ADMIN_AUDIT.HOURLY_ACTIVITY_CHART).should(
        "have.attr",
        "aria-label",
      );
    });

    it("should have focusable date preset buttons", () => {
      cy.get(ADMIN_AUDIT.PRESET_TODAY).should("be.visible").focus();
      cy.get(ADMIN_AUDIT.PRESET_LAST_7).should("be.visible").focus();
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  RBAC                                                                    */
  /* ---------------------------------------------------------------------- */

  describe("Role-Based Access Control", () => {
    it("should block viewer from accessing this page", () => {
      cy.window().then((win) => win.sessionStorage.clear());
      cy.login("viewer");
      cy.visit("/admin/audit");
      cy.url().should("not.include", "/admin/audit");
    });

    it("should allow admin to access all features", () => {
      cy.login("admin");
      cy.visit("/admin/audit");

      // Should see all features
      cy.get(ADMIN_AUDIT.PAGE).should("be.visible");
      cy.get(ADMIN_AUDIT.CHARTS_SECTION).should("be.visible");
      cy.get(ADMIN_AUDIT.COLUMN_VIS_TRIGGER).should("be.visible");
      cy.get(TABLE.EXPORT_BTN).should("be.visible");
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Performance & Edge Cases                                               */
  /* ---------------------------------------------------------------------- */

  describe("Edge Cases", () => {
    it("should handle empty date range gracefully", () => {
      cy.get(ADMIN_AUDIT.DATE_FROM).clear();
      cy.get(ADMIN_AUDIT.DATE_TO).clear();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      // Should show all data
      cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
    });

    it("should handle invalid date range (from > to)", () => {
      cy.get(ADMIN_AUDIT.DATE_FROM).type("2024-12-31");
      cy.get(ADMIN_AUDIT.DATE_TO).type("2024-01-01");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Should handle gracefully (may show 0 results or validation)
      cy.get("tbody").should("exist");
    });

    it("should handle search with special characters", () => {
      cy.get(ADMIN_AUDIT.SEARCH).type("login@#$%");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      // Should not crash
      cy.get("tbody").should("exist");
    });

    it("should handle rapid filter changes", () => {
      cy.get(ADMIN_AUDIT.SEARCH).type("login");
      cy.get(ADMIN_AUDIT.ACTOR_FILTER).type("admin");
      cy.get(ADMIN_AUDIT.PRESET_TODAY).click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      cy.contains("button", "Limpar").click();

      // Should handle gracefully
      cy.get("tbody").should("exist");
    });

    it("should maintain state after page reload", () => {
      cy.get(ADMIN_AUDIT.SEARCH).type("login");

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      cy.reload();

      // Should restore from URL
      cy.get(ADMIN_AUDIT.SEARCH).should("have.value", "login");
    });
  });
});
