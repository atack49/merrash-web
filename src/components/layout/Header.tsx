"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const NAVIGATION = [
  { name: "Inicio", href: "/#inicio" },
  { name: "Servicios", href: "/#servicios" },
  { name: "Nosotros", href: "/#nosotros" },
  { name: "Contacto", href: "/#contacto" },
  { name: "Testimonios", href: "/testimonios" },
  { name: "Encuestas", href: "/encuestas" },
];

const ADMIN_TABS = [
  { name: "📋 Encuestas", href: "encuestas" },
  { name: "🏥 Servicios", href: "servicios" },
  { name: "⭐ Testimonios", href: "testimonios" },
  { name: "📞 Contactanos", href: "contacto" },
  { name: "📅 Citas Agendadas", href: "citas" },
];

interface HeaderProps {
  activeAdminTab?: string;
  onAdminTabChange?: (tab: string) => void;
}

export function Header({ activeAdminTab, onAdminTabChange }: HeaderProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAdmin = pathname === "/admin";

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 👉 SOLO blanco si estás en HOME y NO has hecho scroll
  const useWhiteStyle = isHome && !isScrolled;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm py-4"
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/#inicio" className="flex items-center gap-3">
          <Image
            src={useWhiteStyle ? "/Logob.svg" : "/Logo.svg"}
            alt="Merrash"
            width={70}
            height={34}
            priority
            className="transition-all duration-300"
          />

          <span
            className={cn(
              "text-2xl font-cormorant font-semibold transition-colors duration-300",
              useWhiteStyle ? "text-white drop-shadow-sm" : "text-[#068E89]"
            )}
          >
            Merrash
          </span>
        </Link>

        {/* Desktop Navigation */}
        {!isAdmin ? (
          <nav className="hidden md:flex items-center gap-8">
            {NAVIGATION.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  useWhiteStyle
                    ? "text-white/90 hover:text-white"
                    : "text-foreground hover:text-accent"
                )}
              >
                {item.name}
              </Link>
            ))}

            <a
              href="https://wa.me/527224958550"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                useWhiteStyle
                  ? "bg-white/90 text-primary hover:bg-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Phone className="w-4 h-4" />
              Agendar Cita
            </a>
          </nav>
        ) : (
          <>
            {/* Desktop Admin Tabs */}
            <nav className="hidden lg:flex items-center gap-1">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => onAdminTabChange?.(tab.href)}
                  className={cn(
                    "px-4 py-2 text-sm md:text-base lg:text-lg font-medium rounded-lg transition-colors whitespace-nowrap",
                    activeAdminTab === tab.href
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-slate-100"
                  )}
                >
                  {tab.name}
                </button>
              ))}
            </nav>

            {/* Tablet Admin Tabs */}
            <nav className="hidden md:flex lg:hidden items-center gap-0.5 flex-wrap justify-center">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => onAdminTabChange?.(tab.href)}
                  className={cn(
                    "px-2 py-1.5 text-xs font-medium rounded transition-colors",
                    activeAdminTab === tab.href
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-slate-100"
                  )}
                >
                  {tab.name.split(' ')[0]}
                </button>
              ))}
            </nav>
          </>
        )}

        {/* Mobile Toggle */}
        <button
          className={cn(
            "md:hidden p-2 transition-colors",
            useWhiteStyle ? "text-white" : "text-foreground"
          )}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Abrir menú"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b md:hidden p-4 flex flex-col gap-3 shadow-lg animate-in slide-in-from-top-2 max-h-[calc(100vh-70px)] overflow-y-auto">
          {isAdmin ? (
            <>
              <p className="text-xs font-semibold text-slate-600 uppercase px-2">Panel de Control</p>
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => {
                    onAdminTabChange?.(tab.href);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left",
                    activeAdminTab === tab.href
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-slate-100"
                  )}
                >
                  {tab.name}
                </button>
              ))}
            </>
          ) : (
            NAVIGATION.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium py-3 px-2 border-b border-border/50 text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))
          )}
        </div>
      )}
    </header>
  );
}
