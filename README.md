This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Chatbot IA (OpenAI opcional)

El chatbot funciona siempre con IA local (reglas internas). Si configuras OpenAI, usará OpenAI automáticamente y si falla volverá al modo local.

Variables opcionales en `.env.local`:

```env
OPENAI_API_KEY=tu_api_key
OPENAI_MODEL=gpt-4o-mini
CHATBOT_MODE=auto
WHATSAPP_CHATBOT_NUMBER=521234567890
```

Sin `OPENAI_API_KEY`, el chatbot sigue funcionando con la IA local actual.

`CHATBOT_MODE` puede ser:
- `auto`: usa OpenAI si hay API key, si no IA local
- `local`: fuerza IA local
- `openai`: intenta OpenAI y si falla, vuelve a IA local

También puedes cambiar el modo desde Admin > Configuración Chat Bot.
Ese ajuste se guarda en `data/chatbot-settings.json` (archivo local), sin usar base de datos.
