'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Mail, Pencil, Phone, RefreshCw, Save, Trash2, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE, MAX_APPOINTMENTS_PER_HOUR_TOTAL } from '@/lib/appointments/capacityRules';

type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

interface Appointment {
    id: string;
    customerName?: string | null;
    source?: string | null;
    email: string;
    phone?: string | null;
    preferredDate?: string | null;
    preferredTime?: string | null;
    service?: string | null;
    notes?: string | null;
    status: AppointmentStatus;
    createdAt: string;
    survey?: {
        id: string;
        title: string;
        type: string;
    } | null;
}

interface GoogleCalendarSettings {
    embedUrl: string;
    webhookUrl: string;
}

type AppointmentsSectionView = 'calendarios' | 'gestion';
const GOOGLE_SYNC_COOLDOWN_MS = 60 * 1000;
const GOOGLE_SYNC_INTERVAL_MS = 60 * 1000;

type ManualForm = {
    customerName: string;
    email: string;
    phone: string;
    service: string;
    preferredDate: string;
    preferredTime: string;
    notes: string;
};

type ServiceOption = {
    id: string;
    title: string;
};

type EditForm = ManualForm & {
    status: AppointmentStatus;
};

type SlotLoadInfo = {
    total: number;
    service: number;
    totalReached: boolean;
    serviceReached: boolean;
};

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
];

const toDayKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseAppointmentDate = (appointment: Appointment): Date => {
    if (appointment.preferredDate) {
        const normalized = appointment.preferredDate.trim();

        const yyyyMmDd = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (yyyyMmDd) {
            return new Date(Number(yyyyMmDd[1]), Number(yyyyMmDd[2]) - 1, Number(yyyyMmDd[3]));
        }

        const directDate = new Date(normalized);
        if (!Number.isNaN(directDate.getTime())) {
            return directDate;
        }

        const weekdays: Record<string, number> = {
            domingo: 0,
            lunes: 1,
            martes: 2,
            miercoles: 3,
            miércoles: 3,
            jueves: 4,
            viernes: 5,
            sabado: 6,
            sábado: 6,
        };

        const weekdayKey = normalized.toLowerCase();
        if (weekdays[weekdayKey] !== undefined) {
            const base = new Date(appointment.createdAt);
            const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
            const target = weekdays[weekdayKey];
            const delta = (target - start.getDay() + 7) % 7 || 7;
            const resolved = new Date(start);
            resolved.setDate(start.getDate() + delta);
            return resolved;
        }

        const ddMmYyyy = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (ddMmYyyy) {
            const day = Number(ddMmYyyy[1]);
            const month = Number(ddMmYyyy[2]) - 1;
            const year = Number(ddMmYyyy[3]);
            return new Date(year, month, day);
        }

        const ddMmNoYear = normalized.match(/^(\d{1,2})[/-](\d{1,2})$/);
        if (ddMmNoYear) {
            const today = new Date();
            const day = Number(ddMmNoYear[1]);
            const month = Number(ddMmNoYear[2]) - 1;
            return new Date(today.getFullYear(), month, day);
        }
    }

    return new Date(appointment.createdAt);
};

const getStatusBadgeClass = (status: AppointmentStatus) => {
    if (status === 'confirmed') {
        return 'bg-primary/10 text-primary border-primary/20';
    }
    if (status === 'cancelled') {
        return 'bg-destructive/10 text-destructive border-destructive/20';
    }
    return 'bg-secondary text-secondary-foreground border-primary/20';
};

const getStatusText = (status: AppointmentStatus) => {
    if (status === 'confirmed') return 'Confirmada';
    if (status === 'cancelled') return 'Cancelada';
    return 'Pendiente';
};

const getAppointmentType = (appointment: Appointment) => {
    const serviceText = (appointment.service || appointment.survey?.title || '').toLowerCase();

    if (serviceText.includes('rehabil')) return 'Rehabilitación';
    if (serviceText.includes('masaj')) return 'Masajes';
    if (serviceText.includes('facial') || serviceText.includes('belleza')) return 'Belleza';
    if (serviceText.includes('terapia') || serviceText.includes('mente')) return 'Terapia';
    if (appointment.survey?.type === 'satisfaccion') return 'Satisfacción';
    if (appointment.survey?.type === 'enterado') return 'Prospecto';
    return 'General';
};

const extractCustomerName = (appointment: Appointment) => {
    if (appointment.customerName?.trim()) return appointment.customerName.trim();

    const notes = appointment.notes || '';
    const match = notes.match(/cliente:\s*([^|\n]+)/i);
    if (match?.[1]) return match[1].trim();

    return 'Cliente sin nombre';
};

const formatAppointmentDate = (appointment: Appointment) => {
    const date = parseAppointmentDate(appointment);
    const longDate = date.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
    const numericDate = date.toLocaleDateString('es-MX');

    return `${longDate} (${numericDate})`;
};

const getCreationOrigin = (appointment: Appointment) => {
    const notes = (appointment.notes || '').toLowerCase();
    if (notes.includes('creada manualmente por admin')) return 'Manual';
    if (notes.includes('chatbot')) return 'Chatbot';
    if ((appointment.source || '').toLowerCase() === 'google') return 'Chatbot';
    return 'Global';
};

const cleanEditNotes = (value?: string | null) => {
    if (!value) return '';
    return value
        .replace(/cita creada desde chatbot web\.?/gi, '')
        .replace(/creada manualmente por admin\.?/gi, '')
        .replace(/id\s*:\s*[^|\n]+/gi, '')
        .replace(/\|\s*\|/g, '|')
        .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
        .trim();
};

const getPhoneDisplay = (value?: string | null) => {
    const raw = String(value || '').trim();
    if (!raw) return 'Sin teléfono';

    if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(raw) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(raw)) {
        return 'Sin teléfono';
    }

    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return 'Sin teléfono';
    return raw;
};

const getSourceInfo = (appointment: Appointment) => {
    const source = (appointment.source || '').toLowerCase();

    if (source === 'google') {
        return {
            label: 'Google + Global',
            className: 'bg-accent text-accent-foreground border-primary/20',
        };
    }

    if (source === 'global') {
        return {
            label: 'Global',
            className: 'bg-muted text-muted-foreground border-border',
        };
    }

    const notes = (appointment.notes || '').toLowerCase();

    if (notes.includes('chatbot web')) {
        return {
            label: 'Google + Global',
            className: 'bg-accent text-accent-foreground border-primary/20',
        };
    }

    return {
        label: 'Global',
        className: 'bg-muted text-muted-foreground border-border',
    };
};

const normalizeServiceKey = (value?: string | null) =>
    (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

const getTimeKey = (value?: string | null) => (value || '').trim();

const getDayKeyForAppointment = (appointment: Appointment) => toDayKey(parseAppointmentDate(appointment));

export function AppointmentsCalendar() {
    const lastGoogleSyncAtRef = useRef(0);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sectionView, setSectionView] = useState<AppointmentsSectionView>('calendarios');
    const [currentMonth, setCurrentMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [selectedDayKey, setSelectedDayKey] = useState(() => toDayKey(new Date()));
    const [settings, setSettings] = useState<GoogleCalendarSettings>({ embedUrl: '', webhookUrl: '' });
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [syncingGoogle, setSyncingGoogle] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [managementMessage, setManagementMessage] = useState<string | null>(null);
    const [manualForm, setManualForm] = useState<ManualForm>({
        customerName: '',
        email: '',
        phone: '',
        service: '',
        preferredDate: '',
        preferredTime: '',
        notes: '',
    });
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
    const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
    const [editForm, setEditForm] = useState<EditForm>({
        customerName: '',
        email: '',
        phone: '',
        service: '',
        preferredDate: '',
        preferredTime: '',
        notes: '',
        status: 'pending',
    });

    const loadAppointments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/appointments', { cache: 'no-store' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudieron cargar las citas');
            }

            setAppointments(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar citas');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAppointments();
    }, []);

    useEffect(() => {
        const loadServiceOptions = async () => {
            try {
                const response = await fetch('/api/admin/services', { cache: 'no-store' });
                const data = await response.json();
                if (!response.ok) return;
                    const normalized = Array.isArray(data)
                      ? (data as Array<{ id?: string; title?: string }>)
                          .map((item) => ({ id: String(item.id || item.title || ''), title: String(item.title || '').trim() }))
                          .filter((item) => item.title.length > 0)
                      : [];
                setServiceOptions(normalized);
            } catch {
            }
        };

        loadServiceOptions();
    }, []);

    const loadGoogleSettings = async () => {
        setSettingsLoading(true);
        setSettingsMessage(null);
        try {
            const response = await fetch('/api/admin/google-calendar-settings', { cache: 'no-store' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo cargar la configuración de Google Calendar');
            }

            setSettings({
                embedUrl: data?.embedUrl || '',
                webhookUrl: data?.webhookUrl || '',
            });
        } catch (err) {
            setSettingsMessage(err instanceof Error ? err.message : 'Error cargando configuración');
        } finally {
            setSettingsLoading(false);
        }
    };

    useEffect(() => {
        loadGoogleSettings();
    }, []);

    const saveGoogleSettings = async () => {
        setSettingsSaving(true);
        setSettingsMessage(null);
        try {
            const response = await fetch('/api/admin/google-calendar-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo guardar configuración');
            }

            setSettings({
                embedUrl: data?.embedUrl || '',
                webhookUrl: data?.webhookUrl || '',
            });
            setSettingsMessage('Configuración de Google Calendar guardada ✅');
        } catch (err) {
            setSettingsMessage(err instanceof Error ? err.message : 'Error guardando configuración');
        } finally {
            setSettingsSaving(false);
        }
    };

    const syncGoogleCalendar = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
        setSyncingGoogle(true);
        if (!silent) {
            setSettingsMessage(null);
        }
        try {
            const response = await fetch('/api/admin/google-calendar/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo sincronizar con Google Calendar');
            }

            const stats = data?.stats;
            const warnings = Array.isArray(stats?.warnings) && stats.warnings.length > 0
                ? ` Avisos: ${stats.warnings.length}.`
                : '';

            lastGoogleSyncAtRef.current = Date.now();

            if (!silent) {
                setSettingsMessage(
                    `Sincronizacion completada. Subidas: ${stats?.pushedToGoogle || 0}, importadas: ${stats?.importedFromGoogle || 0}, enlazadas: ${stats?.linkedExisting || 0}, actualizadas: ${stats?.updatedExisting || 0}.${warnings}`
                );
            }

            await loadAppointments();
        } catch (err) {
            if (!silent) {
                setSettingsMessage(err instanceof Error ? err.message : 'Error sincronizando Google Calendar');
            }
        } finally {
            setSyncingGoogle(false);
        }
    }, []);

    useEffect(() => {
        if (!settings.webhookUrl) return;

        const trySync = () => {
            if (document.visibilityState !== 'visible') return;
            if (syncingGoogle) return;

            const now = Date.now();
            if (now - lastGoogleSyncAtRef.current < GOOGLE_SYNC_COOLDOWN_MS) return;

            void syncGoogleCalendar({ silent: true });
        };

        trySync();

        const intervalId = window.setInterval(() => {
            trySync();
        }, GOOGLE_SYNC_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                trySync();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [settings.webhookUrl, syncingGoogle, syncGoogleCalendar]);

    const appointmentsByDay = useMemo(() => {
        const map = new Map<string, Appointment[]>();

        appointments.forEach((appointment) => {
            const date = parseAppointmentDate(appointment);
            const key = toDayKey(date);
            const list = map.get(key) ?? [];
            list.push(appointment);
            map.set(key, list);
        });

        map.forEach((list) => {
            list.sort((a, b) => {
                const timeA = (a.preferredTime || '').toLowerCase();
                const timeB = (b.preferredTime || '').toLowerCase();
                return timeA.localeCompare(timeB);
            });
        });

        return map;
    }, [appointments]);

    const slotLoadByDay = useMemo(() => {
        const map = new Map<string, Map<string, { total: number; byService: Map<string, number> }>>();

        appointments.forEach((appointment) => {
            if (appointment.status === 'cancelled') return;
            const timeKey = getTimeKey(appointment.preferredTime);
            if (!timeKey) return;

            const dayKey = getDayKeyForAppointment(appointment);
            const daySlots = map.get(dayKey) || new Map<string, { total: number; byService: Map<string, number> }>();
            const current = daySlots.get(timeKey) || { total: 0, byService: new Map<string, number>() };

            current.total += 1;
            const serviceKey = normalizeServiceKey(appointment.service);
            if (serviceKey) {
                current.byService.set(serviceKey, (current.byService.get(serviceKey) || 0) + 1);
            }

            daySlots.set(timeKey, current);
            map.set(dayKey, daySlots);
        });

        return map;
    }, [appointments]);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const mondayBasedIndex = (firstDay.getDay() + 6) % 7;
        const startDate = new Date(firstDay);
        startDate.setDate(firstDay.getDate() - mondayBasedIndex);

        return Array.from({ length: 42 }, (_, idx) => {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + idx);
            return date;
        });
    }, [currentMonth]);

    const selectedDayAppointments = appointmentsByDay.get(selectedDayKey) ?? [];

    const monthLabel = `${MONTHS_ES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    const editingAppointment = useMemo(
        () => appointments.find((item) => item.id === editingAppointmentId) || null,
        [appointments, editingAppointmentId]
    );

    const confirmedCount = appointments.filter((appointment) => appointment.status === 'confirmed').length;
    const pendingCount = appointments.filter((appointment) => appointment.status === 'pending').length;
    const cancelledCount = appointments.filter((appointment) => appointment.status === 'cancelled').length;

    const getSlotLoadInfo = useCallback(
        (preferredDate?: string, preferredTime?: string, service?: string, excludeId?: string): SlotLoadInfo => {
            if (!preferredDate || !preferredTime) {
                return {
                    total: 0,
                    service: 0,
                    totalReached: false,
                    serviceReached: false,
                };
            }

            const activeAppointments = appointments.filter((item) => {
                if (excludeId && item.id === excludeId) return false;
                if (item.status === 'cancelled') return false;
                return item.preferredDate === preferredDate && item.preferredTime === preferredTime;
            });

            const serviceKey = normalizeServiceKey(service);
            const serviceCount =
                serviceKey.length > 0
                    ? activeAppointments.filter((item) => normalizeServiceKey(item.service) === serviceKey).length
                    : 0;

            return {
                total: activeAppointments.length,
                service: serviceCount,
                totalReached: activeAppointments.length >= MAX_APPOINTMENTS_PER_HOUR_TOTAL,
                serviceReached: serviceKey.length > 0 && serviceCount >= MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE,
            };
        },
        [appointments]
    );

    const getAppointmentSlotLoadInfo = useCallback(
        (appointment: Appointment): SlotLoadInfo => {
            const dayKey = getDayKeyForAppointment(appointment);
            const timeKey = getTimeKey(appointment.preferredTime);
            const serviceKey = normalizeServiceKey(appointment.service);

            if (!timeKey) {
                return {
                    total: 0,
                    service: 0,
                    totalReached: false,
                    serviceReached: false,
                };
            }

            const slot = slotLoadByDay.get(dayKey)?.get(timeKey);
            const total = slot?.total || 0;
            const service = serviceKey ? slot?.byService.get(serviceKey) || 0 : 0;

            return {
                total,
                service,
                totalReached: total >= MAX_APPOINTMENTS_PER_HOUR_TOTAL,
                serviceReached: serviceKey.length > 0 && service >= MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE,
            };
        },
        [slotLoadByDay]
    );

    const manualSlotLoad = useMemo(
        () => getSlotLoadInfo(manualForm.preferredDate, manualForm.preferredTime, manualForm.service),
        [getSlotLoadInfo, manualForm.preferredDate, manualForm.preferredTime, manualForm.service]
    );

    const editSlotLoad = useMemo(
        () => getSlotLoadInfo(editForm.preferredDate, editForm.preferredTime, editForm.service, editingAppointmentId || undefined),
        [getSlotLoadInfo, editForm.preferredDate, editForm.preferredTime, editForm.service, editingAppointmentId]
    );

    const upsertAppointment = (updated: Appointment) => {
        setAppointments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    };

    const updateStatus = async (appointment: Appointment, status: AppointmentStatus, extraNote?: string) => {
        setActionLoadingId(appointment.id);
        setManagementMessage(null);
        try {
            const noteParts = [appointment.notes || '', extraNote || '']
                .map((part) => part.trim())
                .filter(Boolean);

            const response = await fetch(`/api/admin/appointments/${appointment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    notes: noteParts.join(' | '),
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo actualizar la cita');
            }

            upsertAppointment(data as Appointment);
            if (data?.googleSync?.attempted && !data?.googleSync?.ok) {
                setManagementMessage('Cita actualizada en Global ✅, pero Google falló. Revisa webhook/script de Apps Script.');
            } else {
                setManagementMessage('Cita actualizada correctamente ✅');
            }
        } catch (err) {
            setManagementMessage(err instanceof Error ? err.message : 'Error actualizando cita');
        } finally {
            setActionLoadingId(null);
        }
    };

    const createManualAppointment = async () => {
        setActionLoadingId('create-manual');
        setManagementMessage(null);
        try {
            const response = await fetch('/api/admin/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(manualForm),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo crear la cita manual');
            }

            setAppointments((prev) => [data as Appointment, ...prev]);
            setManualForm({
                customerName: '',
                email: '',
                phone: '',
                service: '',
                preferredDate: '',
                preferredTime: '',
                notes: '',
            });
            setIsManualModalOpen(false);
            setManagementMessage('Cita creada manualmente ✅');
        } catch (err) {
            setManagementMessage(err instanceof Error ? err.message : 'Error creando cita manual');
        } finally {
            setActionLoadingId(null);
        }
    };

    const openEditModal = (appointment: Appointment) => {
        setEditingAppointmentId(appointment.id);
        setEditForm({
            customerName: extractCustomerName(appointment) === 'Cliente sin nombre' ? '' : extractCustomerName(appointment),
            email: appointment.email || '',
            phone: appointment.phone || '',
            service: appointment.service || appointment.survey?.title || '',
            preferredDate: appointment.preferredDate || '',
            preferredTime: appointment.preferredTime || '',
            notes: cleanEditNotes(appointment.notes),
            status: appointment.status,
        });
    };

    const closeEditModal = () => {
        setEditingAppointmentId(null);
    };

    const saveAppointmentEdit = async () => {
        if (!editingAppointmentId) return;

        setActionLoadingId(editingAppointmentId);
        setManagementMessage(null);

        try {
            const response = await fetch(`/api/admin/appointments/${editingAppointmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo editar la cita');
            }

            upsertAppointment(data as Appointment);
            closeEditModal();

            if (data?.googleSync?.attempted && !data?.googleSync?.ok) {
                setManagementMessage('Cita editada en Global ✅, pero Google falló. Revisa webhook/script.');
            } else {
                setManagementMessage('Cita editada correctamente ✅');
            }
        } catch (err) {
            setManagementMessage(err instanceof Error ? err.message : 'Error editando cita');
        } finally {
            setActionLoadingId(null);
        }
    };

    const deleteAppointment = async (appointment: Appointment) => {
        const shouldDelete = window.confirm('¿Eliminar esta cita? Esta acción no se puede deshacer.');
        if (!shouldDelete) return;

        setActionLoadingId(appointment.id);
        setManagementMessage(null);

        try {
            const response = await fetch(`/api/admin/appointments/${appointment.id}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo eliminar la cita');
            }

            setAppointments((prev) => prev.filter((item) => item.id !== appointment.id));

            if (data?.googleSync?.attempted && !data?.googleSync?.ok) {
                setManagementMessage('Cita eliminada en Global ✅, pero Google falló al borrar evento.');
            } else {
                setManagementMessage('Cita eliminada correctamente ✅');
            }
        } catch (err) {
            setManagementMessage(err instanceof Error ? err.message : 'Error eliminando cita');
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Header: title left, folder tabs right */}
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-1">
                <h2 className="text-xl md:text-2xl font-bold text-foreground pb-2">Centro de citas</h2>

                <div className="ml-auto flex shrink-0 items-end gap-2">

                    <button
                        type="button"
                        onClick={() => setSectionView('calendarios')}
                        className={cn(
                            'relative z-10 px-5 py-2.5 rounded-t-xl border-t border-l border-r text-sm font-semibold transition-all select-none',
                            sectionView === 'calendarios'
                                ? '-mb-[1px] border-border bg-card text-foreground [border-bottom-color:hsl(var(--card))]'
                                : 'border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        Calendarios
                    </button>
                    <button
                        type="button"
                        onClick={() => setSectionView('gestion')}
                        className={cn(
                            'relative z-10 px-5 py-2.5 rounded-t-xl border-t border-l border-r text-sm font-semibold transition-all select-none',
                            sectionView === 'gestion'
                                ? '-mb-[1px] border-border bg-card text-foreground [border-bottom-color:hsl(var(--card))]'
                                : 'border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        Gestionar citas
                    </button>
                </div>
            </div>

            {/* Content panel — the active tab's bottom "erases" the top border here */}
            <div className="relative z-0 rounded-2xl rounded-tr-none border border-border bg-card p-4 shadow-lg md:p-6 lg:p-8">
                {sectionView === 'calendarios' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <span className="px-4 py-2.5 rounded-full text-sm font-medium bg-primary text-white border border-primary">
                            Calendario Global
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-card border border-border rounded-2xl p-3">
                            <p className="text-xs text-muted-foreground">Total citas</p>
                            <p className="text-xl font-bold text-foreground">{appointments.length}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-3">
                            <p className="text-xs text-muted-foreground">Pendientes</p>
                            <p className="text-xl font-bold text-secondary-foreground">{pendingCount}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-3">
                            <p className="text-xs text-muted-foreground">Confirmadas</p>
                            <p className="text-xl font-bold text-primary">{confirmedCount}</p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                        <div className="flex-1 bg-card border border-border rounded-2xl p-4 md:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCurrentMonth(
                                            (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                                        )
                                    }
                                    className="p-2 rounded-full hover:bg-slate-200 transition-colors"
                                    aria-label="Mes anterior"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-2 text-foreground">
                                    <CalendarDays className="w-5 h-5 text-primary" />
                                    <h3 className="text-base md:text-lg font-semibold">{monthLabel}</h3>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setCurrentMonth(
                                            (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                                        )
                                    }
                                    className="p-2 rounded-full hover:bg-slate-200 transition-colors"
                                    aria-label="Mes siguiente"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {WEEK_DAYS.map((day) => (
                                    <div key={day} className="text-center text-xs md:text-sm font-semibold text-muted-foreground py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {calendarDays.map((date) => {
                                    const dayKey = toDayKey(date);
                                    const dayAppointments = appointmentsByDay.get(dayKey) ?? [];
                                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                                    const isToday = dayKey === toDayKey(new Date());
                                    const isSelected = dayKey === selectedDayKey;

                                    return (
                                        <button
                                            key={dayKey}
                                            type="button"
                                            onClick={() => setSelectedDayKey(dayKey)}
                                            className={cn(
                                                'min-h-[92px] text-left border rounded-xl p-2 transition-all bg-card',
                                                isSelected && 'ring-2 ring-primary/40 border-primary/40',
                                                !isSelected && 'hover:border-border',
                                                !isCurrentMonth && 'opacity-45'
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span
                                                    className={cn(
                                                        'text-xs font-semibold',
                                                        isToday ? 'text-primary' : 'text-muted-foreground'
                                                    )}
                                                >
                                                    {date.getDate()}
                                                </span>
                                                {dayAppointments.length > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                                        {dayAppointments.length}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                {dayAppointments.slice(0, 2).map((appointment) => (
                                                    (() => {
                                                        const load = getAppointmentSlotLoadInfo(appointment);
                                                        const loadClass = load.totalReached
                                                            ? 'bg-destructive/20 text-destructive border-destructive/30'
                                                            : load.total >= MAX_APPOINTMENTS_PER_HOUR_TOTAL - 1
                                                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                                                              : 'bg-emerald-100 text-emerald-700 border-emerald-300';

                                                        return (
                                                    <div
                                                        key={appointment.id}
                                                        className={cn(
                                                            'text-[10px] px-1.5 py-0.5 rounded border font-medium',
                                                            getStatusBadgeClass(appointment.status)
                                                        )}
                                                        title={`Origen: ${getSourceInfo(appointment).label}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1.5">
                                                            <span className="truncate">
                                                                {appointment.preferredTime ? `${appointment.preferredTime} · ` : ''}
                                                                {appointment.service || appointment.survey?.title || 'Cita'}
                                                            </span>
                                                            <span className={cn('shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold', loadClass)}>
                                                                {load.total}/{MAX_APPOINTMENTS_PER_HOUR_TOTAL}
                                                            </span>
                                                        </div>
                                                    </div>
                                                        );
                                                    })()
                                                ))}
                                                {dayAppointments.length > 2 && (
                                                    <div className="text-[10px] text-muted-foreground font-medium">
                                                        +{dayAppointments.length - 2} más
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <aside className="w-full lg:w-[360px] bg-card border border-border rounded-2xl p-4 md:p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-foreground text-base">Detalle del día</h4>
                                <button
                                    type="button"
                                    onClick={loadAppointments}
                                    className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-slate-200 text-muted-foreground transition-colors"
                                >
                                    Recargar
                                </button>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4">{selectedDayKey}</p>

                            {isLoading ? (
                                <p className="text-sm text-muted-foreground">Cargando citas...</p>
                            ) : error ? (
                                <p className="text-sm text-rose-600">{error}</p>
                            ) : selectedDayAppointments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No hay citas para este día.</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDayAppointments.map((appointment) => (
                                        (() => {
                                            const slotLoad = getAppointmentSlotLoadInfo(appointment);
                                            const slotLoadClass = slotLoad.totalReached
                                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                                : slotLoad.total >= MAX_APPOINTMENTS_PER_HOUR_TOTAL - 1
                                                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                                                  : 'bg-emerald-100 text-emerald-700 border-emerald-300';

                                            return (
                                        <div key={appointment.id} className="p-3 rounded-xl border border-border bg-card">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {appointment.service || appointment.survey?.title || 'Cita'}
                                                </p>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span
                                                        className={cn(
                                                            'text-[11px] px-2 py-0.5 rounded-full border font-semibold',
                                                            getStatusBadgeClass(appointment.status)
                                                        )}
                                                    >
                                                        {getStatusText(appointment.status)}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'text-[10px] px-2 py-0.5 rounded-full border font-semibold',
                                                            getSourceInfo(appointment).className
                                                        )}
                                                    >
                                                        {getSourceInfo(appointment).label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                <p className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', slotLoadClass)}>
                                                    Cupo hora: {slotLoad.total}/{MAX_APPOINTMENTS_PER_HOUR_TOTAL} total · {slotLoad.service}/{MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE} servicio
                                                </p>
                                                {appointment.preferredTime && (
                                                    <p className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                        {appointment.preferredTime}
                                                    </p>
                                                )}
                                                <p className="flex items-center gap-1.5 break-all">
                                                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {appointment.email}
                                                </p>
                                                {appointment.phone && (
                                                    <p className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                                        {appointment.phone}
                                                    </p>
                                                )}
                                                {appointment.notes && (
                                                    <p className="text-muted-foreground pt-1">Nota: {appointment.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                            );
                                        })()
                                    ))}
                                </div>
                            )}
                        </aside>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <h4 className="text-base md:text-lg font-semibold text-foreground">Ajustes de Google Calendar</h4>
                                <div className="flex flex-wrap justify-end gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                                        <RefreshCw className={cn('w-3.5 h-3.5', syncingGoogle && 'animate-spin')} />
                                        Sincronización activa
                                    </span>
                                    <button
                                        type="button"
                                        onClick={loadGoogleSettings}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-muted hover:bg-slate-200 text-muted-foreground"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Recargar ajustes
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">URL embebida de tu calendario</label>
                                    <input
                                        type="text"
                                        value={settings.embedUrl}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, embedUrl: e.target.value }))}
                                        placeholder="https://calendar.google.com/calendar/embed?..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        disabled={settingsLoading || settingsSaving}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">URL webhook para sincronizar eventos (opcional)</label>
                                    <input
                                        type="text"
                                        value={settings.webhookUrl}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        className="w-full px-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        disabled={settingsLoading || settingsSaving}
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Guarda las URLs aquí para enlazar tu Google Calendar con la app. El calendario principal usa la agenda interna; esta sección solo mantiene configuración de sincronización.
                            </p>

                            {settingsMessage && (
                                <p className="text-sm text-muted-foreground">{settingsMessage}</p>
                            )}

                            <button
                                type="button"
                                onClick={saveGoogleSettings}
                                disabled={settingsLoading || settingsSaving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60"
                            >
                                <Save className="w-4 h-4" />
                                Guardar ajustes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {sectionView === 'gestion' && (
                <div className="space-y-4">
                    <div className="flex justify-start">
                        <button
                            type="button"
                            onClick={() => setIsManualModalOpen(true)}
                            className="px-5 py-2.5 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                        >
                            Agendar cita manual
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="bg-card border border-border rounded-2xl p-3">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-xl font-bold text-foreground">{appointments.length}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-3">
                            <p className="text-xs text-muted-foreground">Pendientes</p>
                            <p className="text-xl font-bold text-secondary-foreground">{pendingCount}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-3">
                            <p className="text-xs text-muted-foreground">Confirmadas</p>
                            <p className="text-xl font-bold text-primary">{confirmedCount}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-3">
                            <p className="text-xs text-muted-foreground">Canceladas</p>
                            <p className="text-xl font-bold text-destructive">{cancelledCount}</p>
                        </div>
                    </div>

                    {managementMessage && <p className="text-sm text-muted-foreground">{managementMessage}</p>}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {appointments.map((appointment) => (
                            <div
                                key={appointment.id}
                                className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4 flex flex-col shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-foreground">{appointment.service || appointment.survey?.title || 'Cita'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Tipo: {getAppointmentType(appointment)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{formatAppointmentDate(appointment)} · {appointment.preferredTime || 'Sin hora'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-semibold', getStatusBadgeClass(appointment.status))}>
                                            {getStatusText(appointment.status)}
                                        </span>
                                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold', getSourceInfo(appointment).className)}>
                                            {getSourceInfo(appointment).label}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1 text-xs text-muted-foreground border border-border/70 rounded-xl p-3 bg-muted/20">
                                    <p className="flex items-center gap-1.5 text-foreground font-medium">
                                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                                        {extractCustomerName(appointment)}
                                    </p>
                                    <p className="flex items-center gap-1.5 break-all">
                                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                        {appointment.email}
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                        {getPhoneDisplay(appointment.phone)}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={actionLoadingId === appointment.id}
                                        onClick={() => updateStatus(appointment, 'confirmed', 'Marcada como realizada por admin.')}
                                        className="px-3 py-1.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                                    >
                                        Ya se hizo
                                    </button>
                                    <button
                                        type="button"
                                        disabled={actionLoadingId === appointment.id}
                                        onClick={() => updateStatus(appointment, 'cancelled', 'Cancelada por admin.')}
                                        className="px-3 py-1.5 rounded-full text-xs bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={actionLoadingId === appointment.id}
                                        onClick={() => updateStatus(appointment, 'cancelled', 'No show (no llegó a tiempo).')}
                                        className="px-3 py-1.5 rounded-full text-xs bg-muted text-muted-foreground border border-border hover:bg-slate-200 transition-colors"
                                    >
                                        No llegó a tiempo
                                    </button>
                                    <button
                                        type="button"
                                        disabled={actionLoadingId === appointment.id}
                                        onClick={() => openEditModal(appointment)}
                                        className="px-3 py-1.5 rounded-full text-xs bg-accent/40 text-accent-foreground border border-border hover:bg-accent/60 transition-colors inline-flex items-center gap-1"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={actionLoadingId === appointment.id}
                                        onClick={() => deleteAppointment(appointment)}
                                        className="px-3 py-1.5 rounded-full text-xs bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors inline-flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {editingAppointmentId && (
                        <div
                            className="fixed inset-0 z-[70] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4"
                            onClick={closeEditModal}
                        >
                            <div
                                className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl p-4 md:p-6 space-y-4"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-base md:text-lg font-semibold text-foreground">Editar cita</h4>
                                        {editingAppointment && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-border bg-muted text-muted-foreground">
                                                {getCreationOrigin(editingAppointment)}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:bg-muted flex items-center justify-center"
                                        aria-label="Cerrar modal"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={editForm.customerName}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, customerName: e.target.value }))}
                                        placeholder="Nombre cliente"
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder="Email"
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Teléfono"
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    <select
                                        value={editForm.service}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, service: e.target.value }))}
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    >
                                        <option value="">Selecciona servicio</option>
                                        {serviceOptions.map((service) => (
                                            <option key={service.id} value={service.title}>{service.title}</option>
                                        ))}
                                        {editForm.service && !serviceOptions.some((item) => item.title === editForm.service) && (
                                            <option value={editForm.service}>{editForm.service}</option>
                                        )}
                                    </select>
                                    <input
                                        type="date"
                                        value={editForm.preferredDate}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    <input
                                        type="time"
                                        value={editForm.preferredTime}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, preferredTime: e.target.value }))}
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    {editForm.preferredDate && editForm.preferredTime && (
                                        <div className="md:col-span-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs space-y-1">
                                            <p className="font-semibold text-foreground">Cupo del horario seleccionado</p>
                                            <p className={cn(editSlotLoad.totalReached ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                                                Total: {editSlotLoad.total}/{MAX_APPOINTMENTS_PER_HOUR_TOTAL}
                                            </p>
                                            <p className={cn(editSlotLoad.serviceReached ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                                                Servicio: {editSlotLoad.service}/{MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE}
                                            </p>
                                        </div>
                                    )}
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as AppointmentStatus }))}
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    >
                                        <option value="pending">Pendiente</option>
                                        <option value="confirmed">Confirmada</option>
                                        <option value="cancelled">Cancelada</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Notas"
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="px-5 py-2.5 rounded-full bg-muted text-muted-foreground font-semibold hover:bg-slate-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveAppointmentEdit}
                                        disabled={actionLoadingId === editingAppointmentId || (editForm.status !== 'cancelled' && (editSlotLoad.totalReached || editSlotLoad.serviceReached))}
                                        className="px-5 py-2.5 rounded-full bg-primary text-white font-semibold disabled:opacity-60"
                                    >
                                        Guardar cambios
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isManualModalOpen && (
                        <div
                            className="fixed inset-0 z-[70] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4"
                            onClick={() => setIsManualModalOpen(false)}
                        >
                            <div
                                className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl p-4 md:p-6 space-y-4"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className="text-base md:text-lg font-semibold text-foreground">Agendar cita manual (admin)</h4>
                                    <button
                                        type="button"
                                        onClick={() => setIsManualModalOpen(false)}
                                        className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:bg-muted flex items-center justify-center"
                                        aria-label="Cerrar modal"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={manualForm.customerName}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, customerName: e.target.value }))}
                                        placeholder="Nombre cliente"
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    <input
                                        type="email"
                                        value={manualForm.email}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder="Email"
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    <input
                                        type="text"
                                        value={manualForm.phone}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Teléfono"
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    <select
                                        value={manualForm.service}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, service: e.target.value }))}
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    >
                                        <option value="">Selecciona servicio</option>
                                        {serviceOptions.map((service) => (
                                            <option key={service.id} value={service.title}>{service.title}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="date"
                                        value={manualForm.preferredDate}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    <input
                                        type="time"
                                        value={manualForm.preferredTime}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, preferredTime: e.target.value }))}
                                        className="px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                    {manualForm.preferredDate && manualForm.preferredTime && (
                                        <div className="md:col-span-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs space-y-1">
                                            <p className="font-semibold text-foreground">Cupo del horario seleccionado</p>
                                            <p className={cn(manualSlotLoad.totalReached ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                                                Total: {manualSlotLoad.total}/{MAX_APPOINTMENTS_PER_HOUR_TOTAL}
                                            </p>
                                            <p className={cn(manualSlotLoad.serviceReached ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                                                Servicio: {manualSlotLoad.service}/{MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE}
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        value={manualForm.notes}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Notas"
                                        className="md:col-span-2 px-4 py-2 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsManualModalOpen(false)}
                                        className="px-5 py-2.5 rounded-full bg-muted text-muted-foreground font-semibold hover:bg-slate-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={createManualAppointment}
                                        disabled={actionLoadingId === 'create-manual' || manualSlotLoad.totalReached || manualSlotLoad.serviceReached}
                                        className="px-5 py-2.5 rounded-full bg-primary text-white font-semibold disabled:opacity-60"
                                    >
                                        Crear cita manual
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
}
