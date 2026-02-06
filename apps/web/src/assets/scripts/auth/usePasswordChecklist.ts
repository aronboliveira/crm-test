import { computed } from "vue";
import PasswordPolicyService from "../../../services/PasswordPolicyService";

export interface PasswordChecklistProps {
  password: string;
  confirm: string;
}

export function usePasswordChecklist(props: PasswordChecklistProps) {
  const rules = computed(() =>
    PasswordPolicyService.evaluate(props.password, props.confirm),
  );
  const okAll = computed(() => rules.value.every((r) => r.ok));

  return { rules, okAll };
}
