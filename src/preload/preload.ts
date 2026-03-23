import { contextBridge, ipcRenderer } from 'electron'
import type { Theme } from '../shared/theme'

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
  autoPlay: boolean
  rememberPosition: boolean
  currentThemeId: string
  customThemes: Theme[]
}

export interface PlayPosition {
  bvid: string
  currentTime: number
  duration: number
  updatedAt: number
}

export interface PlayStatsEntry {
  bvid: string
  playCount: number
  totalWatchSeconds: number
  lastPlayedAt: number
  lastCountedAt: number | null
  lastDuration: number | null
  lastPosition: number | null
}

export interface AppStore {
  favorites: FavoriteVideo[]
  playlists: Playlist[]
  settings: AppSettings
  playPositions: PlayPosition[]
  userQueue: ExtractedVideo[]
  lastVolume: number
  playStats?: Record<string, PlayStatsEntry>
}

export type ImportStrategy = 'merge' | 'overwrite'

export interface ExportOptions {
  categories?: string[]
}

export interface ImportOptionsV2 {
  categories?: string[]
  strategy: ImportStrategy
}

export interface ExportResult {
  success: boolean
  error?: string
  filePath?: string
}

export interface ImportResult {
  success: boolean
  error?: string
  stats?: Record<string, { imported: number; total: number }>
}

export interface CategoryStats {
  key: string
  name: string
  count: number
}

export interface DataStats {
  favoritesCount: number
  playlistsCount: number
  totalVideosInPlaylists: number
}

export interface MemoryStats {
  heapUsed: number
  heapTotal: number
  rss: number
  external: number
  searchViewActive: boolean
  playerViewActive: boolean
  searchViewIdleTime: number
  playerViewIdleTime: number
  viewIdleTimeout: number
}

export interface NativePlaybackState {
  hasVideo: boolean
  hasNext: boolean
  hasPrevious: boolean
  title: string
  author: string
  isPlaying: boolean
  isMuted: boolean
  volume: number
  isShuffle: boolean
  isRepeat: boolean
}

export interface MemoryAPI {
  getStats: () => Promise<MemoryStats>
  cleanup: () => Promise<boolean>
  clearCache: () => Promise<boolean>
  setIdleTimeout: (timeoutMs: number) => Promise<boolean>
}

export type NativePlayerCommand =
  | 'togglePlay'
  | 'previous'
  | 'next'
  | 'toggleMute'
  | 'seekBackward'
  | 'seekForward'
  | 'volumeUp'
  | 'volumeDown'
  | 'toggleShuffle'
  | 'toggleRepeat'
export type NativeMenuCommand = NativePlayerCommand | 'openSettings'

export interface NativePlayerAPI {
  updateState: (state: NativePlaybackState) => void
  onCommand: (callback: (command: NativeMenuCommand) => void) => () => void
}

export interface StoreAPI {
  getFavorites: () => Promise<FavoriteVideo[]>
  addFavorite: (video: ExtractedVideo) => Promise<boolean>
  removeFavorite: (bvid: string) => Promise<boolean>
  isFavorite: (bvid: string) => Promise<boolean>
  updateFavoriteDuration: (bvid: string, duration: string) => Promise<boolean>
  getPlaylists: () => Promise<Playlist[]>
  createPlaylist: (name: string, description?: string) => Promise<Playlist>
  updatePlaylist: (
    id: string,
    updates: Partial<Pick<Playlist, 'name' | 'description' | 'cover'>>
  ) => Promise<Playlist | null>
  deletePlaylist: (id: string) => Promise<boolean>
  addVideoToPlaylist: (playlistId: string, video: ExtractedVideo) => Promise<boolean>
  removeVideoFromPlaylist: (playlistId: string, bvid: string) => Promise<boolean>
  updatePlaylistVideoDuration: (bvid: string, duration: string) => Promise<boolean>
  getSettings: () => Promise<AppSettings>
  updateSettings: (updates: Partial<AppSettings>) => Promise<AppSettings>
  getPlayPosition: (bvid: string) => Promise<PlayPosition | null>
  savePlayPosition: (bvid: string, currentTime: number, duration: number) => Promise<void>
  clearPlayPosition: (bvid: string) => Promise<void>
  getPlayStats: (bvid?: string) => Promise<PlayStatsEntry | Record<string, PlayStatsEntry> | null>
  updateWatchTime: (
    bvid: string,
    deltaSeconds: number,
    duration: number,
    position: number
  ) => Promise<PlayStatsEntry>
  incrementPlayCount: (bvid: string, duration: number, position: number) => Promise<PlayStatsEntry>
  getUserQueue: () => Promise<ExtractedVideo[]>
  setUserQueue: (queue: ExtractedVideo[]) => Promise<void>
  addToUserQueue: (video: ExtractedVideo) => Promise<boolean>
  removeFromUserQueue: (bvid: string) => Promise<boolean>
  clearUserQueue: () => Promise<void>
  moveUserQueueItem: (fromIndex: number, toIndex: number) => Promise<boolean>
  exportData: () => Promise<AppStore>
  importData: (data: Partial<AppStore>) => Promise<void>
  exportDataToFile: (options?: ExportOptions) => Promise<ExportResult>
  importDataFromFile: (options: ImportOptionsV2) => Promise<ImportResult>
  getDataStats: () => Promise<DataStats>
  getCategoryStats: () => Promise<CategoryStats[]>
  getLastVolume: () => Promise<number>
  setLastVolume: (volume: number) => Promise<void>
}

export interface SearchAPI {
  search: (query: string, offset?: number) => Promise<SearchResult>
  loadUploaderVideos: (mid: string) => Promise<SearchResult>
  clickNextPage: () => void
  playVideo: (bvid: string, autoplay?: boolean) => void
  pauseVideo: () => void
  resumeVideo: () => void
  seekVideo: (time: number) => void
  setVolume: (volume: number) => void
  onSearchResult: (callback: (result: SearchResult) => void) => () => void
  onPlayerReady: (callback: () => void) => () => void
  onPlayerProgress: (callback: (progress: PlayerProgress) => void) => () => void
  onViewDestroyed: (callback: (data: { message: string; lastQuery: string }) => void) => () => void
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
  playVideo: (bvid: string, autoplay: boolean = true) => {
    ipcRenderer.send('player:play', bvid, autoplay)
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
  },
  onViewDestroyed: (callback) => {
    const handler = (_event: unknown, data: { message: string; lastQuery: string }) =>
      callback(data)
    ipcRenderer.on('search:viewDestroyed', handler)
    return () => ipcRenderer.removeListener('search:viewDestroyed', handler)
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
  updateFavoriteDuration: (bvid: string, duration: string) => {
    return ipcRenderer.invoke('store:updateFavoriteDuration', bvid, duration)
  },
  getPlaylists: () => {
    return ipcRenderer.invoke('store:getPlaylists')
  },
  createPlaylist: (name: string, description?: string) => {
    return ipcRenderer.invoke('store:createPlaylist', name, description)
  },
  updatePlaylist: (
    id: string,
    updates: Partial<Pick<Playlist, 'name' | 'description' | 'cover'>>
  ) => {
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
  updatePlaylistVideoDuration: (bvid: string, duration: string) => {
    return ipcRenderer.invoke('store:updatePlaylistVideoDuration', bvid, duration)
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
  clearPlayPosition: (bvid: string) => {
    return ipcRenderer.invoke('store:clearPlayPosition', bvid)
  },
  getPlayStats: (bvid?: string) => {
    return ipcRenderer.invoke('store:getPlayStats', bvid)
  },
  updateWatchTime: (bvid: string, deltaSeconds: number, duration: number, position: number) => {
    return ipcRenderer.invoke('store:updateWatchTime', bvid, deltaSeconds, duration, position)
  },
  incrementPlayCount: (bvid: string, duration: number, position: number) => {
    return ipcRenderer.invoke('store:incrementPlayCount', bvid, duration, position)
  },
  getUserQueue: () => {
    return ipcRenderer.invoke('store:getUserQueue')
  },
  setUserQueue: (queue: ExtractedVideo[]) => {
    return ipcRenderer.invoke('store:setUserQueue', queue)
  },
  addToUserQueue: (video: ExtractedVideo) => {
    return ipcRenderer.invoke('store:addToUserQueue', video)
  },
  removeFromUserQueue: (bvid: string) => {
    return ipcRenderer.invoke('store:removeFromUserQueue', bvid)
  },
  clearUserQueue: () => {
    return ipcRenderer.invoke('store:clearUserQueue')
  },
  moveUserQueueItem: (fromIndex: number, toIndex: number) => {
    return ipcRenderer.invoke('store:moveUserQueueItem', fromIndex, toIndex)
  },
  exportData: () => {
    return ipcRenderer.invoke('store:exportData')
  },
  importData: (data: Partial<AppStore>) => {
    return ipcRenderer.invoke('store:importData', data)
  },
  exportDataToFile: (options?: ExportOptions) => {
    return ipcRenderer.invoke('store:exportDataToFile', options)
  },
  importDataFromFile: (options: ImportOptionsV2) => {
    return ipcRenderer.invoke('store:importDataFromFile', options)
  },
  getDataStats: () => {
    return ipcRenderer.invoke('store:getDataStats')
  },
  getCategoryStats: () => {
    return ipcRenderer.invoke('store:getCategoryStats')
  },
  getLastVolume: () => {
    return ipcRenderer.invoke('store:getLastVolume')
  },
  setLastVolume: (volume: number) => {
    return ipcRenderer.invoke('store:setLastVolume', volume)
  }
}

const memoryAPI: MemoryAPI = {
  getStats: () => {
    return ipcRenderer.invoke('memory:getStats')
  },
  cleanup: () => {
    return ipcRenderer.invoke('memory:cleanup')
  },
  clearCache: () => {
    return ipcRenderer.invoke('memory:clearCache')
  },
  setIdleTimeout: (timeoutMs: number) => {
    return ipcRenderer.invoke('memory:setIdleTimeout', timeoutMs)
  }
}

const nativePlayerAPI: NativePlayerAPI = {
  updateState: (state: NativePlaybackState) => {
    ipcRenderer.send('native-player:updateState', state)
  },
  onCommand: (callback) => {
    const handler = (_event: unknown, command: NativeMenuCommand) => callback(command)
    ipcRenderer.on('native-player:command', handler)
    return () => ipcRenderer.removeListener('native-player:command', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  search: searchAPI,
  auth: authAPI,
  store: storeAPI,
  memory: memoryAPI,
  nativePlayer: nativePlayerAPI
})
