import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../Header";
import { usePathname } from "next/navigation";

// Mock next-themes para no interferir
jest.mock("next-themes", () => ({
    useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

describe("Header.tsx", () => {
    beforeEach(() => {
        (usePathname as jest.Mock).mockReturnValue("/");
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renderiza la navegación pública y el logo cuando el usuario está en el inicio", () => {
        render(<Header />);
        
        // Verifica que se muestre Merrash (Logo text)
        expect(screen.getByText("Merrash")).toBeInTheDocument();

        // Verifica que los links públicos existan
        expect(screen.getByText("Nosotros")).toBeInTheDocument();
        expect(screen.getByText("Testimonios")).toBeInTheDocument();

        // Verifica que NO se muestre el tag de "Panel de Administración"
        expect(screen.queryByText("Panel de Administración")).not.toBeInTheDocument();
    });

    it("renderiza navegación de administración cuando el usuario está en /admin", () => {
        (usePathname as jest.Mock).mockReturnValue("/admin");
        render(<Header activeAdminTab="citas" />);

        // Debería existir el tag de admin
        expect(screen.getByText("Panel de Administración")).toBeInTheDocument();
        
        // Debería existir el boton de "Citas Agendadas"
        expect(screen.getByText("Citas Agendadas")).toBeInTheDocument();

        // No deberían verse los links de la landing page default como "Nosotros"
        expect(screen.queryByText("Nosotros")).not.toBeInTheDocument();
    });

    it("el botón hamburguesa abre el menú móvil", () => {
        render(<Header />);
        
        // El logo/titulo móvil debería estar
        const button = screen.getByLabelText("Abrir menú");
        fireEvent.click(button);

        // Debería desplegar los links móviles (ej. Servicio que sí existen en public)
        const elements = screen.getAllByText("Servicios");
        expect(elements.length).toBeGreaterThan(0); // Al menos uno
    });
});
