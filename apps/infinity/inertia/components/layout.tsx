import React, { useEffect } from 'react'
import { usePage } from '@inertiajs/react'

// Flash messages component that works within Inertia context
function FlashMessages() {
  const { props } = usePage()
  const flash = props.flash as { success?: string; error?: string } | undefined

  useEffect(() => {
    if (flash?.success) {
      // Create a simple success notification
      const div = document.createElement('div')
      div.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300'
      div.textContent = flash.success
      document.body.appendChild(div)
      
      setTimeout(() => {
        div.style.opacity = '0'
        setTimeout(() => {
          if (document.body.contains(div)) {
            document.body.removeChild(div)
          }
        }, 300)
      }, 4700)
    }
    
    if (flash?.error) {
      // Create a simple error notification
      const div = document.createElement('div')
      div.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300'
      div.textContent = flash.error
      document.body.appendChild(div)
      
      setTimeout(() => {
        div.style.opacity = '0'
        setTimeout(() => {
          if (document.body.contains(div)) {
            document.body.removeChild(div)
          }
        }, 300)
      }, 4700)
    }
  }, [flash])

  return null
}

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      {children}
      <FlashMessages />
    </>
  )
}
