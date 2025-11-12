import type { Query } from '#shared_kernel/application/query.interface'

export class ListLobbiesQuery implements Query {
  constructor(
    public readonly onlyAvailable: boolean = false
  ) {}
}
