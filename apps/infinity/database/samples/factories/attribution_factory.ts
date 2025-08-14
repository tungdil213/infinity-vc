import Factory from '@adonisjs/lucid/factories'
import Attribution from '#models/attribution'
import { UserFactory } from '#database/samples/factories/user_factory'
import { RoleFactory } from '#database/samples/factories/role_factory'
import { CircleFactory } from '#database/samples/factories/circle_factory'
import { generateUuid } from '#utils/uuid_helper'

export const AttributionFactory = Factory.define(Attribution, async () => ({
  uuid: generateUuid(),
}))
  .relation('user', () => UserFactory)
  .relation('role', () => RoleFactory)
  .relation('circle', () => CircleFactory)
  .build()
