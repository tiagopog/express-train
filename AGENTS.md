# Express Train

This file documents context, architecture and overall instructions for AI code agents.

---

## Project Structure

```
express-train/
├── src/
│   ├── common/          # Shared utilities, types, and encryption helpers
│   ├── config/          # DB client (Prisma) and environment config
│   ├── models/          # Prisma schema, migrations, generated client, entities, repositories
│   ├── services/        # Business logic layer
│   ├── web/             # HTTP layer: routes, controllers, serializers, contracts, middlewares
│   └── tests/           # Jest test suites + setup files
├── local/               # Docker Compose, Dockerfile, seeds, init scripts
├── prisma.config.ts     # Prisma CLI configuration (schema path, migrations path, seed command)
├── tsconfig.json
└── package.json
```

---

## Architecture

### Request / Response Flow

```
Request (JSON:API)
  └─► Router          src/web/routes/
        └─► Controller    src/web/controllers/
              │  deserializes body via Serializer + Contract
              └─► Service      src/services/
                    │  validates + shapes data via Entity
                    └─► Repository   src/models/<model>/
                          │  calls Prisma client
                          └─► PostgreSQL

Response flows back through the same layers in reverse.
```

### Layer Responsibilities

- **Controllers** are thin: deserialize input, call a service, serialize output.
- **Serializers** transform data from one format to another — typically JSON:API payloads to DTOs/Entities (deserialization) and vice-versa (serialization).
- **Contracts** define the allowed shape of incoming request data. Used by the serializer's `deserialize` step.
- **Services** own business logic; they use the entity for validation and the repository for persistence.
- **Model Entities** are DTOs with validation — not ActiveRecord-style objects.
- **Model Repositories** are the only layer that touches `prisma` directly.

### Request / Response Flow (detailed)

- **Request**: JSON:API → router → controller → serializer (deserialize + contract validation) → service → entity (`prepareForPersistence`) → repository → Prisma → PostgreSQL
- **Response**: PostgreSQL → Prisma → repository → service → controller → serializer (`serialize`) → JSON:API

---

## Web Layer (`src/web/`)

### Controllers (`src/web/controllers/`)

Static-method classes. Every action is decorated with `@action`, which wraps the handler in a try/catch and forwards errors to Express's `next()` middleware automatically.

```typescript
export class UserController {
  @action
  static async create(req: Request, res: Response): Promise<Response | void> {
    const userAttrs = UserSerializer.deserialize(req.body, UserSignUpContract, UserEntity)
    const user = await UserService.create(userAttrs)
    return res.send(UserSerializer.serialize(user))
  }
}
```

### Serializers (`src/web/serializers/`)

Extend `BaseSerializer`. Define four static properties: `id`, `type`, `attributes`, and `entity`. The base class handles all serialization/deserialization logic using `ts-jsonapi` and `class-transformer`.

```typescript
export class UserSerializer extends BaseSerializer {
  static readonly id = 'uuid'           // JSON:API resource id field
  static readonly type = 'users'        // JSON:API resource type
  static readonly attributes = ['name', 'email']
  static readonly entity = UserEntity
  static readonly defaultContract = UserSignUpContract
}
```

Key methods inherited from `BaseSerializer`:
- `serialize(data)` — converts a model/entity to a JSON:API response object
- `deserialize(data, contract?, entity?)` — parses a JSON:API request body, validates against the contract, returns a typed entity instance
- `sanitize(attrs)` — strips any attributes not listed in `this.attributes`

### Contracts (`src/web/contracts/`)

Plain classes with `class-validator` + `class-transformer` decorators that define the valid shape of request input. Used exclusively during deserialization.

```typescript
export class UserSignUpContract {
  @Expose() @IsString() @IsNotEmpty() name: string
  @Expose() @IsEmail()  @IsNotEmpty() email: string
}
```

### Routes (`src/web/routes/`)

Static-class routers. Path constants are co-located with the route registrations.

```typescript
export class UserRoutes {
  static readonly apiV1 = '/api/v1'
  static readonly createUser = `${this.apiV1}/users`
  static readonly showUser   = `${this.apiV1}/users/:id`
}

UserRoutes.router.get(UserRoutes.showUser, UserController.show as Application)
UserRoutes.router.post(UserRoutes.createUser, UserController.create as Application)
```

### `@action` Decorator (`src/web/common/decorators.ts`)

Wraps any controller method so that unhandled errors are automatically forwarded to Express `next()`. All controller actions must use this decorator.

---

## Services (`src/services/`)

Static-method classes that sit between controllers and repositories. They call `Entity.prepareForPersistence()` for validation and delegate persistence to the repository.

```typescript
export class UserService {
  static async create(attrs: Partial<UserEntity>): Promise<UserEntity> {
    const validData = UserEntity.prepareForPersistence(attrs)
    return UserRepository.save(validData)
  }

  static async get(uuid: string): Promise<UserEntity | null> {
    return UserRepository.getByUuid(uuid)
  }
}
```

Services import the `prisma` singleton directly via `import { prisma } from 'config'` (bare specifier resolved via `baseUrl: ./src` in `tsconfig.json`).

---

## Architecture - Model Layer

### ORM: Prisma 7

The project uses **Prisma 7** with the new driver-adapter pattern (no legacy binary engine).

- **Package:** `prisma` (dev) + `@prisma/client` + `@prisma/adapter-pg` + `pg`
- **Database:** PostgreSQL 16 (via Docker, mapped to host port `5438`)
- **Connection:** configured via `DATABASE_URL` env var; adapter is constructed in `src/config/db.ts`

### File Locations

```
src/models/
├── schema.prisma                   # Prisma schema — source of truth for DB structure
├── migrations/                     # Migration files managed by Prisma CLI
│   ├── migration_lock.toml
│   └── 20250113135956_init/
│       └── migration.sql
├── generated/
│   └── prisma/                     # Auto-generated by `npx prisma generate` — DO NOT EDIT
│       ├── client.ts               # Main entry point: exports PrismaClient and model types
│       ├── models.ts
│       ├── enums.ts
│       ├── commonInputTypes.ts
│       ├── browser.ts              # Browser-safe export (no Node.js APIs)
│       ├── models/
│       │   └── User.ts
│       └── internal/               # Internal Prisma runtime classes
├── index.ts                        # Re-exports all entities and repositories
└── user/
    ├── user_entity.ts              # DTO + validation (class-validator decorators)
    └── user_repository.ts          # DB access methods via Prisma
```

### Schema Configuration (`prisma.config.ts`, project root)

```typescript
export default defineConfig({
  schema: './src/models/schema.prisma',
  migrations: { path: './src/models/migrations', seed: 'npx tsx ./local/seeds.ts' },
  datasource: { url: env('DATABASE_URL') },
})
```

Relative paths in `prisma.config.ts` resolve from the project root.

### Generator (`schema.prisma`)

```prisma
generator client {
  provider = "prisma-client"        // Prisma 7 provider name (was "prisma-client-js" in v6)
  output   = "./generated/prisma"   // Relative to schema file location
}
```

The generated client lives at `src/models/generated/prisma/client.ts`. Import it as:
```typescript
import { PrismaClient, User } from '../models/generated/prisma/client'
```

### DB Client (`src/config/db.ts`)

```typescript
import { PrismaPg } from '@prisma/adapter-pg'

export const buildClient = (log?) => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter, log })
}

export const prisma = buildClient()   // singleton — import this everywhere
```

`src/config/index.ts` re-exports everything from `db.ts`, so consumers import from `'../../config'` (or bare `'config'` when inside `src/`, thanks to `baseUrl`).

### Common CLI Commands (run inside the container)

```sh
npx prisma migrate dev          # create + apply a new migration (interactive)
npx prisma migrate deploy       # apply pending migrations (CI/production, non-interactive)
npx prisma generate             # regenerate the client after schema changes
npx prisma db seed              # run seeds via prisma.config.ts → migrations.seed
npm run db:seed                 # same, via npm script (npx tsx local/seeds.ts)
```

> After any change to `schema.prisma`, always run `npx prisma generate` before running the app or tests.

### Migrations

- Migration files are plain SQL, stored in `src/models/migrations/<timestamp>_<name>/migration.sql`.
- Each migration wraps its SQL in a `BEGIN / COMMIT` transaction.
- The `migration_lock.toml` records the provider and must be committed to version control.
- Notable DB conventions: `citext` extension for case-insensitive email; `gen_random_uuid()` for UUIDs; snake_case column names mapped to camelCase TypeScript fields via `@map`.
- Use snake_case descriptive names for migration files e.g. `add_column_foo_to_payments`.
- When a new migration is required, also create a counterpart revert migration file (`revert.sql`) in the same directory.
- Before creating any migration, first change the Prisma schema, then run the migration command to generate the SQL.
- If the migration operation is not expressible in Prisma schema syntax (e.g. partial indexes), use `--create-only` and write the SQL manually.
- For high-cardinality tables always prefer safe migration patterns (e.g. adding columns as nullable before backfilling).
- When new tables or columns are added, ask the engineer whether to update the seed file (`local/seeds.ts`).

---

## Model Layer Internals

### Entity (`user_entity.ts`)

Entities are plain TypeScript classes decorated with `class-validator` decorators. They serve as **DTOs** (data transfer objects) between the web layer and the persistence layer — they are not Prisma models.

Key responsibilities:
- Field-level validation (`@IsEmail`, `@IsNotEmpty`, etc.)
- `static validate(attrs)` — runs synchronous validation
- `static prepareForPersistence(attrs)` — strips read-only fields (`id`, `createdAt`), merges clean attributes, sets `updatedAt`, and returns a `User` (Prisma type) ready for insert/update

### Repository (`user_repository.ts`)

Repositories are static-method classes that wrap Prisma calls. They receive the Prisma model type (`User`) and return it.

```typescript
UserRepository.save(data: User): Promise<User>
UserRepository.getByUuid(uuid: string): Promise<User | null>
```

They import the shared `prisma` singleton from `src/config`.

### Models Barrel (`src/models/index.ts`)

```typescript
export * from './user/user_entity'
export * from './user/user_repository'
```

Consumers import from `'../../models'` to get both entity and repository.

---

## Seeds (`local/seeds.ts`)

Seeds use `buildClient` directly (not the singleton) with `error`-only logging, and call `prisma.user.upsert` keyed on `email`. Run them with:

```sh
npm run db:seed          # or: npx prisma db seed
```

---

## TypeScript & ESM Configuration

This project is **full ESM** (`"type": "module"` in `package.json`). Key points for agents:

- **Runtime scripts** must use `tsx`, not `ts-node`. `ts-node` does not work with `"type": "module"` + `moduleResolution: "bundler"`.
- **`moduleResolution: "bundler"`** in `tsconfig.json` is a TypeScript-only setting for build tools. It is not a Node.js runtime resolver. Do not rely on it for runtime module resolution.
- **`baseUrl: "./src"`** in `tsconfig.json` enables bare specifier imports like `import { prisma } from 'config'` within the `src/` tree.
- **`__dirname` / `__filename` / `require`** are not available in ESM scope. Use these polyfills when needed:

```typescript
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
```

---

## Testing

### Configuration

- **Framework:** Jest 29 with ts-jest
- **Config file:** `src/tests/jest.config.js`
- **Preset:** `ts-jest/presets/default-esm` (required because the project is ESM)
- **ESM flag:** Jest must be invoked with `NODE_OPTIONS=--experimental-vm-modules`

### Running Tests

```sh
# Via npm script (includes the NODE_OPTIONS flag automatically)
npm test

# With coverage
NODE_OPTIONS=--experimental-vm-modules npx jest --coverage -c 'src/tests/jest.config.js'

# From the host via Docker
npm run docker:test
```

### Test File Conventions

- Test files live under `src/tests/` and must end in `.test.ts`.
- Mirror the source structure: e.g. tests for `src/web/controllers/user_controller.ts` go in `src/tests/web/controllers/user_controller.test.ts`.

### Setup Files

| File | Purpose |
|---|---|
| `src/tests/jest.envs.ts` | Loads `.env.test` via `dotenv` before any test runs (`setupFiles`) |
| `src/tests/jest.setup.ts` | Runs `prisma.user.deleteMany()` in `afterAll` to clean test DB (`setupFilesAfterEnv`) |

### ESM Gotcha in Setup Files

Setup files also run in ESM scope, so `__dirname` is not available. Use:
```typescript
const __dirname = path.dirname(fileURLToPath(import.meta.url))
```

---

## CI / CD

- **Workflow file:** `.github/workflows/fly-deploy.yml`
- **Trigger:** push to any branch
- **Jobs:**
  1. `test` — spins up a PostgreSQL 16 service container, installs deps, runs migrations, then runs Jest with `NODE_OPTIONS=--experimental-vm-modules`
  2. `deploy` (commented out) — deploys to Fly.io on pushes to `main` using `flyctl`
- **Environment variables set in CI:** `NODE_ENV=test`, `DATABASE_URL` pointing to the service container

---

## Docker

### Getting the Backend Container ID

The container ID changes every time the container is recreated. Always resolve it dynamically:

```sh
docker ps | awk '/express-train-backend/ {print $1}'
```

Use this ID for any `docker exec` commands, e.g.:

```sh
docker exec <container_id> sh -c "cd /home/node/app && npx prisma migrate dev"
```

### Services

- **backend** — Node.js 20, working dir `/home/node/app`, port `3000`
- **postgres** — PostgreSQL 16, host port `5438`, internal port `5432`

### Useful npm Scripts

```sh
npm run docker:shell    # open a shell in the backend container
npm run docker:server   # start the HTTP server inside Docker
npm run docker:test     # run the test suite inside Docker
npm run docker:repl     # open the interactive REPL inside Docker
```

---

## Adding a New Resource — Checklist

### Model layer
1. Add the model to `src/models/schema.prisma`
2. Run `npx prisma migrate dev --name <migration_name>` inside the container
3. Run `npx prisma generate` to regenerate the client
4. Create `src/models/<model>/<model>_entity.ts` — DTO with `class-validator` decorators
5. Create `src/models/<model>/<model>_repository.ts` — static Prisma wrapper
6. Re-export both from `src/models/index.ts`

### Service layer
7. Create `src/services/<model>_service.ts` — static business logic class
8. Re-export from `src/services/index.ts`

### Web layer
9. Create `src/web/contracts/<model>_contracts.ts` — request shape contract(s)
10. Create `src/web/serializers/<model>_serializer.ts` — extends `BaseSerializer`
11. Create `src/web/controllers/<model>_controller.ts` — static actions with `@action`
12. Create `src/web/routes/<model>_routes.ts` — register routes on the Express router
13. Mount the new router in `src/web/routes/index.ts`

### Tests
14. Create `src/tests/web/controllers/<model>_controller.test.ts`
