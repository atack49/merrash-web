"use client";

import Link from "next/link";
import { TESTIMONIALS } from "@/lib/data";
import { Star } from "lucide-react";

export function Testimonials() {
    return (
        <section id="testimonios" className="py-24 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">Testimonios</h2>
                    <p className="text-lg text-muted-foreground font-light">
                        Lo que dicen nuestros clientes sobre sus experiencias con nuestros tratamientos integrales.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {TESTIMONIALS.map((testimonial) => (
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

                <div className="text-center mt-12">
                    <Link
                        href="/testimonios"
                        className="inline-flex items-center px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors duration-300 shadow-md hover:shadow-lg"
                    >
                        Ver Más Testimonios
                    </Link>
                </div>
            </div>
        </section>
    );
}