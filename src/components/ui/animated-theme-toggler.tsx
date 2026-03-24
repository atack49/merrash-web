"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

export function AnimatedThemeToggler() {
  const { theme, setTheme, systemTheme } = useTheme();
  // El estado montado previene errores de hidratación entre servidor y cliente (donde no se sabe el tema)
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Esqueleto transparente con las mismas dimensiones para que no salte el contenido
    return <div className="w-10 h-10 rounded-full" />;
  }

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-secondary/50 hover:bg-secondary text-secondary-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
      aria-label="Alternar tema"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? "dark" : "light"}
          initial={{ y: -20, opacity: 0, rotate: 90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: -90 }}
          transition={{ duration: 0.25, type: "spring", stiffness: 200, damping: 15 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {isDark ? (
            <Moon className="w-5 h-5 text-primary" />
          ) : (
            <Sun className="w-5 h-5 text-primary" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
