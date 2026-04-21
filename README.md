# Merrash Web - Sistema de Citas y Cursos

Una aplicación web completa para gestión de citas médicas, cursos y administración, construida con Next.js 16, TypeScript, Prisma y PostgreSQL.

##  Características

###  Sistema de Citas
- **Capacidad por hora**: Máximo 5 citas totales por hora, 2 por servicio
- **Horarios de negocio**: Lunes-Viernes 8AM-6PM, Sábados 9AM-4PM, Domingos cerrado
- **Chatbot inteligente**: Reserva automática con validación de reglas
- **Calendario administrativo**: Vista completa con gestión de citas
- **Sincronización opcional**: Integración con Google Calendar

###  Sistema de Cursos
- **Gestión de cursos**: Crear, activar/desactivar y eliminar cursos
- **Asignación de estudiantes**: Matricular estudiantes con validación de email
- **Panel administrativo**: Interfaz intuitiva para gestión completa
- **Validaciones robustas**: Email, campos obligatorios, confirmaciones

###  Chatbot IA
- **Modo híbrido**: IA local + OpenAI opcional
- **Reserva automática**: Procesa solicitudes naturales de citas
- **Validación inteligente**: Respeta reglas de capacidad y horarios
- **WhatsApp opcional**: Integración con mensajería

###  Panel Administrativo
- **Dashboard completo**: Citas, cursos, servicios, encuestas, testimonios
- **Gestión de servicios**: CRUD completo de servicios médicos
- **Análisis de encuestas**: Métricas y resultados detallados
- **Testimonios**: Moderación y publicación
- **Configuración**: Google Calendar, chatbot settings

##  Tecnologías

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de datos**: PostgreSQL
- **Autenticación**: NextAuth.js
- **UI**: Radix UI, Lucide Icons
- **IA**: OpenAI API (opcional) + reglas locales

##  Requisitos

- Node.js 18+
- PostgreSQL
- npm/yarn/pnpm

##  Instalación

1. **Clona el repositorio**
   ```bash
   git clone <repository-url>
   cd merrash-web
   ```

2. **Instala dependencias**
   ```bash
   npm install
   ```

3. **Configura la base de datos**
   ```bash
   # Crea una base de datos PostgreSQL
   createdb merrash_db
   ```

4. **Configura variables de entorno**
   ```bash
   # Crea el archivo de entorno local
   # Windows PowerShell: New-Item -Path .env.local -ItemType File -Force
   # macOS/Linux: touch .env.local
   ```

   Edita `.env.local`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/merrash_db"
   NEXTAUTH_SECRET="tu-secret-aqui"
   NEXTAUTH_URL="http://localhost:3000"

   # Opcional - OpenAI
   OPENAI_API_KEY=tu_api_key
   OPENAI_MODEL=gpt-4o-mini

   # Opcional - WhatsApp
   WHATSAPP_CHATBOT_NUMBER=521234567890
   ```

5. **Ejecuta migraciones**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

6. **Inicia el servidor**
   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000)

##  Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Panel administrativo
│   ├── api/               # API Routes
│   │   ├── admin/         # APIs administrativas
│   │   │   ├── courses/   # Gestión de cursos
│   │   │   ├── appointments/ # Gestión de citas
│   │   │   └── ...
│   │   └── chatbot/       # API del chatbot
│   ├── login/             # Página de login
│   └── ...
├── components/            # Componentes React
│   ├── admin/            # Componentes admin
│   ├── layout/           # Layout components
│   └── sections/         # Secciones de página
├── lib/                  # Utilidades
│   ├── appointments/     # Lógica de citas
│   ├── chatbot/         # Lógica del chatbot
│   ├── calendarSettings.ts # Config Google Calendar
│   └── ...
└── ...
```

##  Uso

### Para Administradores
1. Ve a `/admin` e inicia sesión
2. Gestiona citas en el calendario
3. Administra cursos y estudiantes
4. Configura servicios y chatbot

### Para Pacientes
1. Usa el chatbot para reservar citas
2. Completa encuestas de satisfacción
3. Deja testimonios

##  Configuración Avanzada

### Reglas de Capacidad de Citas
```typescript
// En src/lib/appointments/capacityRules.ts
export const MAX_APPOINTMENTS_PER_HOUR_TOTAL = 5;
export const MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE = 2;
```

### Horarios de Negocio
```typescript
// En src/lib/appointments/reschedule.ts
const BUSINESS_SCHEDULE = {
  0: null, // Domingo
  1: { open: 8 * 60, close: 18 * 60 }, // Lunes
  // ...
  6: { open: 9 * 60, close: 16 * 60 }, // Sábado
};
```

### Google Calendar (Opcional)

Esta integración usa **Apps Script como webhook** (no usa OAuth directo en Next.js).

1. Abre el script base en [scripts/google-calendar-webhook.gs](scripts/google-calendar-webhook.gs)
2. Crea un proyecto en Apps Script y pega ese contenido en Codigo.gs
3. Publica como Aplicacion web:
   - Ejecutar como: tu cuenta
   - Acceso: quien corresponda a tu flujo (normalmente cualquiera con el enlace)
4. Copia la URL de deployment que termina en /exec
5. En la configuración local, guarda:
   - embedUrl: URL publica embebida de tu calendario Google (de Integrar calendario)
   - webhookUrl: URL /exec de Apps Script

Archivo local de configuracion:
- [data/google-calendar-settings.json](data/google-calendar-settings.json)

Acciones que soporta el webhook:
- create
- update
- delete
- list

Flujo de sincronizacion implementado:
- La app envia calendarId al webhook (derivado de embedUrl -> query src) para usar el calendario correcto.
- Sync automatico cada minuto en la vista admin cuando la pestaña esta visible.
- Sync adicional inmediato despues de crear, editar o eliminar citas.
- Si un evento de Google no trae email, la app genera un email tecnico estable para poder importarlo sin perderlo.

##  Testing

```bash
# Ejecutar tests
npm test

# Build de producción
npm run build

# Verificar linting
npm run lint
```

##  API Reference

### Cursos
- `GET /api/admin/courses` - Listar cursos
- `POST /api/admin/courses` - Crear curso
- `PATCH /api/admin/courses/[id]` - Actualizar curso
- `DELETE /api/admin/courses/[id]` - Eliminar curso

### Asignaciones
- `GET /api/admin/course-assignments` - Listar asignaciones
- `POST /api/admin/course-assignments` - Crear asignación
- `DELETE /api/admin/course-assignments/[id]` - Eliminar asignación

### Citas
- `GET /api/admin/appointments` - Listar citas
- `POST /api/admin/appointments` - Crear cita
- `PATCH /api/admin/appointments/[id]` - Actualizar cita
- `DELETE /api/admin/appointments/[id]` - Eliminar cita

##  Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

##  Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

##  Soporte

Para soporte técnico o preguntas:
- Email: soporte@merrash.com
- WhatsApp: Configurable en admin panel

---

Desarrollado con  para la comunidad médica

Sin `OPENAI_API_KEY`, el chatbot sigue funcionando con la IA local actual.

`CHATBOT_MODE` puede ser:
- `auto`: usa OpenAI si hay API key, si no IA local
- `local`: fuerza IA local
- `openai`: intenta OpenAI y si falla, vuelve a IA local

También puedes cambiar el modo desde Admin > Configuración Chat Bot.
Ese ajuste se guarda en `data/chatbot-settings.json` (archivo local), sin usar base de datos.

## Imagenes de Servicios (Cloudinary Gratis)

Para evitar gastar almacenamiento de la base de datos, las imagenes de servicios se suben a Cloudinary y en DB solo se guarda la URL.

Agrega en `.env.local`:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=tu_unsigned_upload_preset
# Opcional recomendado para borrar tambien en Cloudinary desde el backend
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

Comportamiento actual:
- Acepta cualquier tipo de imagen (`image/*`).
- PNG/JPG/WebP se optimizan en el navegador antes de subir (resize + compresion).
- SVG se sube sin rasterizar.
- En DB solo se guarda URL (se bloquea base64 en APIs de admin).
- Si configuras `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`, al borrar/reemplazar imagen en servicios tambien se elimina el asset en Cloudinary.

Nota: Cloudinary plan gratuito tiene limite mensual. Revisa tu panel para ver creditos, almacenamiento y ancho de banda disponibles.
