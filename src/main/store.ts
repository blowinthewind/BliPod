import Store from 'electron-store'
import type { ExtractedVideo } from '../preload/preload'

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

const defaults: AppStore = {
  favorites: [],
  playlists: [],
  settings: {
    autoPlay: true,
    rememberPosition: true,
    currentThemeId: 'dark'
  },
  playPositions: [],
  userQueue: [],
  lastVolume: 80,
  playStats: {}
}

export const store = new Store<AppStore>({
  defaults,
  name: 'blipod-data',
  encryptionKey: process.env.NODE_ENV === 'production' ? 'blipod-secret-key' : undefined
})

export function getFavorites(): FavoriteVideo[] {
  return safeClone(store.get('favorites'))
}

export function addFavorite(video: ExtractedVideo): boolean {
  const favorites = store.get('favorites')
  const exists = favorites.some((f) => f.bvid === video.bvid)
  if (exists) return false

  const favoriteVideo: FavoriteVideo = {
    ...video,
    addedAt: Date.now()
  }
  store.set('favorites', [...favorites, favoriteVideo])
  return true
}

export function removeFavorite(bvid: string): boolean {
  const favorites = store.get('favorites')
  const index = favorites.findIndex((f) => f.bvid === bvid)
  if (index === -1) return false

  favorites.splice(index, 1)
  store.set('favorites', favorites)
  return true
}

export function isFavorite(bvid: string): boolean {
  const favorites = store.get('favorites')
  return favorites.some((f) => f.bvid === bvid)
}

export function updateFavoriteDuration(bvid: string, duration: string): boolean {
  const favorites = store.get('favorites')
  const index = favorites.findIndex((f) => f.bvid === bvid)
  if (index === -1) return false

  if (favorites[index].duration === duration) return false

  favorites[index].duration = duration
  store.set('favorites', favorites)
  return true
}

export function getPlaylists(): Playlist[] {
  return safeClone(store.get('playlists'))
}

export function createPlaylist(name: string, description?: string): Playlist {
  const playlists = store.get('playlists')
  const playlist: Playlist = {
    id: `playlist-${Date.now()}`,
    name,
    description,
    videos: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  store.set('playlists', [...playlists, playlist])
  return playlist
}

export function updatePlaylist(
  id: string,
  updates: Partial<Pick<Playlist, 'name' | 'description' | 'cover'>>
): Playlist | null {
  const playlists = store.get('playlists')
  const index = playlists.findIndex((p) => p.id === id)
  if (index === -1) return null

  playlists[index] = {
    ...playlists[index],
    ...updates,
    updatedAt: Date.now()
  }
  store.set('playlists', playlists)
  return playlists[index]
}

export function deletePlaylist(id: string): boolean {
  const playlists = store.get('playlists')
  const index = playlists.findIndex((p) => p.id === id)
  if (index === -1) return false

  playlists.splice(index, 1)
  store.set('playlists', playlists)
  return true
}

export function addVideoToPlaylist(playlistId: string, video: ExtractedVideo): boolean {
  const playlists = store.get('playlists')
  const playlistIndex = playlists.findIndex((p) => p.id === playlistId)
  if (playlistIndex === -1) return false

  const exists = playlists[playlistIndex].videos.some((v) => v.bvid === video.bvid)
  if (exists) return false

  const playlistVideo: PlaylistVideo = {
    ...video,
    addedAt: Date.now()
  }
  playlists[playlistIndex].videos.push(playlistVideo)
  playlists[playlistIndex].updatedAt = Date.now()
  store.set('playlists', playlists)
  return true
}

export function removeVideoFromPlaylist(playlistId: string, bvid: string): boolean {
  const playlists = store.get('playlists')
  const playlistIndex = playlists.findIndex((p) => p.id === playlistId)
  if (playlistIndex === -1) return false

  const videoIndex = playlists[playlistIndex].videos.findIndex((v) => v.bvid === bvid)
  if (videoIndex === -1) return false

  playlists[playlistIndex].videos.splice(videoIndex, 1)
  playlists[playlistIndex].updatedAt = Date.now()
  store.set('playlists', playlists)
  return true
}

export function updatePlaylistVideoDuration(bvid: string, duration: string): boolean {
  const playlists = store.get('playlists')
  let updated = false

  for (const playlist of playlists) {
    const videoIndex = playlist.videos.findIndex((v) => v.bvid === bvid)
    if (videoIndex !== -1 && playlist.videos[videoIndex].duration !== duration) {
      playlist.videos[videoIndex].duration = duration
      playlist.updatedAt = Date.now()
      updated = true
    }
  }

  if (updated) {
    store.set('playlists', playlists)
  }
  return updated
}

export function getSettings(): AppSettings {
  return safeClone(store.get('settings'))
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const settings = store.get('settings')
  const newSettings = { ...settings, ...updates }
  store.set('settings', newSettings)
  return newSettings
}

export function getPlayPosition(bvid: string): PlayPosition | null {
  const positions = store.get('playPositions')
  return positions.find((p) => p.bvid === bvid) || null
}

export function savePlayPosition(bvid: string, currentTime: number, duration: number): void {
  const positions = store.get('playPositions')
  const index = positions.findIndex((p) => p.bvid === bvid)

  const position: PlayPosition = {
    bvid,
    currentTime,
    duration,
    updatedAt: Date.now()
  }

  if (index === -1) {
    positions.push(position)
  } else {
    positions[index] = position
  }

  if (positions.length > 100) {
    positions.sort((a, b) => b.updatedAt - a.updatedAt)
    positions.splice(100)
  }

  store.set('playPositions', positions)
}

export function clearPlayPosition(bvid: string): void {
  const positions = store.get('playPositions')
  const index = positions.findIndex((p) => p.bvid === bvid)
  if (index !== -1) {
    positions.splice(index, 1)
    store.set('playPositions', positions)
  }
}

export function getPlayStats(
  bvid?: string
): PlayStatsEntry | Record<string, PlayStatsEntry> | null {
  const stats = store.get('playStats') || {}
  if (!bvid) {
    return safeClone(stats)
  }
  return stats[bvid] ? safeClone(stats[bvid]) : null
}

export function updateWatchTime(
  bvid: string,
  deltaSeconds: number,
  duration: number,
  position: number
): PlayStatsEntry {
  const stats = store.get('playStats') || {}
  const existing = stats[bvid]

  const updated: PlayStatsEntry = {
    bvid,
    playCount: existing?.playCount ?? 0,
    totalWatchSeconds: Math.max(0, (existing?.totalWatchSeconds ?? 0) + Math.max(0, deltaSeconds)),
    lastPlayedAt: Date.now(),
    lastCountedAt: existing?.lastCountedAt ?? null,
    lastDuration:
      Number.isFinite(duration) && duration > 0 ? duration : (existing?.lastDuration ?? null),
    lastPosition:
      Number.isFinite(position) && position >= 0 ? position : (existing?.lastPosition ?? null)
  }

  stats[bvid] = updated
  store.set('playStats', stats)
  return updated
}

export function incrementPlayCount(
  bvid: string,
  duration: number,
  position: number
): PlayStatsEntry {
  const stats = store.get('playStats') || {}
  const existing = stats[bvid]
  const now = Date.now()

  const updated: PlayStatsEntry = {
    bvid,
    playCount: (existing?.playCount ?? 0) + 1,
    totalWatchSeconds: existing?.totalWatchSeconds ?? 0,
    lastPlayedAt: now,
    lastCountedAt: now,
    lastDuration:
      Number.isFinite(duration) && duration > 0 ? duration : (existing?.lastDuration ?? null),
    lastPosition:
      Number.isFinite(position) && position >= 0 ? position : (existing?.lastPosition ?? null)
  }

  stats[bvid] = updated
  store.set('playStats', stats)
  return updated
}

const MAX_USER_QUEUE_SIZE = 50

export function getUserQueue(): ExtractedVideo[] {
  return safeClone(store.get('userQueue'))
}

export function setUserQueue(queue: ExtractedVideo[]): void {
  store.set('userQueue', queue.slice(0, MAX_USER_QUEUE_SIZE))
}

export function addToUserQueue(video: ExtractedVideo): boolean {
  const queue = store.get('userQueue')
  if (queue.find((v) => v.bvid === video.bvid)) {
    return false
  }
  if (queue.length >= MAX_USER_QUEUE_SIZE) {
    return false
  }
  store.set('userQueue', [...queue, video])
  return true
}

export function removeFromUserQueue(bvid: string): boolean {
  const queue = store.get('userQueue')
  const index = queue.findIndex((v) => v.bvid === bvid)
  if (index === -1) return false
  queue.splice(index, 1)
  store.set('userQueue', queue)
  return true
}

export function clearUserQueue(): void {
  store.set('userQueue', [])
}

export function moveUserQueueItem(fromIndex: number, toIndex: number): boolean {
  const queue = store.get('userQueue')
  if (fromIndex < 0 || fromIndex >= queue.length) return false
  if (toIndex < 0 || toIndex >= queue.length) return false
  if (fromIndex === toIndex) return false
  const item = queue[fromIndex]
  queue.splice(fromIndex, 1)
  queue.splice(toIndex, 0, item)
  store.set('userQueue', queue)
  return true
}

function safeClone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

export function exportData(): AppStore {
  return {
    favorites: safeClone(store.get('favorites')),
    playlists: safeClone(store.get('playlists')),
    settings: safeClone(store.get('settings')),
    playPositions: safeClone(store.get('playPositions')),
    userQueue: safeClone(store.get('userQueue')),
    lastVolume: store.get('lastVolume')
  }
}

export function importData(data: Partial<AppStore>): void {
  if (data.favorites) {
    store.set('favorites', data.favorites)
  }
  if (data.playlists) {
    store.set('playlists', data.playlists)
  }
  if (data.settings) {
    store.set('settings', { ...store.get('settings'), ...data.settings })
  }
  if (data.playPositions) {
    store.set('playPositions', data.playPositions)
  }
  if (data.userQueue) {
    store.set('userQueue', data.userQueue)
  }
  if (typeof data.lastVolume === 'number') {
    store.set('lastVolume', data.lastVolume)
  }
}

export function getLastVolume(): number {
  return store.get('lastVolume')
}

export function setLastVolume(volume: number): void {
  store.set('lastVolume', Math.max(0, Math.min(100, volume)))
}
