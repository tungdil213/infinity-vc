export const deMessages = {
  'common.language': 'Sprache',
  'common.startGame': 'Spiel starten',
  'common.starting': 'Startet...',
  'language.en': 'Englisch',
  'language.fr': 'Französisch',
  'language.de': 'Deutsch',

  'guard.leaveLobbyConfirm': 'Du bist aktuell in einer Lobby. Möchtest du sie wirklich verlassen?',
  'guard.autoLeaveSuccess': 'Du hast die Lobby "{lobbyName}" automatisch verlassen',
  'guard.autoLeaveError': 'Automatisches Verlassen der Lobby fehlgeschlagen',
  'guard.leaveLobbyError': 'Fehler beim Verlassen der Lobby',

  'sidebar.currentLobby': 'Aktuelle Lobby',
  'sidebar.disconnected': 'Getrennt',
  'sidebar.playersCount': '{current}/{max} Spieler',
  'sidebar.openLobby': 'Lobby öffnen',
  'sidebar.leaveLobby': 'Lobby verlassen',
  'sidebar.leaving': 'Wird verlassen...',
  'sidebar.leaveSuccess': 'Du hast die Lobby erfolgreich verlassen',
  'sidebar.leaveError': 'Lobby konnte nicht verlassen werden',
  'sidebar.notice':
    'Du bist aktuell in dieser Lobby. Verlasse sie, bevor du einer anderen beitrittst.',
  'status.waiting': 'Wartet',
  'status.inProgress': 'Läuft',
  'status.finished': 'Beendet',

  'error.server.unexpected': 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',

  'devRoutes.pageTitle': 'Entwicklungsrouten - infinity Game',
  'devRoutes.heading': 'Entwicklungsrouten',
  'devRoutes.subtitle':
    'Vollständige Liste der verfügbaren Routen in der infinity-Game-Anwendung',
  'devRoutes.backHome': 'Zurück zur Startseite',
  'devRoutes.warningTitle': 'Nur für Entwicklung',
  'devRoutes.warningBody':
    'Diese Seite ist nur im Entwicklungsmodus verfügbar und in Produktion nicht zugänglich.',
  'devRoutes.quickActions': 'Schnellaktionen',
  'devRoutes.login': 'Anmelden',
  'devRoutes.signup': 'Registrieren',
  'devRoutes.lobbies': 'Lobbys',

  'lobbies.unableJoin': 'Beitritt zur Lobby nicht möglich',
  'lobbies.joined': 'Lobby erfolgreich beigetreten',
  'lobbies.unexpectedError': 'Ein unerwarteter Fehler ist aufgetreten',
  'lobbies.left': 'Lobby erfolgreich verlassen',
  'lobbies.unableLeave': 'Lobby konnte nicht verlassen werden',
  'lobbies.linkCopied': 'Lobby-Link kopiert',
  'lobbies.unableCopyLink': 'Lobby-Link konnte nicht kopiert werden',
  'lobbies.gameStarted': 'Spiel gestartet',
  'lobbies.unableStartGame': 'Spiel konnte nicht gestartet werden',
  'lobbies.playerRemoved': 'Spieler entfernt',
  'lobbies.unableRemovePlayer': 'Spieler konnte nicht entfernt werden',
  'lobbies.closeConfirm': 'Diese Lobby schließen? Diese Aktion ist nur für Moderation vorgesehen.',
  'lobbies.closeReasonPrompt': 'Schließungsgrund (optional)',
  'lobbies.unableClose': 'Lobby konnte nicht geschlossen werden',
  'lobbies.closedByModeration': 'Lobby durch Moderation geschlossen',
  'lobbies.unknownError': 'Unbekannter Fehler',
  'lobbies.unableCloseSome': 'Einige Lobbys konnten nicht geschlossen werden',
  'lobbies.bulkCloseFailed': 'Massen-Schließen fehlgeschlagen',

  'notifications.lobbyFullTitle': 'Lobby ist voll: {lobbyName}',
  'notifications.lobbyFullDescription':
    'Deine Lobby "{lobbyName}" ist jetzt voll ({current}/{max}). Du kannst das Spiel starten.',
  'notifications.lobbyFullDescriptionWithPlayer':
    '{playerName} ist "{lobbyName}" beigetreten ({current}/{max}). Du kannst das Spiel starten.',
  'notifications.openLobby': 'Öffnen',
  'notifications.lobbyFallbackName': 'Lobby',
} as const
