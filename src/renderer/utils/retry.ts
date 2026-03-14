import { logger } from './logger'

export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries?: number
  /** 初始延迟时间（毫秒） */
  initialDelay?: number
  /** 最大延迟时间（毫秒） */
  maxDelay?: number
  /** 退避乘数 */
  backoffMultiplier?: number
  /** 是否使用指数退避 */
  useExponentialBackoff?: boolean
  /** 自定义重试条件 */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  /** 每次重试前的回调 */
  onRetry?: (error: unknown, attempt: number, nextDelay: number) => void
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: unknown
  ) {
    super(message)
    this.name = 'RetryError'
  }
}

/**
 * 计算下一次重试的延迟时间
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  useExponentialBackoff: boolean
): number {
  if (useExponentialBackoff) {
    // 指数退避: delay = initialDelay * (multiplier ^ attempt)
    const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1)
    return Math.min(delay, maxDelay)
  } else {
    // 线性退避: delay = initialDelay * attempt
    const delay = initialDelay * attempt
    return Math.min(delay, maxDelay)
  }
}

/**
 * 带重试机制的异步函数包装器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    useExponentialBackoff = true,
    shouldRetry = () => true,
    onRetry
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 检查是否应该重试
      if (attempt > maxRetries || !shouldRetry(error, attempt)) {
        break
      }

      // 计算下一次重试的延迟
      const nextDelay = calculateDelay(
        attempt,
        initialDelay,
        maxDelay,
        backoffMultiplier,
        useExponentialBackoff
      )

      logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${nextDelay}ms`, {
        error: error instanceof Error ? error.message : String(error)
      })

      // 调用重试回调
      if (onRetry) {
        onRetry(error, attempt, nextDelay)
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, nextDelay))
    }
  }

  // 所有重试都失败了
  const errorMessage = lastError instanceof Error
    ? lastError.message
    : String(lastError)

  throw new RetryError(
    `操作失败，已重试 ${maxRetries} 次: ${errorMessage}`,
    maxRetries,
    lastError
  )
}

/**
 * 创建带重试功能的函数包装器
 */
export function createRetryWrapper<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return withRetry(() => fn(...args), options) as Promise<Awaited<ReturnType<T>>>
  }
}

// 预定义的重试配置
export const RETRY_CONFIGS = {
  // 网络请求（指数退避）
  NETWORK: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    useExponentialBackoff: true
  },

  // 搜索请求（更长的超时）
  SEARCH: {
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    useExponentialBackoff: true
  },

  // 数据操作（线性退避）
  DATA_OPERATION: {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    useExponentialBackoff: false
  },

  // 登录相关（不重试或少量重试）
  LOGIN: {
    maxRetries: 1,
    initialDelay: 1000,
    maxDelay: 3000,
    backoffMultiplier: 1,
    useExponentialBackoff: false
  },

  // 快速重试（用于轻量级操作）
  QUICK: {
    maxRetries: 3,
    initialDelay: 200,
    maxDelay: 2000,
    backoffMultiplier: 2,
    useExponentialBackoff: true
  }
} as const

/**
 * 使用预定义配置的重试函数
 */
export const retryWithConfig = {
  network: <T>(fn: () => Promise<T>) => withRetry(fn, RETRY_CONFIGS.NETWORK),
  search: <T>(fn: () => Promise<T>) => withRetry(fn, RETRY_CONFIGS.SEARCH),
  dataOperation: <T>(fn: () => Promise<T>) => withRetry(fn, RETRY_CONFIGS.DATA_OPERATION),
  login: <T>(fn: () => Promise<T>) => withRetry(fn, RETRY_CONFIGS.LOGIN),
  quick: <T>(fn: () => Promise<T>) => withRetry(fn, RETRY_CONFIGS.QUICK),
  custom: withRetry
}

/**
 * 检查错误是否可重试（网络相关错误）
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // 网络相关错误
    const retryablePatterns = [
      'timeout',
      'network',
      'econnrefused',
      'econnreset',
      'enotfound',
      'etimedout',
      'socket',
      'fetch',
      'abort',
      'failed to fetch'
    ]

    return retryablePatterns.some(pattern => message.includes(pattern))
  }

  return false
}

/**
 * 创建带重试和超时的组合包装器
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions = {},
  timeoutMs: number = 30000
): Promise<T> {
  const { withTimeout } = await import('./ipcTimeout')

  return withRetry(
    () => withTimeout(fn(), timeoutMs),
    retryOptions
  )
}
