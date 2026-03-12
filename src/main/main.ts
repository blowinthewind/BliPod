import { app, BrowserWindow, session, ipcMain, BrowserView } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import type { SearchResult } from '../scripts/search-extractor'
import type { UserInfo, BiliAuthStatus } from '../preload/preload'

let mainWindow: BrowserWindow | null = null
let searchView: BrowserView | null = null
let playerView: BrowserView | null = null
let extractorScript: string | null = null
let progressInterval: NodeJS.Timeout | null = null
let qrPollInterval: NodeJS.Timeout | null = null

const BILIBILI_SESSION = 'persist:bilibili'

function getBilibiliSession() {
  return session.fromPartition(BILIBILI_SESSION)
}

function getExtractorScript(): string {
  if (!extractorScript) {
    try {
      extractorScript = readFileSync(join(__dirname, '../scripts/inject-search.js'), 'utf-8')
    } catch (error) {
      console.error('[BliPod] Failed to read extractor script:', error)
      extractorScript = ''
    }
  }
  return extractorScript
}

function startProgressTracking() {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
  
  progressInterval = setInterval(async () => {
    if (!playerView || !mainWindow) return
    
    try {
      const state = await playerView.webContents.executeJavaScript(`
        (function() {
          const video = document.querySelector('video');
          if (!video) return null;
          return {
            currentTime: video.currentTime,
            duration: video.duration || 0,
            paused: video.paused
          };
        })()
      `)
      
      if (state && mainWindow) {
        mainWindow.webContents.send('player:progress', state)
      }
    } catch {
      // ignore
    }
  }, 500)
}

function stopProgressTracking() {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

function stopQrPoll() {
  if (qrPollInterval) {
    clearInterval(qrPollInterval)
    qrPollInterval = null
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

  mainWindow.on('closed', () => {
    mainWindow = null
    searchView = null
    playerView = null
    stopProgressTracking()
    stopQrPoll()
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
          'Referer': 'https://www.bilibili.com/'
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
          'Referer': 'https://www.bilibili.com/'
        }
      })
    } else {
      callback({ requestHeaders: details.requestHeaders })
    }
  })
}

async function createSearchView(): Promise<BrowserView> {
  if (searchView && mainWindow) {
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

  if (mainWindow) {
    mainWindow.setBrowserView(null)
  }

  searchView.webContents.on('did-finish-load', async () => {
    console.log('[BliPod] Search page finished loading')
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const script = getExtractorScript()
      if (!script) {
        throw new Error('Extractor script not found')
      }
      
      await searchView!.webContents.executeJavaScript(script)
      console.log('[BliPod] Extractor script injected')
      
      const result = await searchView!.webContents.executeJavaScript(
        'window.__BILI_EXTRACT_SEARCH__ ? window.__BILI_EXTRACT_SEARCH__() : null'
      ) as SearchResult | null

      console.log('[BliPod] Extract result:', JSON.stringify(result, null, 2))

      if (result && mainWindow) {
        mainWindow.webContents.send('search:result', result)
      }
    } catch (error) {
      console.error('[BliPod] Failed to extract search results:', error)
      if (mainWindow) {
        mainWindow.webContents.send('search:result', {
          success: false,
          videos: [],
          hasMore: false,
          error: error instanceof Error ? error.message : 'Failed to extract search results',
          extractedAt: Date.now(),
          pageUrl: '',
          currentPage: 1,
          nextOffset: null,
        } as SearchResult)
      }
    }
  })

  return searchView
}

async function createPlayerView(): Promise<BrowserView> {
  if (playerView) {
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

  playerView.webContents.on('did-finish-load', () => {
    console.log('[BliPod] Player page finished loading')
    
    playerView!.webContents.executeJavaScript(`
      (function() {
        const style = document.createElement('style');
        style.textContent = \`
          video { display: none !important; }
          body { background: transparent !important; }
          .bilibili-player-video { display: none !important; }
        \`;
        document.head.appendChild(style);
      })();
    `).catch(err => console.error('[BliPod] Failed to inject player styles:', err))
    
    if (mainWindow) {
      mainWindow.webContents.send('player:ready')
    }
    
    startProgressTracking()
  })

  return playerView
}

async function fetchUserInfo(): Promise<UserInfo | null> {
  try {
    const bilibiliSession = getBilibiliSession()
    const cookies = await bilibiliSession.cookies.get({ url: 'https://www.bilibili.com' })
    
    const sessdata = cookies.find(c => c.name === 'SESSDATA')
    if (!sessdata) {
      return null
    }
    
    const response = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      headers: {
        'Referer': 'https://www.bilibili.com/',
        'Cookie': `SESSDATA=${sessdata.value}`
      }
    })
    
    const data = await response.json()
    
    if (data.code === 0 && data.data.isLogin) {
      return {
        mid: data.data.mid,
        name: data.data.uname,
        face: data.data.face,
        sign: data.data.sign || '',
        level: data.data.level_info?.current_level || 0,
        vipType: data.data.vipType || 0
      }
    }
    
    return null
  } catch (error) {
    console.error('[BliPod] Failed to fetch user info:', error)
    return null
  }
}

async function checkLoginStatus(): Promise<BiliAuthStatus> {
  const bilibiliSession = getBilibiliSession()
  const cookies = await bilibiliSession.cookies.get({ url: 'https://www.bilibili.com' })
  
  const sessdata = cookies.find(c => c.name === 'SESSDATA')
  
  if (!sessdata) {
    return { isLoggedIn: false, userInfo: null }
  }
  
  const userInfo = await fetchUserInfo()
  
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
    const response = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', {
      headers: {
        'Referer': 'https://passport.bilibili.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
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
              'Referer': 'https://passport.bilibili.com/',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          }
        )
        
        const statusResult: QrCodeStatus = await statusResponse.json()
        
        console.log('[BliPod] QR poll status:', statusResult.data?.code, statusResult.data?.message)
        
        if (statusResult.data?.code === 0) {
          stopQrPoll()
          
          const url = new URL(statusResult.data.url)
          const cookieParams = url.searchParams
          
          const bilibiliSession = getBilibiliSession()
          
          const dedeuserid = cookieParams.get('DedeUserID')
          const dedeuseridCkMd5 = cookieParams.get('DedeUserID__ckMd5')
          const sessdata = cookieParams.get('SESSDATA')
          const biliJct = cookieParams.get('bili_jct')
          
          if (sessdata) {
            const cookieOptions = {
              url: 'https://www.bilibili.com',
              domain: '.bilibili.com',
              path: '/'
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
        console.error('[BliPod] QR poll error:', error)
      }
    }, 2000)
    
  } catch (error) {
    console.error('[BliPod] Failed to start QR login:', error)
    if (mainWindow) {
      mainWindow.webContents.send('auth:error', error instanceof Error ? error.message : 'Failed to start login')
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
  ipcMain.handle('search:query', async (_event, query: string, offset?: number): Promise<SearchResult> => {
    console.log('[BliPod] Search query received:', query, 'offset:', offset)
    
    try {
      const view = await createSearchView()
      const encodedQuery = encodeURIComponent(query)
      let searchUrl: string
      
      if (offset && offset > 0) {
        const page = Math.floor(offset / 20) + 1
        searchUrl = `https://search.bilibili.com/video?keyword=${encodedQuery}&search_source=1&page=${page}&o=${offset}`
      } else {
        searchUrl = `https://search.bilibili.com/video?keyword=${encodedQuery}&search_source=1`
      }
      
      console.log('[BliPod] Loading search URL:', searchUrl)
      await view.webContents.loadURL(searchUrl)
      
      return {
        success: true,
        videos: [],
        hasMore: false,
        extractedAt: Date.now(),
        pageUrl: searchUrl,
        currentPage: 1,
        nextOffset: null,
      }
    } catch (error) {
      console.error('[BliPod] Search error:', error)
      return {
        success: false,
        videos: [],
        hasMore: false,
        error: error instanceof Error ? error.message : 'Search request failed',
        extractedAt: Date.now(),
        pageUrl: '',
        currentPage: 1,
        nextOffset: null,
      }
    }
  })

  ipcMain.handle('search:uploader', async (_event, mid: string): Promise<SearchResult> => {
    console.log('[BliPod] Uploader videos request received:', mid)
    
    try {
      const view = await createSearchView()
      const uploaderUrl = `https://space.bilibili.com/${mid}/upload/video`
      
      console.log('[BliPod] Loading uploader URL:', uploaderUrl)
      await view.webContents.loadURL(uploaderUrl)
      
      return {
        success: true,
        videos: [],
        hasMore: false,
        extractedAt: Date.now(),
        pageUrl: uploaderUrl,
        currentPage: 1,
        nextOffset: null,
      }
    } catch (error) {
      console.error('[BliPod] Uploader videos error:', error)
      return {
        success: false,
        videos: [],
        hasMore: false,
        error: error instanceof Error ? error.message : 'Failed to load uploader videos',
        extractedAt: Date.now(),
        pageUrl: '',
        currentPage: 1,
        nextOffset: null,
      }
    }
  })

  ipcMain.on('player:play', async (_event, bvid: string) => {
    console.log('[BliPod] Playing video:', bvid)
    
    try {
      const view = await createPlayerView()
      const playUrl = `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&autoplay=1&muted=0`
      
      await view.webContents.loadURL(playUrl)
      
      if (mainWindow) {
        mainWindow.setBrowserView(view)
        const bounds = mainWindow.getBounds()
        view.setBounds({ x: 0, y: bounds.height, width: 1, height: 1 })
      }
    } catch (error) {
      console.error('[BliPod] Failed to play video:', error)
    }
  })

  ipcMain.on('player:pause', async () => {
    if (playerView) {
      await playerView.webContents.executeJavaScript(`
        if (document.querySelector('video')) {
          document.querySelector('video').pause();
        }
      `).catch(() => {})
    }
  })

  ipcMain.on('search:clickNextPage', async () => {
    console.log('[BliPod] Clicking next page button')
    
    if (!searchView) {
      console.error('[BliPod] Search view not found')
      return
    }
    
    try {
      const hasFunction = await searchView.webContents.executeJavaScript(
        'typeof window.__BILI_CLICK_NEXT_PAGE__ === "function"'
      )
      
      if (!hasFunction) {
        console.log('[BliPod] Re-injecting extractor script')
        const script = getExtractorScript()
        if (script) {
          await searchView.webContents.executeJavaScript(script)
        }
      }
      
      const result = await searchView.webContents.executeJavaScript(
        'window.__BILI_CLICK_NEXT_PAGE__()'
      )
      
      console.log('[BliPod] Click next page result:', JSON.stringify(result, null, 2))
      
      if (mainWindow) {
        mainWindow.webContents.send('search:result', result)
      }
    } catch (error) {
      console.error('[BliPod] Failed to click next page:', error)
      if (mainWindow) {
        mainWindow.webContents.send('search:result', {
          success: false,
          videos: [],
          hasMore: false,
          error: error instanceof Error ? error.message : 'Failed to click next page',
          extractedAt: Date.now(),
          pageUrl: '',
          currentPage: 1,
          nextOffset: null,
        } as SearchResult)
      }
    }
  })

  ipcMain.on('player:resume', async () => {
    if (playerView) {
      await playerView.webContents.executeJavaScript(`
        if (document.querySelector('video')) {
          document.querySelector('video').play();
        }
      `).catch(() => {})
    }
  })

  ipcMain.on('player:seek', async (_event, time: number) => {
    if (playerView) {
      await playerView.webContents.executeJavaScript(`
        if (document.querySelector('video')) {
          document.querySelector('video').currentTime = ${time};
        }
      `).catch(() => {})
    }
  })

  ipcMain.on('player:volume', async (_event, volume: number) => {
    if (playerView) {
      await playerView.webContents.executeJavaScript(`
        if (document.querySelector('video')) {
          document.querySelector('video').volume = ${volume / 100};
        }
      `).catch(() => {})
    }
  })

  ipcMain.handle('auth:checkLogin', async (): Promise<BiliAuthStatus> => {
    return checkLoginStatus()
  })

  ipcMain.handle('auth:startLogin', async () => {
    await startQrLogin()
  })

  ipcMain.handle('auth:logout', async () => {
    await logout()
  })
}

app.whenReady().then(() => {
  setupCSP()
  setupBilibiliImageReferer()
  setupIPC()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
