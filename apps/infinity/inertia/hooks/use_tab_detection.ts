import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface TabDetectionOptions {
  storageKey: string
  warningMessage?: string
  onMultipleTabsDetected?: () => void
}

/**
 * Hook pour détecter si la même ressource est ouverte dans plusieurs onglets
 * Utilise localStorage pour la communication inter-onglets
 */
export function useTabDetection({
  storageKey,
  warningMessage = 'Cette page est déjà ouverte dans un autre onglet',
  onMultipleTabsDetected,
}: TabDetectionOptions) {
  const [hasMultipleTabs, setHasMultipleTabs] = useState(false)
  const tabId = useRef<string>('')
  const heartbeatInterval = useRef<number>(0)

  useEffect(() => {
    // Générer un ID unique pour cet onglet
    tabId.current = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`🔧 useTabDetection: Initialisation pour ${storageKey} avec tabId ${tabId.current}`)

    // Vérifier s'il y a déjà des onglets actifs
    const checkExistingTabs = () => {
      const existingTabs = JSON.parse(localStorage.getItem(storageKey) || '{}')
      const activeTabs = Object.keys(existingTabs).filter((id) => {
        const tabData = existingTabs[id]
        // Considérer un onglet comme actif s'il a été vu dans les 5 dernières secondes
        return Date.now() - tabData.lastSeen < 5000
      })

      if (activeTabs.length > 0) {
        console.log(`🔧 useTabDetection: Onglets actifs détectés:`, activeTabs)
        setHasMultipleTabs(true)
        toast.warning(warningMessage)
        onMultipleTabsDetected?.()
        return true
      }
      return false
    }

    // Enregistrer cet onglet
    const registerTab = () => {
      const existingTabs = JSON.parse(localStorage.getItem(storageKey) || '{}')
      existingTabs[tabId.current!] = {
        lastSeen: Date.now(),
        userAgent: navigator.userAgent,
      }
      localStorage.setItem(storageKey, JSON.stringify(existingTabs))
    }

    // Nettoyer les onglets inactifs
    const cleanupInactiveTabs = () => {
      const existingTabs = JSON.parse(localStorage.getItem(storageKey) || '{}')
      const now = Date.now()
      const cleanedTabs: Record<string, any> = {}

      Object.keys(existingTabs).forEach((id) => {
        const tabData = existingTabs[id]
        // Garder seulement les onglets vus dans les 10 dernières secondes
        if (now - tabData.lastSeen < 10000) {
          cleanedTabs[id] = tabData
        }
      })

      localStorage.setItem(storageKey, JSON.stringify(cleanedTabs))
    }

    // Vérifier les onglets existants avant de s'enregistrer
    const hasExisting = checkExistingTabs()

    // S'enregistrer même s'il y a des onglets existants (pour le heartbeat)
    registerTab()

    // Heartbeat pour maintenir la présence de cet onglet
    heartbeatInterval.current = window.setInterval(() => {
      registerTab()
      cleanupInactiveTabs()

      // Vérifier périodiquement s'il y a d'autres onglets
      const existingTabs = JSON.parse(localStorage.getItem(storageKey) || '{}')
      const activeTabs = Object.keys(existingTabs).filter((id) => {
        if (id === tabId.current) return false // Exclure cet onglet
        const tabData = existingTabs[id]
        return Date.now() - tabData.lastSeen < 5000
      })

      const hasOtherTabs = activeTabs.length > 0
      if (hasOtherTabs !== hasMultipleTabs) {
        setHasMultipleTabs(hasOtherTabs)
        if (hasOtherTabs && !hasMultipleTabs) {
          toast.warning(warningMessage)
          onMultipleTabsDetected?.()
        }
      }
    }, 2000) // Heartbeat toutes les 2 secondes

    // Écouter les changements de localStorage (autres onglets)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const tabs = JSON.parse(e.newValue)
        const activeTabs = Object.keys(tabs).filter((id) => {
          if (id === tabId.current) return false
          const tabData = tabs[id]
          return Date.now() - tabData.lastSeen < 5000
        })

        const hasOtherTabs = activeTabs.length > 0
        if (hasOtherTabs !== hasMultipleTabs) {
          setHasMultipleTabs(hasOtherTabs)
          if (hasOtherTabs) {
            toast.warning(warningMessage)
            onMultipleTabsDetected?.()
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Nettoyage lors de la fermeture de l'onglet
    const handleBeforeUnload = () => {
      console.log(`🔧 useTabDetection: Nettoyage pour ${storageKey} tabId ${tabId.current}`)
      const existingTabs = JSON.parse(localStorage.getItem(storageKey) || '{}')
      delete existingTabs[tabId.current!]

      if (Object.keys(existingTabs).length === 0) {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, JSON.stringify(existingTabs))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Nettoyage
    return () => {
      console.log(`🔧 useTabDetection: Démontage pour ${storageKey} tabId ${tabId.current}`)

      if (heartbeatInterval.current) {
        window.clearInterval(heartbeatInterval.current)
      }

      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)

      // Supprimer cet onglet du localStorage
      const existingTabs = JSON.parse(localStorage.getItem(storageKey) || '{}')
      delete existingTabs[tabId.current!]

      if (Object.keys(existingTabs).length === 0) {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, JSON.stringify(existingTabs))
      }
    }
  }, [storageKey, warningMessage, onMultipleTabsDetected, hasMultipleTabs])

  return {
    hasMultipleTabs,
    tabId: tabId.current,
  }
}
