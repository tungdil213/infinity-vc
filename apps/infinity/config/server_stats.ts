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
  statsEndpoint: '/admin/api/server-stats',
  toolbar: true,
  advanced: {
    channelName: 'admin/server-stats',
    debugEndpoint: '/admin/api/debug',
  },
  collectors: [processCollector(), systemCollector(), httpCollector(), logCollector()],
})
