/**
 * 错误消息映射
 * 将技术错误转换为用户友好的消息
 */

// 网络相关错误
const NETWORK_ERRORS: Record<string, string> = {
  'timeout': '请求超时，请检查网络连接后重试',
  'network error': '网络连接失败，请检查网络设置',
  'failed to fetch': '无法连接到服务器，请检查网络',
  'econnrefused': '连接被拒绝，服务器可能不可用',
  'econnreset': '连接被重置，请稍后重试',
  'enotfound': '无法找到服务器，请检查网络',
  'etimedout': '连接超时，请检查网络后重试',
  'socket': '网络连接异常，请稍后重试',
  'abort': '请求已取消',
  'offline': '您当前处于离线状态，请检查网络连接'
}

// 搜索相关错误
const SEARCH_ERRORS: Record<string, string> = {
  'extractor script not found': '搜索脚本加载失败，请重启应用',
  'failed to extract search results': '搜索结果提取失败，请重试',
  'failed to click next page': '翻页失败，请重新搜索',
  'search view was destroyed': '搜索页面已超时关闭，请重新搜索',
  'search request failed': '搜索请求失败，请稍后重试',
  'search request timeout': '搜索请求超时，请检查网络后重试',
  'failed to load uploader videos': '当前无法获取该 UP 主的相关内容，请稍候再试',
  '风控': '当前无法获取相关内容，请稍候再试'
}

// 播放相关错误
const PLAYER_ERRORS: Record<string, string> = {
  'failed to play video': '视频播放失败，请重试',
  'failed to inject player styles': '播放器样式加载失败',
  'player control timeout': '播放器控制超时',
  'video not found': '视频不存在或已被删除',
  'video unavailable': '视频暂时无法播放'
}

// 登录相关错误
const LOGIN_ERRORS: Record<string, string> = {
  'failed to start login': '登录启动失败，请重试',
  'qr code expired': '二维码已过期，请重新获取',
  'login verification failed': '登录验证失败，请重试',
  'failed to get session': '获取登录会话失败，请重试',
  'failed to fetch user info': '获取用户信息失败，请重试',
  'not logged in': '您尚未登录，请先登录',
  'session expired': '登录已过期，请重新登录'
}

// 数据操作错误
const DATA_ERRORS: Record<string, string> = {
  'export cancelled': '导出已取消',
  'export failed': '数据导出失败，请重试',
  'import failed': '数据导入失败，请检查文件格式',
  'failed to load favorites': '加载收藏列表失败，请重试',
  'failed to save play position': '保存播放进度失败',
  'store read timeout': '数据读取超时，请重试',
  'store write timeout': '数据写入超时，请重试'
}

// 内存/性能错误
const MEMORY_ERRORS: Record<string, string> = {
  'memory cleanup error': '内存清理失败',
  'high memory usage': '内存使用过高，正在清理...',
  'out of memory': '内存不足，请关闭一些页面后重试'
}

const SEARCH_CONTEXT_ERRORS: Record<string, string> = {
  'extractor script not found': '当前无法获取搜索结果，请稍候再试',
  'failed to extract search results': '当前无法获取搜索结果，请稍候再试',
  'failed to click next page': '当前无法继续加载搜索结果，请重新搜索后再试',
  'no next page button found or button is disabled': '当前无法继续加载搜索结果，请重新搜索后再试',
  'search view was destroyed': '当前搜索已失效，请重新搜索',
  '搜索页面已超时关闭，请重新搜索': '当前搜索已失效，请重新搜索',
  '当前搜索已失效，请重新搜索': '当前搜索已失效，请重新搜索',
  'search request failed': '当前无法获取搜索结果，请稍候再试',
  'search request timeout': '搜索请求超时，请检查网络后重试',
  'bilibili 搜索接口返回异常': '当前无法获取搜索结果，请稍候再试',
  '账号未登录': '当前无法获取搜索结果，请稍候再试',
  '风控': '当前无法获取搜索结果，请稍候再试',
  '降级 dom 抓取也失败': '当前无法获取搜索结果，请稍候再试'
}

// 所有错误映射
const ALL_ERROR_MAPPINGS: Record<string, string> = {
  ...NETWORK_ERRORS,
  ...SEARCH_ERRORS,
  ...PLAYER_ERRORS,
  ...LOGIN_ERRORS,
  ...DATA_ERRORS,
  ...MEMORY_ERRORS
}

/**
 * 将技术错误转换为用户友好的消息
 * @param error 错误对象或错误消息
 * @param fallbackMessage 默认错误消息
 * @returns 用户友好的错误消息
 */
export function getUserFriendlyErrorMessage(
  error: unknown,
  fallbackMessage: string = '操作失败，请稍后重试'
): string {
  if (!error) {
    return fallbackMessage
  }

  // 获取错误消息
  const errorMessage = error instanceof Error
    ? error.message
    : String(error)

  const lowerMessage = errorMessage.toLowerCase()

  // 查找匹配的错误映射
  for (const [key, value] of Object.entries(ALL_ERROR_MAPPINGS)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value
    }
  }

  // 特殊错误处理
  if (lowerMessage.includes('timeout')) {
    return '请求超时，请检查网络连接后重试'
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return '网络连接异常，请检查网络设置'
  }

  // 返回原始错误或默认消息
  return errorMessage.length > 100
    ? fallbackMessage
    : errorMessage
}

export function getSearchFriendlyErrorMessage(
  error: unknown,
  fallbackMessage: string = '当前无法获取搜索结果，请稍候再试'
): string {
  if (!error) {
    return fallbackMessage
  }

  const errorMessage = error instanceof Error
    ? error.message
    : String(error)
  const lowerMessage = errorMessage.toLowerCase()

  for (const [key, value] of Object.entries(SEARCH_CONTEXT_ERRORS)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value
    }
  }

  return getUserFriendlyErrorMessage(error, fallbackMessage)
}

/**
 * 获取操作成功消息
 * @param operation 操作名称
 * @returns 成功消息
 */
export function getSuccessMessage(operation: string): string {
  const messages: Record<string, string> = {
    'favorite': '已添加到收藏',
    'unfavorite': '已从收藏移除',
    'addToPlaylist': '已添加到播放列表',
    'removeFromPlaylist': '已从播放列表移除',
    'createPlaylist': '播放列表创建成功',
    'deletePlaylist': '播放列表已删除',
    'updatePlaylist': '播放列表更新成功',
    'export': '数据导出成功',
    'import': '数据导入成功',
    'login': '登录成功',
    'logout': '已退出登录',
    'settings': '设置已保存'
  }

  return messages[operation] || '操作成功'
}

/**
 * 获取操作失败消息
 * @param operation 操作名称
 * @returns 失败消息
 */
export function getErrorMessage(operation: string): string {
  const messages: Record<string, string> = {
    'favorite': '添加收藏失败，请重试',
    'unfavorite': '移除收藏失败，请重试',
    'addToPlaylist': '添加到播放列表失败，请重试',
    'removeFromPlaylist': '从播放列表移除失败，请重试',
    'createPlaylist': '创建播放列表失败，请重试',
    'deletePlaylist': '删除播放列表失败，请重试',
    'updatePlaylist': '更新播放列表失败，请重试',
    'export': '数据导出失败，请重试',
    'import': '数据导入失败，请检查文件格式',
    'login': '登录失败，请重试',
    'logout': '退出登录失败',
    'settings': '保存设置失败，请重试',
    'search': '搜索失败，请重试',
    'play': '播放失败，请重试'
  }

  return messages[operation] || '操作失败，请稍后重试'
}

/**
 * 错误分类
 */
export enum ErrorCategory {
  NETWORK = 'network',
  SEARCH = 'search',
  PLAYER = 'player',
  LOGIN = 'login',
  DATA = 'data',
  MEMORY = 'memory',
  UNKNOWN = 'unknown'
}

/**
 * 获取错误分类
 * @param error 错误对象或错误消息
 * @returns 错误分类
 */
export function getErrorCategory(error: unknown): ErrorCategory {
  if (!error) {
    return ErrorCategory.UNKNOWN
  }

  const errorMessage = error instanceof Error
    ? error.message
    : String(error)

  const lowerMessage = errorMessage.toLowerCase()

  // 检查各类错误
  for (const key of Object.keys(NETWORK_ERRORS)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return ErrorCategory.NETWORK
    }
  }

  for (const key of Object.keys(SEARCH_ERRORS)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return ErrorCategory.SEARCH
    }
  }

  for (const key of Object.keys(PLAYER_ERRORS)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return ErrorCategory.PLAYER
    }
  }

  for (const key of Object.keys(LOGIN_ERRORS)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return ErrorCategory.LOGIN
    }
  }

  for (const key of Object.keys(DATA_ERRORS)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return ErrorCategory.DATA
    }
  }

  for (const key of Object.keys(MEMORY_ERRORS)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return ErrorCategory.MEMORY
    }
  }

  return ErrorCategory.UNKNOWN
}

/**
 * 判断错误是否可重试
 * @param error 错误对象或错误消息
 * @returns 是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  const category = getErrorCategory(error)

  // 网络、搜索、数据错误通常可以重试
  return [
    ErrorCategory.NETWORK,
    ErrorCategory.SEARCH,
    ErrorCategory.DATA
  ].includes(category)
}
