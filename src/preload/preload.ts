import { contextBridge, ipcRenderer } from 'electron'

export interface PlayerProgress {
  currentTime: number
  duration: number
  paused: boolean
}

export interface ExtractedVideo {
  bvid: string
  title: string
  cover: string
  author: string
  authorLink: string
  duration: string
  playCount: string
  videoLink: string
}

export interface UploaderInfo {
  name: string
  avatar: string
  mid: string
}

export interface SearchResult {
  success: boolean
  videos: ExtractedVideo[]
  hasMore: boolean
  error?: string
  extractedAt: number
  pageUrl: string
  currentPage: number
  nextOffset: number | null
  uploader?: UploaderInfo
}

export interface UserInfo {
  mid: number
  name: string
  face: string
  sign: string
  level: number
  vipType: number
}

export interface BiliAuthStatus {
  isLoggedIn: boolean
  userInfo: UserInfo | null
}

export interface SearchAPI {
  search: (query: string, offset?: number) => Promise<SearchResult>
  loadUploaderVideos: (mid: string) => Promise<SearchResult>
  clickNextPage: () => void
  playVideo: (bvid: string) => void
  pauseVideo: () => void
  resumeVideo: () => void
  seekVideo: (time: number) => void
  setVolume: (volume: number) => void
  onSearchResult: (callback: (result: SearchResult) => void) => () => void
  onPlayerReady: (callback: () => void) => () => void
  onPlayerProgress: (callback: (progress: PlayerProgress) => void) => () => void
}

export interface AuthAPI {
  checkLogin: () => Promise<BiliAuthStatus>
  startLogin: () => Promise<void>
  logout: () => Promise<void>
  onQrCode: (callback: (url: string) => void) => () => void
  onLoginSuccess: (callback: (user: UserInfo) => void) => () => void
  onLoginError: (callback: (error: string) => void) => () => void
}

const searchAPI: SearchAPI = {
  search: (query: string, offset?: number) => {
    return ipcRenderer.invoke('search:query', query, offset)
  },
  loadUploaderVideos: (mid: string) => {
    return ipcRenderer.invoke('search:uploader', mid)
  },
  clickNextPage: () => {
    ipcRenderer.send('search:clickNextPage')
  },
  playVideo: (bvid: string) => {
    ipcRenderer.send('player:play', bvid)
  },
  pauseVideo: () => {
    ipcRenderer.send('player:pause')
  },
  resumeVideo: () => {
    ipcRenderer.send('player:resume')
  },
  seekVideo: (time: number) => {
    ipcRenderer.send('player:seek', time)
  },
  setVolume: (volume: number) => {
    ipcRenderer.send('player:volume', volume)
  },
  onSearchResult: (callback) => {
    const handler = (_event: unknown, result: SearchResult) => callback(result)
    ipcRenderer.on('search:result', handler)
    return () => ipcRenderer.removeListener('search:result', handler)
  },
  onPlayerReady: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('player:ready', handler)
    return () => ipcRenderer.removeListener('player:ready', handler)
  },
  onPlayerProgress: (callback) => {
    const handler = (_event: unknown, progress: PlayerProgress) => callback(progress)
    ipcRenderer.on('player:progress', handler)
    return () => ipcRenderer.removeListener('player:progress', handler)
  }
}

const authAPI: AuthAPI = {
  checkLogin: () => {
    return ipcRenderer.invoke('auth:checkLogin')
  },
  startLogin: () => {
    return ipcRenderer.invoke('auth:startLogin')
  },
  logout: () => {
    return ipcRenderer.invoke('auth:logout')
  },
  onQrCode: (callback) => {
    const handler = (_event: unknown, url: string) => callback(url)
    ipcRenderer.on('auth:qrcode', handler)
    return () => ipcRenderer.removeListener('auth:qrcode', handler)
  },
  onLoginSuccess: (callback) => {
    const handler = (_event: unknown, user: UserInfo) => callback(user)
    ipcRenderer.on('auth:success', handler)
    return () => ipcRenderer.removeListener('auth:success', handler)
  },
  onLoginError: (callback) => {
    const handler = (_event: unknown, error: string) => callback(error)
    ipcRenderer.on('auth:error', handler)
    return () => ipcRenderer.removeListener('auth:error', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  search: searchAPI,
  auth: authAPI
})
