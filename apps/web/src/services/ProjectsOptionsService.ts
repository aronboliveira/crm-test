import ApiClientService from "./ApiClientService";
import QueryCacheService from "./QueryCacheService";
import type { ProjectOption } from "../types/options.types";

export default class ProjectsOptionsService {
  static #K = "projects.options.active";
  static #TTL = 10 * 60_000;

  static async active(): Promise<readonly ProjectOption[]> {
    return QueryCacheService.getOrFetch(
      ProjectsOptionsService.#K,
      ProjectsOptionsService.#TTL,
      async () => {
        const rows = await ApiClientService.projects.options({ activeOnly: 1 });
        return Array.isArray(rows) ? rows : [];
      },
    );
  }

  static bust(): void {
    QueryCacheService.drop(ProjectsOptionsService.#K);
  }
}
