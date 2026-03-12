export interface SelectorConfig {
  selector: string
  priority: number
  description?: string
}

export interface VideoSelectors {
  container: SelectorConfig[]
  title: SelectorConfig[]
  cover: SelectorConfig[]
  author: SelectorConfig[]
  authorLink: SelectorConfig[]
  duration: SelectorConfig[]
  playCount: SelectorConfig[]
  videoLink: SelectorConfig[]
  bvid: SelectorConfig[]
}

export const BILIBILI_SELECTORS: VideoSelectors = {
  container: [
    { selector: '.bili-video-card', priority: 1, description: '2024新版卡片布局' },
    { selector: '.video-list .video-item', priority: 2, description: '旧版列表布局' },
    { selector: '[data-mod="search_list"] .video-item', priority: 3, description: '搜索页模块' },
    { selector: '.bili-video-card-recommend', priority: 4, description: '推荐卡片' },
    { selector: '.feed-card', priority: 5, description: '动态Feed卡片' },
    { selector: '.small-item', priority: 6, description: 'UP主空间小卡片' },
    { selector: '.list-item', priority: 7, description: 'UP主空间列表项' },
    { selector: '.bili-video-card__wrap', priority: 8, description: '视频卡片容器' },
  ],
  title: [
    { selector: '.bili-video-card__info--tit a', priority: 1, description: '新版卡片标题' },
    { selector: '.bili-video-card__info--tit', priority: 2, description: '新版卡片标题(无链接)' },
    { selector: '.title', priority: 3, description: '通用标题类' },
    { selector: 'h3 a', priority: 4, description: 'H3链接标题' },
    { selector: '[title]', priority: 5, description: '带title属性的元素' },
    { selector: '.title a', priority: 6, description: '标题链接' },
    { selector: 'a[title]', priority: 7, description: '带title的链接' },
  ],
  cover: [
    { selector: '.bili-video-card__cover img', priority: 1, description: '新版封面' },
    { selector: '.cover img', priority: 2, description: '通用封面' },
    { selector: 'img.bili-video-card__cover', priority: 3, description: '封面图片' },
    { selector: '.lazy-image', priority: 4, description: '懒加载图片' },
    { selector: 'img[data-src]', priority: 5, description: 'data-src图片' },
    { selector: '.pic img', priority: 6, description: '图片容器' },
    { selector: 'img', priority: 7, description: '任意图片' },
  ],
  author: [
    { selector: '.bili-video-card__info--author', priority: 1, description: '新版作者' },
    { selector: '.up-name', priority: 2, description: 'UP主名称' },
    { selector: '.author .name', priority: 3, description: '作者名' },
    { selector: '.bili-video-card__info--bottom .name', priority: 4, description: '底部作者' },
    { selector: '.username', priority: 5, description: '用户名' },
  ],
  authorLink: [
    { selector: '.bili-video-card__info--author', priority: 1, description: '作者链接' },
    { selector: '.up-name', priority: 2, description: 'UP主链接' },
    { selector: '.author a', priority: 3, description: '作者锚点' },
    { selector: 'a[href*="space.bilibili.com"]', priority: 4, description: '空间链接' },
  ],
  duration: [
    { selector: '.bili-video-card__stats--duration', priority: 1, description: '新版时长' },
    { selector: '.duration', priority: 2, description: '通用时长' },
    { selector: '.time', priority: 3, description: '时间类' },
    { selector: '.bili-video-card__cover .duration', priority: 4, description: '封面时长' },
    { selector: '.length', priority: 5, description: '视频长度' },
    { selector: '.so-imgTag_rb', priority: 6, description: '时长标签' },
  ],
  playCount: [
    { selector: '.bili-video-card__stats--item span', priority: 1, description: '播放数' },
    { selector: '.play-count', priority: 2, description: '播放计数' },
    { selector: '.stats .play', priority: 3, description: '统计播放' },
    { selector: '.view-count', priority: 4, description: '观看数' },
    { selector: '.data-box', priority: 5, description: '数据框' },
    { selector: '.play', priority: 6, description: '播放' },
  ],
  videoLink: [
    { selector: '.bili-video-card__wrap a', priority: 1, description: '卡片链接' },
    { selector: 'a[href*="video/BV"]', priority: 2, description: 'BV链接' },
    { selector: 'a[href*="video/av"]', priority: 3, description: 'AV链接' },
    { selector: '.title a', priority: 4, description: '标题链接' },
    { selector: 'a[href*="bilibili.com/video"]', priority: 5, description: '视频链接' },
  ],
  bvid: [
    { selector: '[data-bvid]', priority: 1, description: 'data-bvid属性' },
    { selector: 'a[href*="BV"]', priority: 2, description: 'BV链接提取' },
  ],
}

export const SEARCH_PAGE_SELECTORS = {
  resultContainer: [
    { selector: '.search-list', priority: 1 },
    { selector: '.video-list', priority: 2 },
    { selector: '[data-mod="search_list"]', priority: 3 },
    { selector: '.bili-video-card-list', priority: 4 },
  ],
  noResult: [
    { selector: '.no-result', priority: 1 },
    { selector: '.empty-state', priority: 2 },
    { selector: '.search-empty', priority: 3 },
  ],
  loadMore: [
    { selector: '.load-more', priority: 1 },
    { selector: '.bili-load-more', priority: 2 },
  ],
  nextPageButton: [
    { selector: '.vui_pagenation--btns .vui_button:last-child:not(.vui_button--disabled)', priority: 1, description: 'B站分页下一页按钮' },
    { selector: '.pagination .next:not(.disabled)', priority: 2, description: '通用下一页按钮' },
    { selector: '.page-next:not(.disabled)', priority: 3, description: 'page-next类' },
    { selector: 'button[aria-label="下一页"]:not([disabled])', priority: 4, description: 'aria-label下一页' },
    { selector: '.vui_pagenation--btns button:last-child:not([class*="disabled"])', priority: 5, description: '分页按钮组最后一个' },
  ],
}
