import { cn } from "@/lib/utils";

describe("utils -> cn()", () => {
  it("debe fusionar clases de Tailwind correctamente", () => {
    const result = cn("bg-red-500", "text-white");
    expect(result).toBe("bg-red-500 text-white");
  });

  it("debe resolver conflictos de Tailwind preservando la última clase", () => {
    // text-sm y text-lg son condicionales
    const result = cn("px-2 text-sm", "text-lg");
    expect(result).toBe("px-2 text-lg"); // "text-lg" debería sobreescribir "text-sm"
  });

  it("debe limpiar valores booleanos, nulos o indefinidos", () => {
    const isActive = false;
    const isError = null;
    const result = cn(
      "base-class",
      isActive && "active-class",
      isError && "error-class",
      undefined
    );
    expect(result).toBe("base-class");
  });
});
