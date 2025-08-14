import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import Layout from '../../components/layout'

interface Route {
  method: string
  path: string
  name: string
  description: string
}

interface RouteGroup {
  group: string
  routes: Route[]
}

interface DevRoutesProps {
  routes: RouteGroup[]
}

export default function DevRoutes({ routes }: DevRoutesProps) {
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-800'
      case 'POST':
        return 'bg-blue-100 text-blue-800'
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isClickableRoute = (path: string, method: string) => {
    return method === 'GET' && !path.includes(':')
  }

  return (
    <Layout>
      <Head title="Routes de développement - Infinity Game" />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">🛠️ Routes de développement</h1>
                <p className="text-gray-600 mt-2">
                  Liste complète des routes disponibles dans l'application Infinity Game
                </p>
              </div>
              <Link href="/">
                <Button variant="outline">
                  ← Retour à l'accueil
                </Button>
              </Link>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Page de développement uniquement
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Cette page n'est accessible qu'en mode développement et ne sera pas disponible en production.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Routes Groups */}
          <div className="space-y-8">
            {routes.map((group, groupIndex) => (
              <div key={groupIndex} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">{group.group}</h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {group.routes.map((route, routeIndex) => (
                    <div key={routeIndex} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodColor(route.method)}`}>
                            {route.method}
                          </span>
                          
                          {isClickableRoute(route.path, route.method) ? (
                            <Link 
                              href={route.path} 
                              className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {route.path}
                            </Link>
                          ) : (
                            <code className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {route.path}
                            </code>
                          )}
                          
                          <span className="text-sm text-gray-500">
                            ({route.name})
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {route.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h3>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/auth/login">
                  <Button variant="outline">🔑 Connexion</Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="outline">📝 Inscription</Button>
                </Link>
                <Link href="/lobbies">
                  <Button variant="outline">🎮 Lobbies</Button>
                </Link>
                <Link href="/api/v1/auth/check">
                  <Button variant="outline">🔍 Check API</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
