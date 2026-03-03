export const CHATBOT_OPEN_EVENT = 'merrash:open-chatbot';

export const openChatbotWidget = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CHATBOT_OPEN_EVENT));
};
