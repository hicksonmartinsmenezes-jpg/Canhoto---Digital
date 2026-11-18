import { describe, expect, it } from "vitest";
import { protocoloEhHttps } from "./cookie-seguro";

describe("protocoloEhHttps", () => {
  it("aceita https", () => {
    expect(protocoloEhHttps("https")).toBe(true);
    expect(protocoloEhHttps("HTTPS")).toBe(true);
  });
  it("usa o primeiro valor quando há vários proxies", () => {
    expect(protocoloEhHttps("https, http")).toBe(true);
    expect(protocoloEhHttps("http, https")).toBe(false);
  });
  it("recusa http e ausência do cabeçalho", () => {
    expect(protocoloEhHttps("http")).toBe(false);
    expect(protocoloEhHttps(null)).toBe(false);
    expect(protocoloEhHttps(undefined)).toBe(false);
  });
});
