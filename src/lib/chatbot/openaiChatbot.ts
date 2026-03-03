import { ChatHistoryItem } from '@/lib/chatbot/merrashChatbot';

type OpenAIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

export interface OpenAIChatbotInput {
    message: string;
    history?: ChatHistoryItem[];
    services?: string[];
    serviceCatalog?: Array<{ title: string; category?: string | null; description?: string | null }>;
    contactAddress?: string;
    contactHoursWeekdays?: string;
    contactHoursSaturday?: string;
}

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';
const DEFAULT_HUGGINGFACE_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const DEFAULT_SELF_HOSTED_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const DEFAULT_PUBLIC_MODEL = 'openai';
const DEFAULT_PUBLIC_REVIEW_MODEL = 'openai-large';
const DEFAULT_PUBLIC_FINAL_MODEL = 'openai';

const buildSystemPrompt = (input: OpenAIChatbotInput) => {
    const services = (input.services && input.services.length > 0)
        ? input.services.join(', ')
        : 'Acupuntura, Homeopatía, Rehabilitación, Tratamientos Faciales, Tratamientos Corporales, Masajes, Reiki, Healy';

    const weekdays = input.contactHoursWeekdays || '10:00 AM - 4:00 PM';
    const saturday = input.contactHoursSaturday || '10:00 AM - 4:00 PM';
    const address = input.contactAddress || 'Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx.';
    const serviceCatalog = (input.serviceCatalog || [])
        .map((item) => {
            const category = item.category ? ` [${item.category}]` : '';
            const description = item.description ? ` - ${item.description}` : '';
            return `- ${item.title}${category}${description}`;
        })
        .join('\n');

    return [
        'Eres el asistente virtual de Merrash (spa y medicina alternativa en Metepec).',
        'Responde SIEMPRE en español, tono humano, cálido y natural, breve (máximo 4-7 líneas).',
        'Habla como una persona real en chat, no como bot rígido.',
        'Mantén continuidad con el contexto de la conversación.',
        'SOLO puedes responder temas de Merrash: servicios, horarios, ubicación, citas y seguimiento para agendar.',
        'Si preguntan algo fuera de Merrash, responde de forma amable que solo atiendes temas de Merrash y redirige a servicios/citas.',
        'Interpreta lenguaje informal, abreviaciones, errores ortográficos y frases incompletas del usuario.',
        'Si falta un dato para agendar, pide solo el dato faltante (no repitas toda la lista).',
        'Interpreta sinónimos de agendar: agenda, cita, reservar, apartar, programar, turno, sesión, "hazme una agenda", "me anotas".',
        'Si el usuario manda varios datos mezclados en un solo mensaje, extráelos y continúa con lo que falte.',
        'No inventes precios ni promociones si no se proporcionan explícitamente.',
        'Cuando te pidan recomendación, sugiere 1-2 servicios concretos y explica brevemente por qué.',
        'Si es útil, organiza recomendación por Cuerpo, Mente y/o Espíritu según la intención del cliente.',
        'Si el usuario está indeciso, haz una pregunta corta para afinar recomendación.',
        `Servicios disponibles: ${services}.`,
        serviceCatalog ? `Catálogo detallado:\n${serviceCatalog}` : '',
        `Horario: Lunes a Viernes ${weekdays}; Sábado ${saturday}; Domingo cerrado.`,
        `Ubicación: ${address}.`,
        'Si el usuario quiere agendar, pide: nombre, servicio, día y hora preferida.',
        'Nunca confirmes una cita en domingo ni fuera de horario.',
        'Si el usuario pide domingo o fuera de horario, explica que está cerrado y propone una alternativa válida.',
    ].join(' ');
};

export const generateOpenAIChatbotReply = async (input: OpenAIChatbotInput): Promise<string | null> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return null;
    }

    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

    return generateOpenAICompatibleReply(input, {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        apiKey,
        model,
    });
};

export const generateHuggingFaceChatbotReply = async (input: OpenAIChatbotInput): Promise<string | null> => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
        return null;
    }

    const model = process.env.HUGGINGFACE_MODEL || DEFAULT_HUGGINGFACE_MODEL;

    return generateOpenAICompatibleReply(input, {
        endpoint: 'https://router.huggingface.co/v1/chat/completions',
        apiKey,
        model,
    });
};

export const generateOpenRouterChatbotReply = async (input: OpenAIChatbotInput): Promise<string | null> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return null;
    }

    const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
    const referer = process.env.OPENROUTER_REFERER || process.env.NEXTAUTH_URL;
    const title = process.env.OPENROUTER_TITLE || 'Merrash Chatbot';

    return generateOpenAICompatibleReply(input, {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey,
        model,
        extraHeaders: {
            ...(referer ? { 'HTTP-Referer': referer } : {}),
            ...(title ? { 'X-Title': title } : {}),
        },
    });
};

export const generateSelfHostedChatbotReply = async (input: OpenAIChatbotInput): Promise<string | null> => {
    const baseUrl = (process.env.SELF_HOSTED_AI_BASE_URL || '').trim();
    if (!baseUrl) {
        return null;
    }

    const apiKey = (process.env.SELF_HOSTED_AI_API_KEY || '').trim();
    const model = process.env.SELF_HOSTED_AI_MODEL || DEFAULT_SELF_HOSTED_MODEL;
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    return generateOpenAICompatibleReply(input, {
        endpoint,
        apiKey: apiKey || 'no-key',
        model,
    });
};

export const generatePublicHostedChatbotReply = async (input: OpenAIChatbotInput): Promise<string | null> => {
    const model = process.env.PUBLIC_AI_MODEL || DEFAULT_PUBLIC_MODEL;

    return generateOpenAICompatibleReply(input, {
        endpoint: 'https://text.pollinations.ai/openai',
        apiKey: '',
        model,
    });
};

export const generateTeamReviewedChatbotReply = async (input: OpenAIChatbotInput): Promise<string | null> => {
    const draftModel = process.env.PUBLIC_AI_MODEL || DEFAULT_PUBLIC_MODEL;
    const reviewModel = process.env.PUBLIC_AI_REVIEW_MODEL || DEFAULT_PUBLIC_REVIEW_MODEL;
    const finalModel = process.env.PUBLIC_AI_FINAL_MODEL || DEFAULT_PUBLIC_FINAL_MODEL;

    const draftMessages = buildBaseMessages(input);
    const draft = await generateOpenAICompatibleMessagesReply(draftMessages, {
        endpoint: 'https://text.pollinations.ai/openai',
        model: draftModel,
    });

    if (!draft) {
        return null;
    }

    const reviewPrompt = [
        'Analiza la siguiente respuesta del asistente de Merrash y detecta errores.',
        'Debes validar: solo temas de Merrash, no inventar precios/promociones, horario válido, domingo cerrado, claridad y tono humano.',
        'Si no hay errores, responde exactamente: OK.',
        'Si hay errores, responde en viñetas cortas con correcciones concretas.',
        `Mensaje del cliente: ${input.message}`,
        `Respuesta propuesta: ${draft}`,
    ].join('\n');

    const reviewMessages: OpenAIMessage[] = [
        {
            role: 'system',
            content: 'Eres un auditor experto de calidad para un chatbot de agenda médica/estética. Responde en español.',
        },
        { role: 'user', content: reviewPrompt },
    ];

    const review = await generateOpenAICompatibleMessagesReply(reviewMessages, {
        endpoint: 'https://text.pollinations.ai/openai',
        model: reviewModel,
    });

    if (!review || review.trim().toUpperCase() === 'OK') {
        return draft;
    }

    const finalPrompt = [
        'Toma la respuesta inicial y las observaciones del auditor y entrega una versión final mejorada.',
        'Requisitos: español, tono natural, máximo 4-7 líneas, precisa, sin inventar datos.',
        `Mensaje del cliente: ${input.message}`,
        `Borrador inicial: ${draft}`,
        `Observaciones del auditor: ${review}`,
        'Entrega únicamente la respuesta final al cliente.',
    ].join('\n');

    const finalMessages: OpenAIMessage[] = [
        {
            role: 'system',
            content: 'Eres editor final de respuestas para atención al cliente de Merrash. Corrige errores y mejora precisión.',
        },
        { role: 'user', content: finalPrompt },
    ];

    const final = await generateOpenAICompatibleMessagesReply(finalMessages, {
        endpoint: 'https://text.pollinations.ai/openai',
        model: finalModel,
    });

    return final || draft;
};

type ProviderConfig = {
    endpoint: string;
    apiKey?: string;
    model: string;
    extraHeaders?: Record<string, string>;
};

const generateOpenAICompatibleReply = async (
    input: OpenAIChatbotInput,
    config: ProviderConfig
): Promise<string | null> => {
    const messages = buildBaseMessages(input);
    return generateOpenAICompatibleMessagesReply(messages, config);
};

const buildBaseMessages = (input: OpenAIChatbotInput): OpenAIMessage[] => {
    return [
        { role: 'system', content: buildSystemPrompt(input) },
        ...(input.history || []).slice(-10).map((item) => {
            const role: OpenAIMessage['role'] = item.role === 'bot' ? 'assistant' : 'user';
            return {
                role,
                content: item.text,
            };
        }),
        { role: 'user', content: input.message },
    ];
};

const generateOpenAICompatibleMessagesReply = async (
    messages: OpenAIMessage[],
    config: ProviderConfig
): Promise<string | null> => {
    const { endpoint, apiKey, model, extraHeaders } = config;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                ...(extraHeaders || {}),
            },
            body: JSON.stringify({
                model,
                temperature: 0.45,
                max_tokens: 320,
                messages,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;

        if (typeof text !== 'string' || text.trim().length === 0) {
            return null;
        }

        return text.trim();
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
};
