import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AlertService from "../../../services/AlertService";
import AuthRecoveryService from "../../../services/AuthRecoveryService";
import FormPersistenceService from "../../../services/FormPersistenceService";
import Swal from "sweetalert2";
import { DOMValidator } from "@corp/foundations";

export function useAuthForgotPasswordPage() {
  const router = useRouter();

  const formId = "auth_forgot_password_form";
  const formEl = ref<HTMLFormElement | null>(null);

  const busy = ref(false);
  const email = ref("");

  const submit = async () => {
    if (busy.value) return;

    busy.value = true;
    try {
      if (!email.value?.trim()) {
        await AlertService.error("Falha na solicitação", "O e-mail é obrigatório");
        return;
      }

      const r = await AuthRecoveryService.requestReset(email.value);

      if (r?.devResetToken) {
        const tok = String(r.devResetToken);
        AuthRecoveryService.setLastToken(tok);

        await Swal.fire({
          title: "Token de redefinição (dev)",
          html: `
      <div class="grid gap-2" style="text-align:left;">
        <div style="font-weight:700;">Token</div>
        <code data-id="token" style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${tok}</code>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:0.5rem;">
          <button type="button" data-id="copy" class="swal2-confirm swal2-styled" style="margin:0;">Copiar</button>
          <button type="button" data-id="go" class="swal2-cancel swal2-styled" style="margin:0;">Ir para redefinição</button>
        </div>
      </div>
    `,
          showConfirmButton: false,
          didOpen: () => {
            try {
              const root = Swal.getHtmlContainer();
              if (!root) return;

              DOMValidator.ensureAttr(root, "role", "dialog");
              DOMValidator.ensureAttr(root, "aria-label", "Token de redefinição (dev)");

              const copyBtn = root.querySelector(
                "[data-id='copy']",
              ) as HTMLButtonElement | null;
              const goBtn = root.querySelector(
                "[data-id='go']",
              ) as HTMLButtonElement | null;
              const code = root.querySelector(
                "[data-id='token']",
              ) as HTMLElement | null;

              if (copyBtn && !copyBtn.hasAttribute("data-bound")) {
                copyBtn.setAttribute("data-bound", "1");
                copyBtn.addEventListener("click", async () => {
                  const txt = code?.textContent || tok;
                  try {
                    await navigator.clipboard.writeText(txt);
                  } catch (clipErr) {
                    console.error(
                      "[AuthForgotPasswordPage] clipboard write failed:",
                      clipErr,
                    );
                  }
                  void Swal.close();
                });
              }

              if (goBtn && !goBtn.hasAttribute("data-bound")) {
                goBtn.setAttribute("data-bound", "1");
                goBtn.addEventListener("click", () => {
                  void Swal.close();
                  void router.replace(
                    `/reset-password?token=${encodeURIComponent(tok)}`,
                  );
                });
              }
            } catch (dialogErr) {
              console.error(
                "[AuthForgotPasswordPage] dialog setup failed:",
                dialogErr,
              );
            }
          },
        });

        return;
      }

      if (r.ok) {
        await AlertService.success(
          "Solicitação recebida",
          r.message ||
            "Se o e-mail existir, você receberá instruções de redefinição.",
        );
        await router.replace("/login");
      } else {
        await AlertService.error(
          "Falha na solicitação",
          r.message || "Solicitação inválida",
        );
      }
    } catch (e) {
      console.error("[AuthForgotPasswordPage] submit failed:", e);
      await AlertService.error("Falha na solicitação", e);
    } finally {
      busy.value = false;
    }
  };

  onMounted(() => {
    try {
      email.value = AuthRecoveryService.lastEmail() || email.value;

      if (formEl.value) {
        FormPersistenceService.bind(formEl.value, formId);
      }
    } catch (e) {
      console.error("[AuthForgotPasswordPage] mount failed:", e);
    }
  });

  return { formEl, formId, busy, email, submit, router };
}
