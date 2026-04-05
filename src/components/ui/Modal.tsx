'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: ReactNode;
    maxWidthClassName?: string;
};

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidthClassName = 'max-w-5xl',
}: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70]">
            <button
                type="button"
                aria-label="Cerrar modal"
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
            />

            <div className="relative z-10 flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
                <div className={cn('w-full rounded-[30px] border border-border/70 bg-background shadow-[0_28px_90px_-40px_rgba(15,23,42,0.6)]', maxWidthClassName)}>
                    <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
                        <div className="space-y-1">
                            {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
                            {description && <p className="text-sm text-muted-foreground">{description}</p>}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="max-h-[82vh] overflow-y-auto p-4 sm:p-6">{children}</div>
                </div>
            </div>
        </div>
    );
}