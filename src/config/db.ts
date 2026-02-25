import { Prisma, PrismaClient } from '../models/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Stage } from './environment/enum'

export enum DBError {
  UNIQUENESS = 'P2002',
}

const getLogLevel = (): Prisma.LogDefinition[] => {
  switch (process.env.STAGE) {
    case Stage.TEST:
      return [{ level: 'error', emit: 'event' }]

    case Stage.PRODUCTION:
    case Stage.STAGING:
    case Stage.SANDBOX:
      return [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ]

    default:
      return [
        { level: 'query', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ]
  }
}

/**
 * error in testing: FATAL: sorry, too many clients already
 * https://github.com/prisma/prisma/issues/1983#issuecomment-930200155
 */
export const buildClient = (log?: Prisma.LogDefinition[]): PrismaClient => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })

  log ||= getLogLevel()

  return new PrismaClient({ adapter, log })
}

export const prisma = buildClient()
