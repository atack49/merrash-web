const nextJest = require("next/jest");

// Proveer la ruta al directorio de la app Next.js
const createJestConfig = nextJest({
  dir: "./",
});

// Configuración personalizada para Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Test environment configurado a jsdom para renderizado de React
  testEnvironment: "jest-environment-jsdom",
  // Archivo que se ejecutará antes de todos los tests
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    // Configura el soporte absoluto de imports de TS, mapeando `@/` a `src/`
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
};

// Se exporta envuelto en createJestConfig para cargar el entorno asíncrono
module.exports = createJestConfig(customJestConfig);
