"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Star, Send, ClipboardList, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitSurvey } from "./actions";

interface SurveyService {
    id: string;
    title: string;
    icon: string | null;
    category: string;
    active: boolean;
}

interface SurveyCourse {
    id: string;
    title: string;
    icon: string | null;
    category: string;
    active: boolean;
}

const serviceCategories = ["Cuerpo", "Mente", "Espíritu"];
const courseCategories = ["Cuerpo", "Mente", "Espíritu"];

const isImageSource = (value?: string | null) => {
    if (!value) return false;
    return value.trim().length > 5;
};

const normalizeServices = (payload: unknown): SurveyService[] => {
    if (!Array.isArray(payload)) return [];

    return payload
        .filter((item) => item && typeof item === "object")
        .map((item, index) => {
            const row = item as Record<string, unknown>;
            return {
                id: String(row.id || `service-${index}`),
                title: String(row.title || ""),
                icon: (row.icon as string | null) ?? null,
                category: String(row.category || ""),
                active: Boolean(row.active ?? true),
            };
        })
        .filter((item) => item.title.trim().length > 0 && serviceCategories.includes(item.category));
};

const normalizeCourses = (payload: unknown): SurveyCourse[] => {
    if (!Array.isArray(payload)) return [];

    return payload
        .filter((item) => item && typeof item === "object")
        .map((item, index) => {
            const row = item as Record<string, unknown>;
            return {
                id: String(row.id || `course-${index}`),
                title: String(row.title || ""),
                icon: (row.icon as string | null) ?? null,
                category: String(row.category || "Sin categoría"),
                active: Boolean(row.active ?? true),
            };
        })
        .filter((item) => item.title.trim().length > 0);
};

const socialNetworkMeta: Record<string, { icon: React.ReactNode; color: string }> = {
    "Facebook": {
        color: "#1877F2",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
        ),
    },
    "Instagram": {
        color: "#E1306C",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
        ),
    },
    "TikTok": {
        color: "#69C9D0",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
        ),
    },
};

const satisfactionQuestions = [
    { id: "attended_by", label: "Nombre de la persona que te atendió:", type: "text" },
    { id: "staff_attitude", label: "¿Cómo fue el trato de esa persona?", type: "rating" },
    { id: "staff_improvement", label: "¿Qué recomendarías para mejorar tu experiencia con esta persona?", type: "textarea" },
    { id: "treatment_taken", label: "¿Qué tratamiento tomaste?", type: "select", options: [
        "Acupuntura", "Homeopatía", "Rehabilitación", "Auriculoterapia", "Par Biomagnético",
        "Terapia Neural", "Sueroterapia Intravenosa", "Tratamientos Faciales", "Tratamientos Corporales", "Masajes",
        "Tarot Terapéutico", "Reiki", "Healy", "Toque Cuántico", "Arborología", "Método Integral", "Otro"
    ] },
    { id: "what_to_include", label: "¿Qué te gustaría que incluyéramos para mejorar tu experiencia?", type: "textarea" },
    { id: "info_therapies", label: "¿Te dieron información de todas las terapias que manejamos?", type: "radio", options: ["Sí", "No"] },
    { id: "medical_history", label: "¿Te hicieron historia clínica y firmaste tu consentimiento informado?", type: "radio", options: ["Sí", "No"] },
    { id: "aftercare_instructions", label: "¿Te dieron a conocer las indicaciones para después de tu terapia?", type: "radio", options: ["Sí", "No"] },
    { id: "info_courses", label: "¿Te informaron sobre todos los cursos que tenemos?", type: "radio", options: ["Sí", "No"] },
    { id: "interested_therapies", label: "¿Qué terapias te interesaría tomar más adelante?", type: "checkbox", options: [
        "Acupuntura", "Homeopatía", "Rehabilitación", "Auriculoterapia", "Par Biomagnético",
        "Terapia Neural", "Sueroterapia Intravenosa", "Tratamientos Faciales", "Tratamientos Corporales", "Masajes",
        "Tarot Terapéutico", "Reiki", "Healy", "Toque Cuántico", "Arborología", "Método Integral"
    ] },
    { id: "interested_courses", label: "¿Qué curso te interesaría tomar?", type: "checkbox", options: [
        "Curso de Acupuntura", "Curso de Biomagnetismo", "Curso de Reiki", "Curso de Tarot"
    ] },
    { id: "additional_courses", label: "¿Qué curso recomiendas que agreguemos?", type: "text" },
];

const informedQuestions: any[] = [
    { id: "how_did_you_hear", label: "¿Cómo te enteraste de nosotros?", type: "select", options: ["Redes sociales", "Recomendación de amigo/familiar", "Búsqueda en internet", "Publicidad", "Otro"] },
    { 
        id: "social_network", 
        label: "¿Cuál red social?", 
        type: "select", 
        options: ["Facebook", "Instagram", "TikTok", "Otra"],
        condition: (data: any) => data["how_did_you_hear"] === "Redes sociales"
    },
    { 
        id: "recommended_by", 
        label: "Nombre del grupo de difusión o persona que recomienda", 
        type: "text",
        condition: (data: any) => data["how_did_you_hear"] === "Recomendación de amigo/familiar"
    },
    { id: "first_visit", label: "¿Fue tu primera visita?", type: "radio", options: ["Sí", "No"] },
    { id: "expectations", label: "¿Cumplieron tus expectativas?", type: "rating" },
    { id: "comments", label: "Comentarios adicionales", type: "textarea" },
];

export default function EncuestasPage() {
    const [activeSurvey, setActiveSurvey] = useState<"satisfaccion" | "enterado">("satisfaccion");
    const [formData, setFormData] = useState<Record<string, string | number | string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [services, setServices] = useState<SurveyService[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [courses, setCourses] = useState<SurveyCourse[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [serviceCategoryByQuestion, setServiceCategoryByQuestion] = useState<Record<string, string>>({
        treatment_taken: "Cuerpo",
        interested_therapies: "Cuerpo",
    });
    const [courseCategoryByQuestion, setCourseCategoryByQuestion] = useState<Record<string, string>>({
        interested_courses: "Cuerpo",
    });

    useEffect(() => {
        const fetchServicesAndCourses = async () => {
            try {
                const [servicesResponse, coursesResponse] = await Promise.all([
                    fetch('/api/services', { cache: 'no-store' }),
                    fetch('/api/courses', { cache: 'no-store' }),
                ]);

                if (servicesResponse.ok) {
                    const servicesPayload = await servicesResponse.json();
                    setServices(normalizeServices(servicesPayload));
                } else {
                    setServices([]);
                }

                if (coursesResponse.ok) {
                    const coursesPayload = await coursesResponse.json();
                    setCourses(normalizeCourses(coursesPayload));
                } else {
                    setCourses([]);
                }
            } catch (error) {
                console.error('Error fetching services/courses for survey:', error);
                setServices([]);
                setCourses([]);
            } finally {
                setLoadingServices(false);
                setLoadingCourses(false);
            }
        };

        fetchServicesAndCourses();
    }, []);

    const handleInputChange = (questionId: string, value: string | number | string[]) => {
        setFormData(prev => ({ ...prev, [questionId]: value }));
    };

    const handleCheckboxToggle = (questionId: string, option: string) => {
        setFormData(prev => {
            const current = (prev[questionId] as string[]) || [];
            if (current.includes(option)) {
                return { ...prev, [questionId]: current.filter(o => o !== option) };
            } else {
                return { ...prev, [questionId]: [...current, option] };
            }
        });
    };

    const isOtherOption = (option: string) => {
        const normalized = option.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return normalized === "otro" || normalized === "otra";
    };

    const getOtherFieldKey = (questionId: string) => `${questionId}_other_text`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await submitSurvey(activeSurvey, formData);
            alert("¡Gracias por tu respuesta!");
            setFormData({});
        } catch (error) {
            console.error("Error submitting survey:", error);
            alert("Error al enviar la encuesta. Por favor, intenta de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    interface Question {
        id: string;
        label: string;
        type: string;
        options?: string[];
        condition?: (data: any) => boolean;
    }

    const renderQuestion = (question: Question) => {
        const value = formData[question.id] ?? "";
        const otherFieldKey = getOtherFieldKey(question.id);
        const otherValue = (formData[otherFieldKey] as string) || "";
        const isDynamicServiceQuestion = question.id === "treatment_taken" || question.id === "interested_therapies";
        const isDynamicCourseQuestion = question.id === "interested_courses";

        const renderServiceCardSelector = (isMultiSelect: boolean) => {
            if (loadingServices) {
                return <p className="text-sm text-muted-foreground">Cargando servicios...</p>;
            }

            if (services.length === 0) {
                return <p className="text-sm text-muted-foreground">No hay servicios disponibles por el momento.</p>;
            }

            const categoriesWithServices = serviceCategories.filter((category) =>
                services.some((service) => service.category === category)
            );

            const preferredCategory = serviceCategoryByQuestion[question.id] || "Cuerpo";
            const visibleCategory = categoriesWithServices.includes(preferredCategory)
                ? preferredCategory
                : categoriesWithServices[0];

            const servicesInVisibleCategory = services.filter((service) => service.category === visibleCategory);

            return (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-2 md:gap-3">
                        {categoriesWithServices.map((category) => (
                            <button
                                key={category}
                                type="button"
                                onClick={() => setServiceCategoryByQuestion((prev) => ({ ...prev, [question.id]: category }))}
                                className={cn(
                                    "px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium border transition-all duration-200",
                                    visibleCategory === category
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                                )}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {servicesInVisibleCategory.map((service) => {
                            const selected = isMultiSelect
                                ? Array.isArray(value) && value.includes(service.title)
                                : value === service.title;

                            return (
                                <button
                                    key={service.id}
                                    type="button"
                                    onClick={() => {
                                        if (isMultiSelect) {
                                            handleCheckboxToggle(question.id, service.title);
                                            return;
                                        }
                                        handleInputChange(question.id, service.title);
                                    }}
                                    className={cn(
                                        "group relative h-28 overflow-hidden rounded-2xl border transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-primary/45",
                                        selected
                                            ? "border-primary ring-2 ring-primary/35 shadow-md"
                                            : "border-border/70 hover:border-primary/40 hover:-translate-y-0.5"
                                    )}
                                >
                                    {isImageSource(service.icon) ? (
                                        <div
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={{ backgroundImage: `url('${service.icon}')` }}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-service-card" />
                                    )}
                                    <div className={cn(
                                        "absolute inset-0",
                                        isImageSource(service.icon) ? "bg-black/35" : "bg-transparent"
                                    )} />
                                    <div className="relative z-10 flex h-full items-end p-3">
                                        <span className={cn(
                                            "text-sm font-semibold leading-tight line-clamp-2",
                                            isImageSource(service.icon) ? "text-white" : "text-foreground"
                                        )}>
                                            {service.title}
                                        </span>
                                    </div>
                                    {selected && (
                                        <span className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                                            <Check className="h-4 w-4" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        };

        const renderDynamicCourseSelector = () => {
            const valueArray = Array.isArray(value) ? value : [];

            if (loadingCourses) {
                return <p className="text-sm text-muted-foreground">Cargando cursos...</p>;
            }

            const preferredCategory = courseCategoryByQuestion[question.id] || "Cuerpo";
            const visibleCategory = courseCategories.includes(preferredCategory)
                ? preferredCategory
                : courseCategories[0];

            const coursesInVisibleCategory = courses.filter((course) => course.category === visibleCategory);

            return (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-2 md:gap-3">
                        {courseCategories.map((category) => (
                            <button
                                key={category}
                                type="button"
                                onClick={() => setCourseCategoryByQuestion((prev) => ({ ...prev, [question.id]: category }))}
                                className={cn(
                                    "px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium border transition-all duration-200",
                                    visibleCategory === category
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                                )}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {coursesInVisibleCategory.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {coursesInVisibleCategory.map((course) => {
                            const isChecked = valueArray.includes(course.title);
                            return (
                                <button
                                    key={course.id}
                                    type="button"
                                    onClick={() => handleCheckboxToggle(question.id, course.title)}
                                    className={cn(
                                        "group relative h-28 overflow-hidden rounded-2xl border transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-primary/45",
                                        isChecked
                                            ? "border-primary ring-2 ring-primary/35 shadow-md"
                                            : "border-border/70 hover:border-primary/40 hover:-translate-y-0.5"
                                    )}
                                >
                                    {isImageSource(course.icon) ? (
                                        <div
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={{ backgroundImage: `url('${course.icon}')` }}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-service-card" />
                                    )}
                                    <div className={cn(
                                        "absolute inset-0",
                                        isImageSource(course.icon) ? "bg-black/35" : "bg-transparent"
                                    )} />
                                    <div className="relative z-10 flex h-full items-end p-3">
                                        <span className={cn(
                                            "text-sm font-semibold leading-tight line-clamp-2",
                                            isImageSource(course.icon) ? "text-white" : "text-foreground"
                                        )}>
                                            {course.title}
                                        </span>
                                    </div>
                                    {isChecked && (
                                        <span className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                                            <Check className="h-4 w-4" />
                                        </span>
                                    )}
                                </button>
                            );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                            Aun no hay cursos en la seccion {visibleCategory}.
                        </div>
                    )}
                </div>
            );
        };

        const renderOtherInput = (placeholder = "Especifica tu respuesta") => (
            <div className="pt-2 animate-[fadeUp_0.2s_ease-out_forwards]">
                <input
                    type="text"
                    value={otherValue}
                    onChange={(e) => handleInputChange(otherFieldKey, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 border border-border rounded-xl text-foreground bg-background placeholder-muted-foreground focus:ring-2 focus:ring-primary/35 focus:border-primary/35 transition-all"
                />
            </div>
        );

        if (isDynamicServiceQuestion) {
            return renderServiceCardSelector(question.id === "interested_therapies");
        }

        if (isDynamicCourseQuestion) {
            return renderDynamicCourseSelector();
        }

        if (question.id === "social_network") {
            return (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2.5">
                        {question.options && question.options.map((option: string) => {
                            const isSelected = value === option;
                            const meta = socialNetworkMeta[option];
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => handleInputChange(question.id, option)}
                                    style={
                                        isSelected && meta
                                            ? { backgroundColor: meta.color, borderColor: meta.color, color: "white" }
                                            : meta
                                            ? { borderColor: meta.color + "50" }
                                            : undefined
                                    }
                                    className={cn(
                                        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm md:text-[15px] font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/35 shadow-sm",
                                        isSelected && !meta
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : !isSelected
                                            ? "border-border bg-transparent text-foreground hover:border-primary/40 hover:text-primary"
                                            : ""
                                    )}
                                >
                                    {meta?.icon && (
                                        <span
                                            className="shrink-0 w-[18px] h-[18px]"
                                            style={{ color: isSelected ? "white" : meta.color }}
                                        >
                                            {meta.icon}
                                        </span>
                                    )}
                                    {isSelected && !meta?.icon && <Check className="h-3.5 w-3.5" />}
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                    {typeof value === "string" && isOtherOption(value) && renderOtherInput()}
                </div>
            );
        }

        switch (question.type) {
            case "rating":
                return (
                    <div>
                        <div className="mb-2 flex items-center justify-between text-xs md:text-sm text-muted-foreground font-medium">
                            <span>Nada satisfecho</span>
                            <span>Excelente</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => handleInputChange(question.id, star)}
                                className={cn(
                                    "rounded-xl p-1.5 md:p-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/40",
                                    typeof value === 'number' && star <= value ? "bg-amber-100/70 dark:bg-amber-500/10" : "hover:bg-muted/50"
                                )}
                            >
                                <Star
                                    className={cn(
                                        "w-7 h-7 md:w-8 md:h-8 transition-colors",
                                        typeof value === 'number' && star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted hover:text-yellow-300"
                                    )}
                                />
                            </button>
                        ))}
                        </div>
                    </div>
                );
            case "select":
                return (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2.5">
                            {question.options && question.options.map((option: string) => {
                                const isSelected = value === option;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => handleInputChange(question.id, option)}
                                        className={cn(
                                            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm md:text-[15px] font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/35",
                                            isSelected
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border bg-transparent text-foreground hover:border-primary/40 hover:text-primary"
                                        )}
                                    >
                                        {isSelected && <Check className="h-3.5 w-3.5" />}
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        {typeof value === "string" && isOtherOption(value) && renderOtherInput()}
                    </div>
                );
            case "radio":
                return (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2.5">
                        {question.options && question.options.map((option: string) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => handleInputChange(question.id, option)}
                                className={cn(
                                    "rounded-full border px-5 py-2.5 font-semibold text-sm md:text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40",
                                    value === option
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                                )}
                            >
                                {option}
                            </button>
                        ))}
                        </div>
                        {typeof value === "string" && isOtherOption(value) && renderOtherInput()}
                    </div>
                );
            case "checkbox":
                return (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2.5">
                        {question.options && question.options.map((option: string) => {
                            const isChecked = Array.isArray(value) && value.includes(option);
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => handleCheckboxToggle(question.id, option)}
                                    className={cn(
                                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm md:text-[15px] font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/35",
                                        isChecked
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-transparent text-foreground hover:border-primary/40 hover:text-primary"
                                    )}
                                >
                                    {isChecked && <Check className="h-3.5 w-3.5" />}
                                    <span>{option}</span>
                                </button>
                            );
                        })}
                        </div>
                        {Array.isArray(value) && value.some((option) => isOtherOption(option)) && renderOtherInput()}
                    </div>
                );
            case "text":
                return (
                    <input
                        type="text"
                        value={value as string}
                        onChange={(e) => handleInputChange(question.id, e.target.value)}
                        placeholder="Tu respuesta..."
                        className="w-full px-4 py-3 border border-border rounded-xl text-foreground bg-background placeholder-muted-foreground focus:ring-2 focus:ring-primary/35 focus:border-primary/35 transition-all"
                    />
                );
            case "textarea":
                return (
                    <textarea
                        value={value}
                        onChange={(e) => handleInputChange(question.id, e.target.value)}
                        placeholder="Escribe tus comentarios aquí..."
                        className="w-full px-4 py-3 border border-border rounded-xl text-foreground bg-background placeholder-muted-foreground focus:ring-2 focus:ring-primary/35 focus:border-primary/35 min-h-[120px] transition-all resize-none"
                    />
                );
            default:
                return null;
        }
    };

    const questions = activeSurvey === "satisfaccion" ? satisfactionQuestions : informedQuestions;

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="grow mt-20">
                <section className="py-16 bg-background min-h-screen">
                    <div className="container mx-auto px-4 md:px-6">
                        {/* Header Section */}
                        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                                <ClipboardList className="w-8 h-8 text-primary" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                                Encuestas de Satisfacción
                            </h1>
                            <p className="text-lg text-muted-foreground font-light leading-relaxed">
                                Tu opinión es muy importante para nosotros. Ayúdanos a mejorar completando una de nuestras encuestas.
                            </p>
                        </div>

                        {/* Survey Selector */}
                        <div className="flex justify-center mb-16">
                            <div className="inline-flex bg-card rounded-full p-2 shadow-md border border-border">
                                <button
                                    onClick={() => setActiveSurvey("satisfaccion")}
                                    className={cn(
                                        "px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300",
                                        activeSurvey === "satisfaccion"
                                            ? "bg-linear-to-r from-primary to-primary/80 text-white shadow-lg"
                                            : "text-muted-foreground hover:text-primary dark:hover:text-primary"
                                    )}
                                >
                                    Satisfacción del Servicio
                                </button>
                                <button
                                    onClick={() => setActiveSurvey("enterado")}
                                    className={cn(
                                        "px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300",
                                        activeSurvey === "enterado"
                                            ? "bg-linear-to-r from-primary to-primary/80 text-white shadow-lg"
                                            : "text-muted-foreground hover:text-primary dark:hover:text-primary"
                                    )}
                                >
                                    Cómo nos Encontraste
                                </button>
                            </div>
                        </div>

                        {/* Survey Form */}
                        <div className="max-w-4xl mx-auto">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {questions.filter(q => {
                                    if (q.id === "interested_courses" && !loadingCourses && courses.length === 0) return false;
                                    return !q.condition || q.condition(formData);
                                }).map((question, index) => (
                                    <div
                                        key={question.id}
                                        className="space-y-4 pb-7 border-b border-border/70 last:pb-0 last:border-b-0 animate-[fadeUp_0.35s_ease-out_forwards]"
                                        style={{ animationDelay: `${index * 40}ms` }}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                <span className="text-sm font-semibold text-primary">{index + 1}</span>
                                            </div>
                                            <label className="flex-1 text-base md:text-lg font-semibold text-foreground leading-relaxed pt-1">
                                                {question.label}
                                            </label>
                                        </div>
                                        <div className="ml-0 md:ml-12">
                                            {renderQuestion(question)}
                                        </div>
                                    </div>
                                ))}

                                <div className="text-center pt-8">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-2 px-10 py-4 bg-linear-to-r from-primary to-primary/80 text-white font-semibold rounded-full hover:shadow-lg hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Enviar Encuesta
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Info Card */}
                        <div className="mt-8 p-6 bg-primary/5 rounded-xl border border-primary/20">
                            <p className="text-sm text-muted-foreground text-center">
                                <span className="font-semibold text-primary">✓ Tiempo estimado:</span> 3-5 minutos | 
                                <span className="font-semibold text-primary ml-2">✓ Respuestas confidenciales</span>
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}