import { defineConfig } from 'adonisjs-server-stats'
import { httpCollector, processCollector, systemCollector } from 'adonisjs-server-stats/collectors'

export default defineConfig({
  pollInterval: 3000,
  realtime: false,
  statsEndpoint: false,
  advanced: {
    channelName: 'admin/server-stats',
  },
  collectors: [processCollector(), systemCollector(), httpCollector()],
})
