const urlInput = document.getElementById('urlInput')
const loadBtn = document.getElementById('loadBtn')
const coverContainer = document.getElementById('coverContainer')
const videoTitle = document.getElementById('videoTitle')
const videoAuthor = document.getElementById('videoAuthor')
const currentTimeEl = document.getElementById('currentTime')
const durationEl = document.getElementById('duration')
const progressBar = document.getElementById('progressBar')
const progressFill = document.getElementById('progressFill')
const playBtn = document.getElementById('playBtn')
const backwardBtn = document.getElementById('backwardBtn')
const forwardBtn = document.getElementById('forwardBtn')
const volumeSlider = document.getElementById('volumeSlider')
const statusText = document.getElementById('statusText')
const webview = document.getElementById('webview')
const webviewPlaceholder = document.getElementById('webviewPlaceholder')

let isPlaying = false
let stateUpdateInterval = null
let hasLoggedStateUpdateError = false

const injectScript = `
(function() {
  function hideVideoKeepAudio() {
    const style = document.createElement('style');
    style.id = 'blipod-hide-style';
    style.textContent = \`
      .bpx-player-container {
        min-height: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }
      .bpx-player-dm-wrap {
        display: none !important;
      }
      .bpx-player-video-wrap video {
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .bpx-player-sending-bar {
        display: none !important;
      }
    \`;
    document.head.appendChild(style);
  }
  
  function getVideoInfo() {
    const video = document.querySelector('video');
    const durationEl = document.querySelector('.bpx-player-ctrl-time-duration');
    
    let title = '';
    let cover = '';
    let author = '';
    
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle) {
      title = metaTitle.getAttribute('content') || '';
    }
    
    if (!title) {
      const titleEl = document.querySelector('.video-title, h1.video-title, [class*="video-title"], h1[class*="title"]');
      if (titleEl) {
        title = titleEl.textContent || titleEl.getAttribute('title') || titleEl.getAttribute('data-title') || '';
      }
    }
    
    if (!title) {
      title = document.title.replace(/_哔哩哔哩_bilibili/g, '').replace(/-哔哩哔哩/g, '').trim();
    }
    
    const metaCover = document.querySelector('meta[property="og:image"]');
    if (metaCover) {
      cover = metaCover.getAttribute('content') || '';
    }
    
    if (!cover) {
      const twitterImage = document.querySelector('meta[name="twitter:image"], meta[property="twitter:image"]');
      if (twitterImage) {
        cover = twitterImage.getAttribute('content') || '';
      }
    }
    
    if (!cover && video) {
      cover = video.poster || '';
    }
    
    if (!cover) {
      const coverImg = document.querySelector('.bili-cover img, [class*="cover"] img, img[class*="cover"]');
      if (coverImg) {
        cover = coverImg.src || coverImg.dataset.src || '';
      }
    }
    
    if (!cover) {
      const pageCover = document.querySelector('[class*="video-cover"] img, [class*="poster"] img');
      if (pageCover) {
        cover = pageCover.src || pageCover.dataset.src || '';
      }
    }
    
    const authorEl = document.querySelector('.up-name, .up-name__text, [class*="up-name"], a[class*="username"]');
    if (authorEl) {
      author = authorEl.textContent.trim() || authorEl.getAttribute('title') || '';
    }
    
    return {
      title: title.trim(),
      cover: cover,
      author: author.trim(),
      duration: durationEl ? durationEl.textContent.trim() : '',
      currentTime: video ? video.currentTime : 0,
      durationSeconds: video ? video.duration : 0
    };
  }
  
  function getPlayerState() {
    const video = document.querySelector('video');
    if (!video) return null;
    
    return {
      currentTime: video.currentTime,
      duration: video.duration,
      isPlaying: !video.paused
    };
  }
  
  function play() {
    const video = document.querySelector('video');
    if (video) video.play();
  }
  
  function pause() {
    const video = document.querySelector('video');
    if (video) video.pause();
  }
  
  function seek(seconds) {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }
  }
  
  function seekTo(percent) {
    const video = document.querySelector('video');
    if (video && video.duration) {
      video.currentTime = video.duration * percent;
    }
  }
  
  function setVolume(volume) {
    const video = document.querySelector('video');
    if (video) {
      video.volume = Math.max(0, Math.min(1, volume));
    }
  }
  
  window.bliPodControls = {
    play, pause, seek, seekTo, setVolume, getVideoInfo, getPlayerState, hideVideoKeepAudio
  };
  
  hideVideoKeepAudio();
})();
`

loadBtn.addEventListener('click', () => {
  const url = urlInput.value.trim()
  if (url) {
    loadVideo(url)
  }
})

urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const url = urlInput.value.trim()
    if (url) {
      loadVideo(url)
    }
  }
})

playBtn.addEventListener('click', () => {
  if (isPlaying) {
    webview.executeJavaScript('window.bliPodControls.pause()')
    playBtn.textContent = '▶'
    isPlaying = false
  } else {
    webview.executeJavaScript('window.bliPodControls.play()')
    playBtn.textContent = '⏸'
    isPlaying = true
    startStateUpdates()
  }
})

backwardBtn.addEventListener('click', () => {
  webview.executeJavaScript('window.bliPodControls.seek(-10)')
})

forwardBtn.addEventListener('click', () => {
  webview.executeJavaScript('window.bliPodControls.seek(10)')
})

volumeSlider.addEventListener('input', (e) => {
  const volume = e.target.value / 100
  webview.executeJavaScript(`window.bliPodControls.setVolume(${volume})`)
})

progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  webview.executeJavaScript(`window.bliPodControls.seekTo(${percent})`)
})

function loadVideo(url) {
  statusText.textContent = '正在加载视频...'
  statusText.title = ''
  
  if (!url.includes('bilibili.com')) {
    const bvMatch = url.match(/BV\w+/)
    if (bvMatch) {
      url = `https://www.bilibili.com/video/${bvMatch[0]}`
    } else {
      statusText.textContent = '请输入有效的B站视频链接'
      statusText.title = ''
      return
    }
  }
  
  if (stateUpdateInterval) {
    clearInterval(stateUpdateInterval)
    stateUpdateInterval = null
  }
  
  webview.loadURL(url)
  webviewPlaceholder.style.display = 'none'
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function reportError(message, error) {
  statusText.textContent = message
  statusText.title = getErrorMessage(error)
}

function startStateUpdates() {
  if (stateUpdateInterval) clearInterval(stateUpdateInterval)
  
  stateUpdateInterval = setInterval(() => {
    webview.executeJavaScript('window.bliPodControls.getPlayerState()')
      .then(state => {
        hasLoggedStateUpdateError = false
        if (state) {
          updatePlayerUI(state)
        }
      })
      .catch(err => {
        if (!hasLoggedStateUpdateError) {
          reportError('播放器状态同步失败', err)
          hasLoggedStateUpdateError = true
        }
      })
  }, 500)
}

function updatePlayerUI(state) {
  if (state.currentTime !== undefined) {
    currentTimeEl.textContent = formatTime(state.currentTime)
  }
  
  if (state.duration !== undefined && state.duration > 0) {
    durationEl.textContent = formatTime(state.duration)
    const percent = (state.currentTime / state.duration) * 100
    progressFill.style.width = `${percent}%`
  }
  
  if (state.isPlaying !== undefined) {
    isPlaying = state.isPlaying
    playBtn.textContent = isPlaying ? '⏸' : '▶'
    if (isPlaying && !stateUpdateInterval) {
      startStateUpdates()
    }
  }
}

function updateVideoInfo(info) {
  if (info.title) {
    videoTitle.textContent = info.title
  }
  if (info.author) {
    videoAuthor.textContent = `UP主: ${info.author}`
  }
  if (info.cover) {
    let coverUrl = info.cover
    if (coverUrl.startsWith('//')) {
      coverUrl = 'https:' + coverUrl
    }
    
    coverUrl = coverUrl.replace(/@\d+w_\d+h.*$/, '')
    coverUrl = coverUrl.split('@')[0]

    statusText.textContent = '视频已加载'
    statusText.title = ''
    coverContainer.innerHTML = `<img src="${coverUrl}" alt="封面">`
  }
  if (info.duration) {
    durationEl.textContent = info.duration
  }
  if (!info.cover) {
    statusText.textContent = '视频已加载'
    statusText.title = ''
  }
}

webview.addEventListener('dom-ready', () => {
  webview.executeJavaScript(injectScript)
    .catch(err => reportError('播放器脚本注入失败', err))
  
  setTimeout(() => {
    webview.executeJavaScript('window.bliPodControls.getVideoInfo()')
      .then(info => {
        if (info && info.title) {
          updateVideoInfo(info)
        }
      })
      .catch(() => undefined)
  }, 500)
})

webview.addEventListener('did-finish-load', () => {
  let retryCount = 0
  const maxRetries = 5
  
  function fetchVideoInfo() {
    webview.executeJavaScript('window.bliPodControls.getVideoInfo()')
      .then(info => {
        if (info && info.title) {
          updateVideoInfo(info)
        } else if (retryCount < maxRetries) {
          retryCount++
          setTimeout(fetchVideoInfo, 1000)
        }
      })
      .catch(err => {
        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(fetchVideoInfo, 1000)
          return
        }
        reportError('获取视频信息失败', err)
      })
  }
  
  setTimeout(fetchVideoInfo, 1500)
})

webview.addEventListener('did-fail-load', (event) => {
  if (event.errorCode !== -3) {
    statusText.textContent = `加载失败: ${event.errorDescription}`
    statusText.title = ''
  }
})
