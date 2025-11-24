import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import Layout from '../../components/layout'

interface CreateLobbyProps {
  user: {
    uuid: string
    fullName: string
  }
  errors?: {
    name?: string[]
    maxPlayers?: string[]
    password?: string[]
    general?: string[]
  }
  flash?: {
    error?: string
    success?: string
  }
}

export default function CreateLobby({ user, errors = {}, flash = {} }: CreateLobbyProps) {
  const [formData, setFormData] = useState({
    name: '',
    maxPlayers: 4,
    minPlayers: 2,
    isPrivate: false,
    gameType: 'love-letter',
    // TODO: Implémenter dans le domaine Lobby
    // hasPassword: false,
    // password: '',
    // description: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const submitData = {
      name: formData.name,
      maxPlayers: formData.maxPlayers,
      minPlayers: formData.minPlayers,
      isPrivate: formData.isPrivate,
      gameType: formData.gameType,
    }

    router.post('/lobbies', submitData, {
      onFinish: () => setIsLoading(false),
      onSuccess: () => {
        // Redirect will be handled by the server
      },
    })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }))
    } else if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  return (
    <Layout>
      <Head title="Create Lobby - Infinity Game" />

      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ♾️ Infinity Game
                  </h1>
                </Link>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {user.fullName}!</span>
                <Link href="/lobbies">
                  <Button variant="outline">Back to Lobbies</Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Lobby</h1>
            <p className="text-gray-600">Set up your gaming session and invite friends to play</p>
          </div>

          {/* Flash Messages */}
          {flash.error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {flash.error}
            </div>
          )}

          {flash.success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {flash.success}
            </div>
          )}

          {/* Create Lobby Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Lobby Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Lobby Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter a catchy lobby name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>}
              </div>

              {/* Min Players */}
              <div>
                <label
                  htmlFor="minPlayers"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Minimum Players
                </label>
                <select
                  id="minPlayers"
                  name="minPlayers"
                  value={formData.minPlayers}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                </select>
              </div>

              {/* Game Type */}
              <div>
                <label htmlFor="gameType" className="block text-sm font-medium text-gray-700 mb-2">
                  Game Type
                </label>
                <select
                  id="gameType"
                  name="gameType"
                  value={formData.gameType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="love-letter">Love Letter</option>
                  <option value="uno">Uno (Coming Soon)</option>
                  <option value="poker">Poker (Coming Soon)</option>
                  <option value="hearts">Hearts (Coming Soon)</option>
                </select>
              </div>

              {/* Max Players */}
              <div>
                <label
                  htmlFor="maxPlayers"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Maximum Players
                </label>
                <select
                  id="maxPlayers"
                  name="maxPlayers"
                  value={formData.maxPlayers}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.maxPlayers ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={6}>6 Players</option>
                  <option value={8}>8 Players</option>
                </select>
                {errors.maxPlayers && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxPlayers[0]}</p>
                )}
              </div>

              {/* Privacy Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>

                {/* Private Lobby */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="isPrivate"
                      name="isPrivate"
                      type="checkbox"
                      checked={formData.isPrivate}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700">
                      Private Lobby
                    </label>
                    <p className="text-sm text-gray-500">
                      Only people with the invitation link can join. You'll receive a shareable link after creation.
                    </p>
                  </div>
                </div>

                {/* Coming Soon: Password Protection */}
                <div className="flex items-start opacity-50">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      disabled
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label className="text-sm font-medium text-gray-700">
                      Password Protection <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Coming Soon</span>
                    </label>
                    <p className="text-sm text-gray-500">Require a password to join the lobby (in development)</p>
                  </div>
                </div>
              </div>

              {/* General Errors */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {errors.general[0]}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Lobby...
                    </div>
                  ) : (
                    '🎮 Create Lobby'
                  )}
                </Button>

                <Link href="/lobbies">
                  <Button variant="outline" className="flex-1 py-3 text-lg">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </div>

          {/* Tips */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Pro Tips</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Choose a descriptive name to attract the right players</li>
              <li>• Private lobbies are great for playing with friends - you'll get an invitation link</li>
              <li>• Set the right number of players for your game type</li>
              <li>• You can manage your lobby and kick players once it's created</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  )
}
