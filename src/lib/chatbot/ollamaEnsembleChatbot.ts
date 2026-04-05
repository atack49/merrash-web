import { ChatHistoryItem } from '@/lib/chatbot/merrashChatbot';

type OllamaChatbotInput = {
    message: string;
    history?: ChatHistoryItem[];
    services?: string[];
    serviceCatalog?: Array<{ title: string; category?: string | null; description?: string | null }>;
    contactAddress?: string;
    contactHoursWeekdays?: string;
    contactHoursSaturday?: string;
};

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_DRAFT_MODEL = 'qwen2.5:3b';
const DEFAULT_REVIEW_MODEL = 'phi3:mini';

const buildContextPrompt = (input: OllamaChatbotInput) => {
    const services = input.services?.length
        ? input.services.join(', ')
        : 'Acupuntura, Homeopatía, Rehabilitación, Tratamientos Faciales, Tratamientos Corporales, Masajes, Reiki, Healy';

    const catalog = (input.serviceCatalog || [])
        .map((item) => {
            const category = item.category ? ` [${item.category}]` : '';
            const description = item.description ? ` - ${item.description}` : '';
            return `- ${item.title}${category}${description}`;
        })
        .join('\n');

    const weekdays = input.contactHoursWeekdays || '8:00 AM - 6:00 PM';
    const saturday = input.contactHoursSaturday || '9:00 AM - 4:00 PM';
    const address = input.contactAddress || 'Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx.';

    const historyText = (input.history || [])
        .slice(-8)
        .map((item) => `${item.role === 'user' ? 'Cliente' : 'Asistente'}: ${item.text}`)
        .join('\n');

    return [
        'Negocio: Merrash (medicina alternativa y bienestar).',
        'Responder siempre en español natural, cálido y útil.',
        'Enfocarte solo en Merrash: servicios, horarios, ubicación y ayuda para agendar.',
        'Si la pregunta es fuera de Merrash, redirigir amablemente.',
        'No inventar precios ni promociones.',
        `Horario: Lunes a Viernes ${weekdays}; Sábado ${saturday}; Domingo cerrado.`,
        `Ubicación: ${address}.`,
        `Servicios: ${services}.`,
        catalog ? `Catálogo:\n${catalog}` : '',
        historyText ? `Historial reciente:\n${historyText}` : '',
        `Mensaje actual del cliente: ${input.message}`,
    ]
        .filter(Boolean)
        .join('\n\n');
};

const callOllama = async ({ url, model, prompt }: { url: string; model: string; prompt: string }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(`${url}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.45,
                    num_ctx: 3072,
                },
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            return null;
        }

        const data = (await response.json()) as { response?: string };
        const text = String(data?.response || '').trim();
        return text || null;
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
};

export const generateOllamaEnsembleReply = async (input: OllamaChatbotInput): Promise<string | null> => {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL;
    const draftModel = process.env.OLLAMA_DRAFT_MODEL || DEFAULT_DRAFT_MODEL;
    const reviewModel = process.env.OLLAMA_REVIEW_MODEL || DEFAULT_REVIEW_MODEL;

    const baseContext = buildContextPrompt(input);

    const draftPrompt = [
        baseContext,
        'Tarea: responde al cliente de forma clara y práctica en máximo 6 líneas.',
        'Si pide recomendación, sugiere 1-2 servicios y explica por qué en breve.',
        'Si quiere agendar, guía paso a paso con el siguiente dato faltante.',
        'Respuesta final:',
    ].join('\n\n');

    const draft = await callOllama({
        url: ollamaUrl,
        model: draftModel,
        prompt: draftPrompt,
    });

    if (!draft) return null;

    const reviewPrompt = [
        baseContext,
        `Borrador inicial:\n${draft}`,
        'Tarea: mejora el borrador sin hacerlo más largo de 6 líneas.',
        'Verifica que no invente precios, respete horario y mantenga tono cálido.',
        'Devuelve solo la versión final para el cliente.',
    ].join('\n\n');

    const reviewed = await callOllama({
        url: ollamaUrl,
        model: reviewModel,
        prompt: reviewPrompt,
    });

    return reviewed || draft;
};
