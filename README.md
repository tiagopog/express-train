# Express Train 🚂

> This is the express transport of your backend code from dev to production stations.

Express Train is a small, opinionated TypeScript web framework built on top of [Express.js](https://expressjs.com/). It gives you a production-ready project structure so you can skip the bikeshedding and start shipping.

**Inspired by Ruby on Rails and Phoenix** — familiar patterns (MVC, Services, Serializers), none of the ceremony.

## Why Express Train?

Starting a new TypeScript backend from scratch means making dozens of decisions before writing a single line of business logic: folder structure, ORM, validation, request/response format, CI setup, deployment... Express Train makes those decisions for you.

- **Familiar patterns** — MVC + Services + Repositories. No alien concepts, no decorator overload.
- **API-ready out of the box** — JSON:API request/response format, input validation, and error handling included.
- **Interactive REPL** — explore and test your code live without spinning up HTTP requests.
- **One-command setup** — Docker, database, and migrations all bootstrapped in a single `npm run local:init`.
- **CI/CD included** — GitHub Actions workflow and Fly.io deployment config ready to go.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| Web Server | Express.js |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Containers | Docker & Docker Compose |
| Tests | Jest |
| CI/CD | GitHub Actions |
| Deployment | Fly.io |

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
```

Response flows back through the same layers in reverse.

### Layer Responsibilities

| Layer | Role |
|---|---|
| **Router** | Maps HTTP verbs + paths to controller actions |
| **Controller** | Thin — deserialize input, call a service, serialize output |
| **Serializer** | Converts between JSON:API payloads and internal DTOs |
| **Service** | Owns business logic |
| **Entity** | DTO with field-level validation (`class-validator`) |
| **Repository** | The only layer that talks to Prisma directly |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker](https://www.docker.com/) & Docker Compose

---

## Installation

### Quick Start (recommended)

```sh
git clone https://github.com/tiagopog/express-train.git
mv express-train my-app
cd my-app
npm run local:init
```

`local:init` builds the Docker images, creates the database, and runs all migrations in one shot. When Prisma asks whether to apply migrations, accept it.

> If the database container fails to start on the first attempt, re-run `npm run local:init` — it's safe to run multiple times.

### Manual Setup

```sh
# Build images
cd local/
docker-compose build

# Open a shell in the backend container
docker-compose run --rm --service-ports backend sh

# Or use the npm shorthand from the project root
npm run docker:shell
```

---

## Development

### Starting the Server

```sh
# Inside the container
npm run server

# From the host (starts container + server)
npm run docker:server
```

### REPL

Explore and test your code interactively without making HTTP requests:

```sh
# Inside the container
npm run repl

# From the host
npm run docker:repl
```

Example session:

```
====== TS interactive shell ======
Loaded: /home/node/app/src/common/encryption.ts
...
Loaded: /home/node/app/src/web/serializers/user_serializer.ts

> await UserService.get('0d9060a6-5a27-4129-8c03-4d96bfbea61c')
{
  id: 1,
  uuid: '0d9060a6-5a27-4129-8c03-4d96bfbea61c',
  name: 'Manoel da Silva',
  email: 'manoel.silva@gmail.com',
  isConfirmed: false,
  isDeleted: false,
  createdAt: 2026-02-24T20:30:06.358Z,
  updatedAt: 2026-02-24T20:46:58.334Z
}
```

The REPL also hot-reloads: edit a source file and it's automatically picked up without restarting.

### Running Tests

Tests use Jest. Files must end in `.test.ts` and live under `src/tests/`.

```sh
# From the host (runs inside Docker)
npm run docker:test

# Inside the container
npm test

# With coverage
NODE_OPTIONS=--experimental-vm-modules npx jest --coverage -c 'src/tests/jest.config.js'
```

---

## Database

### Migrations

All migration commands are run from inside the backend container (`npm run docker:shell`).

```sh
# Create and apply a migration
npx prisma migrate dev --name my_migration_name

# Generate the file only (inspect/edit before applying)
npx prisma migrate dev --name my_migration_name --create-only

# Apply a previously created migration
npx prisma migrate dev
```

Migration files live in `src/models/migrations/` as plain SQL wrapped in a `BEGIN / COMMIT` transaction.

### Seeds

```sh
npm run db:seed
```

### Connecting to a Remote Database (Fly.io)

```sh
# Interactive psql session
fly postgres connect --app express-train-staging --database ts_backend_database_staging

# Or open a local tunnel and connect with any DB client on localhost:5432
fly proxy 5432:5432 -a express-train-staging
```

---

## Adding a New Resource

1. Define the model in `src/models/schema.prisma`
2. Run `npx prisma migrate dev --name <name>` inside the container
3. Run `npx prisma generate` to regenerate the client
4. Create `src/models/<model>/<model>_entity.ts` — DTO + validation
5. Create `src/models/<model>/<model>_repository.ts` — Prisma wrapper
6. Re-export both from `src/models/index.ts`
7. Add a service in `src/services/<model>_service.ts`
8. Add a controller in `src/web/controllers/<model>_controller.ts`
9. Register routes in `src/web/routes/`

---

## Deployment

### Automatic (CI/CD)

Pushes to `main` trigger the GitHub Actions workflow, which runs tests and deploys to Fly.io.

### Manual

```sh
fly deploy --app express-train-staging
```

### Troubleshooting a Failed Deploy

Build and run the production image locally to reproduce the issue:

```sh
# Build the production image
docker build -t express-train:staging -f Dockerfile .

# Run it locally, pointed at the local dev database
docker run --rm -it \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5438/express_train_dev" \
  -p 3001:3000 \
  express-train:staging
```

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b my-feature`)
3. Commit your changes
4. Open a pull request against `main`
