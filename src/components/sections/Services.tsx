"use client";

import { useState, useEffect } from "react";
import { SERVICES } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Services() {
    const [activeCategory, setActiveCategory] = useState("Cuerpo");
    const categories = ["Cuerpo", "Mente", "Espíritu"];

    // Listen for URL changes/params to switch category
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const categoryParam = params.get("category");
            if (categoryParam && categories.includes(categoryParam)) {
                setActiveCategory(categoryParam);
            }
        }
    }, []);

    const filteredServices = SERVICES.filter(service => service.category === activeCategory);

    return (
        <section id="servicios" className="py-24 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">Nuestros Servicios</h2>
                    <p className="text-lg text-muted-foreground font-light">
                        Descubre nuestra gama de tratamientos integrales diseñados para armonizar tu cuerpo, mente y espíritu.
                    </p>
                </div>

                {/* Categorías */}
                <div className="flex justify-center mb-12 flex-wrap gap-4">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border",
                                activeCategory === category
                                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                                    : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                            )}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[400px]">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            className="group p-6 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 transition-all duration-300 hover:shadow-md hover:-translate-y-1 animate-in fade-in zoom-in-95 duration-500"
                        >
                            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center text-primary mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <service.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-foreground">{service.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {service.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
