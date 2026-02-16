/**
 * @fileoverview Seed user fixtures for E2E tests.
 * Credentials match the seed data displayed on the login page.
 * @module cypress/fixtures/users
 */

/** Seed user role key */
export type SeedUserKey = "admin" | "manager" | "member" | "viewer";

export interface SeedUser {
  readonly email: string;
  readonly password: string;
  readonly role: string;
}

/**
 * Frozen dictionary of seed users.
 * Values must match `apps/api/src/seed/mock-seed.service.ts`.
 */
export const SEED_USERS: Readonly<Record<SeedUserKey, SeedUser>> =
  Object.freeze({
    admin: {
      email: "admin@corp.local",
      password: "Admin#123",
      role: "admin",
    },
    manager: {
      email: "manager@corp.local",
      password: "Manager#123",
      role: "manager",
    },
    member: {
      email: "member@corp.local",
      password: "Member#123",
      role: "member",
    },
    viewer: {
      email: "viewer@corp.local",
      password: "Viewer#123",
      role: "viewer",
    },
  });
