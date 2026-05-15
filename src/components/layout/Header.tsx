"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, CalendarDays, HeartPulse, PhoneCall, Star, ClipboardList, ShieldCheck, BookOpen, MessageSquare } from 'lucide-react';
import { cn } from "@/lib/utils";
import { openChatbotWidget } from "@/lib/chatbot/widgetEvents";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const NAVIGATION = [
  { name: "Inicio", href: "/#inicio" },
  { name: "Servicios", href: "/#servicios" },
  { name: "Nosotros", href: "/#nosotros" },
  { name: "Cursos", href: "/cursos" },
  { name: "Contacto", href: "/#contacto" },
  { name: "Testimonios", href: "/testimonios" },
  { name: "Encuestas", href: "/encuestas" },
  { name: "Admin", href: "/admin" },
];

const ADMIN_TABS = [
  { name: "Citas Agendadas", shortName: "Citas", href: "citas", icon: CalendarDays },
  { name: "Chat en Vivo", shortName: "Chat", href: "chat", icon: MessageSquare },
  { name: "Servicios", shortName: "Servicios", href: "servicios", icon: HeartPulse },
  { name: "Contactanos", shortName: "Contacto", href: "contacto", icon: PhoneCall },
  { name: "Testimonios", shortName: "Testimonios", href: "testimonios", icon: Star },
  { name: "Encuestas", shortName: "Encuestas", href: "encuestas", icon: ClipboardList },
  { name: "Cursos", shortName: "Cursos", href: "cursos", icon: BookOpen },
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

  //  SOLO blanco si estás en HOME y NO has hecho scroll
  const useWhiteStyle = isHome && !isScrolled;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-card/80 backdrop-blur-md shadow-sm py-4"
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/#inicio" className="flex items-center gap-2 lg:gap-3 shrink-0 mr-4 lg:mr-8">
          <Image
            src={useWhiteStyle ? "/logob.svg" : "/Logo.svg"}
            alt="Merrash"
            width={70}
            height={34}
            priority
            className="transition-all duration-300 shrink-0"
          />

          <span
            className={cn(
              "text-2xl font-cormorant font-semibold transition-colors duration-300 shrink-0",
              useWhiteStyle ? "text-white drop-shadow-sm" : "text-[#068E89]"
            )}
          >
            Merrash
          </span>

          {isAdmin && (
            <span className="hidden md:inline-flex shrink-0 items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ml-2">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden 2xl:inline">Panel de Administración</span>
              <span className="hidden xl:inline 2xl:hidden">Panel Admin</span>
              <span className="inline xl:hidden">Admin</span>
            </span>
          )}
        </Link>

        {/* Desktop Navigation */}
        {!isAdmin ? (
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8">
            {NAVIGATION.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors whitespace-nowrap",
                  useWhiteStyle
                    ? "text-white/90 hover:text-white"
                    : "text-foreground hover:text-accent"
                )}
              >
                {item.name}
              </Link>
            ))}

            <div className="flex items-center">
              <AnimatedThemeToggler />
            </div>

            <button
              type="button"
              onClick={openChatbotWidget}
              className={cn(
                "px-4 lg:px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap",
                useWhiteStyle
                  ? "bg-card/90 text-primary hover:bg-card"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Agendar Cita</span>
              <span className="inline lg:hidden">Cita</span>
            </button>
          </nav>
        ) : (
          <>
            {/* Desktop Admin Tabs (Large screens) */}
            <nav className="hidden xl:flex items-center gap-1">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => onAdminTabChange?.(tab.href)}
                  className={cn(
                    "px-4 py-2 text-base font-medium rounded-full transition-colors whitespace-nowrap",
                    activeAdminTab === tab.href
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-secondary/50"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <tab.icon className="w-4 h-4" />
                    {tab.name}
                  </span>
                </button>
              ))}
            </nav>

            {/* Desktop Admin Tabs (Medium-Large screens) */}
            <nav className="hidden lg:flex xl:hidden items-center gap-0.5">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => onAdminTabChange?.(tab.href)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                    activeAdminTab === tab.href
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-secondary/50"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <tab.icon className="w-4 h-4" />
                    {tab.shortName}
                  </span>
                </button>
              ))}
            </nav>

            <div className="hidden lg:flex items-center ml-1 border-l border-border/50 pl-2">
              <AnimatedThemeToggler />
            </div>

            {/* Tablet Admin Tabs (Medium screens) */}
            <nav className="hidden md:flex lg:hidden items-center gap-0.5 flex-wrap justify-center">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => onAdminTabChange?.(tab.href)}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium rounded-full transition-colors",
                    activeAdminTab === tab.href
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-secondary/50"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.shortName}
                  </span>
                </button>
              ))}
            </nav>
          </>
        )}

        {/* Mobile Toggle & Theme */}
        <div className="flex items-center gap-2 md:hidden">
          <AnimatedThemeToggler />
          <button
            className={cn(
              "p-2 transition-colors",
              useWhiteStyle ? "text-white" : "text-foreground"
            )}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b md:hidden p-4 flex flex-col gap-3 shadow-lg animate-in slide-in-from-top-2 max-h-[calc(100vh-70px)] overflow-y-auto">
          {isAdmin ? (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase px-2">Panel de Control</p>
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => {
                    onAdminTabChange?.(tab.href);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-sm font-medium rounded-full transition-colors text-left",
                    activeAdminTab === tab.href
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-secondary/50"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <tab.icon className="w-4 h-4" />
                    {tab.name}
                  </span>
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
