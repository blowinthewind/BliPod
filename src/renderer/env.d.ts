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

interface PlayStatsEntry {
  bvid: string
  playCount: number
  totalWatchSeconds: number
  lastPlayedAt: number
  lastCountedAt: number | null
  lastDuration: number | null
  lastPosition: number | null
}

interface AppStore {
  favorites: FavoriteVideo[]
  playlists: Playlist[]
  settings: AppSettings
  playPositions: PlayPosition[]
  userQueue: ExtractedVideo[]
  lastVolume: number
  playStats?: Record<string, PlayStatsEntry>
}

type ImportStrategy = 'merge' | 'overwrite'

interface ExportOptions {
  categories?: string[]
}

interface ImportOptionsV2 {
  categories?: string[]
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
  stats?: Record<string, { imported: number; total: number }>
}

interface CategoryStats {
  key: string
  name: string
  count: number
}

interface DataStats {
  favoritesCount: number
  playlistsCount: number
  totalVideosInPlaylists: number
}

interface MemoryStats {
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

interface MemoryAPI {
  getStats: () => Promise<MemoryStats>
  cleanup: () => Promise<boolean>
  clearCache: () => Promise<boolean>
  setIdleTimeout: (timeoutMs: number) => Promise<boolean>
}

interface StoreAPI {
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

interface SearchAPI {
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

interface AuthAPI {
  checkLogin: () => Promise<BiliAuthStatus>
  startLogin: () => Promise<void>
  cancelLogin: () => Promise<void>
  logout: () => Promise<void>
  onQrCode: (callback: (url: string) => void) => () => void
  onLoginSuccess: (callback: (user: UserInfo) => void) => () => void
  onLoginError: (callback: (error: string) => void) => () => void
}

interface NativePlaybackState {
  hasVideo: boolean
  title: string
  author: string
  isPlaying: boolean
  isMuted: boolean
  volume: number
}

interface NativePlayerAPI {
  updateState: (state: NativePlaybackState) => void
}

interface Window {
  electronAPI: {
    platform: NodeJS.Platform
    search: SearchAPI
    auth: AuthAPI
    store: StoreAPI
    memory: MemoryAPI
    nativePlayer: NativePlayerAPI
  }
}
