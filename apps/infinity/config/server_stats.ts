import { defineConfig } from 'adonisjs-server-stats'
import { httpCollector, processCollector, systemCollector } from 'adonisjs-server-stats/collectors'

export default defineConfig({
  intervalMs: 3000,
  transport: 'none',
  channelName: 'admin/server-stats',
  endpoint: false,
  collectors: [processCollector(), systemCollector(), httpCollector()],
})
