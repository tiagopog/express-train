import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: './src/models/schema.prisma',
  migrations: {
    path: './src/models/migrations',
    seed: 'npx tsx ./local/seeds.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
