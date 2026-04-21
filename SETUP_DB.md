#  Configuración de Base de Datos

## Requisitos Previos

- **PostgreSQL 14+** instalado y ejecutándose
- **Node.js 18+**
- Variables de entorno configuradas (`.env.local`)

## Paso 1: Instalar PostgreSQL

### Windows
1. Descargar desde https://www.postgresql.org/download/windows/
2. Instalar con las opciones por defecto
3. Anotar la contraseña del usuario `postgres`
4. Asegurarse de que el servicio esté corriendo

### macOS (con Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Linux (Debian/Ubuntu)
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Paso 2: Crear Base de Datos

```bash
# Conectarse a PostgreSQL como superuser
psql -U postgres

# Crear la base de datos
CREATE DATABASE merrash_db;

# Crear usuario (opcional pero recomendado)
CREATE USER merrash_user WITH PASSWORD 'merrash_password';
ALTER ROLE merrash_user SET client_encoding TO 'utf8';
ALTER ROLE merrash_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE merrash_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE merrash_db TO merrash_user;

# Salir
\q
```

## Paso 3: Configurar `.env.local`

Editar el archivo `.env.local` con los datos de conexión:

```env
# Database
DATABASE_URL="postgresql://merrash_user:merrash_password@localhost:5432/merrash_db?schema=public"

# NextAuth
NEXTAUTH_SECRET="tu-secret-aqui-cambiar-en-produccion"
NEXTAUTH_URL="http://localhost:3000"
```

**O si usas el usuario `postgres`:**

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD_AQUI@localhost:5432/merrash_db?schema=public"
```

## Paso 4: Ejecutar Migrations y Seed

```bash
# Opción 1: Ejecutar ambos en un comando
npm run setup

# Opción 2: Ejecutarlos por separado
npm run prisma:migrate
npm run prisma:seed
```

## Paso 5: Verificar

La consola mostrará:
```
 Admin user created: admin@merrash.com
 Satisfaction survey created: [id]
 "How did you hear about us?" survey created: [id]
 Satisfaction survey questions created
 "How did you hear about us?" questions created
 Seed completed successfully!
```

## Paso 6: Iniciar Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador.

## Credenciales de Admin Iniciales

- **Email**: `admin@merrash.com`
- **Contraseña**: `merrash2024`

 **IMPORTANTE**: Cambiar la contraseña después del primer login en producción.

## Troubleshooting

### Error: "Can't reach database server"
- Verificar que PostgreSQL está corriendo
- Verificar `DATABASE_URL` en `.env.local`
- En Windows: Revisar que el servicio `postgresql-x64-16` están corriendo

### Error: "password authentication failed"
- Verificar la contraseña en `DATABASE_URL`
- Resetear contraseña en PostgreSQL:
  ```bash
  psql -U postgres
  ALTER USER merrash_user WITH PASSWORD 'nueva_password';
  ```

### Error: "database does not exist"
- Verificar que la BD fue creada: `CREATE DATABASE merrash_db;`

### Error: "relation does not exist"
- Ejecutar migrations: `npm run prisma:migrate`

## Comandos Útiles de Prisma

```bash
# Ver UI de Prisma
npx prisma studio

# Generar migraciones después de cambios
npm run prisma:migrate dev -- --name nombre_de_cambios

# Resetear BD (PELIGRO: borra todos los datos)
npx prisma migrate reset

# Ejecutar seed de nuevo
npm run prisma:seed
```

---

 Una vez completado, tu BD estará lista para desarrollo y testing.
