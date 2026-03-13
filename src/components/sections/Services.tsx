"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { Brain, HeartPulse, Sparkles } from "lucide-react";
import { openChatbotWidget } from "@/lib/chatbot/widgetEvents";

interface Service {
    id: string;
    title: string;
    description: string;
    icon: string | null;
    category: string;
    active: boolean;
}

const categoryVisuals: Record<string, { iconBg: string; icon: typeof Brain }> = {
    Cuerpo: { iconBg: '#3CB8A8', icon: HeartPulse },
    Mente: { iconBg: '#5B8BD0', icon: Brain },
    Espíritu: { iconBg: '#7FBFA6', icon: Sparkles },
};

const sharedGradient = 'linear-gradient(135deg, #3CB8A8 0%, #5B8BD0 52%, #7FBFA6 100%)';
const VISIBLE_REFRESH_MS = 3000;
const HIDDEN_REFRESH_MS = 20000;

const isImageSource = (value?: string | null) => {
    if (!value) return false;
    return value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
};

const normalizeServices = (payload: unknown): Service[] => {
    if (!Array.isArray(payload)) return [];

    return payload
        .filter((item) => item && typeof item === 'object')
        .map((item, index) => {
            const row = item as Record<string, unknown>;
            return {
                id: String(row.id || `service-${index}`),
                title: String(row.title || ''),
                description: String(row.description || ''),
                icon: (row.icon as string | null) ?? null,
                category: String(row.category || ''),
                active: Boolean(row.active ?? true),
            };
        })
        .filter((item) => item.title.trim().length > 0 && item.category.trim().length > 0);
};

function useIsDesktop() {
    return useSyncExternalStore(
        (onStoreChange) => {
            if (typeof window === "undefined") {
                return () => {};
            }

            const mq = window.matchMedia("(min-width: 768px)");
            mq.addEventListener("change", onStoreChange);
            return () => mq.removeEventListener("change", onStoreChange);
        },
        () => {
            if (typeof window === "undefined") {
                return false;
            }
            return window.matchMedia("(min-width: 768px)").matches;
        },
        () => false
    );
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

    // Refresco adaptativo: rapido en pestaña activa y liviano en segundo plano.
    useEffect(() => {
        const fetchServices = async (silent = false) => {
            try {
                const res = await fetch('/api/services', { cache: 'no-store' });
                if (!res.ok) {
                    setServices([]);
                    return;
                }
                const data = await res.json();
                setServices(normalizeServices(data));
            } catch (error) {
                console.warn('Error fetching services:', error);
                setServices([]);
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        };

        fetchServices();

        let refreshIntervalId: number | null = null;

        const stopPolling = () => {
            if (refreshIntervalId !== null) {
                window.clearInterval(refreshIntervalId);
                refreshIntervalId = null;
            }
        };

        const startPolling = () => {
            stopPolling();
            const intervalMs = document.visibilityState === 'visible' ? VISIBLE_REFRESH_MS : HIDDEN_REFRESH_MS;
            refreshIntervalId = window.setInterval(() => {
                if (document.visibilityState === 'visible') {
                    fetchServices(true);
                }
            }, intervalMs);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchServices(true);
            }
            startPolling();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        startPolling();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopPolling();
        };
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
        ? services.filter((service) => service.category === visibleCategory)
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
                            (() => {
                                const visual = categoryVisuals[service.category] || categoryVisuals.Cuerpo;
                                const ServiceIcon = visual.icon;

                                return (
                            <article
                                key={service.id}
                                style={{ animationDelay: `${index * 70}ms` }}
                                role="button"
                                tabIndex={0}
                                onClick={openChatbotWidget}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openChatbotWidget();
                                    }
                                }}
                                className={cn(
                                    "group relative min-h-[220px] md:min-h-[260px] overflow-hidden rounded-3xl border border-slate-200/60 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50",
                                    !isDesktop && isClosing
                                        ? "animate-[fadeDown_0.35s_ease-in_forwards]"
                                        : "animate-[fadeUp_0.45s_ease-out_forwards]"
                                )}
                            >
                                <div
                                    className="absolute inset-0"
                                    style={{ background: sharedGradient }}
                                />

                                {isImageSource(service.icon) && (
                                    <div
                                        className="absolute inset-0 bg-cover bg-no-repeat bg-right-bottom scale-[1.04]"
                                        style={{ backgroundImage: `url(${service.icon})` }}
                                    />
                                )}

                                {!isImageSource(service.icon) && (
                                    <div className="absolute inset-0 opacity-55">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_78%,rgba(255,255,255,0.32)_0%,rgba(255,255,255,0)_54%)]" />
                                        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.00)_45%,rgba(0,0,0,0.16)_100%)]" />
                                    </div>
                                )}

                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background:
                                            'linear-gradient(135deg, rgba(60,184,168,0.86) 0%, rgba(91,139,208,0.64) 38%, rgba(127,191,166,0.28) 70%, rgba(255,255,255,0.00) 100%)',
                                    }}
                                />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.20)_30%,rgba(255,255,255,0)_58%)]" />
                                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.18)_56%,rgba(0,0,0,0.36)_100%)]" />

                                <div className="relative z-10 flex h-full flex-col justify-start p-4 md:p-5 text-white">
                                    <div
                                        className="h-10 w-10 rounded-full backdrop-blur-sm flex items-center justify-center mb-4 md:mb-5 border border-white/35"
                                        style={{ backgroundColor: `${visual.iconBg}CC` }}
                                    >
                                        <ServiceIcon className="w-5 h-5 text-white" />
                                    </div>

                                    <div className="mt-1 md:mt-2">
                                        <h3
                                            className="text-base md:text-xl font-semibold leading-tight mb-2 line-clamp-2"
                                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.70), 0 0 1px rgba(255,255,255,0.75)' }}
                                        >
                                            {service.title}
                                        </h3>

                                        <p
                                            className="text-[11px] md:text-sm leading-relaxed text-white/95 line-clamp-3 max-w-[82%] [word-break:break-word]"
                                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.68), 0 0 1px rgba(255,255,255,0.7)' }}
                                        >
                                            {service.description}
                                        </p>
                                    </div>
                                </div>
                            </article>
                                );
                            })()
                        ))}
                    </div>
                )}
            </div>

        </section>
    );
}
