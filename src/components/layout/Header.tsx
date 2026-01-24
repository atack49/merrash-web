"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CONTACT_INFO } from "@/lib/data";


const NAVIGATION = [
  { name: "Inicio", href: "/#inicio" },
  { name: "Servicios", href: "/#servicios" },
  { name: "Nosotros", href: "/#nosotros" },
  { name: "Contacto", href: "/#contacto" },
  { name: "Testimonios", href: "/testimonios" },
  { name: "Encuestas", href: "/encuestas" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm py-4"
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between relative z-50">
        {/* Logo */}
        <Link href="/#inicio" className="flex items-center">
          <Image
            src="/Logo.svg"
            alt="Merrash"
            width={70}
            height={34}
            priority
            className="transition-all duration-300"
          />
          <span className="ml-3 text-2xl font-cormorant font-semibold text-[#068E89]">
            Merrash
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {NAVIGATION.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-accent",
                isScrolled ? "text-foreground" : "text-foreground/90"
              )}
            >
              {item.name}
            </Link>
          ))}

          <a
            href={`https://wa.me/52${CONTACT_INFO.phone[1].replace(/\s/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Agendar Cita
          </a>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-foreground relative z-50"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mounted && createPortal(
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: "-100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "-100%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl md:hidden flex flex-col pt-24 px-6 pb-8 overflow-y-auto"
            >
              {/* Close button inside the portal */}
              <button
                className="absolute top-6 right-4 p-2 text-foreground z-50"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="w-8 h-8" />
              </button>

              <nav className="flex flex-col gap-6 items-center justify-center flex-1">
                {NAVIGATION.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
                    className="w-full text-center"
                  >
                    <Link
                      href={item.href}
                      className="text-3xl font-cormorant font-medium text-foreground hover:text-primary transition-colors block py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + NAVIGATION.length * 0.05, duration: 0.3 }}
                  className="mt-8 w-full max-w-xs"
                >
                  <a
                    href={`https://wa.me/52${CONTACT_INFO.phone[1].replace(/\s/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary text-primary-foreground w-full py-4 rounded-full text-lg font-medium flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Phone className="w-5 h-5" />
                    Agendar Cita
                  </a>
                </motion.div>
              </nav>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-center mt-auto text-muted-foreground text-sm pt-8"
              >
                <p>© {new Date().getFullYear()} Merrash. Todos los derechos reservados.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
}
