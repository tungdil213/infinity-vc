import type { PlayerInterface } from '@infinity.dev/lobby-domain/interfaces'

export interface PlayerRecord {
  uuid: string
  nickName: string
}

export interface PlayerRepository {
  findPlayerInterfaceByUuid(userUuid: string): Promise<PlayerInterface | null>
  findPlayerInterfaceByUuidOrFail(userUuid: string): Promise<PlayerInterface>
  findByUuid?(uuid: string): Promise<PlayerRecord | null>
}
