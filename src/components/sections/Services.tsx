"use client";

import { useState, useEffect } from "react";
import { SERVICES } from "@/lib/data";
import { cn } from "@/lib/utils";

function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)");
        setIsDesktop(mq.matches);

        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener("change", handler);

        return () => mq.removeEventListener("change", handler);
    }, []);

    return isDesktop;
}

export function Services() {
    const categories = ["Cuerpo", "Mente", "Espíritu"];
    const isDesktop = useIsDesktop();

    const [visibleCategory, setVisibleCategory] = useState<string | null>(
        isDesktop ? "Cuerpo" : null
    );
    const [isClosing, setIsClosing] = useState(false);

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
        ? SERVICES.filter(s => s.category === visibleCategory)
        : [];

    return (
        <section
            id="servicios"
            className={cn(
                "bg-white transition-all duration-300",
                visibleCategory || isDesktop ? "py-24" : "pt-24 pb-8"
            )}
        >
            <div className="container mx-auto px-4 md:px-6">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">
                        Nuestros Servicios
                    </h2>
                    <p className="text-lg text-muted-foreground font-light">
                        Descubre nuestra gama de tratamientos integrales diseñados
                        para armonizar tu cuerpo, mente y espíritu.
                    </p>
                </div>

                {/* Categorías */}
                <div
                    className={cn(
                        "flex justify-center flex-wrap gap-2 md:gap-4 transition-all duration-300",
                        visibleCategory || isDesktop ? "mb-10" : "mb-0"
                    )}
                >
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => handleCategoryClick(category)}
                            className={cn(
                                "px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 border",
                                visibleCategory === category
                                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                                    : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                            )}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Cards */}
                {(visibleCategory || isDesktop) && (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                        {servicesToShow.map((service, index) => (
                            <div
                                key={service.id}
                                style={{ animationDelay: `${index * 70}ms` }}
                                className={cn(
                                    "group p-3 md:p-6 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 transition-all duration-300 hover:shadow-md",
                                    !isDesktop && isClosing
                                        ? "animate-[fadeDown_0.35s_ease-in_forwards]"
                                        : "animate-[fadeUp_0.45s_ease-out_forwards]"
                                )}
                            >
                                <div className="h-10 md:h-12 w-10 md:w-12 bg-white rounded-full flex items-center justify-center text-primary mb-3 md:mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                    <service.icon className="w-5 md:w-6 h-5 md:h-6" />
                                </div>

                                <h3 className="text-base md:text-xl font-semibold mb-2 md:mb-3 text-foreground line-clamp-2">
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
