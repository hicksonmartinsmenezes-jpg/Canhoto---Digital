import { describe, expect, it, vi } from "vitest";
import { caminhoDaNotificacao, removerOuvinte } from "./push-nativo";

const acao = (url: unknown) => ({ notification: { data: { url } } });

describe("caminhoDaNotificacao", () => {
  it("aceita o detalhe da entrega e a lista", () => {
    expect(caminhoDaNotificacao(acao("/motorista/entregas/abc-123"))).toBe(
      "/motorista/entregas/abc-123"
    );
    expect(caminhoDaNotificacao(acao("/motorista"))).toBe("/motorista");
  });

  it("recusa endereços fora do app do motorista", () => {
    expect(caminhoDaNotificacao(acao("https://evil.example/"))).toBeNull();
    expect(caminhoDaNotificacao(acao("//evil.example"))).toBeNull();
    expect(caminhoDaNotificacao(acao("/canhotos"))).toBeNull();
    expect(caminhoDaNotificacao(acao("/motorista/../canhotos"))).toBeNull();
    expect(caminhoDaNotificacao(acao("javascript:alert(1)"))).toBeNull();
  });

  it("recusa dados ausentes ou de outro tipo", () => {
    expect(caminhoDaNotificacao({})).toBeNull();
    expect(caminhoDaNotificacao(acao(42))).toBeNull();
  });
});

describe("removerOuvinte", () => {
  it("remove quando o plugin devolve uma Promise", async () => {
    const remove = vi.fn();
    removerOuvinte(Promise.resolve({ remove }));
    await Promise.resolve();
    await Promise.resolve();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("remove quando o plugin devolve o próprio ouvinte (sem Promise)", async () => {
    const remove = vi.fn();
    expect(() => removerOuvinte({ remove })).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("ignora valores inesperados e erros ao remover", async () => {
    expect(() => removerOuvinte(undefined)).not.toThrow();
    expect(() => removerOuvinte({})).not.toThrow();
    expect(() =>
      removerOuvinte({
        remove: () => {
          throw new Error("falhou");
        },
      })
    ).not.toThrow();
    await Promise.resolve();
  });
});
