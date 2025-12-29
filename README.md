## Voting Backend (NestJS + Prisma)

Backend para gestión de elecciones, RBAC y votación anónima. Incluye auth con DNI+password, sesión única, roles/permisos, procesos electorales, categorías, y emisión de voto anónima.

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
- `ADMIN_DNI` y `ADMIN_PASSWORD` para el usuario seed admin
- `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_LOCATION_CODE` (opcionales para el admin)
- `CORS_ORIGINS` (lista separada por comas, ej. `http://localhost:8100,http://localhost:3000`)
- `AUDITOR_DNI`, `AUDITOR_PASSWORD`, `VOTER1_DNI`, `VOTER1_PASSWORD`, `VOTER2_DNI`, `VOTER2_PASSWORD` (opcionales para usuarios demo)

2) Instala dependencias:
```
npm install
```

3) Genera cliente y aplica migraciones:
```
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4) (Opcional) Ejecuta seeds de roles/permisos y admin:
```
npm run prisma:seed
```

El seed también importa ubigeo si existen los CSV en la raíz del backend:
- `ubigeo_peru_2016_departamentos.csv`
- `ubigeo_peru_2016_provincias.csv`
- `ubigeo_peru_2016_distritos.csv`

### Ejecutar
```
npm run start:dev
```
Swagger disponible en `http://localhost:3000/docs`. Health check en `/health`.

### Módulos y endpoints principales
- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` (JWT + Session.tokenHash).
- RBAC: roles/permisos y asignaciones bajo `/rbac/*` con guard de permisos.
- Elections:
  - Procesos: `GET/POST /elections/processes`
  - Categorías: `GET/POST /elections/categories`
  - Elecciones: `GET/POST/PATCH /elections`, `POST /elections/:id/open`, `POST /elections/:id/close`
  - Listas y candidatos: `GET /elections/:id/lists`, `POST /elections/:id/lists`, `POST /elections/lists/:listId/candidates`
- Organizations: `GET/POST/PATCH/DELETE /organizations`
- Voting: `GET /voting/elections/:id/ballot`, `POST /voting/elections/:id/vote` (requiere `voting.cast`).
- Reports: `GET /reports/elections/:id/results`, `GET /reports/processes/:id/results` (requiere `reports.read`).
- Geo: `GET /geo/regions`, `GET /geo/regions/:id/provinces`, `GET /geo/provinces/:id/districts`.

### Scripts útiles
- `start:dev`: servidor en watch mode.
- `prisma:generate`: genera cliente Prisma.
- `prisma:migrate`: aplica migraciones (dev).
- `prisma:seed`: crea roles/permisos base y usuario ADMIN.

### Notas
- Referendums se crean como `BINARY` y generan opciones SI/NO automáticamente.
- Ubigeos se almacenan en la tabla `Location` con jerarquía departamento/provincia/distrito.
- Logos/multimedia se guardan como URL en `PoliticalOrganization.logoUrl`.
