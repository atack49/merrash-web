# Merrash Web - Documentación Técnica

## Arquitectura del Sistema

### Capa de Datos
- **Base de datos**: PostgreSQL con Prisma ORM
- **Modelos principales**:
  - `Appointment`: Citas médicas con validaciones de capacidad
  - `Course`: Cursos con estado activo/inactivo
  - `CourseAssignment`: Asignaciones estudiante-curso
  - `Service`: Servicios médicos
  - `Survey`: Encuestas de satisfacción
  - `Testimonial`: Testimonios de pacientes

### Capa de API
- **Framework**: Next.js API Routes
- **Autenticación**: NextAuth.js con middleware de admin
- **Validación**: Zod schemas para type safety
- **Rate limiting**: Implementado en rutas críticas

### Capa de Presentación
- **UI Framework**: React con TypeScript
- **Styling**: Tailwind CSS con diseño system
- **Componentes**: Radix UI primitives
- **Icons**: Lucide React

## Reglas de Negocio

### Sistema de Citas
```typescript
// Capacidad por hora
MAX_APPOINTMENTS_PER_HOUR_TOTAL = 5
MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE = 2

// Horarios de atención
BUSINESS_HOURS = {
  monday-friday: "08:00-18:00",
  saturday: "09:00-16:00",
  sunday: "closed"
}
```

### Validaciones de Cursos
- **Email**: Regex validation `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- **Campos obligatorios**: título, nombre estudiante, email estudiante
- **Relaciones**: Un curso puede tener múltiples estudiantes
- **Cascade delete**: Eliminar curso elimina asignaciones

## APIs Principales

### Gestión de Cursos

#### GET /api/admin/courses
```typescript
Response: Course[]
interface Course {
  id: string;
  title: string;
  description?: string;
  active: boolean;
  assignments: CourseAssignment[];
}
```

#### POST /api/admin/courses
```typescript
Request: {
  title: string;        // required
  description?: string;
}

Response: Course
```

#### PATCH /api/admin/courses/[id]
```typescript
Request: {
  active: boolean;      // required
}

Response: Course
```

#### DELETE /api/admin/courses/[id]
```typescript
Response: { success: true }
```

### Gestión de Asignaciones

#### GET /api/admin/course-assignments
```typescript
Query params: {
  courseId?: string;    // optional filter
}

Response: CourseAssignment[]
```

#### POST /api/admin/course-assignments
```typescript
Request: {
  courseId: string;     // required
  studentName: string;  // required
  studentEmail: string; // required, validated
}

Response: CourseAssignment
```

#### DELETE /api/admin/course-assignments/[id]
```typescript
Response: { success: true }
```

## Componentes Clave

### CoursesManager
**Ubicación**: `src/components/admin/CoursesManager.tsx`

**Funcionalidades**:
- Crear cursos con título y descripción
- Listar cursos con estado y contador de estudiantes
- Activar/desactivar cursos
- Eliminar cursos con confirmación
- Asignar estudiantes con validación de email
- Ver tabla de estudiantes por curso
- Eliminar asignaciones con confirmación

**Estados**:
```typescript
interface State {
  courses: Course[];
  loading: boolean;
  error: string | null;
  message: string | null;
  actionLoading: string | null; // 'create-course' | 'create-assignment'
  courseForm: { title: string; description: string };
  assignmentForm: { studentName: string; studentEmail: string };
  activeCourseId: string | null;
}
```

### AppointmentsCalendar
**Ubicación**: `src/components/admin/AppointmentsCalendar.tsx`

**Funcionalidades**:
- Vista de calendario mensual
- Gestión de citas (crear, editar, eliminar)
- Filtros por estado y servicio
- Sincronización con Google Calendar
- Validación de capacidad en tiempo real

## Utilidades

### Capacity Management
**Ubicación**: `src/lib/appointments/capacity.ts`

```typescript
export async function getSlotCapacity(input: SlotCapacityInput): Promise<SlotCapacity> {
  // Verifica capacidad para fecha/hora específicos
  // Retorna: totalCount, serviceCount, totalFull, serviceFull
}
```

### Business Schedule
**Ubicación**: `src/lib/chatbot/businessSchedule.ts`

```typescript
export function isBusinessHour(date: Date): boolean {
  // Valida si la fecha está dentro de horarios de negocio
}

export function getNextBusinessHour(from: Date): Date {
  // Encuentra siguiente hora de negocio disponible
}
```

## Configuración

### Variables de Entorno
```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/merrash

# Autenticación
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# OpenAI (opcional)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# WhatsApp (opcional)
WHATSAPP_CHATBOT_NUMBER=521234567890
```

### Google Calendar (Opcional)
1. Crear proyecto en Google Cloud Console
2. Habilitar Google Calendar API
3. Crear credenciales OAuth 2.0
4. Configurar URLs en admin panel

## Testing

### Estrategia de Testing
- **Unit tests**: Funciones utilitarias y validaciones
- **Integration tests**: APIs y base de datos
- **E2E tests**: Flujos completos de usuario

### Comandos
```bash
# Tests unitarios
npm test

# Tests con coverage
npm run test:coverage

# Tests E2E
npm run test:e2e
```

## Despliegue

### Producción
```bash
# Build
npm run build

# Start
npm start
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoreo y Logs

### Logging
- **Errores**: Console.error con contexto
- **Auditoría**: Logs de cambios administrativos
- **Performance**: Métricas de respuesta de APIs

### Alertas
- Errores de base de datos
- Fallos de sincronización con Google Calendar
- Uso excesivo de APIs

## Seguridad

### Autenticación
- NextAuth.js con JWT
- Middleware de protección de rutas admin
- Rate limiting en APIs públicas

### Validación
- Zod schemas en todas las APIs
- Sanitización de inputs
- Validación de emails y formatos

### CORS
- Configurado para dominios específicos
- Headers de seguridad apropiados

## Mantenimiento

### Tareas Periódicas
- Limpieza de logs antiguos
- Backup de base de datos
- Actualización de dependencias

### Actualizaciones
- Revisar changelog de Next.js
- Actualizar Prisma schema cuando sea necesario
- Testing exhaustivo antes de deploy

## Troubleshooting

### Problemas Comunes

#### Error de conexión a BD
```bash
# Verificar conexión
npx prisma db push --preview-feature

# Resetear DB
npx prisma migrate reset
```

#### Build falla
```bash
# Limpiar cache
rm -rf .next
npm run build
```

#### Chatbot no responde
- Verificar configuración de OpenAI
- Revisar logs del servidor
- Verificar reglas de negocio

### Logs Útiles
```bash
# Ver logs de Next.js
npm run dev 2>&1 | tee logs/dev.log

# Ver logs de base de datos
tail -f /var/log/postgresql/postgresql.log
```

## Contribución

### Estándares de Código
- ESLint y Prettier configurados
- TypeScript strict mode
- Commits convencionales

### Pull Requests
1. Crear branch desde `main`
2. Implementar funcionalidad con tests
3. Asegurar build exitoso
4. Crear PR con descripción detallada

### Code Review
- Revisar type safety
- Validar reglas de negocio
- Verificar performance
- Comprobar seguridad