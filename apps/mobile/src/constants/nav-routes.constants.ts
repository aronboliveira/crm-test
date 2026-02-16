/**
 * Navigation route constants
 *
 * Frozen dictionary of all screen route names used in React Navigation.
 * Use these constants instead of magic strings for type safety and consistency.
 *
 * @example
 * ```typescript
 * navigation.navigate(NAV_ROUTES.AUTH.LOGIN);
 * navigation.navigate(NAV_ROUTES.DASHBOARD.PROJECTS);
 * ```
 */

import DeepFreeze from "../utils/deepFreeze";

const _NAV_ROUTES = {
  /** Authentication routes */
  AUTH: {
    /** Login screen */
    LOGIN: "AuthLogin",
    /** Two-factor verification screen */
    TWO_FACTOR: "AuthTwoFactor",
    /** Forgot password screen */
    FORGOT_PASSWORD: "AuthForgotPassword",
    /** Reset password screen */
    RESET_PASSWORD: "AuthResetPassword",
  },

  /** Dashboard routes */
  DASHBOARD: {
    /** Dashboard home/overview */
    HOME: "Dashboard",
    /** Projects list */
    PROJECTS: "DashboardProjects",
    /** Tasks list */
    TASKS: "DashboardTasks",
    /** Clients list */
    CLIENTS: "DashboardClients",
    /** Client profile detail */
    CLIENT_PROFILE: "DashboardClientProfile",
    /** Leads pipeline */
    LEADS: "DashboardLeads",
    /** Calendar view */
    CALENDAR: "DashboardCalendar",
    /** Templates management */
    TEMPLATES: "DashboardTemplates",
    /** Data import */
    IMPORT: "DashboardImport",
    /** Reports view */
    REPORTS: "DashboardReports",
    /** Devices management */
    DEVICES: "DashboardDevices",
    /** My work overview */
    MY_WORK: "DashboardMyWork",
  },

  /** Admin routes */
  ADMIN: {
    /** User management */
    USERS: "AdminUsers",
    /** Audit logs */
    AUDIT: "AdminAudit",
    /** Email outbox */
    MAIL_OUTBOX: "AdminMailOutbox",
  },

  /** Integration routes */
  INTEGRATIONS: {
    /** Integrations overview */
    HOME: "Integrations",
    /** GLPI integration */
    GLPI: "IntegrationsGLPI",
    /** SAT ERP integration */
    SAT: "IntegrationsSAT",
    /** NextCloud integration */
    NEXTCLOUD: "IntegrationsNextCloud",
    /** Zimbra integration */
    ZIMBRA: "IntegrationsZimbra",
    /** Outlook integration */
    OUTLOOK: "IntegrationsOutlook",
  },

  /** User profile routes */
  PROFILE: {
    /** User profile view/edit */
    HOME: "UserProfile",
  },
} as const;

/**
 * Frozen navigation routes dictionary
 * All route names are immutable and type-safe
 */
export const NAV_ROUTES = DeepFreeze.apply(_NAV_ROUTES);

/**
 * Type helper for navigation route values
 */
export type NavRoute = typeof _NAV_ROUTES;

/**
 * Get all route names as a flat array
 */
export function getAllRouteNames(): string[] {
  const routes: string[] = [];

  for (const section of Object.values(_NAV_ROUTES)) {
    for (const route of Object.values(section)) {
      routes.push(route);
    }
  }

  return routes;
}

/**
 * Check if a route name is valid
 */
export function isValidRoute(routeName: string): boolean {
  return getAllRouteNames().includes(routeName);
}
