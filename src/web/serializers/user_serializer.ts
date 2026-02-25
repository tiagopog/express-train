import { BaseSerializer } from './base_serializer'
import { UserSignUpContract } from '../contracts/user_contracts'
import { UserEntity } from '../../models/'

export class UserSerializer extends BaseSerializer {
  static readonly id = 'uuid'
  static readonly type = 'users'
  static readonly attributes = ['name', 'email']
  static readonly entity = UserEntity
  static readonly deafaultContract = UserSignUpContract
}
