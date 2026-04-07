# Replay/Import Guard

This module centralizes replay/import integrity checks at the application layer.

## What it does

- Verifies signed envelopes for replay/import payloads.
- Rejects invalid or mismatched payloads with a single decision API.
- Emits centralized audit logs on rejection.
- Tracks in-memory counters by failure reason, operation, and source.

## Runtime wiring

- Service: `app/application/services/replay_import_guard_service.ts`
- Core utility: `app/application/services/replay_import_guard.ts`
- Replay endpoint integration: `app/controllers/games_controller.ts`
- Import endpoint integration: `app/controllers/games_controller.ts#importReplay`
- Persistent audit store: `app/application/services/replay_verification_audit_store.ts`
- Persistent audit table: `replay_verification_audits`

When game snapshots are persisted, replay payloads are signed and stored under:

- `gameData.runtime.replayEnvelope`

When replay is requested, the controller verifies:

- envelope signature validity
- payload integrity (`gameId + replayTimeline` against the signed payload)

If verification fails, replay is rejected.

## Metrics export

An admin endpoint exposes current in-memory counters:

- `GET /admin/api/games/verification/metrics`
- `POST /admin/api/games/verification/metrics/reset`

Response shape:

```json
{
  "accepted": 12,
  "rejected": 3,
  "rejectedByReason": {
    "invalid_signature": 2,
    "payload_mismatch": 1
  },
  "byOperation": {
    "replay": {
      "accepted": 8,
      "rejected": 2,
      "rejectedByReason": {
        "invalid_signature": 2
      }
    },
    "import": {
      "accepted": 4,
      "rejected": 1,
      "rejectedByReason": {
        "payload_mismatch": 1
      }
    }
  },
  "bySource": {
    "persistence": {
      "accepted": 7,
      "rejected": 2,
      "rejectedByReason": {
        "invalid_signature": 2
      }
    },
    "external": {
      "accepted": 5,
      "rejected": 1,
      "rejectedByReason": {
        "payload_mismatch": 1
      }
    }
  }
}
```

## Future import endpoint

Replay import is now exposed via:

- `POST /admin/api/games/:uuid/replay/import`

Payload:

```json
{
  "replayTimeline": [],
  "envelope": {
    "schemaVersion": 1,
    "keyId": "replay-v1",
    "algorithm": "sha256",
    "signedAt": "2026-04-07T13:00:00.000Z",
    "payload": {},
    "signature": "..."
  }
}
```

On verification failure, the request is rejected and an audit row is written to `replay_verification_audits`.

## Key Rotation Strategy

Environment variables:

- `REPLAY_SIGNING_KEY`: active replay signing secret (dedicated key)
- `REPLAY_SIGNING_KEY_ID`: active key id (default `replay-v1`)
- `REPLAY_SIGNING_PREVIOUS_KEYS`: verify-only rotated keys as `keyId:secret,keyId2:secret2`
- `REPLAY_REQUIRE_SIGNATURES`: strict mode for replay reads (default false)

Fallback behavior:

- If `REPLAY_SIGNING_KEY` is not set, `APP_KEY` is used as active secret for backward compatibility.

Rotation flow:

1. Add current active key to `REPLAY_SIGNING_PREVIOUS_KEYS`.
2. Set new `REPLAY_SIGNING_KEY` + `REPLAY_SIGNING_KEY_ID`.
3. Restart app.
4. Verify metrics and audit for unexpected failures.
5. Remove obsolete previous keys when migration is complete.

## Strict Mode Migration

Recommended phased rollout for `REPLAY_REQUIRE_SIGNATURES=true`:

1. Keep strict mode disabled.
2. Let runtime persistence progressively write `replayEnvelope` on active games.
3. Backfill old persisted games (or accept that old unsigned replays will be unavailable).
4. Enable strict mode.
5. Monitor `replay_verification_audits` and metrics after activation.

## Production Checklist

- [ ] `REPLAY_SIGNING_KEY` configured in production secrets.
- [ ] `REPLAY_SIGNING_KEY_ID` set and documented.
- [ ] `REPLAY_SIGNING_PREVIOUS_KEYS` configured during rotations.
- [ ] Database migration `1734210500000_create_replay_verification_audits_table` applied.
- [ ] Admin access to metrics and reset endpoints validated.
- [ ] Replay import endpoint authorization verified (admin scope).
- [ ] Alerting set up on spikes in `rejected` and `invalid_signature`.
- [ ] Strict mode rollout plan validated before enabling `REPLAY_REQUIRE_SIGNATURES=true`.
