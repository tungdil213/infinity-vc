import React, { useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import { Toaster } from '@infinity.dev/ui/primitives/sonner'
import { Footer } from '@infinity.dev/ui/components/footer'
import { ToastHandler } from './toast_handler'
import { LobbyStatusSidebar } from './LobbyStatusSidebar'
import { AutoLeaveLobby } from './AutoLeaveLobby'
import { LobbyOwnerNotifications } from './LobbyOwnerNotifications'
import { TransmitProvider } from '../contexts/TransmitContext'
import { disposeLobbyService } from '../hooks/use_lobby_service'
import { HeaderWrapper } from './HeaderWrapper'
import { useI18n } from '../i18n/use_i18n'

// Flash messages component using Sonner
function FlashMessages() {
  const { props } = usePage()
  const flash = props.flash as { success?: string; error?: string } | undefined

  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success)
    }

    if (flash?.error) {
      toast.error(flash.error)
    }
  }, [flash])

  return null
}

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useI18n()
  const { props, component } = usePage()
  const rawUser = props.user as
    | {
        uuid?: string
        fullName?: string
        nickName?: string
        email?: string
      }
    | null
    | undefined

  const userUuid = typeof rawUser?.uuid === 'string' ? rawUser.uuid : undefined
  const userDisplayName =
    typeof rawUser?.fullName === 'string' && rawUser.fullName.trim().length > 0
      ? rawUser.fullName
      : typeof rawUser?.nickName === 'string' && rawUser.nickName.trim().length > 0
        ? rawUser.nickName
        : undefined

  const headerUser =
    userUuid && userDisplayName
      ? {
          uuid: userUuid,
          fullName: userDisplayName,
          email: typeof rawUser?.email === 'string' ? rawUser.email : '',
        }
      : undefined

  const isRealtimeEnabled = Boolean(userUuid)
  const rawCurrentLobby = props.currentLobby as
    | {
        uuid?: string
        name?: string
        status?: string
        currentPlayers?: number
        maxPlayers?: number
        canStart?: boolean
        isOwner?: boolean
        createdBy?: string
        isPrivate?: boolean
        hasPassword?: boolean
      }
    | null
    | undefined
  const currentLobby = rawCurrentLobby?.uuid
    ? {
        uuid: rawCurrentLobby.uuid,
        name: rawCurrentLobby.name ?? '',
        status: rawCurrentLobby.status ?? 'WAITING',
        currentPlayers:
          typeof rawCurrentLobby.currentPlayers === 'number' ? rawCurrentLobby.currentPlayers : 0,
        maxPlayers: typeof rawCurrentLobby.maxPlayers === 'number' ? rawCurrentLobby.maxPlayers : 0,
        canStart: rawCurrentLobby.canStart,
        isOwner: rawCurrentLobby.isOwner,
        createdBy: rawCurrentLobby.createdBy,
        isPrivate: rawCurrentLobby.isPrivate,
        hasPassword: rawCurrentLobby.hasPassword,
      }
    : null

  const footerSections = [
    {
      title: t('footer.quickLinks'),
      links: [
        { href: '/lobbies', label: t('footer.browseLobbies') },
        { href: '/auth/register', label: t('footer.signUp') },
        { href: '/auth/login', label: t('footer.login') },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { href: '#', label: t('footer.helpCenter') },
        { href: '#', label: t('footer.contactUs') },
        { href: '#', label: t('footer.privacyPolicy') },
      ],
    },
  ]
  const shouldHideLobbySidebar = component === 'lobby'

  useEffect(() => {
    return () => {
      disposeLobbyService()
    }
  }, [])

  return (
    <TransmitProvider enabled={isRealtimeEnabled}>
      <div className="min-h-screen flex flex-col bg-secondary-background text-foreground">
        <HeaderWrapper user={headerUser} currentLobby={currentLobby ?? undefined} />

        <main className="flex flex-1 flex-col">{children}</main>

        <Footer
          description={t('footer.description')}
          sections={footerSections}
          copyright={t('footer.copyright')}
        />
      </div>

      <FlashMessages />
      <ToastHandler />
      {!shouldHideLobbySidebar && (
        <LobbyStatusSidebar
          currentLobby={currentLobby}
          currentUser={
            userUuid
              ? {
                  uuid: userUuid,
                  fullName: userDisplayName ?? '',
                }
              : undefined
          }
        />
      )}
      <LobbyOwnerNotifications userUuid={userUuid} />
      <AutoLeaveLobby currentLobby={currentLobby} enabled={true} />
      <Toaster />
    </TransmitProvider>
  )
}
