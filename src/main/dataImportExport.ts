import { dialog } from 'electron'
import { writeFile, readFile } from 'fs/promises'
import { app } from 'electron'
import type { FavoriteVideo, Playlist, PlaylistVideo } from './store'
import type { ExtractedVideo } from '../preload/preload'
import { store } from './store'

const CURRENT_EXPORT_VERSION = '1.0.0'

export interface ExportData {
  version: string
  exportedAt: number
  appVersion: string
  favorites: FavoriteVideo[]
  playlists: Playlist[]
  userQueue: ExtractedVideo[]
}

export type ImportStrategy = 'merge' | 'overwrite'

export interface ImportOptions {
  strategy: ImportStrategy
}

function mergeFavorites(existing: FavoriteVideo[], imported: FavoriteVideo[]): FavoriteVideo[] {
  const map = new Map<string, FavoriteVideo>()
  
  existing.forEach(f => map.set(f.bvid, f))
  
  imported.forEach(f => {
    const existingItem = map.get(f.bvid)
    if (!existingItem || f.addedAt > existingItem.addedAt) {
      map.set(f.bvid, f)
    }
  })
  
  return Array.from(map.values()).sort((a, b) => b.addedAt - a.addedAt)
}

function mergePlaylists(existing: Playlist[], imported: Playlist[]): Playlist[] {
  const map = new Map<string, Playlist>()
  
  existing.forEach(p => map.set(p.id, p))
  
  imported.forEach(p => {
    const existingItem = map.get(p.id)
    if (!existingItem) {
      map.set(p.id, p)
    } else {
      const videoMap = new Map<string, PlaylistVideo>()
      existingItem.videos.forEach(v => videoMap.set(v.bvid, v))
      p.videos.forEach(v => {
        const existingVideo = videoMap.get(v.bvid)
        if (!existingVideo || v.addedAt > existingVideo.addedAt) {
          videoMap.set(v.bvid, v)
        }
      })
      map.set(p.id, {
        ...existingItem,
        videos: Array.from(videoMap.values()),
        updatedAt: Math.max(existingItem.updatedAt, p.updatedAt)
      })
    }
  })
  
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt)
}

function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false

  const d = data as Record<string, unknown>
  if (typeof d.version !== 'string') return false
  if (typeof d.exportedAt !== 'number') return false
  if (!Array.isArray(d.favorites)) return false
  if (!Array.isArray(d.playlists)) return false
  // userQueue is optional for backward compatibility

  const [major] = d.version.split('.')
  const [currentMajor] = CURRENT_EXPORT_VERSION.split('.')

  if (major !== currentMajor) {
    throw new Error(`Incompatible export version: ${d.version}`)
  }

  return true
}

export async function exportDataToFile(): Promise<{ success: boolean; error?: string; filePath?: string }> {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Export BliPod Data',
      defaultPath: `blipod-export-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' }
    }
    
    const exportData: ExportData = {
      version: CURRENT_EXPORT_VERSION,
      exportedAt: Date.now(),
      appVersion: app.getVersion(),
      favorites: store.get('favorites'),
      playlists: store.get('playlists'),
      userQueue: store.get('userQueue')
    }
    
    await writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
    
    return { success: true, filePath: result.filePath }
  } catch (error) {
    console.error('[BliPod] Export error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Export failed' 
    }
  }
}

export async function importDataFromFile(options: ImportOptions): Promise<{ 
  success: boolean
  error?: string
  stats?: {
    favoritesImported: number
    playlistsImported: number
    videosImported: number
  }
}> {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Import BliPod Data',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Import cancelled' }
    }
    
    const filePath = result.filePaths[0]
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content)
    
    if (!validateExportData(data)) {
      return { success: false, error: 'Invalid export file format' }
    }
    
    let favoritesImported = 0
    let playlistsImported = 0
    let videosImported = 0
    
    if (options.strategy === 'overwrite') {
      store.set('favorites', data.favorites)
      store.set('playlists', data.playlists)
      if (data.userQueue) {
        store.set('userQueue', data.userQueue)
      }
      favoritesImported = data.favorites.length
      playlistsImported = data.playlists.length
      videosImported = data.playlists.reduce((sum, p) => sum + p.videos.length, 0)
    } else {
      const existingFavorites = store.get('favorites')
      const existingPlaylists = store.get('playlists')
      const existingVideosCount = existingPlaylists.reduce((sum, p) => sum + p.videos.length, 0)

      const mergedFavorites = mergeFavorites(existingFavorites, data.favorites)
      const mergedPlaylists = mergePlaylists(existingPlaylists, data.playlists)
      const mergedVideosCount = mergedPlaylists.reduce((sum, p) => sum + p.videos.length, 0)

      favoritesImported = mergedFavorites.length - existingFavorites.length
      playlistsImported = mergedPlaylists.length - existingPlaylists.length
      videosImported = mergedVideosCount - existingVideosCount

      store.set('favorites', mergedFavorites)
      store.set('playlists', mergedPlaylists)
      // For merge strategy, we don't merge userQueue, just keep existing
    }
    
    return { 
      success: true, 
      stats: { favoritesImported, playlistsImported, videosImported }
    }
  } catch (error) {
    console.error('[BliPod] Import error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Import failed' 
    }
  }
}

export function getDataStats(): {
  favoritesCount: number
  playlistsCount: number
  totalVideosInPlaylists: number
} {
  const favorites = store.get('favorites')
  const playlists = store.get('playlists')
  
  return {
    favoritesCount: favorites.length,
    playlistsCount: playlists.length,
    totalVideosInPlaylists: playlists.reduce((sum, p) => sum + p.videos.length, 0)
  }
}
