import { Head } from '@inertiajs/react'
import { Button } from '@infinity.dev/ui/primitives/button'
import Layout from '../../layouts/layout'
import { useI18n } from '../../i18n/use_i18n'

interface ServerErrorProps {
  error?: {
    message?: string
  }
}

export default function ServerError({ error }: ServerErrorProps) {
  const { t } = useI18n()
  const message = error?.message ?? t('error.server.unexpected')

  return (
    <Layout>
      <Head title="Server Error" />

      <div className="flex flex-1 items-center justify-center bg-secondary-background px-4 py-12">
        <div className="w-full max-w-xl rounded-base border-2 border-border bg-card p-8 text-center shadow-shadow">
          <h1 className="text-3xl font-heading text-foreground">Server Error</h1>
          <p className="mt-3 text-muted-foreground">{message}</p>
          <a href="/" className="mt-6 inline-block">
            <Button variant="neutral">Back to Home</Button>
          </a>
        </div>
      </div>
    </Layout>
  )
}
