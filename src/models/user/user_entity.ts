import { User } from '../generated/prisma/client'
import { IsEmail, IsNotEmpty, IsString, validateSync } from 'class-validator'
import { cleanObject, excludeKeys } from '../../common/utils'

export class UserEntity {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsEmail()
  @IsNotEmpty()
  email: string

  static validate(attrs: Partial<UserEntity>) {
    validateSync(attrs)
  }

  static prepareForPersistence(attrs: Partial<UserEntity>): User {
    this.validate(attrs)

    return {
      ...excludeKeys(attrs, ['id', 'createdat', 'updatedAt']),
      ...cleanObject(attrs),
      updatedAt: new Date(),
    } as User
  }
}
