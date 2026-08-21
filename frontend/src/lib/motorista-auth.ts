import "server-only";
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

// Autenticação do futuro app do motorista (Issue #5) — PIN numérico de 4
// dígitos por telefone, sem Supabase Auth completo (ver decisão de
// 21/08/2026: PIN simples, mais barato de adotar por motorista terceirizado
// do que login com email+senha). Nunca usa uma lib de hash de senha externa
// (bcrypt/argon2) de propósito — o `scrypt` já vem embutido no Node, então
// evita adicionar dependência só pra isso (ver princípio "evitar
// overengineering" em AGENTS.md).

const SCRYPT_KEYLEN = 64;

// PIN de 4 dígitos (0000–9999, com zeros à esquerda) — gerado pelo servidor
// no cadastro/redefinição, nunca escolhido pelo motorista, nunca gravado em
// texto puro (só o hash abaixo vai pro banco).
export function gerarPin(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

// "salt:hash", ambos em hex — salt aleatório por PIN, então dois motoristas
// com o mesmo PIN não geram o mesmo hash (evita comparação por tabela
// pré-computada).
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

// Comparação em tempo constante (timingSafeEqual) — evita vazar, por
// diferença de tempo de resposta, quantos dígitos do PIN bateram.
export function verificarPin(pin: string, hashArmazenado: string): boolean {
  const [salt, hashEsperado] = hashArmazenado.split(":");
  if (!salt || !hashEsperado) return false;

  const hashTentativa = scryptSync(pin, salt, SCRYPT_KEYLEN);
  const bufferEsperado = Buffer.from(hashEsperado, "hex");
  if (hashTentativa.length !== bufferEsperado.length) return false;

  return timingSafeEqual(hashTentativa, bufferEsperado);
}

// Normaliza telefone pra só dígitos antes de gravar/comparar — o campo de
// UI usa máscara "(79) 99999-9999" (ver maskPhoneInput em @/lib/format),
// mas o login precisa comparar de forma estável independente de formatação.
export function normalizarTelefone(raw: string): string {
  return raw.replace(/\D/g, "");
}
