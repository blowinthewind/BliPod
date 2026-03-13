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

export interface FavoriteVideo extends ExtractedVideo {
  addedAt: number
}

export interface PlaylistVideo extends ExtractedVideo {
  addedAt: number
}

export interface Playlist {
  id: string
  name: string
  description?: string
  cover?: string
  videos: PlaylistVideo[]
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  volume: number
  autoPlay: boolean
  rememberPosition: boolean
  currentThemeId: string
}

export interface PlayPosition {
  bvid: string
  currentTime: number
  duration: number
  updatedAt: number
}

export interface AppStore {
  favorites: FavoriteVideo[]
  playlists: Playlist[]
  settings: AppSettings
  playPositions: PlayPosition[]
}

export interface StoreAPI {
  getFavorites: () => Promise<FavoriteVideo[]>
  addFavorite: (video: ExtractedVideo) => Promise<boolean>
  removeFavorite: (bvid: string) => Promise<boolean>
  isFavorite: (bvid: string) => Promise<boolean>
  getPlaylists: () => Promise<Playlist[]>
  createPlaylist: (name: string, description?: string) => Promise<Playlist>
  updatePlaylist: (id: string, updates: Partial<Pick<Playlist, 'name' | 'description' | 'cover'>>) => Promise<Playlist | null>
  deletePlaylist: (id: string) => Promise<boolean>
  addVideoToPlaylist: (playlistId: string, video: ExtractedVideo) => Promise<boolean>
  removeVideoFromPlaylist: (playlistId: string, bvid: string) => Promise<boolean>
  getSettings: () => Promise<AppSettings>
  updateSettings: (updates: Partial<AppSettings>) => Promise<AppSettings>
  getPlayPosition: (bvid: string) => Promise<PlayPosition | null>
  savePlayPosition: (bvid: string, currentTime: number, duration: number) => Promise<void>
  exportData: () => Promise<AppStore>
  importData: (data: Partial<AppStore>) => Promise<void>
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
  cancelLogin: () => Promise<void>
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
  cancelLogin: () => {
    return ipcRenderer.invoke('auth:cancelLogin')
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

const storeAPI: StoreAPI = {
  getFavorites: () => {
    return ipcRenderer.invoke('store:getFavorites')
  },
  addFavorite: (video: ExtractedVideo) => {
    return ipcRenderer.invoke('store:addFavorite', video)
  },
  removeFavorite: (bvid: string) => {
    return ipcRenderer.invoke('store:removeFavorite', bvid)
  },
  isFavorite: (bvid: string) => {
    return ipcRenderer.invoke('store:isFavorite', bvid)
  },
  getPlaylists: () => {
    return ipcRenderer.invoke('store:getPlaylists')
  },
  createPlaylist: (name: string, description?: string) => {
    return ipcRenderer.invoke('store:createPlaylist', name, description)
  },
  updatePlaylist: (id: string, updates: Partial<Pick<Playlist, 'name' | 'description' | 'cover'>>) => {
    return ipcRenderer.invoke('store:updatePlaylist', id, updates)
  },
  deletePlaylist: (id: string) => {
    return ipcRenderer.invoke('store:deletePlaylist', id)
  },
  addVideoToPlaylist: (playlistId: string, video: ExtractedVideo) => {
    return ipcRenderer.invoke('store:addVideoToPlaylist', playlistId, video)
  },
  removeVideoFromPlaylist: (playlistId: string, bvid: string) => {
    return ipcRenderer.invoke('store:removeVideoFromPlaylist', playlistId, bvid)
  },
  getSettings: () => {
    return ipcRenderer.invoke('store:getSettings')
  },
  updateSettings: (updates: Partial<AppSettings>) => {
    return ipcRenderer.invoke('store:updateSettings', updates)
  },
  getPlayPosition: (bvid: string) => {
    return ipcRenderer.invoke('store:getPlayPosition', bvid)
  },
  savePlayPosition: (bvid: string, currentTime: number, duration: number) => {
    return ipcRenderer.invoke('store:savePlayPosition', bvid, currentTime, duration)
  },
  exportData: () => {
    return ipcRenderer.invoke('store:exportData')
  },
  importData: (data: Partial<AppStore>) => {
    return ipcRenderer.invoke('store:importData', data)
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  search: searchAPI,
  auth: authAPI,
  store: storeAPI
})
