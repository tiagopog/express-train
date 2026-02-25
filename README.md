# Express Train

This is the express transport of your backend code from dev to production stations.

- Express Train is another small and but very opinionated TS web framework running on top of [Express(https://expressjs.com/);
- It aims to bring a fast way to start and deploy TypeScript backend applications without needing to waste time with a lot of initial bikeshedding (deciding the tech stack, configuring dependencies, request/response paylaod structures, CI/CD etc);
- The framework utilizes a well-known set of design patterns (MVC, Services, Serializers etc) to better organize code without requiring engineers to study new alian concepts, structures and use tons of decorators;
- It is inspired by Ruby on Rails (Ruby) and Phoenix (Elixir), although being much more lightweight and opinionated in several aspects.

Express Train mainly focuses on:

1. Making it easy to add new resources to your API;
2. Being able to interact with code via dynamic REPL;
3. Write automated tests with little to no configuration;
5. CI/CD ready to run with GitHub Actions;
4. Ready to deploy to Fly.io.

## Tech Stack

| What | Tech |
| -------- | ------- |
| Codebase Structure | MVC + Services |
| Language | TypeScript |
| Runtime | Node.js     |
| Web Server | Express.js     |
| Build & Dependencies | NPM |
| Containers | Docker & Docker Compose |
| Database | Postgres |
| ORM | Prisma |
| Tests | Jest |
| CI/CD | GitHub Actions |
| Deployment | Fly.io |

## Architecture

### Overview

```
Request
  └─► Router (src/web/routes/)
        └─► Controller (src/web/controllers/)
              │  deserializes request body via Serializer + Contract
              └─► Service (src/services/)
                    │  calls Entity.prepareForPersistence() for validation/shaping
                    └─► Repository (src/models/<model>/
                          │  calls prisma.<model>.create / findUnique / etc.
                          └─► Prisma Client → PostgreSQL
```

- **Controllers** are thin: deserialize input, call a service, serialize output.
- **Services** own business logic; they use the entity for validation and the repository for persistence.
- **Serializers** transforms data from one format to another. Typically from JSON objects to DTO/Entity (deserialization) and vice-versa (serialization).
- **Model Entities** are DTOs with validation — not ActiveRecord-style objects.
- **Model Repositories** are the only layer that touches `prisma` directly.

### Models - Adding a New Model

1. Add the model to `src/models/schema.prisma`
2. Run `npx prisma migrate dev --name <migration_name>` inside the container
3. Run `npx prisma generate` to regenerate the client
4. Create `src/models/<model>/<model>_entity.ts` (DTO + validation)
5. Create `src/models/<model>/<model>_repository.ts` (Prisma wrapper)
6. Re-export both from `src/models/index.ts`

### Request/Reponse Flow

- **Request**: request (JSON:API) → router → controller → serializer → service → entity → repository → ORM (Prisma)
- **Response**: ORM (Prisma) → repository → entity → service → controller → serializer → response (JSON:API)

# Installation

## Single-Step Installation

Clone the project to your development folder:

```sh
git clone https://github.com/tiagopog/express-train.git
```

Rename the project to the name of your app:

```sh
mv express-train my-app
```

In the root of the project you should be able to run this single command and
have it all set up (Docker images, environment and database) and be ready to start
developing.

```sh
cd my-app

npm run local:init
```

If it attempts to start the database container but fails after several attempts, just re-run the command it should work. Now when Prisma asks for applying migrations, just accept it.

## Alternative Steps for Installation

Go to the local directory and build the docker images:

```sh
$ cd local/
$ docker-compose build
```

Run the docker containers:

```sh
$ docker-compose run --rm --service-ports backend sh
```

Or using a NPM script:

```sh
npm run docker:shell
```

# Development

## Playing with your code

### REPL

You can play around with your code while developing features by using the project's REPL via NPM scripts.

Inside the Docker container you can run:

```sh
npm run repl
```

Or from your local shell (host) you can directly run:

```sh
npm run docker:repl
```

Example of usage:

```sh
// inside the backend container you can just run:
> npm run repl

> ====== TS interactive shell ======
Loaded: /home/node/app/src/common/encryption.ts
...
Loaded: /home/node/app/src/web/serializers/user_serializer.ts

> await UserService.get('0d9060a6-5a27-4129-8c03-4d96bfbea61c');
prisma:query SELECT "public"."users"."id", "public"."users"."uuid", "public"."users"."name", "public"."users"."email", "public"."users"."password_hash", "public"."users"."is_confirmed", "public"."users"."is_deleted", "public"."users"."last_sign_in_at", "public"."users"."created_at", "public"."users"."updated_at" FROM "public"."users" WHERE ("public"."users"."uuid" = $1 AND 1=1) LIMIT $2 OFFSET $3

{
  id: 1,
  uuid: '0d9060a6-5a27-4129-8c03-4d96bfbea61c',
  name: 'Manoel da Silva',
  email: 'manoel.silva@gmail.com',
  passwordHash: null,
  isConfirmed: false,
  isDeleted: false,
  lastSignInAt: null,
  createdAt: 2026-02-24T20:30:06.358Z,
  updatedAt: 2026-02-24T20:46:58.334Z
}
```

### Web Server

To locally test the web API you can run the server inside a container with:

```sh
npm run server
```

Or directly run it from your local shell:

```sh
npm run docker:server
```

## Tests

This project uses the `jest` framework for test suites.

After creating your test file and ending its name with `.test.ts`,
you can run it with a Docker container by simply calling:

```sh
npm run docker:test src/tests/web/controllers/your_test_file.test.ts
```

Alternatively, if you're not using Docker for local development, you can run:

```sh
npm test src/tests/web/controllers/your_test_file.test.ts
```

## Creating New Migrations

Access the container for the backend applications:

```sh
npm run docker:shell
```

Then after making changes to the data schema (`src/models/schema.prisma`)
run the Prisma (ORM) command for generating the migration for the changes:

```sh
npx prisma migrate dev --name my_migration_name
```

Prisma will then geranate the migration file with the SQL commands and will
execute it right away.

If you just want to generate the migration file so you can check/edit it before
actually running the migration, you can pass the `--create-only` to the
`migrate` command.

```sh
npx prisma migrate dev --name my_migration_name --create-only
```

And then after editing it you can execute the migration by running:

```sh
npx prisma migrate dev
```

# Deployment

## Manual Deployment

Backend applications are deployed to Fly.io. In order to manually deploy a new revision of the backend
application, one just needs to run:

```sh
 fly deploy --app express-train-staging
```

After the command is done, the backend will be deployed to staging environment.

## Troubleshooting Deployments

If an image fails to deploy you can the logs in Fly.io then test it locally. First build the
deployment image in you local:

```sh
docker build -t express-train:staging -f Dockerfile .
```

You can also run it locally (mimicing what Fly.io does) by running:


# Testing Deployments - Web API

Show user details:

```sh
curl https://express-train-staging.fly.dev/api/v1/users/ee251031-aa94-46a2-b80c-aab671b48063
```

```sh
docker run --rm -it -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5438/express_train_dev?schema=public" -p 3001:3000 express-train:staging
```

# Database

## Connect to Remote Database

Connect to the database hosted in Fly.io via command line:

```sh
fly postgres connect --app express-train-staging --database ts_backend_database_staging
```

Or open a SSH tunnel to Fly's internal network:

```sh
fly proxy 5432:5432 -a express-train-staging
```

Then you can use any database client of your choice and connect to the external
database via `localhost:5432`.
