import { Menu, Tray, nativeImage, app } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { NativePlaybackState, NativeMenuCommand } from '../preload/preload'

interface MacOSPlaybackControlsOptions {
  isMac: boolean
  isDevelopment: boolean
  getMainWindow: () => BrowserWindow | null
  showMainWindow: () => void
  sendNativeMenuCommand: (command: NativeMenuCommand) => void
  showShortcutHelp: () => void
}

function createInitialNativePlaybackState(): NativePlaybackState {
  return {
    hasVideo: false,
    hasNext: false,
    hasPrevious: false,
    title: '',
    author: '',
    isPlaying: false,
    isMuted: false,
    volume: 80,
    isShuffle: false,
    isRepeat: false
  }
}

export function createMacOSPlaybackControls(options: MacOSPlaybackControlsOptions) {
  let tray: Tray | null = null
  let nativePlaybackState = createInitialNativePlaybackState()

  function buildApplicationPlaybackMenuItems(hasVideo: boolean): MenuItemConstructorOptions[] {
    return [
      {
        label: nativePlaybackState.isPlaying ? '暂停' : '播放',
        enabled: hasVideo,
        click: () => options.sendNativeMenuCommand('togglePlay')
      },
      {
        label: '上一首',
        enabled: hasVideo && nativePlaybackState.hasPrevious,
        click: () => options.sendNativeMenuCommand('previous')
      },
      {
        label: '下一首',
        enabled: hasVideo && nativePlaybackState.hasNext,
        click: () => options.sendNativeMenuCommand('next')
      },
      {
        label: '后退 15 秒',
        enabled: hasVideo,
        click: () => options.sendNativeMenuCommand('seekBackward')
      },
      {
        label: '前进 30 秒',
        enabled: hasVideo,
        click: () => options.sendNativeMenuCommand('seekForward')
      },
      {
        label: nativePlaybackState.isMuted || nativePlaybackState.volume === 0 ? '取消静音' : '静音',
        enabled: hasVideo,
        click: () => options.sendNativeMenuCommand('toggleMute')
      },
      {
        label: '音量增加',
        enabled: hasVideo,
        click: () => options.sendNativeMenuCommand('volumeUp')
      },
      {
        label: '音量减少',
        enabled: hasVideo,
        click: () => options.sendNativeMenuCommand('volumeDown')
      },
      { type: 'separator' },
      {
        label: '随机播放',
        type: 'checkbox',
        checked: nativePlaybackState.isShuffle,
        click: () => options.sendNativeMenuCommand('toggleShuffle')
      },
      {
        label: '单曲循环',
        type: 'checkbox',
        checked: nativePlaybackState.isRepeat,
        click: () => options.sendNativeMenuCommand('toggleRepeat')
      }
    ]
  }

  function buildTrayPlaybackMenuItems(hasVideo: boolean): MenuItemConstructorOptions[] {
    return [
      {
        label: nativePlaybackState.isPlaying ? '暂停' : '播放',
        enabled: hasVideo,
        click: () => options.sendNativeMenuCommand('togglePlay')
      },
      {
        label: '上一首',
        enabled: hasVideo && nativePlaybackState.hasPrevious,
        click: () => options.sendNativeMenuCommand('previous')
      },
      {
        label: '下一首',
        enabled: hasVideo && nativePlaybackState.hasNext,
        click: () => options.sendNativeMenuCommand('next')
      },
      {
        label: nativePlaybackState.isMuted || nativePlaybackState.volume === 0 ? '取消静音' : '静音',
        enabled: hasVideo,
        click: () => options.sendNativeMenuCommand('toggleMute')
      }
    ]
  }

  function buildBliPodMenu(): MenuItemConstructorOptions {
    return {
      label: 'BliPod',
      submenu: [
        { role: 'about', label: '关于 BliPod' },
        {
          label: '设置…',
          accelerator: 'Command+,',
          click: () => options.sendNativeMenuCommand('openSettings')
        },
        { type: 'separator' },
        { role: 'hide', label: '隐藏 BliPod' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出 BliPod' }
      ]
    }
  }

  function buildEditMenu(): MenuItemConstructorOptions {
    return {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    }
  }

  function buildWindowMenu(): MenuItemConstructorOptions {
    return {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { type: 'separator' },
        { role: 'front', label: '前置全部窗口' },
        { role: 'window', label: '窗口列表' }
      ]
    }
  }

  function buildViewMenu(): MenuItemConstructorOptions {
    if (options.isDevelopment) {
      return {
        label: '视图',
        submenu: [
          { role: 'reload', label: '重新加载' },
          { role: 'forceReload', label: '强制重新加载' },
          { role: 'toggleDevTools', label: '开发者工具' },
          { type: 'separator' },
          { role: 'zoomIn', label: '放大' },
          { role: 'zoomOut', label: '缩小' },
          { role: 'resetZoom', label: '实际大小' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '切换全屏' }
        ]
      }
    }

    return {
      label: '视图',
      submenu: [
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '实际大小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    }
  }

  function buildHelpMenu(): MenuItemConstructorOptions {
    return {
      label: '帮助',
      submenu: [
        {
          label: '快捷键',
          click: () => options.showShortcutHelp()
        }
      ]
    }
  }
  function buildApplicationMenu() {
    if (!options.isMac) return null

    const mainWindow = options.getMainWindow()
    const hasWindow = Boolean(mainWindow && !mainWindow.isDestroyed())
    const hasVideo = hasWindow && nativePlaybackState.hasVideo

    const template: MenuItemConstructorOptions[] = [
      buildBliPodMenu(),
      buildEditMenu(),
      {
        label: '播放',
        submenu: buildApplicationPlaybackMenuItems(hasVideo)
      },
      buildViewMenu(),
      buildWindowMenu(),
      buildHelpMenu()
    ]

    return Menu.buildFromTemplate(template)
  }

  function refreshApplicationMenu() {
    if (!options.isMac) return
    Menu.setApplicationMenu(buildApplicationMenu())
  }

  function createTrayIcon() {
    const icon = nativeImage.createFromNamedImage('music.note')
    const fallbackIcon = icon.isEmpty() ? nativeImage.createFromNamedImage('NSStatusAvailable') : icon
    fallbackIcon.setTemplateImage(true)
    return fallbackIcon
  }

  function buildTrayMenu() {
    if (!options.isMac) return null

    const mainWindow = options.getMainWindow()
    const hasWindow = Boolean(mainWindow && !mainWindow.isDestroyed())
    const canControl = hasWindow && nativePlaybackState.hasVideo
    const trayMenuItems: MenuItemConstructorOptions[] = [
      {
        label: nativePlaybackState.hasVideo ? `当前播放：${nativePlaybackState.title}` : '未在播放',
        enabled: false
      }
    ]

    if (nativePlaybackState.author) {
      trayMenuItems.push({
        label: `UP 主：${nativePlaybackState.author}`,
        enabled: false
      })
    }

    trayMenuItems.push(
      { type: 'separator' },
      ...buildTrayPlaybackMenuItems(canControl),
      { type: 'separator' },
      {
        label: '显示主窗口',
        click: () => options.showMainWindow()
      },
      {
        label: '退出',
        click: () => app.quit()
      }
    )

    return Menu.buildFromTemplate(trayMenuItems)
  }

  function refreshTray() {
    if (!options.isMac || !tray) return

    const mainWindow = options.getMainWindow()
    const hasWindow = Boolean(mainWindow && !mainWindow.isDestroyed())
    const tooltip =
      hasWindow && nativePlaybackState.hasVideo
        ? `${nativePlaybackState.isPlaying ? '正在播放' : '已暂停'}：${nativePlaybackState.title}`
        : 'BliPod'

    tray.setToolTip(tooltip)

    const menu = buildTrayMenu()
    if (menu) {
      tray.setContextMenu(menu)
    }
  }

  function createTray() {
    if (!options.isMac || tray) return

    tray = new Tray(createTrayIcon())
    tray.on('click', () => {
      if (!tray) return

      const menu = buildTrayMenu()
      if (menu) {
        tray.popUpContextMenu(menu)
      }
    })

    refreshTray()
  }

  function updateNativePlaybackState(nextState: NativePlaybackState) {
    const hasChanged =
      nativePlaybackState.hasVideo !== nextState.hasVideo ||
      nativePlaybackState.hasNext !== nextState.hasNext ||
      nativePlaybackState.hasPrevious !== nextState.hasPrevious ||
      nativePlaybackState.title !== nextState.title ||
      nativePlaybackState.author !== nextState.author ||
      nativePlaybackState.isPlaying !== nextState.isPlaying ||
      nativePlaybackState.isMuted !== nextState.isMuted ||
      nativePlaybackState.volume !== nextState.volume ||
      nativePlaybackState.isShuffle !== nextState.isShuffle ||
      nativePlaybackState.isRepeat !== nextState.isRepeat

    if (!hasChanged) return

    nativePlaybackState = nextState
    refreshApplicationMenu()
    refreshTray()
  }

  return {
    refreshApplicationMenu,
    refreshTray,
    createTray,
    updateNativePlaybackState
  }
}
