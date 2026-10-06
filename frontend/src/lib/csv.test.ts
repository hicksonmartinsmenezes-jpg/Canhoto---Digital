import { describe, expect, it } from "vitest";
import { celulaCsv, linhaCsv } from "./csv";

describe("celulaCsv", () => {
  it("mantém texto simples", () => {
    expect(celulaCsv("Maria Souza")).toBe("Maria Souza");
  });

  it("entre aspas quando tem separador, aspas ou quebra de linha", () => {
    expect(celulaCsv("Rua A; 10")).toBe('"Rua A; 10"');
    expect(celulaCsv('Disse "oi"')).toBe('"Disse ""oi"""');
    expect(celulaCsv("a\nb")).toBe('"a\nb"');
  });

  it("vírgula não precisa de aspas (o separador é ponto e vírgula)", () => {
    expect(celulaCsv("R$ 1.234,56")).toBe("R$ 1.234,56");
  });

  it("neutraliza fórmulas", () => {
    expect(celulaCsv("=HYPERLINK(\"http://x\")")).toBe(
      '"\'=HYPERLINK(""http://x"")"'
    );
    expect(celulaCsv("+55 79 99999-9999")).toBe("'+55 79 99999-9999");
    expect(celulaCsv("-1")).toBe("'-1");
    expect(celulaCsv("@SOMA(A1)")).toBe("'@SOMA(A1)");
  });

  it("não altera o código '#123'", () => {
    expect(celulaCsv("#123")).toBe("#123");
  });
});

describe("linhaCsv", () => {
  it("junta com ponto e vírgula", () => {
    expect(linhaCsv(["a", "b;c", "=1"])).toBe("a;\"b;c\";'=1");
  });
});
