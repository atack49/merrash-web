type ChatIntent = 'AGENDAR' | 'HABLAR' | 'CONFIRMAR';
type ChatRole = 'user' | 'bot';

export type ChatbotLocalReply = {
    intent: ChatIntent;
    reply: string;
    isOffTopic: boolean;
};

export type ChatHistoryItem = {
    role: ChatRole;
    text: string;
};

type ChatbotServiceItem = {
    title: string;
    category?: string | null;
    description?: string | null;
};

type BuildChatbotOptions = {
    services?: string[];
    serviceCatalog?: ChatbotServiceItem[];
};

const BUSINESS_NAME = 'Merrash';

const SERVICES = [
    'Acupuntura',
    'Homeopatía',
    'Rehabilitación',
    'Auriculoterapia',
    'Par Biomagnético',
    'Terapia Neural',
    'Sueroterapia Intravenosa',
    'Tratamientos Faciales',
    'Tratamientos Corporales',
    'Masajes',
    'Tarot Terapéutico',
    'Reiki',
    'Healy',
    'Toque Cuántico',
    'Arborología',
    'Método Integral',
];

const SERVICES_BY_CATEGORY = {
    cuerpo: [
        'Acupuntura',
        'Homeopatía',
        'Rehabilitación',
        'Auriculoterapia',
        'Par Biomagnético',
        'Terapia Neural',
        'Sueroterapia Intravenosa',
        'Tratamientos Faciales',
        'Tratamientos Corporales',
        'Masajes',
    ],
    mente: ['Reiki', 'Healy', 'Toque Cuántico', 'Método Integral'],
    espiritu: ['Tarot Terapéutico', 'Arborología', 'Reiki'],
};

const SCHEDULE_HINT = 'Lunes a Viernes de 8:00 AM a 6:00 PM, Sábado de 9:00 AM a 4:00 PM y Domingo cerrado. Para citas: hasta 1 hora antes del cierre.';

const MERRASH_TOPIC_KEYWORDS = [
    'merrash',
    'servicio',
    'tratamiento',
    'acupuntura',
    'homeopatia',
    'rehabilitacion',
    'auriculoterapia',
    'biomagnetico',
    'terapia neural',
    'sueroterapia',
    'facial',
    'corporal',
    'masaje',
    'tarot',
    'reiki',
    'healy',
    'toque cuantico',
    'arborologia',
    'metodo integral',
    'agenda',
    'agendar',
    'cita',
    'reservar',
    'horario',
    'disponibilidad',
    'precio',
    'costo',
    'ubicacion',
    'direccion',
    'metepec',
    'contacto',
    'telefono',
    'whatsapp',
    'confirmar',
    'confirmo',
    'confirmacion',
    'confirmación',
    'dolor',
    'estres',
    'ansiedad',
    'insomnio',
    'bienestar',
    'salud',
];

const isMerrashTopic = (message: string) => {
    const text = normalize(message);
    return MERRASH_TOPIC_KEYWORDS.some((keyword) => text.includes(keyword));
};

const isAckMessage = (message: string) => {
    const text = normalize(message);
    return /^(si|sí|ok|vale|va|perfecto|gracias|grac|dale|entendido|me interesa|claro)$/.test(text);
};

const isGreetingMessage = (message: string) => {
    const text = normalize(message).trim();
    return /^(hola|holi|buenas|buen dia|buenos dias|buenas tardes|buenas noches|que tal|que onda)$/.test(text);
};

const buildOffTopicResponse = () => {
    return `Estoy para ayudarte con todo lo de ${BUSINESS_NAME}: servicios, horarios, ubicación y citas  Cuéntame qué necesitas y lo vemos juntos.`;
};

const normalize = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const getResolvedServices = (options?: BuildChatbotOptions) => {
    const raw = options?.services || [];
    return raw.length > 0 ? raw : SERVICES;
};

const groupServicesByCategory = (options?: BuildChatbotOptions) => {
    const catalog = options?.serviceCatalog || [];
    if (catalog.length === 0) {
        return SERVICES_BY_CATEGORY;
    }

    const grouped: Record<string, string[]> = {
        cuerpo: [],
        mente: [],
        espiritu: [],
    };

    for (const item of catalog) {
        const title = item.title?.trim();
        if (!title) continue;
        const normalizedCategory = normalize(item.category || '');
        if (normalizedCategory.includes('mente')) {
            grouped.mente.push(title);
        } else if (normalizedCategory.includes('espirit')) {
            grouped.espiritu.push(title);
        } else {
            grouped.cuerpo.push(title);
        }
    }

    if (grouped.cuerpo.length + grouped.mente.length + grouped.espiritu.length === 0) {
        return SERVICES_BY_CATEGORY;
    }

    return grouped;
};

export const detectIntent = (message: string): ChatIntent => {
    const text = normalize(message);

    if (/(confirmo|confirmar|si,? confirmo|de acuerdo|agendar ya|reservar ya|ya quedo|ya quedo|si procede|ok confirmo)/.test(text)) {
        return 'CONFIRMAR';
    }

    if (/(horario|disponibilidad|disponible).*(hoy|manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo|\d{1,2}|am|pm)/.test(text)) {
        return 'AGENDAR';
    }

    if (/(horario|abren|hora de atencion|ubicacion|direccion|que servicios|tratamientos|precio|costo|recomiend|informacion)/.test(text)) {
        return 'HABLAR';
    }

    if (
        /(agendar|agenda|cita|reservar|horario|disponible|disponibilidad|cuando|apartar|programar|turno|sesion|hazme una agenda|agendame|me anotas|me apuntas|quiero una cita|quiero agendarme)/.test(
            text
        )
    ) {
        return 'AGENDAR';
    }

    return 'HABLAR';
};

const getContextText = (message: string, history: ChatHistoryItem[] = []) => {
    const recentUserMessages = history
        .filter((item) => item.role === 'user')
        .slice(-8)
        .map((item) => item.text)
        .join(' ');

    const recentBotMessages = history
        .filter((item) => item.role === 'bot')
        .slice(-3)
        .map((item) => item.text)
        .join(' ');

    return normalize(`${recentUserMessages} ${recentBotMessages} ${message}`.trim());
};

const isRecommendationIntent = (contextText: string) => {
    return /(recom|recomi|suger|aconsej|mas adecuado|me conviene|que conviene|cual seria mejor|cual seria lo mejor)/.test(
        contextText
    );
};

const getRecommendation = (contextText: string, options?: BuildChatbotOptions) => {
    const resolvedServices = getResolvedServices(options).map((service) => normalize(service));
    const pickExisting = (preferred: string[], fallback: string) => {
        for (const item of preferred) {
            const found = resolvedServices.find((service) => service.includes(normalize(item)));
            if (found) {
                const original = (options?.services || SERVICES).find((s) => normalize(s) === found || normalize(s).includes(found));
                if (original) return original;
            }
        }
        return fallback;
    };

    if (/(rostro|piel|facial|acne|acné|manchas|rejuvenec|arrugas)/.test(contextText)) {
        const service = pickExisting(['tratamientos faciales', 'facial'], 'Tratamientos Faciales');
        return `Para mejorar la salud del rostro te recomiendo iniciar con ${service}  Ayuda con limpieza profunda, textura y luminosidad de la piel.`;
    }

    if (/(estres|estrés|ansiedad|insomnio|duermo mal|tension|tensión)/.test(contextText)) {
        const first = pickExisting(['reiki', 'masajes'], 'Reiki');
        const second = pickExisting(['masajes', 'acupuntura'], 'Masajes');
        return `Para estrés o ansiedad te recomiendo comenzar con ${first} o ${second}  Si hay tensión física fuerte, Acupuntura también suele funcionar muy bien.`;
    }

    if (/(dolor|espalda|cuello|muscular|contractura|inflamacion|inflamación)/.test(contextText)) {
        const first = pickExisting(['acupuntura', 'rehabilitacion'], 'Acupuntura');
        const second = pickExisting(['rehabilitacion', 'terapia neural'], 'Rehabilitación');
        return `Para dolor físico te recomiendo ${first} o ${second}  Son opciones muy efectivas para aliviar dolor y recuperar movilidad.`;
    }

    if (/(cansancio|fatiga|energia|energía|debilidad)/.test(contextText)) {
        const service = pickExisting(['sueroterapia intravenosa', 'sueroterapia'], 'Sueroterapia Intravenosa');
        return `Para cansancio o baja energía, ${service} suele ser una excelente opción `;
    }

    if (/(emocional|espiritual|claridad|bloqueo)/.test(contextText)) {
        const first = pickExisting(['reiki', 'toque cuantico'], 'Reiki');
        const second = pickExisting(['toque cuantico', 'healy'], 'Toque Cuántico');
        return `Si buscas equilibrio emocional/espiritual, puedes iniciar con ${first} o ${second} `;
    }

    return '';
};

const buildTalkResponse = (message: string, history: ChatHistoryItem[] = [], options?: BuildChatbotOptions) => {
    const text = normalize(message);
    const contextText = getContextText(message, history);
    const groupedServices = groupServicesByCategory(options);

    if (isRecommendationIntent(contextText)) {
        const recommendation = getRecommendation(contextText, options);
        if (recommendation) {
            return `${recommendation}\n\nSi te parece bien, te la agendo ahora mismo `;
        }
        return '¡Claro! Te recomiendo según tu objetivo  Cuéntame qué quieres mejorar (dolor, estrés, piel del rostro, energía, etc.) y te digo cuál servicio te conviene.';
    }

    if (/(hola|holi|buenas|buen dia|buenos dias|buenas tardes|buenas noches|que tal|que onda)/.test(text)) {
        return `¡Hola!  Qué gusto leerte. Soy el asistente de ${BUSINESS_NAME}. ¿Quieres recomendación de servicio o te ayudo a agendar de una vez?`;
    }

    if (/(servicio|tratamiento|que hacen|que ofrecen)/.test(text)) {
        return [
            `En ${BUSINESS_NAME} trabajamos por áreas:`,
            '',
            ' Cuerpo:',
            ...groupedServices.cuerpo.map((s) => `- ${s}`),
            '',
            ' Mente:',
            ...groupedServices.mente.map((s) => `- ${s}`),
            '',
            ' Espíritu:',
            ...groupedServices.espiritu.map((s) => `- ${s}`),
            '',
            'Si me dices tu objetivo (por ejemplo estrés, dolor o energía), te recomiendo el más adecuado ',
        ].join('\n');
    }

    if (/(precio|costo|cuanto cuesta|tarifa)/.test(text)) {
        return 'Con gusto te orientamos en costos según el tratamiento  Dime cuál servicio te interesa y te doy una guía clara.';
    }

    if (/(horario|abren|atienden|hora)/.test(text)) {
        return [
            'Nuestros horarios son:',
            '',
            '- Lunes a Viernes: 8:00 AM - 6:00 PM',
            '- Sábado: 9:00 AM - 4:00 PM',
            '- Domingo: Cerrado',
            '',
            'Para agendar, solo puedo reservar hasta 1 hora antes del cierre (L-V hasta 5:00 PM, sábado hasta 3:00 PM).',
            'Si quieres, también te ayudo a agendar aquí mismo.',
        ].join('\n');
    }

    if (/(ubicacion|direccion|donde estan|donde se ubican)/.test(text)) {
        return 'Estamos en Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx. \n\n¿Quieres que te comparta también horario y cómo agendar?';
    }

    if (
        /(quiero agendar|me gustaria agendar|me gustaría agendar|quiero cita|quiero una cita|hazme una agenda|agendame|me anotas|me apuntas|quiero apartar|sacame cita|sacarme cita)/.test(
            contextText
        )
    ) {
        return '¡Perfecto! Para agendar, compárteme: nombre, email, teléfono, servicio, fecha y hora ';
    }

    return 'Perfecto  Estoy contigo para resolverlo. Si me dices tu objetivo (estrés, dolor, piel, etc.), te recomiendo algo puntual o te ayudo a agendar.';
};

const buildScheduleResponse = (message: string) => {
    const text = normalize(message);

    if (/domingo/.test(text)) {
        return 'El domingo estamos cerrados  Te puedo agendar de lunes a viernes entre 08:00 y 17:00, o sábado entre 09:00 y 15:00.';
    }

    if (/\b(18|19|20|21|22|23|24):\d{2}\b/.test(text) || /\b(6|7|8|9|10|11)\s*(pm)\b/.test(text)) {
        return 'Ese horario está fuera de agenda. Te puedo agendar de lunes a viernes 08:00-17:00 y sábado 09:00-15:00 (domingo cerrado).';
    }

    if (/(hoy|manana|mañana|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado)/.test(text)) {
        return 'Perfecto  Para agendar te pido: nombre, email, teléfono, servicio, día y hora preferida. Con eso te la registro de una vez.';
    }

    return `Con gusto te ayudo a agendar  Envíame nombre, email, teléfono, servicio, fecha y hora (puede ser en un solo mensaje).\n\nHorario: ${SCHEDULE_HINT}`;
};

const buildConfirmResponse = () => {
    return '¡Excelente!  Ya casi queda tu cita. Envíanos por WhatsApp: nombre completo, servicio y horario solicitado para confirmar de inmediato.';
};

export const buildChatbotReply = (message: string, history: ChatHistoryItem[] = [], options?: BuildChatbotOptions) => {
    const contextText = getContextText(message, history);
    const hasTopicInContext = isMerrashTopic(contextText);

    if (isGreetingMessage(message)) {
        return {
            intent: 'HABLAR' as const,
            reply: `¡Hola!  Soy el asistente de ${BUSINESS_NAME}. ¿Quieres que te recomiende un servicio o prefieres agendar?`,
            isOffTopic: false,
        };
    }

    if (!hasTopicInContext && !isAckMessage(message)) {
        return {
            intent: 'HABLAR' as const,
            reply: buildOffTopicResponse(),
            isOffTopic: true,
        };
    }

    const intent = detectIntent(message);

    if (intent === 'CONFIRMAR') {
        return {
            intent,
            reply: buildConfirmResponse(),
            isOffTopic: false,
        };
    }

    if (intent === 'AGENDAR') {
        return {
            intent,
            reply: buildScheduleResponse(message),
            isOffTopic: false,
        };
    }

    return {
        intent,
        reply: buildTalkResponse(message, history, options),
        isOffTopic: false,
    };
};

export const getWhatsappUrl = (rawPhone: string, message: string) => {
    const phone = rawPhone.replace(/\D/g, '');
    const text = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${text}`;
};
