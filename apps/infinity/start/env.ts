/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  VITE_APP_NAME: Env.schema.string(),
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_CONNECTION: Env.schema.enum(['sqlite', 'postgres', 'mysql']),
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring the drive package
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['fs'] as const),
  TEST_TMP_DIR: Env.schema.string(),
  ADMIN_EMAILS: Env.schema.string.optional(),
  MODERATOR_EMAILS: Env.schema.string.optional(),
  INVITATION_CODE_SECRET: Env.schema.string.optional(),
  INVITATION_CODE_QUOTA_PER_USER: Env.schema.number.optional(),
  INVITATION_CODE_TTL_HOURS: Env.schema.number.optional(),
  LOBBY_DISCONNECT_GRACE_MS: Env.schema.number.optional(),
  REPLAY_SIGNING_KEY: Env.schema.string.optional(),
  REPLAY_SIGNING_KEY_ID: Env.schema.string.optional(),
  REPLAY_SIGNING_PREVIOUS_KEYS: Env.schema.string.optional(),
  REPLAY_REQUIRE_SIGNATURES: Env.schema.boolean.optional(),
})
