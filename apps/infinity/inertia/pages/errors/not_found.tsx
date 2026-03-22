import { Head } from '@inertiajs/react'
import { Button } from '@infinity.dev/ui/primitives/button'
import Layout from '../../layouts/layout'

interface NotFoundProps {
  error?: {
    message?: string
  }
}

export default function NotFound({ error }: NotFoundProps) {
  const message = error?.message ?? 'This page does not exist.'

  return (
    <Layout>
      <Head title="Page not found" />

      <div className="flex flex-1 items-center justify-center bg-secondary-background px-4 py-12">
        <div className="w-full max-w-xl rounded-base border-2 border-border bg-card p-8 text-center shadow-shadow">
          <h1 className="text-3xl font-heading text-foreground">Page not found</h1>
          <p className="mt-3 text-muted-foreground">{message}</p>
          <a href="/" className="mt-6 inline-block">
            <Button variant="neutral">Back to Home</Button>
          </a>
        </div>
      </div>
    </Layout>
  )
}
