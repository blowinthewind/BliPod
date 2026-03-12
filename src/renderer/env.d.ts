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
  }
}
