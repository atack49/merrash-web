import { render, screen, fireEvent } from "@testing-library/react";
import { AnimatedThemeToggler } from "../animated-theme-toggler";
import { useTheme } from "next-themes";

// Mock del hook useTheme
jest.mock("next-themes", () => ({
    useTheme: jest.fn(),
}));

describe("AnimatedThemeToggler", () => {
    let mockSetTheme: jest.Mock;

    beforeEach(() => {
        mockSetTheme = jest.fn();
        (useTheme as jest.Mock).mockReturnValue({
            theme: "system",
            systemTheme: "light",
            setTheme: mockSetTheme,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renderiza correctamente", () => {
        render(<AnimatedThemeToggler />);
        const button = screen.getByRole("button", { name: /Alternar tema/i });
        expect(button).toBeInTheDocument();
        // Cuando es system, debiese tener title "Automático (Sistema)"
        expect(button).toHaveAttribute("title", "Tema: Automático (Sistema)");
    });

    it("cicla de 'system' a 'dark' correctamente", () => {
        render(<AnimatedThemeToggler />);
        const button = screen.getByRole("button", { name: /Alternar tema/i });
        
        fireEvent.click(button);
        // Si systemTheme="light", isDark es false. Al clickear theme='system' -> "dark" o "light". 
        // Según la lógica: isDark ? 'light' : 'dark'. Si isDark es false, click envía 'dark'.
        expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
});
