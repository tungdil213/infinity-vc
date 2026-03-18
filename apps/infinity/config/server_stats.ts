import app from '@adonisjs/core/services/app'
import { defineConfig } from 'adonisjs-server-stats'
import {
  httpCollector,
  logCollector,
  processCollector,
  systemCollector,
} from 'adonisjs-server-stats/collectors'

const isDevelopment = app.inDev

export default defineConfig({
  authorize: () => isDevelopment,
  pollInterval: 3000,
  realtime: false,
  statsEndpoint: false,
  advanced: {
    channelName: 'admin/server-stats',
  },
  collectors: [processCollector(), systemCollector(), httpCollector(), logCollector()],
})
