"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { SERVICES } from "@/lib/data";
import { openChatbotWidget } from "@/lib/chatbot/widgetEvents";

// Assuming the image will be saved at /hero_background.png in the public folder after I move it.
// For now I will reference it, and I will move it in the next step.

export function Hero() {
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

    const getServicesByCategory = (category: string) => {
        return SERVICES.filter((service) => service.category === category);
    };

    const CategoryWord = ({ word, hasComma }: { word: string; hasComma?: boolean }) => (
        <div
            className="relative inline-block"
            onMouseEnter={() => setHoveredCategory(word)}
            onMouseLeave={() => setHoveredCategory(null)}
        >
            <span
                className="cursor-pointer hover:text-primary-foreground/80 transition-colors decoration-wavy decoration-primary-foreground/30 underline-offset-8 decoration-2"
                style={{ textDecorationLine: hoveredCategory === word ? 'underline' : 'none' }}
            >
                {word}
            </span>
            {hasComma && <span className="mr-2">,</span>}

            <AnimatePresence>
                {hoveredCategory === word && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 md:w-72 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-2 z-50 text-left"
                    >
                        {/* Triangle pointer */}
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 rotate-45 border-l border-t border-white/20" />

                        <div className="relative max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            <div className="p-2 border-b border-gray-100 mb-2">
                                <span className="text-primary font-bold text-sm uppercase tracking-wider">{word}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {getServicesByCategory(word).map((service) => (
                                    <Link
                                        key={service.id}
                                        href={`/#servicios?category=${word}`}
                                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors group"
                                    >
                                        <div className="mt-0.5 min-w-[1.5rem] h-6 flex items-center justify-center text-primary/70 group-hover:text-primary">
                                            <service.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-semibold text-gray-800 group-hover:text-primary leading-tight">{service.title}</span>
                                            <span className="block text-[10px] text-gray-500 line-clamp-2 leading-tight mt-0.5">{service.description}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <section id="inicio" className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/hero_background_hq.png"
                    alt="Merrash Spa Atmosphere"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/30 md:bg-black/20" /> {/* Overlay */}
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 text-center text-white space-y-6 md:space-y-8 animate-in fade-in zoom-in duration-1000">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-md">
                    <CategoryWord word="Cuerpo" hasComma />
                    <CategoryWord word="Mente" />
                    <span className="mx-2 md:mx-4">y</span>
                    <CategoryWord word="Espíritu" />
                    <span className="font-light text-2xl md:text-4xl block mt-4 text-white/90">Medicina Alternativa y Spa en Metepec</span>
                </h1>

                <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/90 drop-shadow-sm font-light">
                    Un santuario dedicado a tu bienestar holístico.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <button
                        type="button"
                        onClick={openChatbotWidget}
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full font-medium transition-all text-lg shadow-lg hover:shadow-xl hover:-translate-y-1"
                    >
                        Agendar Cita
                    </button>
                    <Link
                        href="#servicios"
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-full font-medium transition-all text-lg"
                    >
                        Ver Servicios
                    </Link>
                </div>
            </div>
        </section>
    );
}
