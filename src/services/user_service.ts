import { prisma } from 'config'
import { UserEntity, UserRepository } from '../models'

export class UserService {
  static async create(userAttrs: Partial<UserEntity>): Promise<UserEntity> {
    const validData = UserEntity.prepareForPersistence(userAttrs)
    return UserRepository.save(validData)
  }

  static async get(uuid: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { uuid } }) as unknown as UserEntity
    return UserRepository.getByUuid(uuid)
  }
}
