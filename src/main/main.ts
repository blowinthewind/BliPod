import { app, BrowserWindow, session, ipcMain, BrowserView } from 'electron'
import { join } from 'path'
import type { SearchResult } from '../scripts/search-extractor'

let mainWindow: BrowserWindow | null = null
let searchView: BrowserView | null = null
let playerView: BrowserView | null = null

const BILIBILI_SESSION = 'persist:bilibili'

function getBilibiliSession() {
  return session.fromPartition(BILIBILI_SESSION)
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
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' https: data: blob:; " +
          "connect-src 'self' https: ws:; " +
          "font-src 'self' data:; " +
          "media-src 'self' https: blob:; " +
          "frame-src 'self' https://www.bilibili.com https://player.bilibili.com https://search.bilibili.com"
        ]
      }
    })
  })
}

async function createSearchView(): Promise<BrowserView> {
  if (searchView && mainWindow) {
    return searchView
  }

  searchView = new BrowserView({
    webPreferences: {
      preload: join(__dirname, '../scripts/inject-search.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      session: getBilibiliSession()
    }
  })

  if (mainWindow) {
    mainWindow.setBrowserView(null)
  }

  searchView.webContents.on('did-finish-load', async () => {
    try {
      const result = await searchView!.webContents.executeJavaScript(
        'window.__BILI_EXTRACT_SEARCH__ ? window.__BILI_EXTRACT_SEARCH__() : null'
      ) as SearchResult | null

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
          pageUrl: ''
        } as SearchResult)
      }
    }
  })

  return searchView
}

async function createPlayerView(): Promise<BrowserView> {
  if (playerView && mainWindow) {
    return playerView
  }

  playerView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      session: getBilibiliSession()
    }
  })

  playerView.webContents.on('did-finish-load', () => {
    if (mainWindow) {
      mainWindow.webContents.send('player:ready')
    }
  })

  return playerView
}

function setupIPC() {
  ipcMain.handle('search:query', async (_event, query: string): Promise<SearchResult> => {
    try {
      const view = await createSearchView()
      const encodedQuery = encodeURIComponent(query)
      const searchUrl = `https://search.bilibili.com/all?keyword=${encodedQuery}&search_source=1`
      
      await view.webContents.loadURL(searchUrl)
      
      return {
        success: true,
        videos: [],
        hasMore: false,
        extractedAt: Date.now(),
        pageUrl: searchUrl
      }
    } catch (error) {
      return {
        success: false,
        videos: [],
        hasMore: false,
        error: error instanceof Error ? error.message : 'Search request failed',
        extractedAt: Date.now(),
        pageUrl: ''
      }
    }
  })

  ipcMain.on('player:play', async (_event, bvid: string) => {
    try {
      const view = await createPlayerView()
      const playUrl = `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&autoplay=1`
      
      await view.webContents.loadURL(playUrl)
      
      if (mainWindow) {
        mainWindow.setBrowserView(view)
        const bounds = mainWindow.getBounds()
        view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height - 90 })
      }
    } catch (error) {
      console.error('[BliPod] Failed to play video:', error)
    }
  })
}

app.whenReady().then(() => {
  setupCSP()
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
