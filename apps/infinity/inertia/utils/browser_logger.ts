/**
 * Browser-compatible logger
 *
 * Utilise console.log mais avec formatage structuré
 * Compatible avec les DevTools du navigateur
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class BrowserLogger {
  constructor(private context: string) {}

  private log(level: LogLevel, data: LogContext | string, message?: string) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] ${level.toUpperCase()} (${this.context}):`
    const style = this.getStyle(level)

    // Si data est une string, c'est le message
    if (typeof data === 'string') {
      console[level](`%c${prefix}`, style, data)
      return
    }

    // Si on a des données + message
    if (message) {
      console[level](`%c${prefix}`, style, message, data)
    } else {
      // Juste les données
      console[level](`%c${prefix}`, style, data)
    }
  }

  private getStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #888; font-weight: normal',
      info: 'color: #0066cc; font-weight: bold',
      warn: 'color: #ff9800; font-weight: bold',
      error: 'color: #f44336; font-weight: bold',
    }
    return styles[level]
  }

  debug(data: LogContext | string, message?: string) {
    // En dev seulement
    this.log('debug', data, message)
  }

  info(data: LogContext | string, message?: string) {
    this.log('info', data, message)
  }

  warn(data: LogContext | string, message?: string) {
    this.log('warn', data, message)
  }

  error(data: LogContext | string, message?: string) {
    this.log('error', data, message)
  }
}

/**
 * Créer un logger contextualisé pour le frontend
 */
export function createBrowserLogger(context: string): BrowserLogger {
  return new BrowserLogger(context)
}
