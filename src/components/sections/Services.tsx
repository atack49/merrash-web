"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

interface Service {
    id: string;
    title: string;
    description: string;
    icon: string | null;
    category: string;
    active: boolean;
}

function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(() => {
        if (typeof window !== "undefined") {
            return window.matchMedia("(min-width: 768px)").matches;
        }
        return false;
    });

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)");
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return isDesktop;
}

export function Services() {
    const categories = ["Cuerpo", "Mente", "Espíritu"];
    const isDesktop = useIsDesktop();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    const [visibleCategory, setVisibleCategory] = useState<string | null>(
        isDesktop ? "Cuerpo" : null
    );
    const [isClosing, setIsClosing] = useState(false);

    // Obtener servicios de la API
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await fetch('/api/services');
                const data = await res.json();
                setServices(data);
            } catch (error) {
                console.error('Error fetching services:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchServices();
    }, []);

    useEffect(() => {
        if (isDesktop && !visibleCategory) {
            setVisibleCategory("Cuerpo");
        }
    }, [isDesktop, visibleCategory]);

    const handleCategoryClick = (category: string) => {
        // DESKTOP → solo cambiar filtro
        if (isDesktop) {
            setVisibleCategory(category);
            return;
        }

        // MOBILE → toggle con animación
        if (category === visibleCategory) {
            setIsClosing(true);
            setTimeout(() => {
                setVisibleCategory(null);
                setIsClosing(false);
            }, 350);
            return;
        }

        if (visibleCategory) {
            setIsClosing(true);
            setTimeout(() => {
                setVisibleCategory(category);
                setIsClosing(false);
            }, 350);
            return;
        }

        setVisibleCategory(category);
    };

    const servicesToShow = visibleCategory
        ? services.filter(s => s.category === visibleCategory)
        : [];

    return (
        <section
            id="servicios"
            className="bg-white pt-32 pb-24 md:pt-40 md:pb-32 transition-all duration-300"
        >
            <div className="container mx-auto px-4 md:px-6">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">
                        Nuestros Servicios
                    </h2>
                    <p className="text-lg text-muted-foreground font-light">
                        Descubre nuestra gama de tratamientos integrales diseñados
                        para armonizar tu cuerpo, mente y espíritu.
                    </p>
                </div>

                {/* Categorías */}
                <div className="flex justify-center flex-wrap gap-3 md:gap-4 mb-12 md:mb-16">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => handleCategoryClick(category)}
                            className={cn(
                                "px-4 md:px-6 py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 border",
                                visibleCategory === category
                                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                    : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-primary hover:scale-105"
                            )}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Cards */}
                {(visibleCategory || isDesktop) && !loading && (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {servicesToShow.map((service, index) => (
                            <div
                                key={service.id}
                                style={{ animationDelay: `${index * 70}ms` }}
                                className={cn(
                                    "group p-4 md:p-6 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 transition-all duration-300 hover:shadow-lg hover:border-primary/30",
                                    !isDesktop && isClosing
                                        ? "animate-[fadeDown_0.35s_ease-in_forwards]"
                                        : "animate-[fadeUp_0.45s_ease-out_forwards]"
                                )}
                            >
                                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center text-primary mb-4 md:mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                    <Activity className="w-6 h-6" />
                                </div>

                                <h3 className="text-base md:text-lg font-semibold mb-3 text-foreground line-clamp-2">
                                    {service.title}
                                </h3>

                                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-3">
                                    {service.description}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
