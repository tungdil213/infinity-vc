import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { Result } from '#shared/result'
import { safeSystemError } from '#shared/error_sanitizer'
import {
  type FriendOverview,
  type FriendRepository,
  type FriendRequestRecord,
  type FriendRequestStatus,
  type FriendshipRecord,
  type FriendUserRecord,
} from '#application/repositories/friend_repository'

type UserSummaryRow = {
  user_uuid: string
  full_name: string | null
  email: string
}

type FriendRequestRow = {
  uuid: string
  requester_user_uuid: string
  recipient_user_uuid: string
  status: FriendRequestStatus
  responded_at: Date | string | null
  created_at: Date | string
}

type FriendshipRow = {
  uuid: string
  user_a_uuid: string
  user_b_uuid: string
  created_at: Date | string
}

export class DatabaseFriendRepository implements FriendRepository {
  async listOverview(userUuid: string): Promise<FriendOverview> {
    const friendships = (await db
      .from('friendships')
      .where((query) => {
        query.where('user_a_uuid', userUuid).orWhere('user_b_uuid', userUuid)
      })
      .orderBy('created_at', 'desc')) as FriendshipRow[]

    const friendUuids = friendships.map((row) =>
      row.user_a_uuid === userUuid ? row.user_b_uuid : row.user_a_uuid
    )
    const usersByUuid = await this.getUsersByUuid(friendUuids)

    const friends = friendships
      .map((row) => {
        const friendUserUuid = row.user_a_uuid === userUuid ? row.user_b_uuid : row.user_a_uuid
        const friendUser = usersByUuid.get(friendUserUuid)
        if (!friendUser) {
          return null
        }

        return {
          uuid: row.uuid,
          userUuid,
          friendUserUuid,
          friendFullName: friendUser.full_name ?? 'Unknown User',
          friendEmail: friendUser.email,
          createdAt: this.toDate(row.created_at)!,
        } satisfies FriendshipRecord
      })
      .filter((value): value is FriendshipRecord => value !== null)

    const incomingRows = (await db
      .from('friend_requests')
      .where('recipient_user_uuid', userUuid)
      .where('status', 'pending')
      .orderBy('created_at', 'desc')) as FriendRequestRow[]
    const outgoingRows = (await db
      .from('friend_requests')
      .where('requester_user_uuid', userUuid)
      .where('status', 'pending')
      .orderBy('created_at', 'desc')) as FriendRequestRow[]

    const requestUserUuids = [
      ...incomingRows.map((row) => row.requester_user_uuid),
      ...outgoingRows.map((row) => row.recipient_user_uuid),
    ]
    const requestUsersByUuid = await this.getUsersByUuid(requestUserUuids)

    return {
      friends,
      incomingRequests: incomingRows
        .map((row) => {
          const requester = requestUsersByUuid.get(row.requester_user_uuid)
          if (!requester) {
            return null
          }

          return this.toFriendRequestRecord(row, requester, {
            user_uuid: userUuid,
            full_name: null,
            email: '',
          })
        })
        .filter((value): value is FriendRequestRecord => value !== null),
      outgoingRequests: outgoingRows
        .map((row) => {
          const recipient = requestUsersByUuid.get(row.recipient_user_uuid)
          if (!recipient) {
            return null
          }

          return this.toFriendRequestRecord(
            row,
            {
              user_uuid: userUuid,
              full_name: null,
              email: '',
            },
            recipient
          )
        })
        .filter((value): value is FriendRequestRecord => value !== null),
    }
  }

  async searchUsers(query: string, userUuid: string, limit = 10): Promise<FriendUserRecord[]> {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return []
    }

    const rows = (await db
      .from('users')
      .leftJoin('players', 'players.user_uuid', 'users.user_uuid')
      .select('users.user_uuid', 'users.full_name', 'users.email')
      .whereNull('users.deleted_at')
      .where('users.user_uuid', '!=', userUuid)
      .where((builder) => {
        builder
          .whereRaw('LOWER(users.full_name) like ?', [`%${normalizedQuery}%`])
          .orWhereRaw('LOWER(players.nick_name) like ?', [`%${normalizedQuery}%`])
      })
      .orderBy('users.full_name', 'asc')
      .limit(limit)) as UserSummaryRow[]

    const pairKeys = rows.map((row) => buildPairKey(userUuid, row.user_uuid))
    const friendshipRows = pairKeys.length
      ? ((await db.from('friendships').whereIn('pair_key', pairKeys)) as Array<{
          pair_key: string
        }>)
      : []
    const requestRows = pairKeys.length
      ? ((await db.from('friend_requests').whereIn('pair_key', pairKeys)) as Array<{
          pair_key: string
          requester_user_uuid: string
          recipient_user_uuid: string
          status: FriendRequestStatus
        }>)
      : []

    const friendshipsByKey = new Set(friendshipRows.map((row) => row.pair_key))
    const requestsByKey = new Map(requestRows.map((row) => [row.pair_key, row]))

    return rows.map((row) => {
      const pairKey = buildPairKey(userUuid, row.user_uuid)
      const existingRequest = requestsByKey.get(pairKey)

      return {
        userUuid: row.user_uuid,
        fullName: row.full_name ?? 'Unknown User',
        email: row.email,
        isFriend: friendshipsByKey.has(pairKey),
        hasIncomingRequest:
          existingRequest?.status === 'pending' &&
          existingRequest.requester_user_uuid === row.user_uuid,
        hasOutgoingRequest:
          existingRequest?.status === 'pending' && existingRequest.requester_user_uuid === userUuid,
      }
    })
  }

  async sendRequest(
    requesterUserUuid: string,
    recipientUserUuid: string
  ): Promise<Result<FriendRequestRecord>> {
    try {
      if (requesterUserUuid === recipientUserUuid) {
        return Result.fail('You cannot send a friend request to yourself')
      }

      const requester = await this.getActiveUser(requesterUserUuid)
      const recipient = await this.getActiveUser(recipientUserUuid)

      if (!requester || !recipient) {
        return Result.fail('User was not found')
      }

      const pairKey = buildPairKey(requesterUserUuid, recipientUserUuid)
      const friendship = await db.from('friendships').where('pair_key', pairKey).first()
      if (friendship) {
        return Result.fail('You are already friends with this user')
      }

      const existingRequest = (await db
        .from('friend_requests')
        .where('pair_key', pairKey)
        .first()) as FriendRequestRow | null

      const now = DateTime.now()
      const nowSql = this.toDatabaseDateTime(now)

      if (!existingRequest) {
        const uuid = randomUUID()
        await db.table('friend_requests').insert({
          uuid,
          requester_user_uuid: requesterUserUuid,
          recipient_user_uuid: recipientUserUuid,
          pair_key: pairKey,
          status: 'pending',
          responded_at: null,
          created_at: nowSql,
          updated_at: nowSql,
        })

        return Result.ok({
          uuid,
          requesterUserUuid,
          requesterFullName: requester.full_name ?? 'Unknown User',
          recipientUserUuid,
          recipientFullName: recipient.full_name ?? 'Unknown User',
          status: 'pending',
          createdAt: now.toJSDate(),
          respondedAt: null,
        })
      }

      if (existingRequest.status === 'pending') {
        return Result.fail('A friend request is already pending for this user')
      }

      if (existingRequest.status === 'accepted') {
        return Result.fail('You are already friends with this user')
      }

      await db.from('friend_requests').where('uuid', existingRequest.uuid).update({
        requester_user_uuid: requesterUserUuid,
        recipient_user_uuid: recipientUserUuid,
        status: 'pending',
        responded_at: null,
        updated_at: nowSql,
      })

      return Result.ok({
        uuid: existingRequest.uuid,
        requesterUserUuid,
        requesterFullName: requester.full_name ?? 'Unknown User',
        recipientUserUuid,
        recipientFullName: recipient.full_name ?? 'Unknown User',
        status: 'pending',
        createdAt: this.toDate(existingRequest.created_at) ?? now.toJSDate(),
        respondedAt: null,
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'send_friend_request'))
    }
  }

  async acceptRequest(
    requestUuid: string,
    recipientUserUuid: string
  ): Promise<Result<FriendshipRecord>> {
    const trx = await db.transaction()

    try {
      const requestRow = (await trx
        .from('friend_requests')
        .where('uuid', requestUuid)
        .where('recipient_user_uuid', recipientUserUuid)
        .first()) as FriendRequestRow | null

      if (!requestRow) {
        await trx.rollback()
        return Result.fail('Friend request was not found')
      }

      if (requestRow.status !== 'pending') {
        await trx.rollback()
        return Result.fail('Friend request is no longer pending')
      }

      const pairKey = buildPairKey(requestRow.requester_user_uuid, requestRow.recipient_user_uuid)
      const existingFriendship = await trx.from('friendships').where('pair_key', pairKey).first()
      if (existingFriendship) {
        await trx.rollback()
        return Result.fail('You are already friends with this user')
      }

      const now = DateTime.now()
      const nowSql = this.toDatabaseDateTime(now)
      const [userAUuid, userBUuid] = sortPair(
        requestRow.requester_user_uuid,
        requestRow.recipient_user_uuid
      )
      const friendshipUuid = randomUUID()

      await trx.from('friend_requests').where('uuid', requestRow.uuid).update({
        status: 'accepted',
        responded_at: nowSql,
        updated_at: nowSql,
      })

      await trx.table('friendships').insert({
        uuid: friendshipUuid,
        user_a_uuid: userAUuid,
        user_b_uuid: userBUuid,
        pair_key: pairKey,
        created_at: nowSql,
        updated_at: nowSql,
      })

      await trx.commit()

      const friendUser = await this.getActiveUser(requestRow.requester_user_uuid)
      if (!friendUser) {
        return Result.fail('User was not found')
      }

      logger.info(
        {
          friendshipUuid,
          requesterUserUuid: requestRow.requester_user_uuid,
          recipientUserUuid,
        },
        'Friendship created'
      )

      return Result.ok({
        uuid: friendshipUuid,
        userUuid: recipientUserUuid,
        friendUserUuid: requestRow.requester_user_uuid,
        friendFullName: friendUser.full_name ?? 'Unknown User',
        friendEmail: friendUser.email,
        createdAt: now.toJSDate(),
      })
    } catch (error) {
      await trx.rollback()
      return Result.fail(safeSystemError(error, 'accept_friend_request'))
    }
  }

  async rejectRequest(
    requestUuid: string,
    recipientUserUuid: string
  ): Promise<Result<FriendRequestRecord>> {
    try {
      const requestRow = (await db
        .from('friend_requests')
        .where('uuid', requestUuid)
        .where('recipient_user_uuid', recipientUserUuid)
        .first()) as FriendRequestRow | null

      if (!requestRow) {
        return Result.fail('Friend request was not found')
      }

      if (requestRow.status !== 'pending') {
        return Result.fail('Friend request is no longer pending')
      }

      const now = DateTime.now()
      const nowSql = this.toDatabaseDateTime(now)
      await db.from('friend_requests').where('uuid', requestRow.uuid).update({
        status: 'rejected',
        responded_at: nowSql,
        updated_at: nowSql,
      })

      const requester = await this.getActiveUser(requestRow.requester_user_uuid)
      const recipient = await this.getActiveUser(requestRow.recipient_user_uuid)

      if (!requester || !recipient) {
        return Result.fail('User was not found')
      }

      return Result.ok({
        uuid: requestRow.uuid,
        requesterUserUuid: requestRow.requester_user_uuid,
        requesterFullName: requester.full_name ?? 'Unknown User',
        recipientUserUuid: requestRow.recipient_user_uuid,
        recipientFullName: recipient.full_name ?? 'Unknown User',
        status: 'rejected',
        createdAt: this.toDate(requestRow.created_at) ?? now.toJSDate(),
        respondedAt: now.toJSDate(),
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'reject_friend_request'))
    }
  }

  async cancelRequest(
    requestUuid: string,
    requesterUserUuid: string
  ): Promise<Result<FriendRequestRecord>> {
    try {
      const requestRow = (await db
        .from('friend_requests')
        .where('uuid', requestUuid)
        .where('requester_user_uuid', requesterUserUuid)
        .first()) as FriendRequestRow | null

      if (!requestRow) {
        return Result.fail('Friend request was not found')
      }

      if (requestRow.status !== 'pending') {
        return Result.fail('Friend request is no longer pending')
      }

      const now = DateTime.now()
      const nowSql = this.toDatabaseDateTime(now)
      await db.from('friend_requests').where('uuid', requestRow.uuid).update({
        status: 'cancelled',
        responded_at: nowSql,
        updated_at: nowSql,
      })

      const requester = await this.getActiveUser(requestRow.requester_user_uuid)
      const recipient = await this.getActiveUser(requestRow.recipient_user_uuid)

      if (!requester || !recipient) {
        return Result.fail('User was not found')
      }

      return Result.ok({
        uuid: requestRow.uuid,
        requesterUserUuid: requestRow.requester_user_uuid,
        requesterFullName: requester.full_name ?? 'Unknown User',
        recipientUserUuid: requestRow.recipient_user_uuid,
        recipientFullName: recipient.full_name ?? 'Unknown User',
        status: 'cancelled',
        createdAt: this.toDate(requestRow.created_at) ?? now.toJSDate(),
        respondedAt: now.toJSDate(),
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'cancel_friend_request'))
    }
  }

  async removeFriend(userUuid: string, friendUserUuid: string): Promise<Result<void>> {
    try {
      const pairKey = buildPairKey(userUuid, friendUserUuid)
      const deletedRows = await db.from('friendships').where('pair_key', pairKey).delete()

      if (!deletedRows) {
        return Result.fail('Friendship was not found')
      }

      return Result.ok(undefined)
    } catch (error) {
      return Result.fail(safeSystemError(error, 'remove_friend'))
    }
  }

  private async getActiveUser(userUuid: string): Promise<UserSummaryRow | null> {
    return (
      ((await db
        .from('users')
        .select('user_uuid', 'full_name', 'email')
        .where('user_uuid', userUuid)
        .whereNull('deleted_at')
        .first()) as UserSummaryRow | null) ?? null
    )
  }

  private async getUsersByUuid(userUuids: string[]): Promise<Map<string, UserSummaryRow>> {
    const uniqueUuids = [...new Set(userUuids)].filter(Boolean)
    if (uniqueUuids.length === 0) {
      return new Map()
    }

    const rows = (await db
      .from('users')
      .select('user_uuid', 'full_name', 'email')
      .whereIn('user_uuid', uniqueUuids)
      .whereNull('deleted_at')) as UserSummaryRow[]

    return new Map(rows.map((row) => [row.user_uuid, row]))
  }

  private toFriendRequestRecord(
    row: FriendRequestRow,
    requester: UserSummaryRow,
    recipient: UserSummaryRow
  ): FriendRequestRecord {
    return {
      uuid: row.uuid,
      requesterUserUuid: row.requester_user_uuid,
      requesterFullName: requester.full_name ?? 'Unknown User',
      recipientUserUuid: row.recipient_user_uuid,
      recipientFullName: recipient.full_name ?? 'Unknown User',
      status: row.status,
      createdAt: this.toDate(row.created_at) ?? new Date(),
      respondedAt: this.toDate(row.responded_at),
    }
  }

  private toDate(value: Date | string | null): Date | null {
    if (!value) {
      return null
    }

    if (value instanceof Date) {
      return value
    }

    const sqlDate = DateTime.fromSQL(value)
    if (sqlDate.isValid) {
      return sqlDate.toJSDate()
    }

    const isoDate = DateTime.fromISO(value)
    if (isoDate.isValid) {
      return isoDate.toJSDate()
    }

    return new Date(value)
  }

  private toDatabaseDateTime(value: DateTime): string {
    return value.toSQL({ includeOffset: false }) ?? value.toISO() ?? value.toJSDate().toISOString()
  }
}

function sortPair(left: string, right: string): [string, string] {
  return left < right ? [left, right] : [right, left]
}

export function buildPairKey(left: string, right: string): string {
  const [first, second] = sortPair(left, right)
  return `${first}::${second}`
}
