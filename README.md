## Voting Backend (NestJS + Prisma)

Backend para gestión de colegiados con Auth, RBAC, estructura organizacional (Association/Branch/Chapter/Specialty), partidos políticos, padrón por Excel y auditoría. Incluye auth con DNI+password y sesión única.

> **Note:** For Docker deployment, see the main [README.md](../README.md) in the project root. The `docker-compose.yml` file is located at the project root level.

### Requisitos

- Node 18+
- Postgres accesible vía `DATABASE_URL` en `.env`

### Configuración

1) Copia el ejemplo de variables y ajusta:
```
cp .env.example .env
```
Variables clave:
- `DATABASE_URL=postgresql://user:pass@localhost:5432/voting`
- `JWT_SECRET` y `JWT_EXPIRES_IN` (ej. `15m`)
- `PASSWORD_RESET_EXPIRES_IN` (ej. `1h`)
- `PASSWORD_RESET_URL` (ej. `http://localhost:8100/login/reset`)
- `CORS_ORIGINS` (lista separada por comas, ej. `http://localhost:8100,http://localhost:3000`)
- `ADMIN_DNI`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` (seed admin)
- `ASSOCIATION_NAME`, `BRANCH_NAME`, `SPECIALTY_NAME`, `CHAPTER_NAME` (seed estructura básica)

Opcional para correos de padrón:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

2) Instala dependencias:
```
npm install
```

3) Flujo recomendado (reset + init):
```
npx prisma migrate reset
npm run prisma:generate
npm run prisma:migrate -- --name init
```

Si no deseas resetear:
```
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4) (Opcional) Ejecuta seeds de roles/permisos y admin:
```
npm run prisma:seed
```

El seed crea permisos, roles, estructura base y usuario SystemAdmin.

### Ejecutar
```
npm run start:dev
```
Swagger disponible en `http://localhost:3000/docs`. Health check en `/health`.

### Módulos y endpoints principales
- Auth: `POST /auth/login`, `POST /auth/logout` (JWT + Session.tokenHash).
- Password reset: `POST /auth/forgot-password`, `POST /auth/reset-password`.
- Users: `GET /users/me`, `PATCH /users/me`.
- RBAC: roles, permisos y usuarios bajo `/rbac/*` (incluye asignaciones por DNI).
- Structure: `GET/POST/PATCH/DELETE` para `/associations`, `/branches`, `/specialties`, `/chapters`.
- Political parties: `GET/POST/PATCH/DELETE /parties`.
- Padron (XLSX): `POST /padron/import`.
- Audit: `GET /audit`.

### Scripts útiles
- `start:dev`: servidor en watch mode.
- `prisma:generate`: genera cliente Prisma.
- `prisma:migrate`: aplica migraciones (dev).
- `prisma:seed`: crea permisos, roles, estructura base y usuario SystemAdmin.

### Comandos esenciales (DB)
Si ya existen migraciones (por ejemplo `init`) y solo quieres aplicar el esquema actual:
```
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Solo usa reset cuando quieras borrar datos y reiniciar todo:
```
npx prisma migrate reset
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Solo regenerar cliente:
```
npm run prisma:generate
```

### Padron (Excel)
El padrón acepta archivos `.xlsx` con las columnas:
- `dni` (8 dígitos)
- `firstName`, `lastName`, `email`, `phone`
- `branchName` (Sede), `chapterName` (Capítulo)
- `isPaidUp` (booleano; acepta `true/false`, `1/0`, `si/no`)

Se validan el capítulo/sede. Los usuarios se crean o actualizan y reciben una clave temporal de 12 dígitos por correo (si `SMTP_*` está configurado). Si `isPaidUp=false`, el usuario queda desactivado (`isActive=false`). El mismo import gestiona altas, actualizaciones y desactivaciones.

Ejemplos de archivo (mismo formato, se procesan con `/padron/import`): `padron_import.xlsx` y `padron_status_update.xlsx` en la raíz del backend.

### Notas
- Todas las operaciones `DELETE` son soft-delete (usa `deletedAt`).
- Sesión única: cada login invalida sesiones anteriores.

---

## Docker Deployment (Production)

### Requisitos
- Docker 20.10+
- Docker Compose 2.0+

### Configuración Inicial

1) **Copia el archivo de entorno de producción:**
```bash
cp .env.production .env
```

2) **Edita `.env` con tus valores de producción:**
   - Cambia `POSTGRES_PASSWORD` por una contraseña segura
   - Actualiza `JWT_SECRET` con un secreto seguro
   - Configura `CORS_ORIGINS` con tus dominios permitidos
   - Actualiza `PASSWORD_RESET_URL` con tu URL de frontend
   - Configura SMTP si necesitas envío de correos
   - Personaliza los datos de seed (admin, asociación, etc.)

### Despliegue

1) **Construir e iniciar los servicios:**
```bash
docker-compose up -d --build
```

Esto iniciará:
- `voting-db`: PostgreSQL 15 (Supabase)
- `voting-studio`: Supabase Studio (Database UI)
- `voting-backend`: NestJS API

2) **Verificar que los servicios estén corriendo:**
```bash
docker-compose ps
```

3) **Inicializar la base de datos (primera vez):**

Generar cliente Prisma:
```bash
docker-compose exec app npx prisma generate
```

Ejecutar migraciones:
```bash
docker-compose exec app npx prisma migrate deploy
```

Ejecutar seeds (crear roles, permisos, admin):
```bash
docker-compose exec app npx prisma db seed
```

4) **Verificar la aplicación:**
- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Health Check: `http://localhost:3000/health`
- **Supabase Studio**: `http://localhost:3001` (Database Management UI)

### Comandos Útiles

**Ver logs:**
```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f app

# Solo base de datos
docker-compose logs -f db
```

**Reiniciar servicios:**
```bash
# Todos
docker-compose restart

# Solo backend
docker-compose restart app
```

**Detener servicios:**
```bash
docker-compose down
```

**Detener y eliminar volúmenes (⚠️ elimina datos):**
```bash
docker-compose down -v
```

**Acceder al contenedor:**
```bash
# Backend
docker-compose exec app sh

# Base de datos
docker-compose exec db psql -U postgres -d voting
```

**Ejecutar migraciones en producción:**
```bash
docker-compose exec app npx prisma migrate deploy
```

**Ver estado de la base de datos:**
```bash
docker-compose exec app npx prisma db pull
```

### Actualización de la Aplicación

1) **Detener el backend:**
```bash
docker-compose stop app
```

2) **Reconstruir con nuevos cambios:**
```bash
docker-compose build app
```

3) **Ejecutar migraciones si hay cambios en el schema:**
```bash
docker-compose exec app npx prisma migrate deploy
```

4) **Reiniciar el backend:**
```bash
docker-compose up -d app
```

### Backup de Base de Datos

**Crear backup:**
```bash
docker-compose exec db pg_dump -U postgres voting > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restaurar backup:**
```bash
cat backup_file.sql | docker-compose exec -T db psql -U postgres -d voting
```

### Supabase Studio - Database Management UI

Supabase Studio provides a web-based interface to manage your PostgreSQL database visually.

**Access:** `http://localhost:3001`

**Features:**
- 📊 **Table Editor**: Browse and edit data with a spreadsheet-like interface
- 🔍 **SQL Editor**: Run custom queries with syntax highlighting
- 📈 **Schema Viewer**: Visualize database structure and relationships
- 👥 **User Browser**: View all users in the `User` table
- 📝 **Query History**: Review previously executed queries
- 🔐 **Database Policies**: View RLS policies (if enabled)

**Common Tasks:**

*View all users:*
1. Open Studio at `http://localhost:3001`
2. Navigate to "Table Editor"
3. Select the `User` table
4. Browse, search, and filter users

*Run custom queries:*
1. Go to "SQL Editor"
2. Write your query (e.g., `SELECT * FROM "User" WHERE "isActive" = true`)
3. Click "Run" or press `Ctrl+Enter`

*Check election results:*
```sql
SELECT 
  c."firstName", 
  c."lastName", 
  c."voteCount",
  cl."name" as "listName"
FROM "Candidate" c
JOIN "CandidateList" cl ON c."candidateListId" = cl.id
ORDER BY c."voteCount" DESC;
```

*View audit logs:*
```sql
SELECT 
  a.action,
  a.entity,
  a."createdAt",
  u."firstName" || ' ' || u."lastName" as "userName"
FROM "AuditLog" a
LEFT JOIN "User" u ON a."userId" = u.id
ORDER BY a."createdAt" DESC
LIMIT 50;
```

**Note:** Studio connects directly to the PostgreSQL database, so changes made here will affect your production data. Use with caution!

### Troubleshooting

**El backend no se conecta a la base de datos:**
- Verifica que el servicio `db` esté healthy: `docker-compose ps`
- Revisa logs: `docker-compose logs db`
- Verifica la `DATABASE_URL` en `.env`

**Error de permisos en Prisma:**
- Regenera el cliente: `docker-compose exec app npx prisma generate`

**Puerto ya en uso:**
- Cambia `APP_PORT` en `.env` a otro puerto (ej. 3001)
- O detén el servicio que usa el puerto 3000

**Limpiar todo y empezar de nuevo:**
```bash
docker-compose down -v
docker-compose up -d --build
# Luego ejecuta migraciones y seeds nuevamente
```
