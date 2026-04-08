import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '@infinity.dev/ui/primitives/button'
import { Input } from '@infinity.dev/ui/primitives/input'
import { Textarea } from '@infinity.dev/ui/primitives/textarea'
import { Label } from '@infinity.dev/ui/primitives/label'
import { Checkbox } from '@infinity.dev/ui/primitives/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@infinity.dev/ui/primitives/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
import { Alert, AlertDescription } from '@infinity.dev/ui/primitives/alert'
import Layout from '../layouts/layout'
import { AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react'
import { useI18n } from '../i18n/use_i18n'
import type { AvailableGameViewModel } from '../../shared/game_definition_helpers'

function buildDefaultGameSettings(availableGame: AvailableGameViewModel | null | undefined) {
  return Object.fromEntries((availableGame?.settings ?? []).map((field) => [field.key, field.defaultValue]))
}

interface CreateLobbyProps {
  availableGames: AvailableGameViewModel[]
  errors?: {
    name?: string[]
    gameType?: string[]
    maxPlayers?: string[]
    password?: string[]
    gameSettings?: string[]
    general?: string[]
  }
  flash?: {
    error?: string
    success?: string
  }
}

export default function CreateLobby({
  availableGames,
  errors = {},
  flash = {},
}: CreateLobbyProps) {
  const { t } = useI18n()
  const defaultGame = availableGames[0]
  const [formData, setFormData] = useState({
    name: '',
    maxPlayers: defaultGame ? Math.max(2, defaultGame.minPlayers) : 2,
    isPrivate: false,
    hasPassword: false,
    password: '',
    description: '',
    gameType: defaultGame?.id ?? '',
    gameSettings: buildDefaultGameSettings(defaultGame),
  })
  const [isLoading, setIsLoading] = useState(false)

  const selectedGame =
    availableGames.find((game) => game.id === formData.gameType) ?? availableGames[0] ?? null
  const selectedGameSettings = selectedGame?.settings ?? []
  const hasConfigurableSettings = selectedGameSettings.length > 0
  const playerOptions = selectedGame
    ? Array.from(
        { length: selectedGame.maxPlayers - selectedGame.minPlayers + 1 },
        (_, index) => selectedGame.minPlayers + index
      )
    : [2, 3, 4]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const submitData = {
      ...formData,
      password: formData.hasPassword ? formData.password : undefined,
      gameSettings: hasConfigurableSettings ? formData.gameSettings : undefined,
    }

    router.post('/lobbies', submitData, {
      onFinish: () => setIsLoading(false),
      onSuccess: () => {
        // Redirect will be handled by the server
      },
    })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }))
    } else if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  return (
    <Layout>
      <Head title={t('createLobby.pageTitle')} />

      <div className="flex-1 bg-secondary-background">
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Flash Messages */}
          {flash.error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{flash.error}</AlertDescription>
            </Alert>
          )}

          {flash.success && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{flash.success}</AlertDescription>
            </Alert>
          )}

          {/* Create Lobby Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{t('createLobby.heading')}</CardTitle>
              <CardDescription>
                {t('createLobby.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Lobby Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">{t('createLobby.nameLabel')}</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t('createLobby.namePlaceholder')}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">{t('createLobby.descriptionLabel')}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder={t('createLobby.descriptionPlaceholder')}
                  />
                </div>

                {/* Game Type */}
                <div className="space-y-2">
                  <Label>{t('createLobby.gameTypeLabel')}</Label>
                  <Select
                    value={formData.gameType}
                    onValueChange={(value) => {
                      const nextGame = availableGames.find((game) => game.id === value)
                      setFormData((prev) => ({
                        ...prev,
                        gameType: value,
                        maxPlayers: nextGame
                          ? Math.min(
                              Math.max(prev.maxPlayers, nextGame.minPlayers),
                              nextGame.maxPlayers
                            )
                          : prev.maxPlayers,
                        gameSettings: nextGame
                          ? buildDefaultGameSettings(nextGame)
                          : prev.gameSettings,
                      }))
                    }}
                  >
                    <SelectTrigger className={errors.gameType ? 'border-destructive' : ''}>
                      <SelectValue placeholder={t('createLobby.gameTypePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGames.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.gameType && (
                    <p className="text-sm text-destructive">{errors.gameType[0]}</p>
                  )}
                  {selectedGame && (
                    <p className="text-sm text-muted-foreground">
                      {selectedGame.description} ({selectedGame.minPlayers}-
                      {selectedGame.maxPlayers} {t('createLobby.playersSuffix')})
                    </p>
                  )}
                </div>

                {/* Max Players */}
                <div className="space-y-2">
                  <Label>{t('createLobby.maxPlayersLabel')}</Label>
                  <Select
                    value={String(formData.maxPlayers)}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, maxPlayers: parseInt(value) }))
                    }
                  >
                    <SelectTrigger className={errors.maxPlayers ? 'border-destructive' : ''}>
                      <SelectValue placeholder={t('createLobby.maxPlayersPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {playerOptions.map((count) => (
                        <SelectItem key={count} value={String(count)}>
                          {count} {t('createLobby.playersSuffix')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.maxPlayers && (
                    <p className="text-sm text-destructive">{errors.maxPlayers[0]}</p>
                  )}
                </div>

                {hasConfigurableSettings && (
                  <div className="space-y-4">
                    <Label className="text-base font-heading">{t('createLobby.gameSettingsTitle')}</Label>
                    {selectedGameSettings.map((field) => {
                      const fieldValue = formData.gameSettings[field.key] ?? field.defaultValue

                      if (field.type === 'boolean') {
                        return (
                          <div key={field.key} className="flex items-center space-x-3">
                            <Checkbox
                              id={field.key}
                              checked={Boolean(fieldValue)}
                              onCheckedChange={(checked) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  gameSettings: {
                                    ...prev.gameSettings,
                                    [field.key]: !!checked,
                                  },
                                }))
                              }
                            />
                            <div>
                              <Label htmlFor={field.key} className="cursor-pointer">
                                {field.label}
                              </Label>
                              {field.description && (
                                <p className="text-sm text-muted-foreground">
                                  {field.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      }

                      if (field.type === 'select') {
                        return (
                          <div key={field.key} className="space-y-2">
                            <Label htmlFor={field.key}>{field.label}</Label>
                            <Select
                              value={String(fieldValue ?? '')}
                              onValueChange={(value) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  gameSettings: {
                                    ...prev.gameSettings,
                                    [field.key]: value,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={field.label} />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options ?? []).map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {field.description && (
                              <p className="text-sm text-muted-foreground">{field.description}</p>
                            )}
                          </div>
                        )
                      }

                      return (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={field.key}>{field.label}</Label>
                          <Input
                            id={field.key}
                            name={field.key}
                            type={field.type === 'number' ? 'number' : 'text'}
                            min={field.type === 'number' ? field.min : undefined}
                            max={field.type === 'number' ? field.max : undefined}
                            value={
                              field.type === 'number'
                                ? typeof fieldValue === 'number'
                                  ? fieldValue
                                  : String(fieldValue ?? '')
                                : String(fieldValue ?? '')
                            }
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                gameSettings: {
                                  ...prev.gameSettings,
                                  [field.key]:
                                    field.type === 'number'
                                      ? event.target.value === ''
                                        ? ''
                                        : Number(event.target.value)
                                      : event.target.value,
                                },
                              }))
                            }
                          />
                          {field.description && (
                            <p className="text-sm text-muted-foreground">{field.description}</p>
                          )}
                        </div>
                      )
                    })}

                    {errors.gameSettings && (
                      <p className="text-sm text-destructive">{errors.gameSettings[0]}</p>
                    )}
                  </div>
                )}

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <Label className="text-base font-heading">{t('createLobby.privacyTitle')}</Label>

                  {/* Private Lobby */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="isPrivate"
                      checked={formData.isPrivate}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, isPrivate: !!checked }))
                      }
                    />
                    <div>
                      <Label htmlFor="isPrivate" className="cursor-pointer">
                        {t('createLobby.privateLabel')}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t('createLobby.privateHelp')}
                      </p>
                    </div>
                  </div>

                  {/* Password Protection */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="hasPassword"
                      checked={formData.hasPassword}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, hasPassword: !!checked }))
                      }
                    />
                    <div>
                      <Label htmlFor="hasPassword" className="cursor-pointer">
                        {t('createLobby.passwordProtectionLabel')}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t('createLobby.passwordProtectionHelp')}
                      </p>
                    </div>
                  </div>

                  {/* Password Field */}
                  {formData.hasPassword && (
                    <div className="ml-7 space-y-2">
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={t('createLobby.passwordPlaceholder')}
                        className={errors.password ? 'border-destructive' : ''}
                      />
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password[0]}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* General Errors */}
                {errors.general && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.general[0]}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? t('createLobby.creating') : t('createLobby.createCta')}
                  </Button>

                  <Link href="/lobbies" className="flex-1">
                    <Button variant="neutral" className="w-full">
                      {t('createLobby.cancel')}
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tips */}
          <Alert className="mt-8">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              {t('createLobby.proTips')}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Layout>
  )
}
