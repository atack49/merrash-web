"use client";

import { useState } from "react";
import { TESTIMONIALS, SERVICES } from "@/lib/data";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Create a map of service title to category
const serviceCategoryMap = SERVICES.reduce((map, service) => {
    map[service.title] = service.category;
    return map;
}, {} as Record<string, string>);

// Group testimonials by category
const groupedTestimonials = TESTIMONIALS.reduce((groups, testimonial) => {
    const category = serviceCategoryMap[testimonial.service] || "Otros";
    if (!groups[category]) {
        groups[category] = [];
    }
    groups[category].push(testimonial);
    return groups;
}, {} as Record<string, typeof TESTIMONIALS>);

const categories = ["Cuerpo", "Mente", "Espíritu"];

export default function TestimoniosPage() {
    const [activeCategory, setActiveCategory] = useState("Cuerpo");

    const filteredTestimonials = groupedTestimonials[activeCategory] || [];

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
                            <h1 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">Todos Nuestros Testimonios</h1>
                            <p className="text-lg text-muted-foreground font-light">
                                Descubre las experiencias de nuestros clientes clasificadas por tipo de servicio.
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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
                            {filteredTestimonials.map((testimonial) => (
                                <div
                                    key={testimonial.id}
                                    className="p-6 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 transition-all duration-300 hover:shadow-md hover:-translate-y-1 animate-in fade-in zoom-in-95 duration-500"
                                >
                                    <div className="flex items-center mb-4">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-muted-foreground mb-4 leading-relaxed italic">
                                        {testimonial.text}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-foreground">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.service}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}