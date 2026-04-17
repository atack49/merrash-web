'use client';

import { ReactNode, useMemo } from 'react';
import { CheckCircle2, Sparkles, Star, UserRound } from 'lucide-react';
import { SERVICES } from '@/lib/data';
import { cn } from '@/lib/utils';

export type TestimonialFormValues = {
    name: string;
    service: string;
    text: string;
    rating: number;
    approved?: boolean;
    active?: boolean;
};

export const normalizeTestimonialCategory = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

export const TESTIMONIAL_CATEGORIES = Array.from(
    new Set(SERVICES.filter((service) => service.active !== false).map((service) => service.category))
);

export const getServicesForCategory = (category: string) =>
    SERVICES.filter(
        (service) =>
            service.active !== false &&
            normalizeTestimonialCategory(service.category) === normalizeTestimonialCategory(category)
    );

export const getCategoryForService = (serviceTitle: string) =>
    SERVICES.find((service) => service.title === serviceTitle)?.category || TESTIMONIAL_CATEGORIES[0] || 'Cuerpo';

type TestimonialFormProps = {
    title?: string;
    description?: string;
    values: TestimonialFormValues;
    serviceCategory: string;
    onChange: (patch: Partial<TestimonialFormValues>) => void;
    onServiceCategoryChange: (category: string) => void;
    onSubmit: () => void;
    submitLabel: string;
    submitIcon?: ReactNode;
    onCancel?: () => void;
    cancelLabel?: string;
    message?: string;
    submitting?: boolean;
    showApprovalControls?: boolean;
    className?: string;
};

const inputClassName = 'w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] outline-none transition focus:border-primary/50 focus:bg-background focus:ring-4 focus:ring-primary/10';
const sectionClassName = 'rounded-[28px] border border-border/70 bg-gradient-to-br from-card via-card to-secondary/10 p-4 md:p-5 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.28)]';

const ratingLabels: Record<number, string> = {
    1: 'Muy mala',
    2: 'Regular',
    3: 'Buena',
    4: 'Muy buena',
    5: 'Excelente',
};

function StepHeader({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                {number}
            </div>
            <div className="space-y-1">
                <h4 className="text-base font-semibold text-foreground">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

export function TestimonialForm({
    title,
    description,
    values,
    serviceCategory,
    onChange,
    onServiceCategoryChange,
    onSubmit,
    submitLabel,
    submitIcon,
    onCancel,
    cancelLabel = 'Cancelar',
    message,
    submitting = false,
    showApprovalControls = false,
    className,
}: TestimonialFormProps) {
    const categoryServices = useMemo(() => getServicesForCategory(serviceCategory), [serviceCategory]);
    const isKnownService = SERVICES.some((service) => service.title === values.service);
    const manualServiceValue = isKnownService ? '' : values.service;

    return (
        <div className={cn('space-y-5', className)}>
            {(title || description) && (
                <div className="rounded-[28px] border border-primary/15 bg-card/80 bg-gradient-to-br from-primary/5 to-transparent p-5 md:p-6 shadow-[0_28px_70px_-48px_rgba(45,181,170,0.55)]">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="space-y-1.5">
                            {title && <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>}
                            {description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
                        </div>
                    </div>
                </div>
            )}

            <div className={sectionClassName}>
                <StepHeader
                    number="1"
                    title="Primero, identifica el servicio"
                    description="Elige la categoria y luego toca el tratamiento para evitar errores al enviar el testimonio."
                />

                <div className="mt-5 space-y-5">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1.8fr]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Tu nombre</label>
                            <div className="relative">
                                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={values.name}
                                    onChange={(e) => onChange({ name: e.target.value })}
                                    placeholder="Escribe tu nombre"
                                    className={cn(inputClassName, 'pl-11')}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Categoria</label>
                            <div className="flex flex-wrap gap-2">
                                {TESTIMONIAL_CATEGORIES.map((category) => {
                                    const active = serviceCategory === category;
                                    return (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => onServiceCategoryChange(category)}
                                            className={cn(
                                                'rounded-full border px-4 py-2 text-sm font-medium transition',
                                                active
                                                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                    : 'border-border bg-background text-muted-foreground hover:border-primary/35 hover:text-primary'
                                            )}
                                        >
                                            {category}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Servicio</label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {categoryServices.map((service) => {
                                const active = values.service === service.title;
                                return (
                                    <button
                                        key={service.id}
                                        type="button"
                                        onClick={() => onChange({ service: service.title })}
                                        className={cn(
                                            'rounded-2xl border px-4 py-3 text-left transition',
                                            active
                                                ? 'border-primary bg-primary/8 shadow-[0_18px_40px_-28px_rgba(45,181,170,0.8)]'
                                                : 'border-border bg-background hover:border-primary/35 hover:bg-secondary/35'
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-foreground">{service.title}</span>
                                            {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground">Si el servicio no aparece, escribelo manualmente abajo.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Servicio manual</label>
                        <input
                            type="text"
                            value={manualServiceValue}
                            onChange={(e) => onChange({ service: e.target.value })}
                            placeholder="Solo si no encuentras el servicio en la lista"
                            className={inputClassName}
                        />
                    </div>
                </div>
            </div>

            <div className={sectionClassName}>
                <StepHeader
                    number="2"
                    title="Ahora comparte tu experiencia"
                    description="Escribe tu testimonio de forma clara para facilitar su revision."
                />

                <div className="mt-5 space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Testimonio</label>
                        <textarea
                            value={values.text}
                            onChange={(e) => onChange({ text: e.target.value })}
                            placeholder="Cuenta que cambio, como te sentiste o que resultado viste"
                            className="min-h-[150px] w-full rounded-[24px] border border-border bg-background/80 px-4 py-4 text-sm leading-6 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] outline-none transition focus:border-primary/50 focus:bg-background focus:ring-4 focus:ring-primary/10"
                        />
                        <p className="text-xs text-muted-foreground">El texto es obligatorio para enviar el testimonio.</p>
                    </div>
                </div>
            </div>

            <div className={sectionClassName}>
                <StepHeader
                    number="3"
                    title="Ultimo paso: califica la experiencia"
                    description="Selecciona una nota general antes de enviar."
                />

                <div className="mt-5 space-y-5">
                    <div className="rounded-[24px] border border-border bg-background/80 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-sm font-medium text-foreground">Calificacion general</p>
                                <p className="text-xs text-muted-foreground">Tu seleccion actual: {ratingLabels[values.rating] || 'Excelente'}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const active = star <= values.rating;
                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => onChange({ rating: star })}
                                            className={cn(
                                                'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition',
                                                active
                                                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-500'
                                                    : 'border-border bg-background text-muted-foreground hover:border-amber-300 hover:text-amber-600'
                                            )}
                                        >
                                            <Star className={cn('h-4 w-4', active ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
                                            {star}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {showApprovalControls && (
                        <div className="flex flex-wrap gap-3 rounded-[24px] border border-border bg-background/80 p-4">
                            <label className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground">
                                <input
                                    type="checkbox"
                                    checked={Boolean(values.approved)}
                                    onChange={(e) => onChange({ approved: e.target.checked, active: e.target.checked })}
                                />
                                Aprobado
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground">
                                <input
                                    type="checkbox"
                                    checked={Boolean(values.active)}
                                    onChange={(e) => onChange({ active: e.target.checked })}
                                />
                                Visible
                            </label>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={submitting}
                            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-[0_22px_45px_-22px_rgba(45,181,170,0.95)] transition hover:bg-primary/90 disabled:opacity-60"
                        >
                            {submitIcon}
                            {submitLabel}
                        </button>

                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-secondary px-6 py-3 font-medium text-secondary-foreground transition hover:bg-secondary/80"
                            >
                                {cancelLabel}
                            </button>
                        )}
                    </div>

                    {message && (
                        <div className="rounded-2xl border border-primary/20 bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
