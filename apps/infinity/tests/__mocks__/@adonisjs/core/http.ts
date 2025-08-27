// Mock for @adonisjs/core/http
export interface HttpContext {
  request: any
  response: any
  session: any
  auth: any
}

export class HttpContextContract implements HttpContext {
  request: any = {}
  response: any = {}
  session: any = {}
  auth: any = {}
}
