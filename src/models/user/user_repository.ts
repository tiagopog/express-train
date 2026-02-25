import { User } from '../generated/prisma/client'
import { prisma } from '../../config'

export class UserRepository {
  static async save(data: User): Promise<User> {
    return await prisma.user.create({ data })
  }

  static async getByUuid(uuid: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { uuid } })
  }
}
