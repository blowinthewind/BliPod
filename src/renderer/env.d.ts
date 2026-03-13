/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface SearchResult {
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

interface ExtractedVideo {
  bvid: string
  title: string
  cover: string
  author: string
  authorLink: string
  duration: string
  playCount: string
  videoLink: string
}

interface UploaderInfo {
  name: string
  avatar: string
  mid: string
}

interface PlayerProgress {
  currentTime: number
  duration: number
  paused: boolean
}

interface UserInfo {
  mid: number
  name: string
  face: string
  sign: string
  level: number
  vipType: number
}

interface BiliAuthStatus {
  isLoggedIn: boolean
  userInfo: UserInfo | null
}

interface FavoriteVideo extends ExtractedVideo {
  addedAt: number
}

interface PlaylistVideo extends ExtractedVideo {
  addedAt: number
}

interface Playlist {
  id: string
  name: string
  description?: string
  cover?: string
  videos: PlaylistVideo[]
  createdAt: number
  updatedAt: number
}

interface AppSettings {
  volume: number
  autoPlay: boolean
  rememberPosition: boolean
  currentThemeId: string
}

interface PlayPosition {
  bvid: string
  currentTime: number
  duration: number
  updatedAt: number
}

interface AppStore {
  favorites: FavoriteVideo[]
  playlists: Playlist[]
  settings: AppSettings
  playPositions: PlayPosition[]
}

type ImportStrategy = 'merge' | 'overwrite'

interface ImportOptions {
  strategy: ImportStrategy
}

interface ExportResult {
  success: boolean
  error?: string
  filePath?: string
}

interface ImportResult {
  success: boolean
  error?: string
  stats?: {
    favoritesImported: number
    playlistsImported: number
    videosImported: number
  }
}

interface DataStats {
  favoritesCount: number
  playlistsCount: number
  totalVideosInPlaylists: number
}

interface StoreAPI {
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
  exportDataToFile: () => Promise<ExportResult>
  importDataFromFile: (options: ImportOptions) => Promise<ImportResult>
  getDataStats: () => Promise<DataStats>
}

interface SearchAPI {
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

interface AuthAPI {
  checkLogin: () => Promise<BiliAuthStatus>
  startLogin: () => Promise<void>
  cancelLogin: () => Promise<void>
  logout: () => Promise<void>
  onQrCode: (callback: (url: string) => void) => () => void
  onLoginSuccess: (callback: (user: UserInfo) => void) => () => void
  onLoginError: (callback: (error: string) => void) => () => void
}

interface Window {
  electronAPI: {
    platform: NodeJS.Platform
    search: SearchAPI
    auth: AuthAPI
    store: StoreAPI
  }
}
