import { describe, expect, it } from "vitest";
import {
  classificarEnterWizard,
  tentarAdquirirTravaEnvio,
} from "./wizard-keyboard";

describe("tecla Enter no wizard de entrega", () => {
  it("avanca somente pelas etapas iniciais a partir de input text", () => {
    expect(classificarEnterWizard("Enter", "INPUT", "text", 1, false)).toBe("avancar");
    expect(classificarEnterWizard("Enter", "INPUT", "text", 2, false)).toBe("avancar");
  });

  it("nunca usa Enter para submeter, inclusive durante a saida animada da etapa 2", () => {
    expect(classificarEnterWizard("Enter", "INPUT", "text", 3, false)).toBe("bloquear");
    expect(classificarEnterWizard("Enter", "INPUT", "text", 3, true)).toBe("bloquear");
    expect(classificarEnterWizard("Enter", "BUTTON", undefined, 3, false, "submit")).toBe("bloquear");
  });

  it("classifica repetições na etapa 2 como avanço e bloqueia Enter quando a etapa 3 já está animando", () => {
    const repeticoesNaEtapa2 = Array.from({ length: 3 }, () =>
      classificarEnterWizard("Enter", "INPUT", "text", 2, false)
    );
    const repeticoesNaSaida = Array.from({ length: 3 }, () =>
      classificarEnterWizard("Enter", "INPUT", "text", 3, false)
    );

    expect(repeticoesNaEtapa2).toEqual(["avancar", "avancar", "avancar"]);
    expect(repeticoesNaSaida).toEqual(["bloquear", "bloquear", "bloquear"]);
  });

  it("preserva Enter em controles que nao submetem e em textarea", () => {
    expect(classificarEnterWizard("Enter", "TEXTAREA", "textarea", 2, false)).toBe("manter");
    expect(classificarEnterWizard("Enter", "INPUT", "date", 2, false)).toBe("manter");
    expect(classificarEnterWizard("Enter", "BUTTON", undefined, 2, false, "button")).toBe("manter");
    expect(classificarEnterWizard("Enter", "A", undefined, 2, false)).toBe("manter");
    expect(classificarEnterWizard("Enter", "SELECT", undefined, 2, false)).toBe("manter");
  });

  it.each(["number", "email", "password", "search", "tel", "url", "submit"])(
    "bloqueia Enter no input do tipo %s para evitar submissao implicita",
    (inputType) => {
      expect(classificarEnterWizard("Enter", "INPUT", inputType, 1, false)).toBe("bloquear");
      expect(classificarEnterWizard("Enter", "INPUT", inputType, 3, false)).toBe("bloquear");
    }
  );

  it("impede envios repetidos pela trava sincrona e pelo estado pending", () => {
    const trava = { current: false };

    expect(tentarAdquirirTravaEnvio(trava, false, 3, true)).toBe(true);
    const enviosDuplicados = Array.from({ length: 3 }, () =>
      tentarAdquirirTravaEnvio(trava, false, 3, true)
    );
    expect(enviosDuplicados).toEqual([false, false, false]);
    expect(tentarAdquirirTravaEnvio(trava, true, 3, true)).toBe(false);
    trava.current = false;
    expect(tentarAdquirirTravaEnvio(trava, false, 3, true)).toBe(true);
  });

  it("rejects submit unless the review step is active and its entrance animation is complete", () => {
    expect(tentarAdquirirTravaEnvio({ current: false }, false, 2, true)).toBe(false);
    expect(tentarAdquirirTravaEnvio({ current: false }, false, 3, false)).toBe(false);
    expect(tentarAdquirirTravaEnvio({ current: false }, false, 1, false)).toBe(false);
  });

  it("libera a submissao quando a animacao da revisao termina", () => {
    const trava = { current: false };

    expect(tentarAdquirirTravaEnvio(trava, false, 3, false)).toBe(false);
    expect(trava.current).toBe(false);
    expect(tentarAdquirirTravaEnvio(trava, false, 3, true)).toBe(true);
    expect(trava.current).toBe(true);
  });

  it("ignora teclas diferentes de Enter", () => {
    expect(classificarEnterWizard("Escape", "BUTTON", undefined, 3, false, "submit")).toBe("ignorar");
  });
});
