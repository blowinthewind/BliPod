import type { FavoriteVideo, Playlist, AppSettings } from './store'
import type { ExtractedVideo } from '../preload/preload'
import { store } from './store'

export interface DataCategory<T> {
  key: string
  name: string
  description: string
  get: () => T
  set: (data: T) => void
  merge?: (existing: T, imported: T) => T
  validate: (data: unknown) => data is T
  getStats: (data: T) => number
}

const dataCategoriesMap = new Map<string, DataCategory<unknown>>()

export function registerDataCategory<T>(category: DataCategory<T>): void {
  if (dataCategoriesMap.has(category.key)) {
    console.warn(`[BliPod] Data category "${category.key}" already registered, overwriting`)
  }
  dataCategoriesMap.set(category.key, category as DataCategory<unknown>)
}

export function getDataCategory(key: string): DataCategory<unknown> | undefined {
  return dataCategoriesMap.get(key)
}

export function getRegisteredCategories(): DataCategory<unknown>[] {
  return Array.from(dataCategoriesMap.values())
}

export function getRegisteredCategoryKeys(): string[] {
  return Array.from(dataCategoriesMap.keys())
}

function isValidFavoriteVideo(data: unknown): data is FavoriteVideo {
  if (!data || typeof data !== 'object') return false
  const v = data as Record<string, unknown>
  return (
    typeof v.bvid === 'string' &&
    typeof v.title === 'string' &&
    typeof v.cover === 'string' &&
    typeof v.author === 'string' &&
    typeof v.addedAt === 'number'
  )
}

function isValidPlaylist(data: unknown): data is Playlist {
  if (!data || typeof data !== 'object') return false
  const p = data as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    Array.isArray(p.videos) &&
    typeof p.createdAt === 'number' &&
    typeof p.updatedAt === 'number'
  )
}

function isValidExtractedVideo(data: unknown): data is ExtractedVideo {
  if (!data || typeof data !== 'object') return false
  const v = data as Record<string, unknown>
  return (
    typeof v.bvid === 'string' &&
    typeof v.title === 'string' &&
    typeof v.cover === 'string' &&
    typeof v.author === 'string'
  )
}

function isValidAppSettings(data: unknown): data is AppSettings {
  if (!data || typeof data !== 'object') return false
  const s = data as Record<string, unknown>
  return (
    typeof s.volume === 'number' &&
    typeof s.autoPlay === 'boolean' &&
    typeof s.rememberPosition === 'boolean' &&
    typeof s.currentThemeId === 'string'
  )
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
      const videoMap = new Map<string, { video: typeof p.videos[0]; addedAt: number }>()
      existingItem.videos.forEach(v => videoMap.set(v.bvid, { video: v, addedAt: v.addedAt }))
      p.videos.forEach(v => {
        const existingVideo = videoMap.get(v.bvid)
        if (!existingVideo || v.addedAt > existingVideo.addedAt) {
          videoMap.set(v.bvid, { video: v, addedAt: v.addedAt })
        }
      })
      map.set(p.id, {
        ...existingItem,
        videos: Array.from(videoMap.values()).map(v => v.video),
        updatedAt: Math.max(existingItem.updatedAt, p.updatedAt)
      })
    }
  })
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt)
}

function mergeUserQueue(existing: ExtractedVideo[], imported: ExtractedVideo[]): ExtractedVideo[] {
  const map = new Map<string, ExtractedVideo>()
  existing.forEach(v => map.set(v.bvid, v))
  imported.forEach(v => {
    if (!map.has(v.bvid)) {
      map.set(v.bvid, v)
    }
  })
  return Array.from(map.values())
}

function safeClone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

registerDataCategory<FavoriteVideo[]>({
  key: 'favorites',
  name: '收藏列表',
  description: '您收藏的视频列表',
  get: () => safeClone(store.get('favorites')),
  set: (data) => store.set('favorites', data),
  merge: mergeFavorites,
  validate: (data): data is FavoriteVideo[] => {
    if (!Array.isArray(data)) return false
    return data.every(isValidFavoriteVideo)
  },
  getStats: (data) => data.length
})

registerDataCategory<Playlist[]>({
  key: 'playlists',
  name: '播放列表',
  description: '您创建的播放列表',
  get: () => safeClone(store.get('playlists')),
  set: (data) => store.set('playlists', data),
  merge: mergePlaylists,
  validate: (data): data is Playlist[] => {
    if (!Array.isArray(data)) return false
    return data.every(isValidPlaylist)
  },
  getStats: (data) => data.length
})

registerDataCategory<ExtractedVideo[]>({
  key: 'userQueue',
  name: '播放队列',
  description: '当前播放队列中的视频',
  get: () => safeClone(store.get('userQueue')),
  set: (data) => store.set('userQueue', data),
  merge: mergeUserQueue,
  validate: (data): data is ExtractedVideo[] => {
    if (!Array.isArray(data)) return false
    return data.every(isValidExtractedVideo)
  },
  getStats: (data) => data.length
})

registerDataCategory<AppSettings>({
  key: 'settings',
  name: '应用设置',
  description: '应用配置选项',
  get: () => safeClone(store.get('settings')),
  set: (data) => store.set('settings', data),
  validate: isValidAppSettings,
  getStats: () => 1
})



export interface CategoryStats {
  key: string
  name: string
  count: number
}

export function getCategoryStats(): CategoryStats[] {
  return getRegisteredCategories().map(category => ({
    key: category.key,
    name: category.name,
    count: category.getStats(category.get())
  }))
}
