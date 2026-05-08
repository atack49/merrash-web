"use client";

import Link from "next/link";
import Image from "next/image";
import { openChatbotWidget } from "@/lib/chatbot/widgetEvents";

// Assuming the image will be saved at /hero_background.png in the public folder after I move it.
// For now I will reference it, and I will move it in the next step.

export function Hero() {
    return (
        <section id="inicio" className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/hero_bg_fixed.png"
                    alt="Merrash Spa Atmosphere"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                />
                <div className="absolute inset-0 bg-black/30 md:bg-black/20" /> {/* Overlay */}
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 text-center text-white space-y-6 md:space-y-8 animate-in fade-in zoom-in duration-1000">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-md">
                    Cuerpo, Mente y Espíritu
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
