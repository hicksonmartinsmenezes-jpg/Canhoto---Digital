export type EnterWizardAction =
  | "ignorar"
  | "bloquear"
  | "manter"
  | "avancar";

export function classificarEnterWizard(
  tecla: string,
  tagName: string,
  inputType: string | undefined,
  etapa: 1 | 2 | 3,
  enviando: boolean,
  buttonType?: string
): EnterWizardAction {
  if (tecla !== "Enter") return "ignorar";
  if (tagName === "TEXTAREA") return "manter";
  if (tagName === "BUTTON") return buttonType === "submit" ? "bloquear" : "manter";
  if (tagName === "A" || tagName === "SELECT" || tagName === "OPTION") return "manter";

  if (tagName === "INPUT") {
    if (inputType === "text") {
      if (enviando || etapa === 3) return "bloquear";
      return "avancar";
    }
    if (["email", "number", "password", "search", "submit", "tel", "url"].includes(inputType ?? "")) {
      return "bloquear";
    }
  }

  return "manter";
}

export function tentarAdquirirTravaEnvio(
  trava: { current: boolean },
  enviando: boolean,
  etapa: 1 | 2 | 3,
  revisaoPronta: boolean
): boolean {
  if (enviando || trava.current || etapa !== 3 || !revisaoPronta) return false;
  trava.current = true;
  return true;
}
