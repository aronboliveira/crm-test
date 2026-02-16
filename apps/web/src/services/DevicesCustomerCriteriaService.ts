import StorageService from "./StorageService";

export type CustomerDeviceCriteria = "same-domain" | "exclude-self";

export const DEVICES_CUSTOMER_CRITERIA_UPDATED_EVENT =
  "devices:customer-criteria:updated";

const STORAGE_KEY = "devices.customer.criteria.v1";

const DEFAULT_CRITERIA: CustomerDeviceCriteria = "same-domain";

const VALID_CRITERIA = new Set<CustomerDeviceCriteria>([
  "same-domain",
  "exclude-self",
]);

export type CustomerDeviceCriteriaOption = Readonly<{
  value: CustomerDeviceCriteria;
  label: string;
  description: string;
}>;

const CRITERIA_OPTIONS: readonly CustomerDeviceCriteriaOption[] = Object.freeze(
  [
    Object.freeze({
      value: "same-domain" as const,
      label: "Mesmo domínio de e-mail",
      description:
        "Considera dispositivo de cliente quando o e-mail do dono pertence ao mesmo domínio do usuário logado.",
    }),
    Object.freeze({
      value: "exclude-self" as const,
      label: "Qualquer e-mail diferente do meu",
      description:
        "Considera dispositivo de cliente quando o e-mail do dono não é o mesmo e-mail do usuário logado.",
    }),
  ],
);

const toCriteria = (value: unknown): CustomerDeviceCriteria =>
  typeof value === "string" &&
  VALID_CRITERIA.has(value as CustomerDeviceCriteria)
    ? (value as CustomerDeviceCriteria)
    : DEFAULT_CRITERIA;

const notifyUpdated = (criteria: CustomerDeviceCriteria): void => {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  ) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<CustomerDeviceCriteria>(
      DEVICES_CUSTOMER_CRITERIA_UPDATED_EVENT,
      { detail: criteria },
    ),
  );
};

export default class DevicesCustomerCriteriaService {
  static readonly defaults = Object.freeze({
    criteria: DEFAULT_CRITERIA,
  });

  static options(): readonly CustomerDeviceCriteriaOption[] {
    return CRITERIA_OPTIONS;
  }

  static load(): CustomerDeviceCriteria {
    const stored = StorageService.local.getJson<{ criteria?: unknown }>(
      STORAGE_KEY,
      { criteria: DEFAULT_CRITERIA },
    );
    return toCriteria(stored?.criteria);
  }

  static save(criteria: unknown): CustomerDeviceCriteria {
    const normalized = toCriteria(criteria);
    StorageService.local.setJson(STORAGE_KEY, { criteria: normalized });
    notifyUpdated(normalized);
    return normalized;
  }
}
