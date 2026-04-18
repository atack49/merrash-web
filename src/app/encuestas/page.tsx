"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Star, Send, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitSurvey } from "./actions";

const satisfactionQuestions = [
    { id: "service_quality", label: "¿Cómo calificarías la calidad del servicio recibido?", type: "rating" },
    { id: "staff_attitude", label: "¿Cómo fue la actitud del personal?", type: "rating" },
    { id: "facility_cleanliness", label: "¿Cómo calificarías la limpieza de las instalaciones?", type: "rating" },
    { id: "value_for_money", label: "¿Consideras que el precio es justo por el servicio recibido?", type: "rating" },
    { id: "recommendation", label: "¿Recomendarías nuestros servicios a otros?", type: "rating" },
    { id: "comments", label: "Comentarios adicionales", type: "textarea" },
];

const informedQuestions = [
    { id: "how_did_you_hear", label: "¿Cómo te enteraste de nosotros?", type: "select", options: ["Redes sociales", "Recomendación de amigo/familiar", "Búsqueda en internet", "Publicidad", "Otro"] },
    { id: "first_visit", label: "¿Fue tu primera visita?", type: "radio", options: ["Sí", "No"] },
    { id: "expectations", label: "¿Cumplieron tus expectativas?", type: "rating" },
    { id: "comments", label: "Comentarios adicionales", type: "textarea" },
];

export default function EncuestasPage() {
    const [activeSurvey, setActiveSurvey] = useState<"satisfaccion" | "enterado">("satisfaccion");
    const [formData, setFormData] = useState<Record<string, string | number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (questionId: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [questionId]: value }));
    };

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
    }

    const renderQuestion = (question: Question) => {
        const value = formData[question.id] ?? "";

        switch (question.type) {
            case "rating":
                return (
                    <div className="flex items-center gap-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => handleInputChange(question.id, star)}
                                className="transition-all duration-200 hover:scale-110"
                            >
                                <Star
                                    className={cn(
                                        "w-8 h-8 transition-colors",
                                        typeof value === 'number' && star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted hover:text-yellow-300"
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                );
            case "select":
                return (
                    <select
                        value={value}
                        onChange={(e) => handleInputChange(question.id, e.target.value)}
                        className="w-full px-4 py-3 border border-border rounded-lg text-foreground bg-card focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                        <option value="">Selecciona una opción</option>
                        {question.options && question.options.map((option: string) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                );
            case "radio":
                return (
                    <div className="flex flex-wrap gap-4">
                        {question.options && question.options.map((option: string) => (
                            <label key={option} className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    name={question.id}
                                    value={option}
                                    checked={value === option}
                                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                                    className="w-5 h-5 text-primary cursor-pointer"
                                />
                                <span className="text-muted-foreground font-medium">{option}</span>
                            </label>
                        ))}
                    </div>
                );
            case "textarea":
                return (
                    <textarea
                        value={value}
                        onChange={(e) => handleInputChange(question.id, e.target.value)}
                        placeholder="Escribe tus comentarios aquí..."
                        className="w-full px-4 py-3 border border-border rounded-lg text-foreground bg-card placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent min-h-[120px] transition-all resize-none"
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
                        <div className="max-w-2xl mx-auto">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {questions.map((question, index) => (
                                    <div key={question.id} className="space-y-4 pb-8 border-b border-border last:pb-0 last:border-b-0">
                                        <div className="flex items-start gap-4">
                                            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-sm font-semibold text-primary">{index + 1}</span>
                                            </div>
                                            <label className="flex-1 text-base font-semibold text-foreground leading-relaxed">
                                                {question.label}
                                            </label>
                                        </div>
                                        <div className="ml-12">
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