import { router } from '@inertiajs/react'
import { Header } from '@infinity.dev/ui/components/header'
import { useTransmit } from '../contexts/TransmitContext'
import { disposeLobbyService } from '../hooks/use_lobby_service'
import { useI18n } from '../i18n/use_i18n'

interface User {
  uuid: string
  fullName: string
  email: string
}

interface CurrentLobby {
  uuid: string
  name: string
  status: string
  currentPlayers: number
  maxPlayers: number
}

interface HeaderWrapperProps {
  user?: User
  currentLobby?: CurrentLobby
  className?: string
}

export function HeaderWrapper({ user, currentLobby, className }: HeaderWrapperProps) {
  const { isConnected, unsubscribeAll } = useTransmit()
  const { locale, setLocale, supportedLocales, t } = useI18n()

  const handleCreateLobby = () => {
    router.visit('/lobbies/create')
  }

  const handleJoinByCode = async (code: string) => {
    if (!user) throw new Error('User not available')

    await new Promise<void>((resolve, reject) => {
      router.post(
        `/lobbies/${code}/join`,
        {},
        {
          onSuccess: () => {
            router.visit(`/lobbies/${code}`)
            resolve()
          },
          onError: (errors) => {
            const errorMessage =
              typeof errors === 'object' && errors !== null && 'error' in errors
                ? String((errors as { error: string }).error)
                : t('lobbies.unableJoin')

            reject(new Error(errorMessage))
          },
        }
      )
    })
  }

  const handleGoToCurrentLobby = () => {
    if (currentLobby) {
      router.visit(`/lobbies/${currentLobby.uuid}`)
    }
  }

  const handleGoToLobbies = () => {
    router.visit('/lobbies')
  }

  const handleLogin = () => {
    router.visit('/auth/login')
  }

  const handleRegister = () => {
    router.visit('/auth/register')
  }

  const handleLogout = async () => {
    try {
      disposeLobbyService()
      await unsubscribeAll()
    } finally {
      router.post('/auth/logout')
    }
  }

  const handleProfile = () => {
    // TODO: Implement profile page
    console.log('Profile clicked')
  }

  const handleSettings = () => {
    // TODO: Implement settings page
    console.log('Settings clicked')
  }

  return (
    <Header
      user={user}
      currentLobby={currentLobby}
      isConnected={isConnected}
      className={className}
      locale={locale}
      availableLocales={supportedLocales.map((value) => ({
        value,
        label: t(`language.${value}`),
      }))}
      localeLabel={t('common.language')}
      labels={{
        connectionConnected: t('header.connected'),
        connectionDisconnected: t('header.disconnected'),
        createAction: t('header.create'),
        joinAction: t('header.join'),
        joinDialogTitle: t('header.joinDialogTitle'),
        joinDialogDescription: t('header.joinDialogDescription'),
        joinCodeLabel: t('header.joinCodeLabel'),
        joinCodePlaceholder: t('header.joinCodePlaceholder'),
        joinSubmit: t('header.join'),
        joining: t('header.joining'),
        lobbiesAction: t('header.lobbies'),
        profile: t('header.profile'),
        settings: t('header.settings'),
        logout: t('header.logout'),
        browseLobbies: t('header.browseLobbies'),
        lobbiesShort: t('header.lobbies'),
        login: t('header.login'),
        signup: t('header.signup'),
      }}
      onLocaleChange={(nextLocale) => {
        const matchedLocale = supportedLocales.find((value) => value === nextLocale)
        if (matchedLocale) {
          setLocale(matchedLocale)
        }
      }}
      onCreateLobby={handleCreateLobby}
      onJoinByCode={handleJoinByCode}
      onGoToCurrentLobby={handleGoToCurrentLobby}
      onGoToLobbies={handleGoToLobbies}
      onLogin={handleLogin}
      onRegister={handleRegister}
      onLogout={handleLogout}
      onProfile={handleProfile}
      onSettings={handleSettings}
    />
  )
}
