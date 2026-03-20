export interface GameRepository {
  save(game: unknown): Promise<void>
}
