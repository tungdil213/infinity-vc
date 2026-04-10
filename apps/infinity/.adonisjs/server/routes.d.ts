import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'server-stats.api': { paramsTuple?: []; params?: {} }
    'server-stats.debug.config': { paramsTuple?: []; params?: {} }
    'server-stats.debug.diagnostics': { paramsTuple?: []; params?: {} }
    'server-stats.debug.queries': { paramsTuple?: []; params?: {} }
    'server-stats.debug.events': { paramsTuple?: []; params?: {} }
    'server-stats.debug.routes': { paramsTuple?: []; params?: {} }
    'server-stats.debug.queryExplain': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server-stats.debug.logs': { paramsTuple?: []; params?: {} }
    'server-stats.debug.emails': { paramsTuple?: []; params?: {} }
    'server-stats.debug.emailPreview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server-stats.debug.traces': { paramsTuple?: []; params?: {} }
    'server-stats.debug.traceDetail': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'home': { paramsTuple?: []; params?: {} }
    'dev.routes': { paramsTuple?: []; params?: {} }
    'auth.login.show': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.register.show': { paramsTuple?: []; params?: {} }
    'auth.register.validateInvitation': { paramsTuple?: []; params?: {} }
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'settings.show': { paramsTuple?: []; params?: {} }
    'invitations.index': { paramsTuple?: []; params?: {} }
    'invitations.generate': { paramsTuple?: []; params?: {} }
    'invitations.revoke': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'friends.index': { paramsTuple?: []; params?: {} }
    'friends.requests.send': { paramsTuple?: []; params?: {} }
    'friends.requests.accept': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'friends.requests.reject': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'friends.requests.cancel': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'friends.remove': { paramsTuple: [ParamValue]; params: {'friendUserUuid': ParamValue} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.password.update': { paramsTuple?: []; params?: {} }
    'lobbies.index': { paramsTuple?: []; params?: {} }
    'lobbies.create': { paramsTuple?: []; params?: {} }
    'lobbies.store': { paramsTuple?: []; params?: {} }
    'lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.join': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.leave.close': { paramsTuple?: []; params?: {} }
    'lobbies.heartbeat': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.start': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.kick': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.transfer': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.close': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.resume': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.join.invite.show': { paramsTuple: [ParamValue]; params: {'invitationCode': ParamValue} }
    'lobbies.join.invite': { paramsTuple: [ParamValue]; params: {'invitationCode': ParamValue} }
    'api.auth.me': { paramsTuple?: []; params?: {} }
    'api.auth.check': { paramsTuple?: []; params?: {} }
    'api.games.catalog': { paramsTuple?: []; params?: {} }
    'api.lobbies.index': { paramsTuple?: []; params?: {} }
    'api.lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.join': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.leave.close': { paramsTuple?: []; params?: {} }
    'api.lobbies.heartbeat': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.start': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.close': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.my.active': { paramsTuple?: []; params?: {} }
    'api.games.my.history': { paramsTuple?: []; params?: {} }
    'api.games.my.stats': { paramsTuple?: []; params?: {} }
    'api.friends.presence.index': { paramsTuple?: []; params?: {} }
    'api.friends.presence.heartbeat': { paramsTuple?: []; params?: {} }
    'api.friends.presence.offline': { paramsTuple?: []; params?: {} }
    'api.games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.replay': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.actions': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.players': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.action': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.lobbies.close': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.games.catalog': { paramsTuple?: []; params?: {} }
    'admin.games.replay.import': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.games.verification.metrics': { paramsTuple?: []; params?: {} }
    'admin.games.verification.metrics.reset': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'server-stats.api': { paramsTuple?: []; params?: {} }
    'server-stats.debug.config': { paramsTuple?: []; params?: {} }
    'server-stats.debug.diagnostics': { paramsTuple?: []; params?: {} }
    'server-stats.debug.queries': { paramsTuple?: []; params?: {} }
    'server-stats.debug.events': { paramsTuple?: []; params?: {} }
    'server-stats.debug.routes': { paramsTuple?: []; params?: {} }
    'server-stats.debug.queryExplain': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server-stats.debug.logs': { paramsTuple?: []; params?: {} }
    'server-stats.debug.emails': { paramsTuple?: []; params?: {} }
    'server-stats.debug.emailPreview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server-stats.debug.traces': { paramsTuple?: []; params?: {} }
    'server-stats.debug.traceDetail': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'home': { paramsTuple?: []; params?: {} }
    'dev.routes': { paramsTuple?: []; params?: {} }
    'auth.login.show': { paramsTuple?: []; params?: {} }
    'auth.register.show': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'settings.show': { paramsTuple?: []; params?: {} }
    'invitations.index': { paramsTuple?: []; params?: {} }
    'friends.index': { paramsTuple?: []; params?: {} }
    'lobbies.index': { paramsTuple?: []; params?: {} }
    'lobbies.create': { paramsTuple?: []; params?: {} }
    'lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.resume': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.join.invite.show': { paramsTuple: [ParamValue]; params: {'invitationCode': ParamValue} }
    'api.auth.me': { paramsTuple?: []; params?: {} }
    'api.auth.check': { paramsTuple?: []; params?: {} }
    'api.games.catalog': { paramsTuple?: []; params?: {} }
    'api.lobbies.index': { paramsTuple?: []; params?: {} }
    'api.lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.my.active': { paramsTuple?: []; params?: {} }
    'api.games.my.history': { paramsTuple?: []; params?: {} }
    'api.games.my.stats': { paramsTuple?: []; params?: {} }
    'api.friends.presence.index': { paramsTuple?: []; params?: {} }
    'api.games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.replay': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.actions': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.players': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.games.catalog': { paramsTuple?: []; params?: {} }
    'admin.games.verification.metrics': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'server-stats.api': { paramsTuple?: []; params?: {} }
    'server-stats.debug.config': { paramsTuple?: []; params?: {} }
    'server-stats.debug.diagnostics': { paramsTuple?: []; params?: {} }
    'server-stats.debug.queries': { paramsTuple?: []; params?: {} }
    'server-stats.debug.events': { paramsTuple?: []; params?: {} }
    'server-stats.debug.routes': { paramsTuple?: []; params?: {} }
    'server-stats.debug.queryExplain': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server-stats.debug.logs': { paramsTuple?: []; params?: {} }
    'server-stats.debug.emails': { paramsTuple?: []; params?: {} }
    'server-stats.debug.emailPreview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server-stats.debug.traces': { paramsTuple?: []; params?: {} }
    'server-stats.debug.traceDetail': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'home': { paramsTuple?: []; params?: {} }
    'dev.routes': { paramsTuple?: []; params?: {} }
    'auth.login.show': { paramsTuple?: []; params?: {} }
    'auth.register.show': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'settings.show': { paramsTuple?: []; params?: {} }
    'invitations.index': { paramsTuple?: []; params?: {} }
    'friends.index': { paramsTuple?: []; params?: {} }
    'lobbies.index': { paramsTuple?: []; params?: {} }
    'lobbies.create': { paramsTuple?: []; params?: {} }
    'lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.resume': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.join.invite.show': { paramsTuple: [ParamValue]; params: {'invitationCode': ParamValue} }
    'api.auth.me': { paramsTuple?: []; params?: {} }
    'api.auth.check': { paramsTuple?: []; params?: {} }
    'api.games.catalog': { paramsTuple?: []; params?: {} }
    'api.lobbies.index': { paramsTuple?: []; params?: {} }
    'api.lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.my.active': { paramsTuple?: []; params?: {} }
    'api.games.my.history': { paramsTuple?: []; params?: {} }
    'api.games.my.stats': { paramsTuple?: []; params?: {} }
    'api.friends.presence.index': { paramsTuple?: []; params?: {} }
    'api.games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.replay': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.actions': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.players': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.games.catalog': { paramsTuple?: []; params?: {} }
    'admin.games.verification.metrics': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.register.validateInvitation': { paramsTuple?: []; params?: {} }
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'invitations.generate': { paramsTuple?: []; params?: {} }
    'invitations.revoke': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'friends.requests.send': { paramsTuple?: []; params?: {} }
    'friends.requests.accept': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'friends.requests.reject': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'friends.requests.cancel': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'friends.remove': { paramsTuple: [ParamValue]; params: {'friendUserUuid': ParamValue} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.password.update': { paramsTuple?: []; params?: {} }
    'lobbies.store': { paramsTuple?: []; params?: {} }
    'lobbies.join': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.leave.close': { paramsTuple?: []; params?: {} }
    'lobbies.heartbeat': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.start': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.kick': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.transfer': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.close': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.join.invite': { paramsTuple: [ParamValue]; params: {'invitationCode': ParamValue} }
    'api.lobbies.join': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.leave.close': { paramsTuple?: []; params?: {} }
    'api.lobbies.heartbeat': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.start': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.close': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.friends.presence.heartbeat': { paramsTuple?: []; params?: {} }
    'api.friends.presence.offline': { paramsTuple?: []; params?: {} }
    'api.games.action': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.lobbies.close': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.games.replay.import': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.games.verification.metrics.reset': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}