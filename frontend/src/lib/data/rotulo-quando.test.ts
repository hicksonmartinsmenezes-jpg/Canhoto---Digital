import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ getDb: () => null }));

import { rotuloQuando } from "./entregas";

describe("rotuloQuando", () => {
  // 07/10/2026 15:00 no horário de Brasília (18:00 UTC).
  const agora = new Date("2026-10-07T18:00:00Z");

  it("usa Hoje/Ontem/data no fuso da loja", () => {
    expect(rotuloQuando("2026-10-07T12:45:00-03:00", agora)).toBe("Hoje, 12:45");
    expect(rotuloQuando("2026-10-06T11:01:00-03:00", agora)).toBe("Ontem, 11:01");
    expect(rotuloQuando("2026-10-03T09:30:00-03:00", agora)).toBe("03/10, 09:30");
  });

  it("23:30 de Brasília ainda é o mesmo dia, mesmo já sendo outro dia em UTC", () => {
    const noite = new Date("2026-10-08T02:40:00Z"); // 07/10 23:40 em Brasília
    expect(rotuloQuando("2026-10-07T23:30:00-03:00", noite)).toBe("Hoje, 23:30");
  });
});
