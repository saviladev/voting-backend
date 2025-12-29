## Voting Backend (NestJS + Prisma)

Backend para gestión de colegiados con Auth, RBAC, estructura organizacional (Association/Branch/Chapter/Specialty), partidos políticos, padrón por Excel y auditoría. Incluye auth con DNI+password y sesión única.

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
