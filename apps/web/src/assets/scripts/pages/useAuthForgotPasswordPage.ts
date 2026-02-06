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
        await AlertService.error("Request failed", "Email is required");
        return;
      }

      const r = await AuthRecoveryService.requestReset(email.value);

      if (r?.devResetToken) {
        const tok = String(r.devResetToken);
        AuthRecoveryService.setLastToken(tok);

        await Swal.fire({
          title: "Dev reset token",
          html: `
      <div class="grid gap-2" style="text-align:left;">
        <div style="font-weight:700;">Token</div>
        <code data-id="token" style="display:block;word-break:break-all;padding:0.6rem;border-radius:0.6rem;background:rgba(0,0,0,0.06)">${tok}</code>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:0.5rem;">
          <button type="button" data-id="copy" class="swal2-confirm swal2-styled" style="margin:0;">Copy</button>
          <button type="button" data-id="go" class="swal2-cancel swal2-styled" style="margin:0;">Go to reset</button>
        </div>
      </div>
    `,
          showConfirmButton: false,
          didOpen: () => {
            try {
              const root = Swal.getHtmlContainer();
              if (!root) return;

              DOMValidator.ensureAttr(root, "role", "dialog");
              DOMValidator.ensureAttr(root, "aria-label", "Dev reset token");

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
          "Request received",
          r.message ||
            "If the email exists, you will receive reset instructions.",
        );
        await router.replace("/login");
      } else {
        await AlertService.error(
          "Request failed",
          r.message || "Invalid request",
        );
      }
    } catch (e) {
      console.error("[AuthForgotPasswordPage] submit failed:", e);
      await AlertService.error("Request failed", e);
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
