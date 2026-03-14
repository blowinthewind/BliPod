import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, appendFileSync, statSync, readdirSync, unlinkSync } from 'fs'

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

const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_LOG_DAYS = 7

class Logger {
  private logDir: string
  private currentLogFile: string
  private minLevel: LogLevel

  constructor() {
    this.logDir = join(app.getPath('logs'), 'blipod')
    this.minLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
    this.currentLogFile = this._getLogFilePath()
    this.ensureLogDir()
    this.cleanupOldLogs()
  }

  private ensureLogDir(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }
  }

  private _getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0]
    return join(this.logDir, `blipod-${date}.log`)
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel]
  }

  private formatMessage(entry: LogEntry): string {
    let message = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`
    if (entry.details !== undefined) {
      const detailsStr = typeof entry.details === 'object'
        ? JSON.stringify(entry.details, null, 2)
        : String(entry.details)
      message += `\nDetails: ${detailsStr}`
    }
    return message + '\n'
  }

  private writeToFile(entry: LogEntry): void {
    try {
      // 检查是否需要切换日志文件
      const newLogFile = this._getLogFilePath()
      if (newLogFile !== this.currentLogFile) {
        this.currentLogFile = newLogFile
        this.cleanupOldLogs()
      }

      // 检查文件大小
      if (existsSync(this.currentLogFile)) {
        const stats = statSync(this.currentLogFile)
        if (stats.size > MAX_LOG_FILE_SIZE) {
          // 备份当前日志
          const backupFile = this.currentLogFile.replace('.log', '.old.log')
          if (existsSync(backupFile)) {
            unlinkSync(backupFile)
          }
          // 重命名当前日志
          // 注意：这里简化处理，实际可能需要更复杂的轮转逻辑
        }
      }

      const formattedMessage = this.formatMessage(entry)
      appendFileSync(this.currentLogFile, formattedMessage, 'utf-8')
    } catch (error) {
      console.error('[Logger] Failed to write log:', error)
    }
  }

  private cleanupOldLogs(): void {
    try {
      if (!existsSync(this.logDir)) return

      const files = readdirSync(this.logDir)
      const now = Date.now()
      const maxAge = MAX_LOG_DAYS * 24 * 60 * 60 * 1000

      for (const file of files) {
        if (!file.startsWith('blipod-') || !file.endsWith('.log')) continue

        const filePath = join(this.logDir, file)
        const stats = statSync(filePath)
        const fileAge = now - stats.mtime.getTime()

        if (fileAge > maxAge) {
          unlinkSync(filePath)
        }
      }
    } catch (error) {
      console.error('[Logger] Failed to cleanup old logs:', error)
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

    // 同时输出到控制台
    const consoleMethod = level === 'error' ? console.error :
                         level === 'warn' ? console.warn :
                         level === 'debug' ? console.debug : console.log
    consoleMethod(`[BliPod] [${level.toUpperCase()}]`, message, details || '')

    // 写入文件
    this.writeToFile(entry)
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

  // 获取日志文件路径（用于导出日志）
  getCurrentLogFilePath(): string {
    return this.currentLogFile
  }

  // 获取所有日志文件
  getAllLogFiles(): string[] {
    try {
      if (!existsSync(this.logDir)) return []
      return readdirSync(this.logDir)
        .filter(f => f.startsWith('blipod-') && f.endsWith('.log'))
        .map(f => join(this.logDir, f))
    } catch {
      return []
    }
  }
}

// 单例模式
let loggerInstance: Logger | null = null

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger()
  }
  return loggerInstance
}

export const logger = {
  debug: (message: string, details?: unknown) => getLogger().debug(message, details),
  info: (message: string, details?: unknown) => getLogger().info(message, details),
  warn: (message: string, details?: unknown) => getLogger().warn(message, details),
  error: (message: string, details?: unknown) => getLogger().error(message, details),
  getLogFilePath: () => getLogger().getCurrentLogFilePath(),
  getAllLogFiles: () => getLogger().getAllLogFiles()
}
