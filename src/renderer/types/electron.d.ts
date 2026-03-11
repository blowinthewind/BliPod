import type { SearchResult, ExtractedVideo } from '../scripts/search-extractor'
import type { SearchAPI } from '../preload/preload'

declare global {
  interface Window {
    electronAPI: {
      platform: NodeJS.Platform
      search: SearchAPI
    }
  }
}

export type { SearchResult, ExtractedVideo, SearchAPI }
