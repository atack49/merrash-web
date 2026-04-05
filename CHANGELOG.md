# Changelog - Merrash Web

## [Unreleased]

### Added
- **Sistema de Cursos**: Gestión completa de cursos y estudiantes
  - Crear, editar, activar/desactivar y eliminar cursos
  - Asignar estudiantes con validación de email
  - Interfaz administrativa intuitiva
  - APIs RESTful para gestión de cursos
- **Validaciones robustas**: Email regex, campos obligatorios, confirmaciones
- **UI mejorada**: Iconos, estados de carga, diseño responsive
- **Documentación completa**: README y documentación técnica
- **Build optimizado**: Verificación automática de builds exitosos

### Removed
- **Reagendar citas pasadas**: Removido por problemas de distribución
  - Eliminada API `/api/admin/appointments/reschedule-past`
  - Removido botón del calendario administrativo
  - Código limpio y refactorizado

### Fixed
- **Capacidad de citas**: Reglas de 5/hour total, 2/hour por servicio
- **Validaciones**: Mejor manejo de errores y mensajes de usuario
- **Performance**: Optimización de queries y estados de carga

### Technical
- **TypeScript**: Mejor type safety en componentes
- **Prisma**: Modelos Course y CourseAssignment
- **Next.js 16**: Actualización y optimizaciones
- **Tailwind CSS**: Sistema de diseño consistente

## [1.0.0] - 2024-04-XX

### Added
- **Sistema de citas médicas**: Capacidades por hora, chatbot inteligente
- **Panel administrativo**: Dashboard completo con calendario
- **Chatbot IA**: Modo híbrido local + OpenAI opcional
- **Google Calendar**: Sincronización opcional
- **Sistema de encuestas**: Creación y análisis de métricas
- **Gestión de testimonios**: Moderación y publicación
- **Autenticación**: NextAuth.js con roles
- **Base de datos**: PostgreSQL con Prisma ORM

### Technical
- **Next.js 16**: App Router, Turbopack
- **TypeScript**: Configuración completa
- **Tailwind CSS**: Diseño system
- **Prisma**: ORM con migraciones
- **Vercel**: Despliegue optimizado

---

## Formato de Versiones
Este proyecto sigue [Semantic Versioning](https://semver.org/):

- **MAJOR**: Cambios incompatibles
- **MINOR**: Nuevas funcionalidades compatibles
- **PATCH**: Corrección de bugs

## Tipos de Cambios
- **Added**: Nuevas funcionalidades
- **Changed**: Cambios en funcionalidades existentes
- **Deprecated**: Funcionalidades obsoletas
- **Removed**: Funcionalidades eliminadas
- **Fixed**: Corrección de bugs
- **Security**: Cambios de seguridad

## Próximas Versiones
- [ ] Sincronización bidireccional con Google Calendar
- [ ] Notificaciones por email/SMS
- [ ] API pública para integraciones
- [ ] Análisis avanzado de datos
- [ ] Multi-tenancy para múltiples clínicas
- [ ] App móvil complementaria