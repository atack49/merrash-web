// Opcional: configura custom jest matchers para aserciones en el DOM.
// ej. expect(element).toBeInTheDocument()
import "@testing-library/jest-dom";
// Extensión para text encoder (soluciona warn en Node)
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: jest.fn().mockReturnValue('/'),
  useSearchParams: () => new URLSearchParams(),
}));
