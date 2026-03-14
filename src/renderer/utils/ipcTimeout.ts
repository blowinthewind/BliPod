import { logger } from './logger'

export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * 为 Promise 添加超时功能
 * @param promise 原始 Promise
 * @param timeoutMs 超时时间（毫秒）
 * @param errorMessage 超时错误消息
 * @returns 带超时的 Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = '操作超时'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage, timeoutMs))
    }, timeoutMs)

    promise
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * 为异步函数添加超时包装
 * @param fn 异步函数
 * @param timeoutMs 超时时间（毫秒）
 * @param errorMessage 超时错误消息
 * @returns 带超时的异步函数
 */
export function withTimeoutFn<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  timeoutMs: number = 30000,
  errorMessage?: string
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const operationName = fn.name || '匿名操作'
    const message = errorMessage || `${operationName} 超时`

    try {
      return await withTimeout(fn(...args), timeoutMs, message) as Awaited<ReturnType<T>>
    } catch (error) {
      if (error instanceof TimeoutError) {
        logger.error('IPC Timeout:', { operation: operationName, timeoutMs, error: error.message })
      }
      throw error
    }
  }
}

// 预定义的超时时间（毫秒）
export const IPC_TIMEOUTS = {
  // 搜索相关
  SEARCH: 45000,        // 搜索需要较长时间（45秒）
  SEARCH_NEXT_PAGE: 30000, // 翻页（30秒）

  // 播放相关
  PLAY_VIDEO: 15000,    // 播放视频（15秒）
  PLAYER_CONTROL: 5000, // 播放器控制（5秒）

  // 登录相关
  LOGIN_CHECK: 10000,   // 登录状态检查（10秒）
  LOGIN_START: 15000,   // 开始登录（15秒）
  LOGIN_QR_POLL: 5000,  // 二维码轮询（5秒）

  // 数据操作
  STORE_READ: 3000,     // 读取存储（3秒）
  STORE_WRITE: 5000,    // 写入存储（5秒）
  DATA_EXPORT: 10000,   // 数据导出（10秒）
  DATA_IMPORT: 10000,   // 数据导入（10秒）

  // 内存管理
  MEMORY_CLEANUP: 10000, // 内存清理（10秒）
  MEMORY_STATS: 3000,    // 获取内存统计（3秒）

  // 默认
  DEFAULT: 30000
} as const

/**
 * 使用预定义超时时间的包装函数
 */
export const ipcWithTimeout = {
  // 搜索
  search: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.SEARCH, '搜索请求超时，请重试'),
  searchNextPage: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.SEARCH_NEXT_PAGE, '翻页请求超时，请重试'),

  // 播放
  playVideo: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.PLAY_VIDEO, '播放请求超时'),
  playerControl: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.PLAYER_CONTROL, '播放器控制超时'),

  // 登录
  loginCheck: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.LOGIN_CHECK, '登录状态检查超时'),
  loginStart: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.LOGIN_START, '登录启动超时'),

  // 存储
  storeRead: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.STORE_READ, '数据读取超时'),
  storeWrite: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.STORE_WRITE, '数据写入超时'),

  // 数据导入导出
  dataExport: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.DATA_EXPORT, '数据导出超时'),
  dataImport: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.DATA_IMPORT, '数据导入超时'),

  // 内存
  memoryCleanup: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.MEMORY_CLEANUP, '内存清理超时'),
  memoryStats: <T>(promise: Promise<T>) => withTimeout(promise, IPC_TIMEOUTS.MEMORY_STATS, '获取内存统计超时'),

  // 自定义
  custom: withTimeout
}
