import { useState, useEffect } from 'react'
import { transmitManager, ConnectionState } from '../services/transmit_manager'
import { Head } from '@inertiajs/react'

/**
 * Page de debug pour Transmit
 * Permet de tester la connexion et les subscriptions
 */
export default function TransmitDebug() {
  const [logs, setLogs] = useState<string[]>([])
  const [stats, setStats] = useState<any>(null)
  const [testChannel, setTestChannel] = useState('lobbies')

  // Ajouter un log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 50))
  }

  // Rafraîchir les stats
  const refreshStats = () => {
    const currentStats = transmitManager.getStats()
    setStats(currentStats)
    addLog(`Stats refreshed: ${currentStats.subscriptionCount} subscriptions`)
  }

  // Initialisation
  useEffect(() => {
    addLog('🚀 TransmitDebug page mounted')
    refreshStats()

    // Écouter les événements du manager
    const handleStateChange = (event: any) => {
      addLog(`🔄 State changed: ${event.data.oldState} → ${event.data.newState}`)
      refreshStats()
    }

    const handleSubscriptionCreated = (event: any) => {
      addLog(`✅ Subscription created: ${event.data.channel}`)
      refreshStats()
    }

    const handleMessageReceived = (event: any) => {
      addLog(
        `📨 Message received on ${event.data.channel}: ${JSON.stringify(event.data.data).substring(0, 100)}`
      )
    }

    transmitManager.on('connection_state_changed', handleStateChange)
    transmitManager.on('subscription_created', handleSubscriptionCreated)
    transmitManager.on('message_received', handleMessageReceived)

    // Rafraîchir les stats toutes les 2 secondes
    const interval = setInterval(refreshStats, 2000)

    return () => {
      clearInterval(interval)
      transmitManager.off('connection_state_changed', handleStateChange)
      transmitManager.off('subscription_created', handleSubscriptionCreated)
      transmitManager.off('message_received', handleMessageReceived)
    }
  }, [])

  // Test de connexion
  const handleConnect = async () => {
    try {
      addLog('🔌 Attempting to connect...')
      await transmitManager.connect()
      addLog('✅ Connected successfully')
      refreshStats()
    } catch (error) {
      addLog(`❌ Connection failed: ${error}`)
    }
  }

  // Test de subscription
  const handleSubscribe = async () => {
    try {
      addLog(`📥 Subscribing to channel: ${testChannel}`)
      await transmitManager.subscribe(testChannel, (data) => {
        addLog(`📨 Received data on ${testChannel}: ${JSON.stringify(data).substring(0, 100)}`)
      })
      addLog(`✅ Subscribed to ${testChannel}`)
      refreshStats()
    } catch (error) {
      addLog(`❌ Subscription failed: ${error}`)
    }
  }

  // Test d'unsubscribe
  const handleUnsubscribe = async () => {
    try {
      addLog(`📤 Unsubscribing from channel: ${testChannel}`)
      await transmitManager.unsubscribe(testChannel)
      addLog(`✅ Unsubscribed from ${testChannel}`)
      refreshStats()
    } catch (error) {
      addLog(`❌ Unsubscribe failed: ${error}`)
    }
  }

  // Déconnexion
  const handleDisconnect = async () => {
    try {
      addLog('🔌 Disconnecting...')
      await transmitManager.disconnect()
      addLog('✅ Disconnected successfully')
      refreshStats()
    } catch (error) {
      addLog(`❌ Disconnect failed: ${error}`)
    }
  }

  // Clear logs
  const handleClearLogs = () => {
    setLogs([])
    addLog('🗑️ Logs cleared')
  }

  return (
    <>
      <Head title="Transmit Debug" />
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-3xl font-bold">📡 Transmit Debug Console</h1>

          {/* Stats Panel */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">📊 Statistics</h2>
            {stats ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div>
                  <div className="text-sm text-gray-500">State</div>
                  <div className="text-lg font-bold">
                    {stats.state === ConnectionState.CONNECTED ? (
                      <span className="text-green-600">🟢 {stats.state}</span>
                    ) : stats.state === ConnectionState.ERROR ? (
                      <span className="text-red-600">🔴 {stats.state}</span>
                    ) : (
                      <span className="text-yellow-600">🟡 {stats.state}</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Subscriptions</div>
                  <div className="text-lg font-bold">{stats.subscriptionCount}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Reconnect Attempts</div>
                  <div className="text-lg font-bold">{stats.reconnectAttempts}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Event Handlers</div>
                  <div className="text-lg font-bold">{stats.eventHandlersCount}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Active Channels</div>
                  <div className="text-sm font-mono">
                    {stats.activeChannels.length > 0
                      ? stats.activeChannels.join(', ')
                      : 'None'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading stats...</p>
            )}
          </div>

          {/* Controls Panel */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">🎮 Controls</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={handleConnect}
                  className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  🔌 Connect
                </button>
                <button
                  onClick={handleDisconnect}
                  className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                >
                  🔌 Disconnect
                </button>
                <button
                  onClick={refreshStats}
                  className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
                >
                  🔄 Refresh Stats
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value)}
                  placeholder="Channel name"
                  className="flex-1 rounded border px-4 py-2"
                />
                <button
                  onClick={handleSubscribe}
                  className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                >
                  📥 Subscribe
                </button>
                <button
                  onClick={handleUnsubscribe}
                  className="rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
                >
                  📤 Unsubscribe
                </button>
              </div>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">📝 Logs</h2>
              <button
                onClick={handleClearLogs}
                className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
              >
                🗑️ Clear
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto rounded bg-gray-900 p-4 font-mono text-sm text-green-400">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 font-semibold">💡 Quick Actions</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>1. Click "Connect" to establish Transmit connection</li>
              <li>2. Enter "lobbies" in the channel field and click "Subscribe"</li>
              <li>3. Open another tab, create a lobby, and watch messages appear here</li>
              <li>4. Check the browser console for detailed Transmit logs (📡)</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
