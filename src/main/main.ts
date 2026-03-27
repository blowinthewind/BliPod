import { app, BrowserWindow, session, ipcMain, BrowserView, dialog, nativeImage, shell } from 'electron'
import { createHash, randomBytes } from 'crypto'
import { join, resolve } from 'path'
import { readFileSync } from 'fs'
import type { SearchResult } from '../scripts/search-extractor'
import type {
  UserInfo,
  BiliAuthStatus,
  ExtractedVideo,
  UploaderInfo,
  AppSettings,
  AppStore,
  NativePlaybackState,
  NativeMenuCommand
} from '../preload/preload'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  getSettings,
  updateSettings,
  getPlayPosition,
  savePlayPosition,
  clearPlayPosition,
  getPlayStats,
  updateWatchTime,
  incrementPlayCount,
  getUserQueue,
  setUserQueue,
  addToUserQueue,
  removeFromUserQueue,
  clearUserQueue,
  moveUserQueueItem,
  exportData,
  importData,
  getLastVolume,
  setLastVolume,
  updateFavoriteDuration,
  updatePlaylistVideoDuration
} from './store'
import {
  exportDataToFile,
  importDataFromFile,
  getDataStats,
  getCategoryStats
} from './dataImportExport'
import type { ExportOptions, ImportOptionsV2 } from './dataImportExport'
import { logger } from './utils/logger'
import { createMacOSPlaybackControls } from './macosPlaybackControls'
import { formatPlayCount } from '../shared/format'
import { DEFAULT_RUNTIME_CONFIG } from '../shared/runtimeConfig'
import { getRuntimeConfig, loadRuntimeConfig } from './runtimeConfig'

let mainWindow: BrowserWindow | null = null
let searchView: BrowserView | null = null
let playerView: BrowserView | null = null
let extractorScript: string | null = null
let qrPollInterval: NodeJS.Timeout | null = null
let memoryCleanupInterval: NodeJS.Timeout | null = null
let searchViewLastUsed: number = 0
let playerViewLastUsed: number = 0
type SearchViewContext = 'search' | 'uploader'

let viewIdleTimeout: number = DEFAULT_RUNTIME_CONFIG.behavior.memory.searchViewIdleTimeoutMinutes * 60 * 1000
let lastSearchQuery: string = ''
let searchSessionState: SearchSessionState | null = null
let searchViewLoadContext: SearchViewContext = 'search'
let searchViewAutoExtractEnabled = false

const BILIBILI_SESSION = 'persist:bilibili'
const MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000
const isMac = process.platform === 'darwin'
const isDevelopment = Boolean(process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL)
const DISABLED_CHROMIUM_FEATURES = ['HardwareMediaKeyHandling']
const BILIBILI_DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const BILIBILI_DESKTOP_REFERRER = 'https://www.bilibili.com/'
const SEARCH_VIEW_DESKTOP_BOUNDS = { x: 0, y: 0, width: 1280, height: 900 }
const SPACE_PAGE_ORIGIN = 'https://space.bilibili.com'
const SEARCH_PAGE_ORIGIN = 'https://search.bilibili.com'
const SEARCH_PAGE_PATH = '/video'
const SEARCH_API_PAGE_SIZE = 42
const SEARCH_API_DYNAMIC_OFFSET_STEP = 30
const SEARCH_API_DEFAULT_WEB_LOCATION = 1430654
const UPLOADER_API_PAGE_SIZE = 40
const SEARCH_API_RESPONSE_ERROR = 'Bilibili 搜索接口返回异常'
const SEARCH_API_RISK_BLOCKED_ERROR = 'Bilibili 风控校验阻止了搜索接口访问'
const UPLOADER_NOT_LOGGED_IN_ERROR = '账号未登录'
const UPLOADER_RISK_BLOCKED_ERROR = 'Bilibili 风控校验阻止了 UP 主投稿接口访问'
const PLAYER_PROGRESS_CONSOLE_PREFIX = '__BLIPOD_PLAYER_PROGRESS__:'
const PLAYER_READY_CONSOLE_PREFIX = '__BLIPOD_PLAYER_READY__:'
const WBI_MIXIN_KEY_INDEXES = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
]

interface BilibiliApiResponse<T> {
  code: number
  message: string
  data?: T
}

interface BilibiliNavData {
  isLogin?: boolean
  mid?: number
  uname?: string
  face?: string
  sign?: string
  vipType?: number
  level_info?: {
    current_level?: number
  }
  wbi_img?: {
    img_url?: string
    sub_url?: string
  }
}

interface BilibiliUploaderInfoData {
  mid?: number
  name?: string
  face?: string
}

interface BilibiliUploaderVideoItem {
  bvid?: string
  title?: string
  pic?: string
  author?: string
  mid?: number | string
  length?: string
  play?: number | string
}

interface BilibiliUploaderVideoListData {
  list?: {
    vlist?: BilibiliUploaderVideoItem[]
  }
  page?: {
    pn?: number
    ps?: number
    count?: number
  }
  is_risk?: boolean
  gaia_res_type?: number
  gaia_data?: unknown
}

interface BilibiliSearchApiItem {
  type?: string
  author?: string
  mid?: number | string
  arcurl?: string
  bvid?: string
  title?: string
  pic?: string
  play?: number | string
  duration?: string
}

interface BilibiliSearchApiData {
  page?: number
  pagesize?: number
  numResults?: number
  numPages?: number
  result?: BilibiliSearchApiItem[]
  is_risk?: boolean
  gaia_res_type?: number
  gaia_data?: unknown
}

interface SearchPaginationState {
  page: number
  offset: number
}

interface SearchSessionState {
  query: string
  mode: 'api' | 'dom'
  pagination: SearchPaginationState
}

app.commandLine.appendSwitch('disable-features', DISABLED_CHROMIUM_FEATURES.join(','))
app.setName('BliPod')

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show()
  }

  mainWindow.focus()
}

function showShortcutHelp() {
  const options = {
    type: 'info' as const,
    buttons: ['知道了'],
    defaultId: 0,
    title: '快捷键',
    message: '应用快捷键',
    detail: [
      '前台播放控制',
      '• 播放 / 暂停：Space',
      '• 上一首：⌘←',
      '• 下一首：⌘→',
      '• 后退 15 秒：⌘J',
      '• 前进 30 秒：⌘L',
      '• 静音 / 取消静音：⌘M',
      '• 音量增加：⌘↑',
      '• 音量减少：⌘↓',
      '',
      '进度条聚焦时',
      '• 后退 5 秒：←',
      '• 前进 5 秒：→',
      '• 跳到开头：Home',
      '• 跳到结尾：End',
      '• 后退 15 秒：PageDown',
      '• 前进 15 秒：PageUp'
    ].join('\n')
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    void dialog.showMessageBox(mainWindow, options)
    return
  }

  void dialog.showMessageBox(options)
}


function sendNativeMenuCommand(command: NativeMenuCommand) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('native-player:command', command)
}

const macOSPlaybackControls = createMacOSPlaybackControls({
  isMac,
  isDevelopment,
  getMainWindow: () => mainWindow,
  showMainWindow,
  sendNativeMenuCommand,
  showShortcutHelp
})

const {
  refreshApplicationMenu,
  refreshTray,
  createTray,
  updateNativePlaybackState
} = macOSPlaybackControls

// 保留 Tray 原型实现，当前版本默认不启用。
void createTray

function getBilibiliSession() {
  return session.fromPartition(BILIBILI_SESSION)
}

async function loadSearchViewUrl(
  view: BrowserView,
  url: string,
  context: SearchViewContext = 'search',
  options: { autoExtract?: boolean } = {}
) {
  searchViewLoadContext = context
  searchViewAutoExtractEnabled = options.autoExtract ?? false

  return view.webContents.loadURL(url, {
    userAgent: BILIBILI_DESKTOP_USER_AGENT,
    httpReferrer: BILIBILI_DESKTOP_REFERRER
  })
}

function isNavigationAbortedError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ERR_ABORTED'
}

function getSearchViewContextLabel(context: SearchViewContext): string {
  return context === 'uploader' ? 'Uploader' : 'Search'
}

function getExtractorScript(): string {
  if (!extractorScript) {
    try {
      extractorScript = readFileSync(join(__dirname, '../scripts/inject-search.js'), 'utf-8')
    } catch (error) {
      logger.error('Failed to read extractor script:', error)
      extractorScript = ''
    }
  }
  return extractorScript
}

interface PlayerProgressPayload {
  currentTime: number
  duration: number
  paused: boolean
}

function normalizePlayerProgressPayload(value: unknown): PlayerProgressPayload | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Partial<PlayerProgressPayload>
  const currentTime = typeof payload.currentTime === 'number' && Number.isFinite(payload.currentTime)
    ? payload.currentTime
    : null
  const duration = typeof payload.duration === 'number' && Number.isFinite(payload.duration)
    ? payload.duration
    : null
  const paused = typeof payload.paused === 'boolean' ? payload.paused : null

  if (currentTime === null || duration === null || paused === null) {
    return null
  }

  return {
    currentTime,
    duration,
    paused
  }
}

function sendPlayerProgressToRenderer(payload: PlayerProgressPayload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  mainWindow.webContents.send('player:progress', payload)
}

function handlePlayerConsoleMessage(message: string) {
  if (message.startsWith(PLAYER_PROGRESS_CONSOLE_PREFIX)) {
    try {
      const payload = normalizePlayerProgressPayload(
        JSON.parse(message.slice(PLAYER_PROGRESS_CONSOLE_PREFIX.length))
      )

      if (payload) {
        playerViewLastUsed = Date.now()
        sendPlayerProgressToRenderer(payload)
      }
    } catch (error) {
      logger.debug('Failed to parse player progress payload:', error)
    }
    return
  }

  if (message.startsWith(PLAYER_READY_CONSOLE_PREFIX)) {
    playerViewLastUsed = Date.now()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('player:ready')
    }
  }
}

function startProgressTracking() {
  // 任务 C 已切换为媒体事件驱动桥；保留空函数是为了兼容现有调用点。
}

function stopProgressTracking() {
  // 任务 C 已切换为媒体事件驱动桥；保留空函数是为了兼容现有调用点。
}

function stopQrPoll() {
  if (qrPollInterval) {
    clearInterval(qrPollInterval)
    qrPollInterval = null
  }
}

function destroySearchView() {
  if (searchView) {
    logger.info('Destroying search view for memory cleanup')
    try {
      searchView.webContents.removeAllListeners()
      if (mainWindow) {
        const views = mainWindow.getBrowserViews()
        if (views.includes(searchView)) {
          mainWindow.removeBrowserView(searchView)
        }
      }
      searchView.webContents.close()
      searchView = null
      searchViewLoadContext = 'search'
      searchViewAutoExtractEnabled = false
    } catch (error) {
      logger.error('Error destroying search view:', error)
      searchView = null
      searchViewLoadContext = 'search'
      searchViewAutoExtractEnabled = false
    }
  }
}

function destroyPlayerView() {
  if (playerView) {
    logger.info('Destroying player view for memory cleanup')
    stopProgressTracking()
    try {
      playerView.webContents.removeAllListeners()
      if (mainWindow) {
        const views = mainWindow.getBrowserViews()
        if (views.includes(playerView)) {
          mainWindow.removeBrowserView(playerView)
        }
      }
      playerView.webContents.close()
      playerView = null
    } catch (error) {
      logger.error('Error destroying player view:', error)
      playerView = null
    }
  }
}

async function clearSessionCache() {
  try {
    const bilibiliSession = getBilibiliSession()
    await bilibiliSession.clearCache()
    logger.info('Session cache cleared')
  } catch (error) {
    logger.error('Error clearing session cache:', error)
  }
}

async function performMemoryCleanup() {
  logger.info('Performing memory cleanup...')

  const now = Date.now()

  // 如果 searchView 正在加载页面，不清理
  if (searchView && searchView.webContents.isLoading()) {
    logger.info('Search view is loading, skipping cleanup')
    return
  }

  // 只清理 searchView，保留 playerView（确保用户可以随时恢复播放）
  if (searchView && now - searchViewLastUsed > viewIdleTimeout) {
    logger.info('Search view idle timeout reached, destroying...')
    destroySearchView()
  }

  // 注意：playerView 不清理，确保用户长时间暂停后仍可恢复播放

  // 只在 searchView 存在时清理缓存（避免影响 playerView）
  if (searchView) {
    await clearSessionCache()
  }

  if (global.gc) {
    global.gc()
    logger.info('Manual GC triggered')
  }

  const memoryUsage = process.memoryUsage()
  logger.info('Memory usage after cleanup:', {
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
  })
}

function startMemoryManagement() {
  if (memoryCleanupInterval) {
    clearInterval(memoryCleanupInterval)
  }

  memoryCleanupInterval = setInterval(() => {
    performMemoryCleanup().catch((err) => {
      logger.error('Memory cleanup error:', err)
    })
  }, MEMORY_CLEANUP_INTERVAL)

  process.on('warning', (warning) => {
    if (warning.name === 'MaxListenersExceededWarning' || warning.message.includes('memory')) {
      logger.warn('Memory warning received:', warning.message)
      performMemoryCleanup().catch(() => {})
    }
  })

  const checkMemoryUsage = () => {
    const memoryUsage = process.memoryUsage()
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024
    const usageRatio = heapUsedMB / heapTotalMB

    if (usageRatio > 0.9) {
      logger.warn('High memory usage detected:', `${Math.round(usageRatio * 100)}%`)
      performMemoryCleanup().catch(() => {})
    }
  }

  setInterval(checkMemoryUsage, 60000)

  logger.info('Memory management started')
}

function stopMemoryManagement() {
  if (memoryCleanupInterval) {
    clearInterval(memoryCleanupInterval)
    memoryCleanupInterval = null
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: true
    }
  })

  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  refreshApplicationMenu()
  refreshTray()

  mainWindow.on('closed', () => {
    destroySearchView()
    destroyPlayerView()
    stopProgressTracking()
    stopQrPoll()
    stopMemoryManagement()
    mainWindow = null
    refreshApplicationMenu()
    refreshTray()
  })
}

function setupCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; " +
            "style-src 'self' 'unsafe-inline' https:; " +
            "img-src 'self' https: data: blob:; " +
            "connect-src 'self' https: ws:; " +
            "font-src 'self' data: https:; " +
            "media-src 'self' https: blob:; " +
            "frame-src 'self' https://www.bilibili.com https://player.bilibili.com https://search.bilibili.com https://passport.bilibili.com"
        ]
      }
    })
  })
}

function setupBilibiliImageReferer() {
  const bilibiliSession = getBilibiliSession()

  bilibiliSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = details.url
    if (url.includes('hdslb.com') || url.includes('bilivideo.com') || url.includes('biliapi.net')) {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          Referer: 'https://www.bilibili.com/'
        }
      })
    } else {
      callback({ requestHeaders: details.requestHeaders })
    }
  })

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = details.url
    if (url.includes('hdslb.com') || url.includes('bilivideo.com')) {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          Referer: 'https://www.bilibili.com/'
        }
      })
    } else {
      callback({ requestHeaders: details.requestHeaders })
    }
  })
}

async function createSearchView(): Promise<BrowserView> {
  if (searchView && mainWindow) {
    searchViewLastUsed = Date.now()
    return searchView
  }

  searchView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      session: getBilibiliSession(),
      webSecurity: false
    }
  })

  searchViewLastUsed = Date.now()
  searchView.setBounds(SEARCH_VIEW_DESKTOP_BOUNDS)
  searchView.webContents.setUserAgent(BILIBILI_DESKTOP_USER_AGENT)

  if (mainWindow) {
    mainWindow.setBrowserView(null)
  }

  searchView.webContents.on('did-finish-load', async () => {
    logger.info('Search view page finished loading')
    searchViewLastUsed = Date.now()

    if (searchViewLoadContext !== 'search' || !searchViewAutoExtractEnabled) {
      logger.info(`${getSearchViewContextLabel(searchViewLoadContext)} view auto extraction skipped for manual load`)
      return
    }

    searchViewAutoExtractEnabled = false

    try {
      const result = await extractSearchResultsFromView(searchView!, 'search')

      if (mainWindow) {
        mainWindow.webContents.send('search:result', result)
      }
    } catch (error) {
      logger.error('Failed to extract search results:', error)
      if (mainWindow) {
        mainWindow.webContents.send('search:result', {
          success: false,
          videos: [],
          hasMore: false,
          error: error instanceof Error ? error.message : 'Failed to extract search results',
          extractedAt: Date.now(),
          pageUrl: '',
          currentPage: 1,
          nextOffset: null
        } as SearchResult)
      }
    }
  })

  return searchView
}

async function createPlayerView(): Promise<BrowserView> {
  if (playerView) {
    playerViewLastUsed = Date.now()
    return playerView
  }

  playerView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      session: getBilibiliSession(),
      webSecurity: false
    }
  })

  playerViewLastUsed = Date.now()

  playerView.webContents.on('console-message', (_event, _level, message) => {
    handlePlayerConsoleMessage(message)
  })

  playerView.webContents.on('did-finish-load', () => {
    logger.info('Player page finished loading')
    playerViewLastUsed = Date.now()

    playerView!.webContents
      .executeJavaScript(
        `
      (function() {
        const progressPrefix = ${JSON.stringify(PLAYER_PROGRESS_CONSOLE_PREFIX)};
        const readyPrefix = ${JSON.stringify(PLAYER_READY_CONSOLE_PREFIX)};
        const bridgeKey = '__BLIPOD_PLAYER_BRIDGE__';

        const emit = (prefix, payload) => {
          try {
            console.log(prefix + JSON.stringify(payload));
          } catch (_error) {
            // ignore serialization errors
          }
        };

        const readState = (video) => ({
          currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          paused: video.paused
        });

        const installStyle = () => {
          if (document.getElementById('blipod-player-style')) {
            return;
          }
          const style = document.createElement('style');
          style.id = 'blipod-player-style';
          style.textContent = \`
            video { display: none !important; }
            body { background: transparent !important; }
            .bilibili-player-video { display: none !important; }
          \`;
          document.head.appendChild(style);
        };

        const clearMediaSession = () => {
          const mediaSession = navigator.mediaSession;
          if (!mediaSession) {
            return;
          }
          mediaSession.metadata = null;
          mediaSession.playbackState = 'none';
          const actions = [
            'play',
            'pause',
            'previoustrack',
            'nexttrack',
            'seekbackward',
            'seekforward',
            'seekto',
            'stop'
          ];
          actions.forEach((action) => {
            try {
              mediaSession.setActionHandler(action, null);
            } catch (_error) {
              // ignore unsupported action handlers
            }
          });
        };

        const ensureBridge = () => {
          installStyle();
          clearMediaSession();

          const existing = window[bridgeKey];
          const video = document.querySelector('video');
          if (!video) {
            if (existing && existing.video !== null) {
              existing.video = null;
              existing.lastState = null;
            }
            return false;
          }

          if (existing && existing.video === video) {
            return true;
          }

          if (existing && existing.cleanup) {
            existing.cleanup();
          }

          const state = {
            video,
            lastState: null,
            cleanup: null,
            observer: null,
            retryTimer: null
          };

          const emitState = (force = false) => {
            const nextState = readState(video);
            if (
              !force &&
              state.lastState &&
              state.lastState.currentTime === nextState.currentTime &&
              state.lastState.duration === nextState.duration &&
              state.lastState.paused === nextState.paused
            ) {
              return;
            }
            state.lastState = nextState;
            emit(progressPrefix, nextState);
          };

          const onProgressEvent = () => emitState();
          const events = ['loadedmetadata', 'timeupdate', 'play', 'pause', 'seeking', 'seeked', 'ended'];
          events.forEach((eventName) => {
            video.addEventListener(eventName, onProgressEvent, { passive: true });
          });

          state.cleanup = () => {
            events.forEach((eventName) => {
              video.removeEventListener(eventName, onProgressEvent);
            });
          };

          window[bridgeKey] = state;
          emit(readyPrefix, { attached: true });
          emitState(true);
          return true;
        };

        const bootstrap = () => {
          ensureBridge();

          const existing = window[bridgeKey] || {};
          if (existing.observer) {
            existing.observer.disconnect();
          }
          if (existing.retryTimer) {
            clearInterval(existing.retryTimer);
          }

          const observer = new MutationObserver(() => {
            ensureBridge();
          });
          observer.observe(document.documentElement || document.body, {
            childList: true,
            subtree: true
          });

          const retryTimer = window.setInterval(() => {
            if (ensureBridge()) {
              const activeState = window[bridgeKey];
              if (activeState && activeState.retryTimer) {
                clearInterval(activeState.retryTimer);
                activeState.retryTimer = null;
              }
            }
          }, 1000);

          window[bridgeKey] = {
            ...(window[bridgeKey] || {}),
            observer,
            retryTimer
          };
        };

        bootstrap();
      })();
    `
      )
      .catch((err) => logger.error('Failed to inject player bridge:', err))

    startProgressTracking()
  })

  return playerView
}

function getCookieHeader(cookies: Electron.Cookie[]) {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

async function getBilibiliCookieHeader() {
  const bilibiliSession = getBilibiliSession()
  const cookies = await bilibiliSession.cookies.get({ url: 'https://www.bilibili.com' })
  return getCookieHeader(cookies)
}

async function fetchBilibiliJson<T>(url: string, referer: string): Promise<BilibiliApiResponse<T>> {
  const cookieHeader = await getBilibiliCookieHeader()
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: referer,
      Origin: new URL(referer).origin,
      Cookie: cookieHeader,
      'User-Agent': BILIBILI_DESKTOP_USER_AGENT
    }
  })

  return response.json() as Promise<BilibiliApiResponse<T>>
}

function getWbiKeyPart(url?: string) {
  if (!url) return ''

  const pathname = new URL(url).pathname
  const filename = pathname.split('/').pop() || ''
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex >= 0 ? filename.slice(0, dotIndex) : filename
}

function getWbiMixinKey(imgKey: string, subKey: string) {
  const raw = `${imgKey}${subKey}`
  return WBI_MIXIN_KEY_INDEXES.map((index) => raw[index] || '').join('').slice(0, 32)
}

function sanitizeWbiValue(value: string) {
  return value.replace(/[!'()*]/g, '')
}

function signWbiParams(params: Record<string, string | number>, mixinKey: string) {
  const wts = Math.floor(Date.now() / 1000)
  const searchParams = new URLSearchParams()

  Object.entries({ ...params, wts })
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .forEach(([key, value]) => {
      searchParams.set(key, sanitizeWbiValue(String(value)))
    })

  const query = searchParams.toString()
  const wRid = createHash('md5').update(`${query}${mixinKey}`).digest('hex')
  searchParams.set('w_rid', wRid)
  return searchParams
}

async function getWbiMixinKeyForSession() {
  const navData = await fetchBilibiliJson<BilibiliNavData>(
    'https://api.bilibili.com/x/web-interface/nav',
    BILIBILI_DESKTOP_REFERRER
  )

  if (!navData.data?.wbi_img) {
    throw new Error(navData.message || 'Failed to fetch WBI keys')
  }

  const imgKey = getWbiKeyPart(navData.data.wbi_img.img_url)
  const subKey = getWbiKeyPart(navData.data.wbi_img.sub_url)

  if (!imgKey || !subKey) {
    throw new Error('Failed to resolve WBI keys')
  }

  return getWbiMixinKey(imgKey, subKey)
}

function normalizeSearchQuery(query: string) {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    throw new Error('Invalid search query')
  }
  return normalizedQuery
}

function normalizeSearchOffset(offset?: number | null) {
  if (offset == null) {
    return 0
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('Invalid search offset')
  }

  return offset
}

function getNextSearchPaginationState(currentPage: number): SearchPaginationState {
  const normalizedPage = Number.isInteger(currentPage) && currentPage > 0 ? currentPage : 1

  return {
    page: normalizedPage + 1,
    offset: normalizedPage * SEARCH_API_DYNAMIC_OFFSET_STEP
  }
}

function resolveSearchPaginationState(offset?: number | null): SearchPaginationState {
  const normalizedOffset = normalizeSearchOffset(offset)

  if (normalizedOffset <= 0) {
    return {
      page: 1,
      offset: 0
    }
  }

  if (normalizedOffset % SEARCH_API_DYNAMIC_OFFSET_STEP === 0) {
    return {
      page: Math.floor(normalizedOffset / SEARCH_API_DYNAMIC_OFFSET_STEP) + 1,
      offset: normalizedOffset
    }
  }

  return {
    page: Math.floor(normalizedOffset / 20) + 1,
    offset: normalizedOffset
  }
}

function getSearchPageUrl(query: string, pagination: SearchPaginationState) {
  const normalizedQuery = encodeURIComponent(normalizeSearchQuery(query))

  if (pagination.page <= 1 && pagination.offset === 0) {
    return `${SEARCH_PAGE_ORIGIN}${SEARCH_PAGE_PATH}?keyword=${normalizedQuery}&search_source=1`
  }

  return `${SEARCH_PAGE_ORIGIN}${SEARCH_PAGE_PATH}?keyword=${normalizedQuery}&search_source=1&page=${pagination.page}&o=${pagination.offset}`
}

function normalizeUploaderMid(mid: string) {
  const normalizedMid = mid.trim()
  if (!/^\d+$/.test(normalizedMid)) {
    throw new Error('Invalid uploader mid')
  }
  return normalizedMid
}

function normalizeUploaderPage(page: number) {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Invalid uploader page')
  }
  return page
}

function getUploaderPageUrl(mid: string, page: number) {
  return `${SPACE_PAGE_ORIGIN}/${mid}/upload/video?p=${page}`
}

function normalizeBilibiliAssetUrl(url?: string) {
  if (!url) {
    return ''
  }

  if (url.startsWith('https://')) {
    return url
  }

  if (url.startsWith('http://')) {
    return `https://${url.slice('http://'.length)}`
  }

  if (url.startsWith('//')) {
    return `https:${url}`
  }

  if (url.startsWith('/')) {
    return `https://i0.hdslb.com${url}`
  }

  return url
}

async function hasBilibiliLoginSession() {
  const bilibiliSession = getBilibiliSession()
  const cookies = await bilibiliSession.cookies.get({ url: 'https://www.bilibili.com' })
  return cookies.some((cookie) => cookie.name === 'SESSDATA' && Boolean(cookie.value))
}

function createSearchQvId() {
  return randomBytes(16).toString('base64url')
}

function stripHtmlTags(value?: string) {
  if (!value) {
    return ''
  }

  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeSearchResultPlayCounts(result: SearchResult): SearchResult {
  return {
    ...result,
    videos: result.videos.map((video) => ({
      ...video,
      playCount: formatPlayCount(video.playCount)
    }))
  }
}

function getSearchVideoUrl(item: BilibiliSearchApiItem) {
  if (item.arcurl) {
    const normalizedArcurl = normalizeBilibiliAssetUrl(item.arcurl)
    if (normalizedArcurl) {
      return normalizedArcurl
    }
  }

  return item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : ''
}

function mapSearchApiVideo(item: BilibiliSearchApiItem): ExtractedVideo | null {
  if (item.type !== 'video' || !item.bvid || !item.title) {
    return null
  }

  const title = stripHtmlTags(item.title)
  const videoLink = getSearchVideoUrl(item)
  if (!title || !videoLink) {
    return null
  }

  const authorMid = item.mid != null ? String(item.mid) : ''

  return {
    bvid: item.bvid,
    title,
    cover: normalizeBilibiliAssetUrl(item.pic),
    author: item.author || '未知UP主',
    authorLink: authorMid ? `https://space.bilibili.com/${authorMid}` : '',
    duration: item.duration?.trim() || '',
    playCount: formatPlayCount(item.play),
    videoLink
  }
}

function shouldFallbackToSearchDom(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message === SEARCH_API_RISK_BLOCKED_ERROR ||
    error.message.includes('风控') ||
    error.message === UPLOADER_NOT_LOGGED_IN_ERROR ||
    error.message.includes(UPLOADER_NOT_LOGGED_IN_ERROR) ||
    error.message === SEARCH_API_RESPONSE_ERROR
  )
}

function shouldFallbackToUploaderDom(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message === UPLOADER_RISK_BLOCKED_ERROR ||
    error.message.includes('风控') ||
    error.message === UPLOADER_NOT_LOGGED_IN_ERROR ||
    error.message.includes(UPLOADER_NOT_LOGGED_IN_ERROR)
  )
}

function updateSearchSessionState(query: string, mode: 'api' | 'dom', pagination: SearchPaginationState) {
  searchSessionState = {
    query,
    mode,
    pagination
  }
}

async function extractSearchResultsFromView(
  view: BrowserView,
  context: SearchViewContext = 'search'
): Promise<SearchResult> {
  searchViewLastUsed = Date.now()
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const contextLabel = getSearchViewContextLabel(context)
  const script = getExtractorScript()
  if (!script) {
    throw new Error('Extractor script not found')
  }

  await view.webContents.executeJavaScript(script)
  logger.info(`${contextLabel} extractor script injected`)

  const result = (await view.webContents.executeJavaScript(
    'window.__BILI_EXTRACT_SEARCH__ ? window.__BILI_EXTRACT_SEARCH__() : null'
  )) as SearchResult | null

  if (!result) {
    throw new Error('Failed to extract search results')
  }

  if (result.pageUrl?.includes('m.bilibili.com')) {
    logger.warn(`${contextLabel} view redirected to mobile site`, { pageUrl: result.pageUrl.split('?')[0] })
  }

  logger.info(`${contextLabel} results extracted`, {
    videoCount: result.videos.length,
    hasMore: result.hasMore,
    currentPage: result.currentPage,
    nextOffset: result.nextOffset
  })

  searchViewLastUsed = Date.now()
  return result
}

function mapUploaderInfo(mid: string, data?: BilibiliUploaderInfoData): UploaderInfo | undefined {
  if (!data?.name) {
    return undefined
  }

  return {
    mid: String(data.mid ?? mid),
    name: data.name,
    avatar: data.face || ''
  }
}

function mapUploaderVideo(item: BilibiliUploaderVideoItem, uploaderInfo?: UploaderInfo): ExtractedVideo | null {
  if (!item.bvid || !item.title) {
    return null
  }

  const authorMid = item.mid ?? uploaderInfo?.mid ?? ''
  const author = item.author || uploaderInfo?.name || '未知UP主'
  const cover = normalizeBilibiliAssetUrl(item.pic)

  return {
    bvid: item.bvid,
    title: item.title,
    cover,
    author,
    authorLink: authorMid ? `https://space.bilibili.com/${authorMid}` : '',
    duration: item.length || '',
    playCount: formatPlayCount(item.play),
    videoLink: `https://www.bilibili.com/video/${item.bvid}`
  }
}

async function loadSearchResultsByApi(query: string, offset?: number | null): Promise<SearchResult> {
  const normalizedQuery = normalizeSearchQuery(query)
  const pagination = resolveSearchPaginationState(offset)
  const mixinKey = await getWbiMixinKeyForSession()
  const pageUrl = getSearchPageUrl(normalizedQuery, pagination)
  const params = signWbiParams(
    {
      category_id: '',
      search_type: 'video',
      ad_resource: 5654,
      __refresh__: 'true',
      _extra: '',
      context: '',
      page: pagination.page,
      page_size: SEARCH_API_PAGE_SIZE,
      pubtime_begin_s: 0,
      pubtime_end_s: 0,
      from_source: '',
      from_spmid: '333.337',
      platform: 'pc',
      highlight: 1,
      single_column: 0,
      keyword: normalizedQuery,
      qv_id: createSearchQvId(),
      source_tag: 3,
      gaia_vtoken: '',
      dynamic_offset: pagination.offset,
      web_roll_page: 1,
      web_location: SEARCH_API_DEFAULT_WEB_LOCATION
    },
    mixinKey
  )

  const response = await fetchBilibiliJson<BilibiliSearchApiData>(
    `https://api.bilibili.com/x/web-interface/wbi/search/type?${params.toString()}`,
    pageUrl
  )

  if (response.code !== 0) {
    throw new Error(response.message || SEARCH_API_RESPONSE_ERROR)
  }

  const data = response.data
  if (!data) {
    throw new Error(SEARCH_API_RESPONSE_ERROR)
  }

  if (data.is_risk || data.gaia_res_type || data.gaia_data) {
    throw new Error(SEARCH_API_RISK_BLOCKED_ERROR)
  }

  const videos = (data.result || [])
    .map((item) => mapSearchApiVideo(item))
    .filter((item): item is ExtractedVideo => item !== null)
  const currentPage = data.page || pagination.page
  const numPages = data.numPages || currentPage
  const hasMore = currentPage < numPages
  const nextOffset = hasMore ? currentPage * SEARCH_API_DYNAMIC_OFFSET_STEP : null

  return {
    success: true,
    videos,
    hasMore,
    extractedAt: Date.now(),
    pageUrl,
    currentPage,
    nextOffset
  }
}

async function loadSearchResultsByDom(query: string, offset?: number | null): Promise<SearchResult> {
  const normalizedQuery = normalizeSearchQuery(query)
  const pagination = resolveSearchPaginationState(offset)
  const searchUrl = getSearchPageUrl(normalizedQuery, pagination)
  const view = await createSearchView()

  logger.info('Loading search URL via DOM fallback', `${normalizedQuery} page: ${pagination.page}`)
  await loadSearchViewUrl(view, searchUrl, 'search', { autoExtract: false })

  const result = normalizeSearchResultPlayCounts(await extractSearchResultsFromView(view, 'search'))
  updateSearchSessionState(normalizedQuery, 'dom', {
    page: result.currentPage,
    offset: result.nextOffset != null ? Math.max(result.nextOffset - SEARCH_API_DYNAMIC_OFFSET_STEP, 0) : pagination.offset
  })
  return result
}

async function prepareSearchViewForPagination(query: string, offset?: number | null): Promise<void> {
  const normalizedQuery = normalizeSearchQuery(query)
  const pagination = resolveSearchPaginationState(offset)
  const searchUrl = getSearchPageUrl(normalizedQuery, pagination)
  const view = await createSearchView()

  try {
    await loadSearchViewUrl(view, searchUrl, 'search', { autoExtract: false })
  } catch (error) {
    if (isNavigationAbortedError(error) && searchViewLoadContext !== 'search') {
      logger.info('Search view preparation aborted by a newer non-search load')
      return
    }
    throw error
  }
}

async function loadSearchResults(query: string, offset?: number | null): Promise<SearchResult> {
  const normalizedQuery = normalizeSearchQuery(query)
  const pagination = resolveSearchPaginationState(offset)

  try {
    logger.info('Search request uses API mode', `${normalizedQuery} page: ${pagination.page}`)
    const result = await loadSearchResultsByApi(normalizedQuery, pagination.offset)
    updateSearchSessionState(normalizedQuery, 'api', pagination)

    void prepareSearchViewForPagination(normalizedQuery, pagination.offset).catch((viewError) => {
      logger.warn('Failed to prepare search view for DOM pagination:', viewError)
    })

    return result
  } catch (error) {
    if (!shouldFallbackToSearchDom(error)) {
      throw error
    }

    logger.warn('Search API fallback to DOM', {
      query: normalizedQuery,
      offset: pagination.offset,
      reason: error instanceof Error ? error.message : 'unknown'
    })

    try {
      return await loadSearchResultsByDom(normalizedQuery, pagination.offset)
    } catch (domError) {
      if (domError instanceof Error && error instanceof Error) {
        throw new Error(`${error.message}；降级 DOM 抓取也失败：${domError.message}`)
      }
      throw domError
    }
  }
}

async function loadUploaderVideosByApi(mid: string, page: number = 1): Promise<SearchResult> {
  const normalizedMid = normalizeUploaderMid(mid)
  const normalizedPage = normalizeUploaderPage(page)
  const mixinKey = await getWbiMixinKeyForSession()
  const pageParams = signWbiParams(
    {
      mid: normalizedMid,
      pn: normalizedPage,
      ps: UPLOADER_API_PAGE_SIZE,
      order: 'pubdate',
      tid: 0,
      keyword: ''
    },
    mixinKey
  )
  const infoParams = signWbiParams({ mid: normalizedMid }, mixinKey)
  const pageUrl = getUploaderPageUrl(normalizedMid, normalizedPage)

  const [videoResponse, uploaderResponse] = await Promise.all([
    fetchBilibiliJson<BilibiliUploaderVideoListData>(
      `https://api.bilibili.com/x/space/wbi/arc/search?${pageParams.toString()}`,
      pageUrl
    ),
    fetchBilibiliJson<BilibiliUploaderInfoData>(
      `https://api.bilibili.com/x/space/wbi/acc/info?${infoParams.toString()}`,
      pageUrl
    )
  ])

  if (videoResponse.code !== 0) {
    throw new Error(videoResponse.message || 'Failed to load uploader videos')
  }

  const videoData = videoResponse.data
  if (videoData?.is_risk || videoData?.gaia_res_type || videoData?.gaia_data) {
    throw new Error(UPLOADER_RISK_BLOCKED_ERROR)
  }

  const uploader = uploaderResponse.code === 0 ? mapUploaderInfo(normalizedMid, uploaderResponse.data) : undefined
  const rawVideos = videoData?.list?.vlist || []
  const videos = rawVideos
    .map((item) => mapUploaderVideo(item, uploader))
    .filter((item): item is ExtractedVideo => item !== null)
  const currentPage = videoData?.page?.pn || normalizedPage
  const pageSize = videoData?.page?.ps || UPLOADER_API_PAGE_SIZE
  const total = videoData?.page?.count || videos.length
  const hasMore = currentPage * pageSize < total
  const extractedAt = Date.now()

  if (normalizedPage === 1 && videos.length === 0 && !uploader) {
    logger.warn('Uploader API returned no uploader metadata or videos', {
      mid: normalizedMid,
      page: normalizedPage,
      pageUrl: pageUrl.split('?')[0]
    })

    return {
      success: false,
      videos: [],
      hasMore: false,
      error: 'Failed to load uploader videos',
      extractedAt,
      pageUrl,
      currentPage,
      nextOffset: null
    }
  }

  return {
    success: true,
    videos,
    hasMore,
    extractedAt,
    pageUrl,
    currentPage,
    nextOffset: hasMore ? currentPage + 1 : null,
    uploader
  }
}

async function loadUploaderVideosByDom(mid: string, page: number = 1): Promise<SearchResult> {
  const normalizedMid = normalizeUploaderMid(mid)
  const normalizedPage = normalizeUploaderPage(page)
  const pageUrl = getUploaderPageUrl(normalizedMid, normalizedPage)
  const view = await createSearchView()

  logger.info('Loading uploader page via DOM fallback', `${normalizedMid} page: ${normalizedPage}`)
  await loadSearchViewUrl(view, pageUrl, 'uploader', { autoExtract: false })

  const result = normalizeSearchResultPlayCounts(await extractSearchResultsFromView(view, 'uploader'))
  const uploader =
    result.uploader ||
    (result.videos.length > 0
      ? {
          name: result.videos[0].author,
          avatar: '',
          mid: normalizedMid
        }
      : undefined)

  if (result.success && normalizedPage === 1 && result.videos.length === 0 && !uploader) {
    logger.warn('Uploader DOM fallback returned no uploader metadata or videos', {
      mid: normalizedMid,
      page: normalizedPage,
      pageUrl: result.pageUrl.split('?')[0]
    })

    return {
      success: false,
      videos: [],
      hasMore: false,
      error: 'Failed to load uploader videos',
      extractedAt: result.extractedAt,
      pageUrl: result.pageUrl,
      currentPage: normalizedPage,
      nextOffset: null
    }
  }

  return {
    ...result,
    currentPage: normalizedPage,
    nextOffset: result.hasMore ? normalizedPage + 1 : null,
    uploader
  }
}

async function loadUploaderVideos(mid: string, page: number = 1): Promise<SearchResult> {
  const normalizedMid = normalizeUploaderMid(mid)
  const normalizedPage = normalizeUploaderPage(page)

  if (!(await hasBilibiliLoginSession())) {
    logger.info('Uploader request uses DOM fallback because user is not logged in')
    return loadUploaderVideosByDom(normalizedMid, normalizedPage)
  }

  try {
    logger.info('Uploader request uses API mode', `${normalizedMid} page: ${normalizedPage}`)
    return await loadUploaderVideosByApi(normalizedMid, normalizedPage)
  } catch (error) {
    if (!shouldFallbackToUploaderDom(error)) {
      throw error
    }

    logger.warn('Uploader API fallback to DOM', {
      mid: normalizedMid,
      page: normalizedPage,
      reason: error instanceof Error ? error.message : 'unknown'
    })

    try {
      return await loadUploaderVideosByDom(normalizedMid, normalizedPage)
    } catch (domError) {
      if (domError instanceof Error && error instanceof Error) {
        throw new Error(`${error.message}；降级 DOM 抓取也失败：${domError.message}`)
      }
      throw domError
    }
  }
}

async function fetchUserInfo(): Promise<UserInfo | null> {
  try {
    const bilibiliSession = getBilibiliSession()
    const cookies = await bilibiliSession.cookies.get({ url: 'https://www.bilibili.com' })

    const sessdata = cookies.find((c) => c.name === 'SESSDATA')
    if (!sessdata) {
      return null
    }

    const data = await fetchBilibiliJson<BilibiliNavData>(
      'https://api.bilibili.com/x/web-interface/nav',
      BILIBILI_DESKTOP_REFERRER
    )

    logger.info('fetchUserInfo response:', `${data.code} ${data.message || 'ok'}`)

    if (data.code === 0 && data.data?.isLogin) {
      return {
        mid: data.data.mid || 0,
        name: data.data.uname || '',
        face: data.data.face || '',
        sign: data.data.sign || '',
        level: data.data.level_info?.current_level || 0,
        vipType: data.data.vipType || 0
      }
    }

    return null
  } catch (error) {
    logger.error('Failed to fetch user info:', error)
    return null
  }
}

async function checkLoginStatus(): Promise<BiliAuthStatus> {
  const bilibiliSession = getBilibiliSession()
  const cookies = await bilibiliSession.cookies.get({ url: 'https://www.bilibili.com' })
  const sessdata = cookies.find((c) => c.name === 'SESSDATA')

  if (!sessdata) {
    logger.debug('No active Bilibili session found')
    return { isLoggedIn: false, userInfo: null }
  }

  logger.debug('Active Bilibili session detected, fetching user info')

  const userInfo = await fetchUserInfo()

  logger.debug('Login status resolved', { isLoggedIn: userInfo !== null })

  return {
    isLoggedIn: userInfo !== null,
    userInfo
  }
}

interface QrCodeResult {
  code: number
  data: {
    url: string
    qrcode_key: string
  }
}

interface QrCodeStatus {
  code: number
  data: {
    code: number
    message: string
    url: string
    refresh_token: string
    timestamp: number
  }
}

async function startQrLogin() {
  stopQrPoll()

  try {
    const response = await fetch(
      'https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
      {
        headers: {
          Referer: 'https://passport.bilibili.com/',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    )

    const result: QrCodeResult = await response.json()

    if (result.code !== 0 || !result.data?.url) {
      throw new Error('Failed to generate QR code')
    }

    const qrUrl = result.data.url
    const qrcodeKey = result.data.qrcode_key

    if (mainWindow) {
      mainWindow.webContents.send('auth:qrcode', qrUrl)
    }

    qrPollInterval = setInterval(async () => {
      if (!mainWindow) {
        stopQrPoll()
        return
      }

      try {
        const statusResponse = await fetch(
          `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrcodeKey}`,
          {
            headers: {
              Referer: 'https://passport.bilibili.com/',
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          }
        )

        const statusResult: QrCodeStatus = await statusResponse.json()

        logger.debug('QR poll status:', `${statusResult.data?.code} ${statusResult.data?.message}`)

        if (statusResult.data?.code === 0) {
          stopQrPoll()
          logger.info('QR login confirmed')

          const url = new URL(statusResult.data.url)
          const cookieParams = url.searchParams

          const bilibiliSession = getBilibiliSession()

          const dedeuserid = cookieParams.get('DedeUserID')
          const dedeuseridCkMd5 = cookieParams.get('DedeUserID__ckMd5')
          const sessdata = cookieParams.get('SESSDATA')
          const biliJct = cookieParams.get('bili_jct')

          if (sessdata) {
            const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60

            const cookieOptions = {
              url: 'https://www.bilibili.com',
              domain: '.bilibili.com',
              path: '/',
              expirationDate
            }

            if (dedeuserid) {
              await bilibiliSession.cookies.set({
                ...cookieOptions,
                name: 'DedeUserID',
                value: dedeuserid
              })
            }

            if (dedeuseridCkMd5) {
              await bilibiliSession.cookies.set({
                ...cookieOptions,
                name: 'DedeUserID__ckMd5',
                value: dedeuseridCkMd5
              })
            }

            await bilibiliSession.cookies.set({
              ...cookieOptions,
              name: 'SESSDATA',
              value: decodeURIComponent(sessdata),
              secure: true,
              httpOnly: true
            })

            if (biliJct) {
              await bilibiliSession.cookies.set({
                ...cookieOptions,
                name: 'bili_jct',
                value: biliJct
              })
            }

            logger.info('Bilibili session cookies saved')

            const userInfo = await fetchUserInfo()

            if (userInfo && mainWindow) {
              mainWindow.webContents.send('auth:success', userInfo)
            } else if (mainWindow) {
              mainWindow.webContents.send('auth:error', 'Login verification failed')
            }
          } else if (mainWindow) {
            mainWindow.webContents.send('auth:error', 'Failed to get session')
          }
        } else if (statusResult.data?.code === 86038) {
          stopQrPoll()
          if (mainWindow) {
            mainWindow.webContents.send('auth:error', 'QR code expired, please try again')
          }
        } else if (statusResult.data?.code === 86090) {
          // QR code scanned but not confirmed, continue polling
        } else if (statusResult.data?.code === 86101) {
          // Not scanned yet, continue polling
        }
      } catch (error) {
        logger.error('QR poll error:', error)
      }
    }, 2000)
  } catch (error) {
    logger.error('Failed to start QR login:', error)
    if (mainWindow) {
      mainWindow.webContents.send(
        'auth:error',
        error instanceof Error ? error.message : 'Failed to start login'
      )
    }
  }
}

async function logout() {
  stopQrPoll()

  const bilibiliSession = getBilibiliSession()

  const cookies = await bilibiliSession.cookies.get({})
  for (const cookie of cookies) {
    const url = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`
    await bilibiliSession.cookies.remove(url, cookie.name)
  }
}

function setupIPC() {
  ipcMain.handle('config:getRuntimeConfig', async () => {
    return getRuntimeConfig()
  })

  ipcMain.handle('config:openExternal', async (_event, url: string) => {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed')
    }
    await shell.openExternal(parsedUrl.toString())
  })

  ipcMain.handle(
    'search:query',
    async (_event, query: string, offset?: number): Promise<SearchResult> => {
      logger.info('Search query received:', `${query} offset: ${offset}`)

      let normalizedQuery = query
      let pagination: SearchPaginationState = { page: 1, offset: 0 }

      try {
        normalizedQuery = normalizeSearchQuery(query)
        pagination = resolveSearchPaginationState(offset)
      } catch (error) {
        logger.error('Search query validation error:', error)
        return {
          success: false,
          videos: [],
          hasMore: false,
          error: error instanceof Error ? error.message : 'Search request failed',
          extractedAt: Date.now(),
          pageUrl: '',
          currentPage: 1,
          nextOffset: null
        }
      }

      // 保存搜索词，用于超时后提示用户
      lastSearchQuery = normalizedQuery

      try {
        const result = await loadSearchResults(normalizedQuery, pagination.offset)

        if (mainWindow) {
          mainWindow.webContents.send('search:result', result)
        }

        return result
      } catch (error) {
        logger.error('Search error:', error)
        return {
          success: false,
          videos: [],
          hasMore: false,
          error: error instanceof Error ? error.message : 'Search request failed',
          extractedAt: Date.now(),
          pageUrl: getSearchPageUrl(normalizedQuery, pagination),
          currentPage: pagination.page,
          nextOffset: null
        }
      }
    }
  )

  ipcMain.handle('search:uploader', async (_event, mid: string, page: number = 1): Promise<SearchResult> => {
    logger.info('Uploader videos request received:', `${mid} page: ${page}`)

    let normalizedMid = mid
    let normalizedPage = page

    try {
      normalizedMid = normalizeUploaderMid(mid)
      normalizedPage = normalizeUploaderPage(page)
      return await loadUploaderVideos(normalizedMid, normalizedPage)
    } catch (error) {
      logger.error('Uploader videos error:', error)
      return {
        success: false,
        videos: [],
        hasMore: false,
        error: error instanceof Error ? error.message : 'Failed to load uploader videos',
        extractedAt: Date.now(),
        pageUrl: getUploaderPageUrl(normalizedMid, normalizedPage),
        currentPage: normalizedPage,
        nextOffset: null
      }
    }
  })

  ipcMain.on('player:play', async (_event, bvid: string, autoplay: boolean = true) => {
    logger.info('Playing video:', `${bvid} autoplay: ${autoplay}`)

    try {
      const view = await createPlayerView()
      const playUrl = `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&autoplay=${autoplay ? 1 : 0}&muted=0`

      await view.webContents.loadURL(playUrl)

      if (mainWindow) {
        mainWindow.setBrowserView(view)
        const bounds = mainWindow.getBounds()
        view.setBounds({ x: 0, y: bounds.height, width: 1, height: 1 })
      }
    } catch (error) {
      logger.error('Failed to play video:', error)
    }
  })

  ipcMain.on('player:pause', async () => {
    if (playerView) {
      await playerView.webContents
        .executeJavaScript(
          `
        if (document.querySelector('video')) {
          document.querySelector('video').pause();
        }
      `
        )
        .catch(() => {})
    }
  })

  ipcMain.on('search:clickNextPage', async () => {
    logger.info('Clicking next page button')

    const sessionState = searchSessionState
    if (!sessionState) {
      logger.info('No active search session, notifying user to search again')
      if (mainWindow) {
        mainWindow.webContents.send('search:viewDestroyed', {
          message: '当前搜索已失效，请重新搜索',
          lastQuery: lastSearchQuery
        })
      }
      return
    }

    // 更新最后使用时间，防止翻页过程中被清理
    searchViewLastUsed = Date.now()

    if (sessionState.mode === 'api') {
      const nextPagination = getNextSearchPaginationState(sessionState.pagination.page)

      try {
        const result = await loadSearchResultsByApi(sessionState.query, nextPagination.offset)
        updateSearchSessionState(sessionState.query, 'api', nextPagination)

        void prepareSearchViewForPagination(sessionState.query, nextPagination.offset).catch((viewError) => {
          logger.warn('Failed to prepare search view for DOM pagination:', viewError)
        })

        if (mainWindow) {
          mainWindow.webContents.send('search:result', result)
        }
      } catch (error) {
        logger.error('Failed to load next search page via API:', error)
        if (mainWindow) {
          mainWindow.webContents.send('search:result', {
            success: false,
            videos: [],
            hasMore: false,
            error: error instanceof Error ? error.message : 'Search request failed',
            extractedAt: Date.now(),
            pageUrl: getSearchPageUrl(sessionState.query, nextPagination),
            currentPage: nextPagination.page,
            nextOffset: null
          } as SearchResult)
        }
      }
      return
    }

    // 如果 searchView 已被销毁（超时清理），提示用户重新搜索
    if (!searchView) {
      logger.info('Search view was destroyed due to timeout, notifying user')
      logger.debug('lastSearchQuery:', lastSearchQuery)
      if (mainWindow) {
        mainWindow.webContents.send('search:viewDestroyed', {
          message: '当前搜索已失效，请重新搜索',
          lastQuery: lastSearchQuery
        })
      }
      return
    }

    try {
      const hasFunction = await searchView.webContents.executeJavaScript(
        'typeof window.__BILI_CLICK_NEXT_PAGE__ === "function"'
      )

      if (!hasFunction) {
        logger.info('Re-injecting extractor script')
        const script = getExtractorScript()
        if (script) {
          await searchView.webContents.executeJavaScript(script)
        }
      }

      const result = normalizeSearchResultPlayCounts(
        (await searchView.webContents.executeJavaScript('window.__BILI_CLICK_NEXT_PAGE__()')) as SearchResult
      )

      logger.info('Click next page result:', JSON.stringify(result, null, 2))
      updateSearchSessionState(sessionState.query, 'dom', {
        page: result.currentPage,
        offset: result.nextOffset != null ? Math.max(result.nextOffset - SEARCH_API_DYNAMIC_OFFSET_STEP, 0) : sessionState.pagination.offset
      })

      if (mainWindow) {
        mainWindow.webContents.send('search:result', result)
      }
    } catch (error) {
      logger.error('Failed to click next page:', error)
      if (mainWindow) {
        mainWindow.webContents.send('search:result', {
          success: false,
          videos: [],
          hasMore: false,
          error: error instanceof Error ? error.message : 'Failed to click next page',
          extractedAt: Date.now(),
          pageUrl: '',
          currentPage: 1,
          nextOffset: null
        } as SearchResult)
      }
    }
  })

  ipcMain.on('player:resume', async () => {
    if (playerView) {
      await playerView.webContents
        .executeJavaScript(
          `
        if (document.querySelector('video')) {
          document.querySelector('video').play();
        }
      `
        )
        .catch(() => {})
    }
  })

  ipcMain.on('player:seek', async (_event, time: number) => {
    if (playerView) {
      await playerView.webContents
        .executeJavaScript(
          `
        if (document.querySelector('video')) {
          document.querySelector('video').currentTime = ${time};
        }
      `
        )
        .catch(() => {})
    }
  })

  ipcMain.on('player:volume', async (_event, volume: number) => {
    if (playerView) {
      await playerView.webContents
        .executeJavaScript(
          `
        if (document.querySelector('video')) {
          document.querySelector('video').volume = ${volume / 100};
        }
      `
        )
        .catch(() => {})
    }
  })

  ipcMain.on('native-player:updateState', (_event, state: NativePlaybackState) => {
    updateNativePlaybackState(state)
  })

  ipcMain.handle('auth:checkLogin', async (): Promise<BiliAuthStatus> => {
    return checkLoginStatus()
  })

  ipcMain.handle('auth:startLogin', async () => {
    await startQrLogin()
  })

  ipcMain.handle('auth:cancelLogin', async () => {
    stopQrPoll()
    logger.info('Login cancelled, QR poll stopped')
  })

  ipcMain.handle('auth:logout', async () => {
    await logout()
  })

  ipcMain.handle('store:getFavorites', async () => {
    return getFavorites()
  })

  ipcMain.handle('store:addFavorite', async (_event, video: ExtractedVideo) => {
    return addFavorite(video)
  })

  ipcMain.handle('store:removeFavorite', async (_event, bvid: string) => {
    return removeFavorite(bvid)
  })

  ipcMain.handle('store:isFavorite', async (_event, bvid: string) => {
    return isFavorite(bvid)
  })

  ipcMain.handle('store:updateFavoriteDuration', async (_event, bvid: string, duration: string) => {
    return updateFavoriteDuration(bvid, duration)
  })

  ipcMain.handle('store:getPlaylists', async () => {
    return getPlaylists()
  })

  ipcMain.handle('store:createPlaylist', async (_event, name: string, description?: string) => {
    return createPlaylist(name, description)
  })

  ipcMain.handle(
    'store:updatePlaylist',
    async (_event, id: string, updates: Parameters<typeof updatePlaylist>[1]) => {
      return updatePlaylist(id, updates)
    }
  )

  ipcMain.handle('store:deletePlaylist', async (_event, id: string) => {
    return deletePlaylist(id)
  })

  ipcMain.handle(
    'store:addVideoToPlaylist',
    async (_event, playlistId: string, video: ExtractedVideo) => {
      return addVideoToPlaylist(playlistId, video)
    }
  )

  ipcMain.handle(
    'store:removeVideoFromPlaylist',
    async (_event, playlistId: string, bvid: string) => {
      return removeVideoFromPlaylist(playlistId, bvid)
    }
  )

  ipcMain.handle('store:updatePlaylistVideoDuration', async (_event, bvid: string, duration: string) => {
    return updatePlaylistVideoDuration(bvid, duration)
  })

  ipcMain.handle('store:getSettings', async () => {
    return getSettings()
  })

  ipcMain.handle('store:updateSettings', async (_event, updates: Partial<AppSettings>) => {
    return updateSettings(updates)
  })

  ipcMain.handle('store:getPlayPosition', async (_event, bvid: string) => {
    return getPlayPosition(bvid)
  })

  ipcMain.handle(
    'store:savePlayPosition',
    async (_event, bvid: string, currentTime: number, duration: number) => {
      return savePlayPosition(bvid, currentTime, duration)
    }
  )

  ipcMain.handle('store:clearPlayPosition', async (_event, bvid: string) => {
    return clearPlayPosition(bvid)
  })

  ipcMain.handle('store:getPlayStats', async (_event, bvid?: string) => {
    return getPlayStats(bvid)
  })

  ipcMain.handle(
    'store:updateWatchTime',
    async (_event, bvid: string, deltaSeconds: number, duration: number, position: number) => {
      return updateWatchTime(bvid, deltaSeconds, duration, position)
    }
  )

  ipcMain.handle(
    'store:incrementPlayCount',
    async (_event, bvid: string, duration: number, position: number) => {
      return incrementPlayCount(bvid, duration, position)
    }
  )

  ipcMain.handle('store:exportData', async () => {
    return exportData()
  })

  ipcMain.handle('store:importData', async (_event, data: Partial<AppStore>) => {
    return importData(data)
  })

  ipcMain.handle('store:getUserQueue', async () => {
    return getUserQueue()
  })

  ipcMain.handle('store:setUserQueue', async (_event, queue: ExtractedVideo[]) => {
    return setUserQueue(queue)
  })

  ipcMain.handle('store:addToUserQueue', async (_event, video: ExtractedVideo) => {
    return addToUserQueue(video)
  })

  ipcMain.handle('store:removeFromUserQueue', async (_event, bvid: string) => {
    return removeFromUserQueue(bvid)
  })

  ipcMain.handle('store:clearUserQueue', async () => {
    return clearUserQueue()
  })

  ipcMain.handle('store:moveUserQueueItem', async (_event, fromIndex: number, toIndex: number) => {
    return moveUserQueueItem(fromIndex, toIndex)
  })

  ipcMain.handle('store:exportDataToFile', async (_event, options?: ExportOptions) => {
    return exportDataToFile(options)
  })

  ipcMain.handle('store:importDataFromFile', async (_event, options: ImportOptionsV2) => {
    return importDataFromFile(options)
  })

  ipcMain.handle('store:getDataStats', async () => {
    return getDataStats()
  })

  ipcMain.handle('store:getCategoryStats', async () => {
    return getCategoryStats()
  })

  ipcMain.handle('store:getLastVolume', async () => {
    return getLastVolume()
  })

  ipcMain.handle('store:setLastVolume', async (_event, volume: number) => {
    setLastVolume(volume)
  })

  ipcMain.handle('memory:getStats', async () => {
    const memoryUsage = process.memoryUsage()
    return {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      searchViewActive: searchView !== null,
      playerViewActive: playerView !== null,
      searchViewIdleTime: searchView ? Math.round((Date.now() - searchViewLastUsed) / 1000) : 0,
      playerViewIdleTime: playerView ? Math.round((Date.now() - playerViewLastUsed) / 1000) : 0,
      viewIdleTimeout: Math.round(viewIdleTimeout / 1000)
    }
  })

  ipcMain.handle('memory:cleanup', async () => {
    await performMemoryCleanup()
    return true
  })

  ipcMain.handle('memory:clearCache', async () => {
    await clearSessionCache()
    return true
  })

  ipcMain.handle('memory:setIdleTimeout', async (_event, timeoutMs: number) => {
    viewIdleTimeout = timeoutMs
    logger.info('View idle timeout set to:', `${Math.round(timeoutMs / 1000)} seconds`)
    return true
  })
}

// 全局错误处理器
function setupGlobalErrorHandlers(): void {
  // 捕获未处理的异常
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error)
    // 发送错误到渲染进程显示
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:error', {
        type: 'fatal',
        message: '应用发生严重错误，建议重启应用',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  // 捕获未处理的Promise拒绝
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason)
  })

  // 监听渲染进程崩溃
  app.on('render-process-gone', (_event, _webContents, details) => {
    logger.error('Render process gone:', details)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:error', {
        type: 'error',
        message: `渲染进程异常: ${details.reason}`,
        error: details.reason
      })
    }
  })

  // 监听子进程崩溃
  app.on('child-process-gone', (_event, details) => {
    logger.error('Child process gone:', details)
  })
}

function setMacOSDockIcon() {
  if (!isMac) return

  const dockIconPath = app.isPackaged
    ? join(process.resourcesPath, 'icons', 'macos', 'app-icon.icns')
    : resolve(__dirname, '../../resources/icons/macos/app-icon.icns')

  const dockIcon = nativeImage.createFromPath(dockIconPath)
  if (dockIcon.isEmpty()) {
    logger.warn('Failed to load macOS dock icon:', dockIconPath)
    return
  }

  app.dock?.setIcon(dockIcon)
}

app.whenReady().then(() => {
  setupGlobalErrorHandlers()
  setMacOSDockIcon()
  setupCSP()
  setupBilibiliImageReferer()

  const runtimeConfig = loadRuntimeConfig()
  viewIdleTimeout = runtimeConfig.behavior.memory.searchViewIdleTimeoutMinutes * 60 * 1000

  setupIPC()
  startMemoryManagement()
  refreshApplicationMenu()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  showMainWindow()
})
