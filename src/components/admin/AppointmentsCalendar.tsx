'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Mail, Phone, RefreshCw, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

interface Appointment {
    id: string;
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

type CalendarView = 'global' | 'gestion' | 'google';
const OPEN_GESTION_CITAS_EVENT = 'merrash:open-gestion-citas';

type ManualForm = {
    customerName: string;
    email: string;
    phone: string;
    service: string;
    preferredDate: string;
    preferredTime: string;
    notes: string;
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
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    if (status === 'cancelled') {
        return 'bg-rose-100 text-rose-700 border-rose-200';
    }
    return 'bg-amber-100 text-amber-700 border-amber-200';
};

const getStatusText = (status: AppointmentStatus) => {
    if (status === 'confirmed') return 'Confirmada';
    if (status === 'cancelled') return 'Cancelada';
    return 'Pendiente';
};

const getSourceInfo = (appointment: Appointment) => {
    const source = (appointment.source || '').toLowerCase();

    if (source === 'google') {
        return {
            label: 'Google + Global',
            className: 'bg-sky-100 text-sky-700 border-sky-200',
        };
    }

    if (source === 'global') {
        return {
            label: 'Global',
            className: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }

    const notes = (appointment.notes || '').toLowerCase();

    if (notes.includes('chatbot web')) {
        return {
            label: 'Google + Global',
            className: 'bg-sky-100 text-sky-700 border-sky-200',
        };
    }

    return {
        label: 'Global',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
    };
};

export function AppointmentsCalendar() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<CalendarView>('global');
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
    const [rescheduleDrafts, setRescheduleDrafts] = useState<Record<string, { preferredDate: string; preferredTime: string }>>({});
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

    useEffect(() => {
        const handleOpenGestion = () => {
            setActiveView('gestion');
        };

        window.addEventListener(OPEN_GESTION_CITAS_EVENT, handleOpenGestion);
        return () => window.removeEventListener(OPEN_GESTION_CITAS_EVENT, handleOpenGestion);
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

    const syncGoogleCalendar = async () => {
        setSyncingGoogle(true);
        setSettingsMessage(null);
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

            setSettingsMessage(
                `Sincronizacion completada. Subidas: ${stats?.pushedToGoogle || 0}, importadas: ${stats?.importedFromGoogle || 0}, enlazadas: ${stats?.linkedExisting || 0}, actualizadas: ${stats?.updatedExisting || 0}.${warnings}`
            );

            await loadAppointments();
        } catch (err) {
            setSettingsMessage(err instanceof Error ? err.message : 'Error sincronizando Google Calendar');
        } finally {
            setSyncingGoogle(false);
        }
    };

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

    const confirmedCount = appointments.filter((appointment) => appointment.status === 'confirmed').length;
    const pendingCount = appointments.filter((appointment) => appointment.status === 'pending').length;
    const cancelledCount = appointments.filter((appointment) => appointment.status === 'cancelled').length;

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

    const submitReschedule = async (appointment: Appointment) => {
        const draft = rescheduleDrafts[appointment.id];
        if (!draft?.preferredDate || !draft?.preferredTime) {
            setManagementMessage('Ingresa fecha y hora para reagendar.');
            return;
        }

        setActionLoadingId(appointment.id);
        setManagementMessage(null);
        try {
            const noteParts = [appointment.notes || '', 'Reagendada por admin.']
                .map((part) => part.trim())
                .filter(Boolean);

            const response = await fetch(`/api/admin/appointments/${appointment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferredDate: draft.preferredDate,
                    preferredTime: draft.preferredTime,
                    status: 'pending',
                    notes: noteParts.join(' | '),
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo reagendar la cita');
            }

            upsertAppointment(data as Appointment);
            if (data?.googleSync?.attempted && !data?.googleSync?.ok) {
                setManagementMessage('Cita reagendada en Global ✅, pero Google falló. Revisa webhook/script de Apps Script.');
            } else {
                setManagementMessage('Cita reagendada correctamente ✅');
            }
        } catch (err) {
            setManagementMessage(err instanceof Error ? err.message : 'Error reagendando cita');
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

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 space-y-3">
                <div>
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Centro de citas</h3>
                    <p className="text-xs md:text-sm text-slate-600">
                        Revisa el calendario general, gestiona estatus y configura la sincronización con Google Calendar.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveView('global')}
                        className={cn(
                            'px-4 py-2.5 rounded-full text-sm font-medium transition-colors border',
                            activeView === 'global'
                                ? 'bg-primary text-white border-primary'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                    >
                        Calendario Global
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView('google')}
                        className={cn(
                            'px-4 py-2.5 rounded-full text-sm font-medium transition-colors border',
                            activeView === 'google'
                                ? 'bg-primary text-white border-primary'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                    >
                        Google Calendar
                    </button>
                </div>
            </div>

            {activeView === 'global' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Total citas</p>
                            <p className="text-xl font-bold text-slate-900">{appointments.length}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Pendientes</p>
                            <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Confirmadas</p>
                            <p className="text-xl font-bold text-emerald-600">{confirmedCount}</p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-6">
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

                                <div className="flex items-center gap-2 text-slate-900">
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
                                    <div key={day} className="text-center text-xs md:text-sm font-semibold text-slate-500 py-2">
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
                                                'min-h-[92px] text-left border rounded-xl p-2 transition-all bg-white',
                                                isSelected && 'ring-2 ring-primary/40 border-primary/40',
                                                !isSelected && 'hover:border-slate-300',
                                                !isCurrentMonth && 'opacity-45'
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span
                                                    className={cn(
                                                        'text-xs font-semibold',
                                                        isToday ? 'text-primary' : 'text-slate-700'
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
                                                    <div
                                                        key={appointment.id}
                                                        className={cn(
                                                            'text-[10px] truncate px-1.5 py-0.5 rounded border font-medium',
                                                            getStatusBadgeClass(appointment.status)
                                                        )}
                                                        title={`Origen: ${getSourceInfo(appointment).label}`}
                                                    >
                                                        {appointment.preferredTime ? `${appointment.preferredTime} · ` : ''}
                                                        {appointment.service || appointment.survey?.title || 'Cita'}
                                                    </div>
                                                ))}
                                                {dayAppointments.length > 2 && (
                                                    <div className="text-[10px] text-slate-500 font-medium">
                                                        +{dayAppointments.length - 2} más
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <aside className="w-full lg:w-[360px] bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-slate-900 text-base">Detalle del día</h4>
                                <button
                                    type="button"
                                    onClick={loadAppointments}
                                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                >
                                    Recargar
                                </button>
                            </div>

                            <p className="text-sm text-slate-500 mb-4">{selectedDayKey}</p>

                            {isLoading ? (
                                <p className="text-sm text-slate-500">Cargando citas...</p>
                            ) : error ? (
                                <p className="text-sm text-rose-600">{error}</p>
                            ) : selectedDayAppointments.length === 0 ? (
                                <p className="text-sm text-slate-500">No hay citas para este día.</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDayAppointments.map((appointment) => (
                                        <div key={appointment.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <p className="text-sm font-semibold text-slate-900">
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

                                            <div className="space-y-1 text-xs text-slate-600">
                                                {appointment.preferredTime && (
                                                    <p className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                                        {appointment.preferredTime}
                                                    </p>
                                                )}
                                                <p className="flex items-center gap-1.5 break-all">
                                                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                                                    {appointment.email}
                                                </p>
                                                {appointment.phone && (
                                                    <p className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                                                        {appointment.phone}
                                                    </p>
                                                )}
                                                {appointment.notes && (
                                                    <p className="text-slate-500 pt-1">Nota: {appointment.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            )}

            {activeView === 'gestion' && (
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
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="text-xl font-bold text-slate-900">{appointments.length}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Pendientes</p>
                            <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Confirmadas</p>
                            <p className="text-xl font-bold text-emerald-600">{confirmedCount}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Canceladas</p>
                            <p className="text-xl font-bold text-rose-600">{cancelledCount}</p>
                        </div>
                    </div>

                    {managementMessage && <p className="text-sm text-slate-700">{managementMessage}</p>}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {appointments.map((appointment) => (
                            <div
                                key={appointment.id}
                                className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-4 min-h-[250px] flex flex-col"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{appointment.service || 'Cita'}</p>
                                        <p className="text-sm text-slate-600">{appointment.preferredDate || 'Sin fecha'} · {appointment.preferredTime || 'Sin hora'}</p>
                                        <p className="text-xs text-slate-500">{appointment.email} {appointment.phone ? `· ${appointment.phone}` : ''}</p>
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

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={actionLoadingId === appointment.id}
                                        onClick={() => updateStatus(appointment, 'confirmed', 'Marcada como realizada por admin.')}
                                        className="px-3 py-1.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    >
                                        Ya se hizo
                                    </button>
                                    <button
                                        type="button"
                                        disabled={actionLoadingId === appointment.id}
                                        onClick={() => updateStatus(appointment, 'cancelled', 'Cancelada por admin.')}
                                        className="px-3 py-1.5 rounded-full text-xs bg-rose-100 text-rose-700 border border-rose-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={actionLoadingId === appointment.id}
                                        onClick={() => updateStatus(appointment, 'cancelled', 'No show (no llegó a tiempo).')}
                                        className="px-3 py-1.5 rounded-full text-xs bg-amber-100 text-amber-700 border border-amber-200"
                                    >
                                        No llegó a tiempo
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center mt-auto">
                                    <input
                                        type="date"
                                        value={rescheduleDrafts[appointment.id]?.preferredDate || ''}
                                        onChange={(e) =>
                                            setRescheduleDrafts((prev) => ({
                                                ...prev,
                                                [appointment.id]: {
                                                    preferredDate: e.target.value,
                                                    preferredTime: prev[appointment.id]?.preferredTime || '',
                                                },
                                            }))
                                        }
                                        className="px-3 py-2 rounded-lg border border-slate-300"
                                    />
                                    <input
                                        type="time"
                                        value={rescheduleDrafts[appointment.id]?.preferredTime || ''}
                                        onChange={(e) =>
                                            setRescheduleDrafts((prev) => ({
                                                ...prev,
                                                [appointment.id]: {
                                                    preferredDate: prev[appointment.id]?.preferredDate || '',
                                                    preferredTime: e.target.value,
                                                },
                                            }))
                                        }
                                        className="px-3 py-2 rounded-lg border border-slate-300"
                                    />
                                    <button
                                        type="button"
                                        disabled={actionLoadingId === appointment.id}
                                        onClick={() => submitReschedule(appointment)}
                                        className="px-3 py-2 rounded-full text-xs bg-primary text-white"
                                    >
                                        Reagendar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {isManualModalOpen && (
                        <div
                            className="fixed inset-0 z-[70] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4"
                            onClick={() => setIsManualModalOpen(false)}
                        >
                            <div
                                className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 md:p-6 space-y-4"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className="text-base md:text-lg font-semibold text-slate-900">Agendar cita manual (admin)</h4>
                                    <button
                                        type="button"
                                        onClick={() => setIsManualModalOpen(false)}
                                        className="h-9 w-9 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center"
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
                                        className="px-3 py-2 rounded-lg border border-slate-300"
                                    />
                                    <input
                                        type="email"
                                        value={manualForm.email}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder="Email"
                                        className="px-3 py-2 rounded-lg border border-slate-300"
                                    />
                                    <input
                                        type="text"
                                        value={manualForm.phone}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Teléfono"
                                        className="px-3 py-2 rounded-lg border border-slate-300"
                                    />
                                    <input
                                        type="text"
                                        value={manualForm.service}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, service: e.target.value }))}
                                        placeholder="Servicio"
                                        className="px-3 py-2 rounded-lg border border-slate-300"
                                    />
                                    <input
                                        type="date"
                                        value={manualForm.preferredDate}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
                                        className="px-3 py-2 rounded-lg border border-slate-300"
                                    />
                                    <input
                                        type="time"
                                        value={manualForm.preferredTime}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, preferredTime: e.target.value }))}
                                        className="px-3 py-2 rounded-lg border border-slate-300"
                                    />
                                    <input
                                        type="text"
                                        value={manualForm.notes}
                                        onChange={(e) => setManualForm((prev) => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Notas"
                                        className="md:col-span-2 px-3 py-2 rounded-lg border border-slate-300"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsManualModalOpen(false)}
                                        className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={createManualAppointment}
                                        disabled={actionLoadingId === 'create-manual'}
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

            {activeView === 'google' && (
                <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h4 className="text-base md:text-lg font-semibold text-slate-900">Ajustes de Google Calendar</h4>
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={syncGoogleCalendar}
                                    disabled={syncingGoogle || settingsLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
                                >
                                    <RefreshCw className={cn('w-3.5 h-3.5', syncingGoogle && 'animate-spin')} />
                                    Sincronizar Google y App
                                </button>
                                <button
                                    type="button"
                                    onClick={loadGoogleSettings}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Recargar
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">URL embebida de Google Calendar</label>
                                <input
                                    type="text"
                                    value={settings.embedUrl}
                                    onChange={(e) => setSettings((prev) => ({ ...prev, embedUrl: e.target.value }))}
                                    placeholder="https://calendar.google.com/calendar/embed?..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    disabled={settingsLoading || settingsSaving}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">URL webhook para crear eventos (opcional)</label>
                                <input
                                    type="text"
                                    value={settings.webhookUrl}
                                    onChange={(e) => setSettings((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    disabled={settingsLoading || settingsSaving}
                                />
                            </div>
                        </div>

                        <p className="text-xs text-slate-500">
                            La URL embebida muestra tu calendario en esta pestaña. La URL webhook se usa para enviar nuevas citas al Google Calendar y tambien para leer eventos existentes desde Google hacia la app.
                        </p>

                        {settingsMessage && (
                            <p className="text-sm text-slate-700">{settingsMessage}</p>
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

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[540px]">
                        {settings.embedUrl ? (
                            <iframe
                                src={settings.embedUrl}
                                title="Google Calendar Merrash"
                                className="w-full h-[620px]"
                                loading="lazy"
                            />
                        ) : (
                            <div className="h-[540px] flex items-center justify-center p-6 text-center text-slate-500">
                                Aún no hay URL embebida configurada. Guarda la URL de Google Calendar para visualizar las citas aquí.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
