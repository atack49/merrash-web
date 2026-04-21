export interface GoogleCalendarWebhookPayload {
    action?: 'create' | 'update' | 'delete' | 'list';
    calendarId?: string;
    eventId?: string;
    name?: string;
    email?: string;
    phone?: string;
    service?: string;
    preferredDate?: string;
    preferredTime?: string;
    notes?: string;
    source?: 'chatbot-web' | 'google-sync';
    timeMin?: string;
    timeMax?: string;
    includeDeleted?: boolean;
}

export const sendAppointmentToGoogleCalendar = async (
    webhookUrl: string,
    payload: GoogleCalendarWebhookPayload
) => {
    if (!webhookUrl) {
        return { sent: false, reason: 'missing_webhook' };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        let data: any = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        return {
            sent: response.ok,
            status: response.status,
            eventId: data?.eventId,
            data,
        };
    } catch {
        return { sent: false, reason: 'request_failed' };
    }
};
