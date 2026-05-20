import { describe, it, expect } from "vitest";
import { sanitizeForLog } from "@/lib/security/sanitize";

describe("sanitizeForLog", () => {
  it("ofusca JWT e Bearer", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.sig";
    const out = sanitizeForLog(`Authorization: Bearer ${token}`) as string;
    expect(out).not.toContain("eyJhbGci");
    expect(out).toContain("[jwt-oculto]");
  });

  it("ofusca chaves em query string", () => {
    const out = sanitizeForLog("apikey=super-secret-key") as string;
    expect(out).not.toContain("super-secret");
    expect(out).toContain("[oculto]");
  });

  it("ofusca campos sensíveis em objetos", () => {
    const out = sanitizeForLog({ password: "123", email: "a@b.c" }) as Record<string, unknown>;
    expect(out.password).toBe("[oculto]");
    expect(out.email).toBe("a@b.c");
  });
});
