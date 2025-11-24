import type { Query } from '#shared_kernel/application/query.interface'

export class GetUserQuery implements Query {
  constructor(public readonly userId: string) {}
}
