import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'home': { paramsTuple?: []; params?: {} }
    'dev.routes': { paramsTuple?: []; params?: {} }
    'admin.server-stats.index': { paramsTuple?: []; params?: {} }
    'auth.login.show': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.register.show': { paramsTuple?: []; params?: {} }
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'lobbies.index': { paramsTuple?: []; params?: {} }
    'lobbies.create': { paramsTuple?: []; params?: {} }
    'lobbies.store': { paramsTuple?: []; params?: {} }
    'lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.join': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.leave.close': { paramsTuple?: []; params?: {} }
    'lobbies.start': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.kick': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.transfer': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
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
    'api.lobbies.start': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.actions': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.players': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.action': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.games.catalog': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'home': { paramsTuple?: []; params?: {} }
    'dev.routes': { paramsTuple?: []; params?: {} }
    'admin.server-stats.index': { paramsTuple?: []; params?: {} }
    'auth.login.show': { paramsTuple?: []; params?: {} }
    'auth.register.show': { paramsTuple?: []; params?: {} }
    'lobbies.index': { paramsTuple?: []; params?: {} }
    'lobbies.create': { paramsTuple?: []; params?: {} }
    'lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.join.invite.show': { paramsTuple: [ParamValue]; params: {'invitationCode': ParamValue} }
    'api.auth.me': { paramsTuple?: []; params?: {} }
    'api.auth.check': { paramsTuple?: []; params?: {} }
    'api.games.catalog': { paramsTuple?: []; params?: {} }
    'api.lobbies.index': { paramsTuple?: []; params?: {} }
    'api.lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.actions': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.players': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.games.catalog': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'home': { paramsTuple?: []; params?: {} }
    'dev.routes': { paramsTuple?: []; params?: {} }
    'admin.server-stats.index': { paramsTuple?: []; params?: {} }
    'auth.login.show': { paramsTuple?: []; params?: {} }
    'auth.register.show': { paramsTuple?: []; params?: {} }
    'lobbies.index': { paramsTuple?: []; params?: {} }
    'lobbies.create': { paramsTuple?: []; params?: {} }
    'lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.join.invite.show': { paramsTuple: [ParamValue]; params: {'invitationCode': ParamValue} }
    'api.auth.me': { paramsTuple?: []; params?: {} }
    'api.auth.check': { paramsTuple?: []; params?: {} }
    'api.games.catalog': { paramsTuple?: []; params?: {} }
    'api.lobbies.index': { paramsTuple?: []; params?: {} }
    'api.lobbies.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.actions': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.players': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'admin.games.catalog': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'lobbies.store': { paramsTuple?: []; params?: {} }
    'lobbies.join': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.leave.close': { paramsTuple?: []; params?: {} }
    'lobbies.start': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.kick': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.transfer': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'games.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'lobbies.join.invite': { paramsTuple: [ParamValue]; params: {'invitationCode': ParamValue} }
    'api.lobbies.join': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.leave': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.lobbies.leave.close': { paramsTuple?: []; params?: {} }
    'api.lobbies.start': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.games.action': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}