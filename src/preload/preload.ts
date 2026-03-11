import { contextBridge, ipcRenderer } from 'electron'
import type { SearchResult } from '../scripts/search-extractor'

export interface SearchAPI {
  search: (query: string) => Promise<SearchResult>
  playVideo: (bvid: string) => void
  pauseVideo: () => void
  resumeVideo: () => void
  seekVideo: (time: number) => void
  setVolume: (volume: number) => void
  onSearchResult: (callback: (result: SearchResult) => void) => () => void
  onPlayerReady: (callback: () => void) => () => void
}

const searchAPI: SearchAPI = {
  search: (query: string) => {
    return ipcRenderer.invoke('search:query', query)
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
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  search: searchAPI
})
