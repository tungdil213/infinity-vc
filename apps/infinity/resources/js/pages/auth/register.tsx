import React from 'react'
import { Head, useForm } from '@inertiajs/react'
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

interface RegisterProps {
  redirect?: string
}

export default function Register({ redirect = '/lobbies' }: RegisterProps) {
  const { data, setData, post, processing, errors } = useForm({
    fullName: '',
    email: '',
    password: '',
    password_confirmation: '',
    redirect,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    if (!data.fullName.trim()) {
      console.error('Full name is required')
      return
    }

    if (!data.email.trim()) {
      console.error('Email is required')
      return
    }

    if (data.password.length < 8) {
      console.error('Password must be at least 8 characters long')
      return
    }

    if (data.password !== data.password_confirmation) {
      console.error('Passwords do not match')
      return
    }

    post('/auth/register')
  }

  return (
    <>
      <Head title="Register" />

      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Join the Infinity Game community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={data.fullName}
                  onChange={(e) => setData('fullName', e.target.value)}
                  required
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  required
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password (min 8 characters)"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  required
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirmation">Confirm Password</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  placeholder="Confirm your password"
                  value={data.password_confirmation}
                  onChange={(e) => setData('password_confirmation', e.target.value)}
                  required
                />
                {errors.password_confirmation && (
                  <p className="text-sm text-destructive">{errors.password_confirmation}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <a href="/auth/login" className="text-primary hover:underline font-medium">
                  Sign in here
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
