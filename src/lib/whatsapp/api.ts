import { Message } from '@/components/chatbot/ChatbotWidget';

export const WHATSAPP_API_VERSION = 'v20.0';

/**
 * Convierte el formato Markdown clásico de la IA (**negritas**, listas, etc.)
 * al formato básico que soporta WhatsApp (*negritas*, _cursivas_, _tachado_).
 */
export const formatMessageForWhatsApp = (text: string): string => {
    // Convertir negritas (**texto** -> *texto*)
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
    
    // Las listas con asteriscos o guiones no necesitan mucha conversión,
    // pero aseguramos de que haya espacios limpios
    formatted = formatted.replace(/^\s*[-*]\s+/gm, '- ');

    return formatted;
};

/**
 * Envía un mensaje de texto a través de WhatsApp Cloud API
 */
export const sendWhatsAppMessage = async (to: string, text: string) => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
        console.error('Faltan credenciales de WhatsApp en el entorno');
        return false;
    }

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: {
                    preview_url: false,
                    body: formatMessageForWhatsApp(text)
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Error enviando mensaje de WhatsApp:', JSON.stringify(error, null, 2));
            return false;
        }

        return true;
    } catch (error) {
        console.error('Fallo la conexión con WhatsApp API:', error);
        return false;
    }
};

/**
 * Estructuras de tipos para el Webhook de WhatsApp
 */
export type WhatsAppWebhookBody = {
    object: string;
    entry?: Array<{
        id: string;
        changes?: Array<{
            value: {
                messaging_product: string;
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: {
                        name: string;
                    };
                    wa_id: string;
                }>;
                messages?: Array<{
                    from: string;
                    id: string;
                    timestamp: string;
                    text?: {
                        body: string;
                    };
                    type: string;
                }>;
            };
            field: string;
        }>;
    }>;
};
