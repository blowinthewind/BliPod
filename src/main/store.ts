import Store from 'electron-store'
import { BUILT_IN_THEME_IDS, DEFAULT_THEME_ID, type Theme } from '../shared/theme'
import type { ExtractedVideo, VideoPlaybackDetail } from '../preload/preload'

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
  autoPlayNextPart: boolean
  rememberPosition: boolean
  currentThemeId: string
  customThemes: Theme[]
}

export interface PlayPosition {
  bvid: string
  cid: number | null
  partIndex: number | null
  currentTime: number
  duration: number
  updatedAt: number
}

export interface PlayHistoryEntry extends ExtractedVideo {
  playedAt: number
  cid: number | null
  partIndex: number | null
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

export interface CachedPlaybackDetailEntry {
  detail: VideoPlaybackDetail
  fetchedAt: number
  expiresAt: number
  version: 1
}

export interface AppStore {
  favorites: FavoriteVideo[]
  playlists: Playlist[]
  settings: AppSettings
  playPositions: PlayPosition[]
  playHistory: PlayHistoryEntry[]
  userQueue: ExtractedVideo[]
  lastVolume: number
  playStats?: Record<string, PlayStatsEntry>
  playbackDetailCache?: Record<string, CachedPlaybackDetailEntry>
}

const defaults: AppStore = {
  favorites: [],
  playlists: [],
  settings: {
    autoPlay: true,
    autoPlayNextPart: false,
    rememberPosition: true,
    currentThemeId: DEFAULT_THEME_ID,
    customThemes: []
  },
  playPositions: [],
  playHistory: [],
  userQueue: [],
  lastVolume: 80,
  playStats: {},
  playbackDetailCache: {}
}

const BUILT_IN_THEME_ID_SET = new Set<string>(BUILT_IN_THEME_IDS)

export function normalizeAppSettings(settings?: Partial<AppSettings>): AppSettings {
  const normalizedSettings: AppSettings = {
    ...defaults.settings,
    ...safeClone(settings ?? {}),
    customThemes: Array.isArray(settings?.customThemes) ? safeClone(settings.customThemes) : []
  }

  const availableThemeIds = new Set(BUILT_IN_THEME_ID_SET)
  normalizedSettings.customThemes.forEach((theme) => {
    if (theme?.id) {
      availableThemeIds.add(theme.id)
    }
  })

  if (!availableThemeIds.has(normalizedSettings.currentThemeId)) {
    normalizedSettings.currentThemeId = defaults.settings.currentThemeId
  }

  return normalizedSettings
}

export const store = new Store<AppStore>({
  defaults,
  name: 'blipod-data',
  encryptionKey: process.env.NODE_ENV === 'production' ? 'blipod-secret-key' : undefined
})

store.set('settings', normalizeAppSettings(store.get('settings')))

function normalizeCoverUrl(cover: string): string {
  if (!cover) return cover
  if (cover.startsWith('https://')) return cover
  if (cover.startsWith('http://')) return `https://${cover.slice('http://'.length)}`
  if (cover.startsWith('//')) return `https:${cover}`
  return cover
}

function normalizeVideo<T extends ExtractedVideo>(video: T): T {
  return {
    ...video,
    cover: normalizeCoverUrl(video.cover)
  }
}

function normalizePlaylist(playlist: Playlist): Playlist {
  return {
    ...playlist,
    cover: typeof playlist.cover === 'string' ? normalizeCoverUrl(playlist.cover) : playlist.cover,
    videos: playlist.videos.map((video) => normalizeVideo(video))
  }
}

export function getFavorites(): FavoriteVideo[] {
  return safeClone(store.get('favorites')).map((video) => normalizeVideo(video))
}

export function addFavorite(video: ExtractedVideo): boolean {
  const favorites = store.get('favorites')
  const exists = favorites.some((f) => f.bvid === video.bvid)
  if (exists) return false

  const favoriteVideo: FavoriteVideo = {
    ...normalizeVideo(video),
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
  return safeClone(store.get('playlists')).map((playlist) => normalizePlaylist(playlist))
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
    ...normalizeVideo(video),
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
      updated = true
    }
  }

  if (updated) {
    store.set('playlists', playlists)
  }
  return updated
}

export function getSettings(): AppSettings {
  return normalizeAppSettings(store.get('settings'))
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const settings = store.get('settings')
  const newSettings = normalizeAppSettings({ ...settings, ...updates })
  store.set('settings', newSettings)
  return newSettings
}

export function getPlayPosition(bvid: string, cid?: number | null, partIndex?: number | null): PlayPosition | null {
  const positions = store.get('playPositions')
  if (cid != null) {
    return positions.find((p) => p.bvid === bvid && p.cid === cid) || null
  }
  if (partIndex != null) {
    return positions.find((p) => p.bvid === bvid && p.partIndex === partIndex) || null
  }
  return positions.find((p) => p.bvid === bvid) || null
}

export function getLastPlayPositionByBvid(bvid: string): PlayPosition | null {
  const positions = store.get('playPositions').filter((p) => p.bvid === bvid)
  if (positions.length === 0) return null
  return positions.reduce((latest, p) => (p.updatedAt > latest.updatedAt ? p : latest))
}

export function savePlayPosition(position: PlayPosition): void {
  const positions = store.get('playPositions')

  const matchIndex = positions.findIndex((p) => {
    if (p.bvid !== position.bvid) return false
    if (position.cid != null) return p.cid === position.cid
    if (position.partIndex != null) return p.partIndex === position.partIndex
    return p.cid == null && p.partIndex == null
  })

  if (matchIndex === -1) {
    positions.push(position)
  } else {
    positions[matchIndex] = position
  }

  if (positions.length > 100) {
    positions.sort((a, b) => b.updatedAt - a.updatedAt)
    positions.splice(100)
  }

  store.set('playPositions', positions)
}

export function clearPlayPosition(bvid: string, cid?: number | null, partIndex?: number | null): void {
  const positions = store.get('playPositions')
  let index: number
  if (cid != null) {
    index = positions.findIndex((p) => p.bvid === bvid && p.cid === cid)
  } else if (partIndex != null) {
    index = positions.findIndex((p) => p.bvid === bvid && p.partIndex === partIndex)
  } else {
    index = positions.findIndex((p) => p.bvid === bvid)
  }
  if (index !== -1) {
    positions.splice(index, 1)
    store.set('playPositions', positions)
  }
}

const MAX_PLAY_HISTORY_SIZE = 100

export function getPlayHistory(): PlayHistoryEntry[] {
  return safeClone(store.get('playHistory') || [])
}

export function addOrUpdatePlayHistory(entry: PlayHistoryEntry): void {
  const history = store.get('playHistory') || []
  const existingIndex = history.findIndex((h) => h.bvid === entry.bvid)

  if (existingIndex !== -1) {
    history.splice(existingIndex, 1)
  }

  history.unshift(normalizeVideo(entry))

  if (history.length > MAX_PLAY_HISTORY_SIZE) {
    history.splice(MAX_PLAY_HISTORY_SIZE)
  }

  store.set('playHistory', history)
}

export function removeFromPlayHistory(bvid: string): void {
  const history = store.get('playHistory') || []
  const index = history.findIndex((h) => h.bvid === bvid)
  if (index !== -1) {
    history.splice(index, 1)
    store.set('playHistory', history)
  }
}

export function clearPlayHistory(): void {
  store.set('playHistory', [])
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
  return safeClone(store.get('userQueue')).map((video) => normalizeVideo(video))
}

export function setUserQueue(queue: ExtractedVideo[]): void {
  store.set(
    'userQueue',
    queue.slice(0, MAX_USER_QUEUE_SIZE).map((video) => normalizeVideo(video))
  )
}

export function addToUserQueue(video: ExtractedVideo): boolean {
  const queue = store.get('userQueue')
  if (queue.find((v) => v.bvid === video.bvid)) {
    return false
  }
  if (queue.length >= MAX_USER_QUEUE_SIZE) {
    return false
  }
  store.set('userQueue', [...queue, normalizeVideo(video)])
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
    favorites: getFavorites(),
    playlists: getPlaylists(),
    settings: getSettings(),
    playPositions: safeClone(store.get('playPositions')),
    playHistory: [],
    userQueue: getUserQueue(),
    lastVolume: store.get('lastVolume')
  }
}

export function importData(data: Partial<AppStore>): void {
  if (data.favorites) {
    store.set('favorites', data.favorites.map((video) => normalizeVideo(video)))
  }
  if (data.playlists) {
    store.set('playlists', data.playlists.map((playlist) => normalizePlaylist(playlist)))
  }
  if (data.settings) {
    store.set('settings', normalizeAppSettings({ ...store.get('settings'), ...data.settings }))
  }
  if (data.playPositions) {
    store.set('playPositions', data.playPositions)
  }
  if (data.userQueue) {
    store.set('userQueue', data.userQueue.map((video) => normalizeVideo(video)))
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
