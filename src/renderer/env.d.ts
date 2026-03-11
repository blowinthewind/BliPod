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

interface SearchAPI {
  search: (query: string) => Promise<SearchResult>
  playVideo: (bvid: string) => void
  pauseVideo: () => void
  resumeVideo: () => void
  seekVideo: (time: number) => void
  setVolume: (volume: number) => void
  onSearchResult: (callback: (result: SearchResult) => void) => () => void
  onPlayerReady: (callback: () => void) => () => void
}

interface Window {
  electronAPI: {
    platform: NodeJS.Platform
    search: SearchAPI
  }
}
