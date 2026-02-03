"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Star, Send } from "lucide-react";
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
    const [formData, setFormData] = useState<Record<string, any>>({});

    const handleInputChange = (questionId: string, value: any) => {
        setFormData(prev => ({ ...prev, [questionId]: value }));
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await submitSurvey(activeSurvey, formData);
            if (result.success) {
                alert(result.message);
                setFormData({});
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert("Ocurrió un error inesperado");
        } finally {
            setIsSubmitting(false);
        }
    };


    const renderQuestion = (question: any) => {
        const value = formData[question.id] || "";

        switch (question.type) {
            case "rating":
                return (
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => handleInputChange(question.id, star)}
                                className="transition-colors"
                            >
                                <Star
                                    className={cn(
                                        "w-6 h-6",
                                        star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
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
                        className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="">Selecciona una opción</option>
                        {question.options.map((option: string) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                );
            case "radio":
                return (
                    <div className="flex gap-4">
                        {question.options.map((option: string) => (
                            <label key={option} className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name={question.id}
                                    value={option}
                                    checked={value === option}
                                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                                    className="text-primary"
                                />
                                {option}
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
                        className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px]"
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
            <main className="flex-grow">
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
                            <h1 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">Encuestas</h1>
                            <p className="text-lg text-muted-foreground font-light">
                                Tu opinión es muy importante para nosotros. Ayúdanos a mejorar completando una de nuestras encuestas.
                            </p>
                        </div>

                        {/* Survey Selector */}
                        <div className="flex justify-center mb-12">
                            <div className="flex bg-secondary/20 rounded-full p-1">
                                <button
                                    onClick={() => setActiveSurvey("satisfaccion")}
                                    className={cn(
                                        "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                                        activeSurvey === "satisfaccion"
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    Satisfacción
                                </button>
                                <button
                                    onClick={() => setActiveSurvey("enterado")}
                                    className={cn(
                                        "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                                        activeSurvey === "enterado"
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    Enterado
                                </button>
                            </div>
                        </div>

                        {/* Survey Form */}
                        <div className="max-w-2xl mx-auto">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {questions.map((question) => (
                                    <div key={question.id} className="space-y-3">
                                        <label className="block text-lg font-medium text-foreground">
                                            {question.label}
                                        </label>
                                        {renderQuestion(question)}
                                    </div>
                                ))}

                                <div className="text-center pt-8">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-5 h-5" />
                                        {isSubmitting ? "Enviando..." : "Enviar Encuesta"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}