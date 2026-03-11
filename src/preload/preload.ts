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

export interface SearchResult {
  success: boolean
  videos: ExtractedVideo[]
  hasMore: boolean
  error?: string
  extractedAt: number
  pageUrl: string
  currentPage: number
  nextOffset: number | null
}

export interface SearchAPI {
  search: (query: string, offset?: number) => Promise<SearchResult>
  playVideo: (bvid: string) => void
  pauseVideo: () => void
  resumeVideo: () => void
  seekVideo: (time: number) => void
  setVolume: (volume: number) => void
  onSearchResult: (callback: (result: SearchResult) => void) => () => void
  onPlayerReady: (callback: () => void) => () => void
  onPlayerProgress: (callback: (progress: PlayerProgress) => void) => () => void
}

const searchAPI: SearchAPI = {
  search: (query: string, offset?: number) => {
    return ipcRenderer.invoke('search:query', query, offset)
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

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  search: searchAPI
})
