type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  details?: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

class RendererLogger {
  private minLevel: LogLevel

  constructor() {
    this.minLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel]
  }

  private sendToMain(entry: LogEntry): void {
    // 发送日志到主进程
    if (typeof window !== 'undefined' && window.electronAPI) {
      // 使用 IPC 发送日志到主进程
      // 这里我们通过一个自定义事件来发送，主进程可以监听
      try {
        const event = new CustomEvent('renderer-log', {
          detail: entry
        })
        window.dispatchEvent(event)
      } catch {
        // 忽略发送错误
      }
    }
  }

  private log(level: LogLevel, message: string, details?: unknown): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    }

    // 输出到控制台
    const consoleMethod = level === 'error' ? console.error :
                         level === 'warn' ? console.warn :
                         level === 'debug' ? console.debug : console.log
    consoleMethod(`[BliPod Renderer] [${level.toUpperCase()}]`, message, details || '')

    // 发送到主进程记录
    this.sendToMain(entry)
  }

  debug(message: string, details?: unknown): void {
    this.log('debug', message, details)
  }

  info(message: string, details?: unknown): void {
    this.log('info', message, details)
  }

  warn(message: string, details?: unknown): void {
    this.log('warn', message, details)
  }

  error(message: string, details?: unknown): void {
    this.log('error', message, details)
  }
}

// 单例模式
let loggerInstance: RendererLogger | null = null

export function getLogger(): RendererLogger {
  if (!loggerInstance) {
    loggerInstance = new RendererLogger()
  }
  return loggerInstance
}

export const logger = {
  debug: (message: string, details?: unknown) => getLogger().debug(message, details),
  info: (message: string, details?: unknown) => getLogger().info(message, details),
  warn: (message: string, details?: unknown) => getLogger().warn(message, details),
  error: (message: string, details?: unknown) => getLogger().error(message, details)
}
