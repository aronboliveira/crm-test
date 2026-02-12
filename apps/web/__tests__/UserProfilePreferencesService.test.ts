import { beforeEach, describe, expect, it, vi } from "vitest";
import UserProfilePreferencesService, {
  PROFILE_INTERESTS_MAX,
  PROFILE_PREFERENCES_UPDATED_EVENT,
} from "../src/services/UserProfilePreferencesService";

describe("UserProfilePreferencesService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default preferences when nothing is stored", () => {
    const preferences = UserProfilePreferencesService.load();

    expect(preferences.department).toBe("Produto");
    expect(preferences.workMode).toBe("balanced");
    expect(preferences.dashboard.showEmailInTopBar).toBe(true);
    expect(preferences.communication.includeExamples).toBe(true);
  });

  it("sanitizes invalid payloads when saving", () => {
    const saved = UserProfilePreferencesService.save({
      preferredName: "  Carla  ",
      headline: "  Lider de Projetos  ",
      department: "Departamento inexistente",
      workMode: "modo-invalido",
      interests: [
        "crm",
        "crm",
        "projects",
        "sales",
        "support",
        "integrations",
      ],
      dashboard: {
        showEmailInTopBar: "sim",
      },
      communication: {
        conciseUpdates: false,
      },
    });

    expect(saved.preferredName).toBe("Carla");
    expect(saved.headline).toBe("Lider de Projetos");
    expect(saved.department).toBe("Produto");
    expect(saved.workMode).toBe("balanced");
    expect(saved.interests.length).toBe(PROFILE_INTERESTS_MAX);
    expect(saved.interests[0]).toBe("crm");
    expect(saved.dashboard.showEmailInTopBar).toBe(true);
    expect(saved.communication.conciseUpdates).toBe(false);
  });

  it("emits update event after save", () => {
    const eventSpy = vi.fn();
    window.addEventListener(PROFILE_PREFERENCES_UPDATED_EVENT, eventSpy);

    UserProfilePreferencesService.save({
      preferredName: "Marta",
      dashboard: { showEmailInTopBar: false },
    });

    expect(eventSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener(PROFILE_PREFERENCES_UPDATED_EVENT, eventSpy);
  });

  it("resets preferences back to defaults", () => {
    UserProfilePreferencesService.save({
      preferredName: "Andre",
      dashboard: { showEmailInTopBar: false },
      communication: { celebrateMilestones: true },
    });

    const reset = UserProfilePreferencesService.reset();

    expect(reset.preferredName).toBe("");
    expect(reset.dashboard.showEmailInTopBar).toBe(true);
    expect(reset.communication.celebrateMilestones).toBe(false);
    expect(UserProfilePreferencesService.load().preferredName).toBe("");
  });
});
