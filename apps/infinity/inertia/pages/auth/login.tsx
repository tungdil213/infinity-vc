import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { Input } from '@tyfo.dev/ui/primitives/input'
import { Label } from '@tyfo.dev/ui/primitives/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tyfo.dev/ui/primitives/card'
import { Alert, AlertDescription } from '@tyfo.dev/ui/primitives/alert'
import { Separator } from '@tyfo.dev/ui/primitives/separator'
import Layout from '../../layouts/layout'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface LoginProps {
  redirect?: string
  errors?: {
    email?: string[]
    password?: string[]
    general?: string[]
  }
  flash?: {
    error?: string
    success?: string
  }
}

export default function Login({ errors = {}, flash = {}, redirect = '/lobbies' }: LoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    redirect,
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    router.post('/auth/login', formData, {
      onFinish: () => setIsLoading(false),
      onSuccess: () => {
        // Redirect will be handled by the server
      },
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <Layout>
      <Head title="Login - Infinity Game" />

      <div className="min-h-screen bg-secondary-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/">
              <h1 className="text-3xl font-heading text-foreground mb-2">♾️ Infinity Game</h1>
            </Link>
          </div>

          {/* Flash Messages */}
          {flash.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{flash.error}</AlertDescription>
            </Alert>
          )}

          {flash.success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{flash.success}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle>Welcome back!</CardTitle>
              <CardDescription>Sign in to your account to continue playing</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password[0]}</p>
                  )}
                </div>

                {/* General Errors */}
                {errors.general && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.general[0]}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center">
                <Separator className="flex-1" />
                <span className="px-4 text-sm text-muted-foreground">Don't have an account?</span>
                <Separator className="flex-1" />
              </div>

              {/* Sign Up Link */}
              <Link href="/auth/register">
                <Button variant="neutral" className="w-full">
                  Create New Account
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="text-center space-y-2">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Homepage
            </Link>
            <div className="text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">
                Forgot Password?
              </a>
              {' • '}
              <a href="#" className="hover:text-foreground">
                Help
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
