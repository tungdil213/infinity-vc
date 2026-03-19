/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />
/// <reference types="vite/client" />

import '../css/app.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { I18nProvider } from '../i18n/provider'

const appName = (import.meta.env?.VITE_APP_NAME as string) || 'AdonisJS'

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title) => `${title} - ${appName}`,

  resolve: (name) => {
    return resolvePageComponent(`../pages/${name}.tsx`, import.meta.glob('../pages/**/*.tsx'))
  },

  setup({ el, App, props }) {
    const sharedLocale = (props.initialPage.props as { locale?: string } | undefined)?.locale
    createRoot(el).render(
      <I18nProvider initialLocale={sharedLocale}>
        <App {...props} />
      </I18nProvider>
    )
  },
})
