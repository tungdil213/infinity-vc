import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import { randomUUID } from 'node:crypto'

/**
 * Seeder pour créer des utilisateurs de développement
 * Exécution: node ace db:seed --files database/seeders/dev_user_seeder.ts
 */
export default class DevUserSeeder extends BaseSeeder {
  public async run() {
    console.log('🔹 Création des utilisateurs de développement...')

    // Utilisateur de test 1
    await User.updateOrCreate(
      { email: 'eric@structo.ch' },
      {
        userUuid: randomUUID(),
        email: 'eric@structo.ch',
        fullName: 'Eric Monnier',
        username: 'eric',
        password: 'password', // ← En clair, le hook @beforeSave le hashera
      }
    )

    // Utilisateur de test 2
    await User.updateOrCreate(
      { email: 'eric2@structo.ch' },
      {
        userUuid: randomUUID(),
        email: 'eric2@structo.ch',
        fullName: 'Eric Monnier 2',
        username: 'eric2',
        password: 'password', // ← En clair, le hook @beforeSave le hashera
      }
    )

    // Utilisateur admin
    await User.updateOrCreate(
      { email: 'admin@infinity.dev' },
      {
        userUuid: randomUUID(),
        email: 'admin@infinity.dev',
        fullName: 'Admin',
        username: 'admin',
        password: 'admin123', // ← En clair, le hook @beforeSave le hashera
      }
    )

    console.log('✅ Utilisateurs de développement créés :')
    console.log('   - eric@structo.ch / password')
    console.log('   - eric2@structo.ch / password')
    console.log('   - admin@infinity.dev / admin123')
  }
}
