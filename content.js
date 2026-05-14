// content.js — runs at document_idle on TikTok pages
// Adds a Picture-in-Picture (PiP) floating button

(function () {
  'use strict';

  let pipButton = null;
  let currentPipVideo = null;
  let pipTrackerInterval = null;

  // ── Setup Media Session for scrolling via PiP buttons ───────────
  function setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        // Эмуляция нажатия стрелки вниз
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true, cancelable: true
        }));
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        // Эмуляция нажатия стрелки вверх
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, bubbles: true, cancelable: true
        }));
      });
    }
  }

  // ── Create the PiP floating button ──────────────────────────────
  function createPipButton() {
    if (document.getElementById('tiktok-pip-btn')) return;

    pipButton = document.createElement('button');
    pipButton.id = 'tiktok-pip-btn';
    pipButton.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <rect x="12" y="10" width="8" height="6" rx="1" ry="1" fill="currentColor" opacity="0.3"/>
        <polyline points="9 17 9 21 15 21 15 17"/>
      </svg>
      <span class="pip-tooltip">Picture-in-Picture</span>
    `;
    pipButton.title = 'Открыть видео в плавающем окне (PiP)';

    pipButton.addEventListener('click', togglePiP);
    document.body.appendChild(pipButton);
  }

  // ── Find the currently playing video ────────────────────────────
  function findActiveVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return null;

    // Filter out hidden or tiny videos (e.g. background ads or preloaded next videos)
    const visibleVideos = videos.filter(v => {
      const rect = v.getBoundingClientRect();
      const style = window.getComputedStyle(v);
      return rect.width > 50 && rect.height > 50 && 
             style.opacity !== '0' && style.visibility !== 'hidden' &&
             rect.top < window.innerHeight && rect.bottom > 0;
    });

    if (visibleVideos.length === 0) return null;

    // First priority: A video that is currently playing
    for (const v of visibleVideos) {
      if (!v.paused && v.readyState >= 2) return v;
    }

    // Second priority: The visible video closest to the center of the viewport
    let bestVideo = null;
    let bestDistance = Infinity;
    const centerY = window.innerHeight / 2;

    for (const v of visibleVideos) {
      const rect = v.getBoundingClientRect();
      const videoCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(videoCenterY - centerY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestVideo = v;
      }
    }

    return bestVideo;
  }

  // ── Auto-track new videos while in PiP ──────────────────────────
  function startPipTracker() {
    if (pipTrackerInterval) clearInterval(pipTrackerInterval);
    
    pipTrackerInterval = setInterval(async () => {
      if (!document.pictureInPictureElement) {
        clearInterval(pipTrackerInterval);
        pipTrackerInterval = null;
        pipButton.classList.remove('pip-active');
        return;
      }

      const active = findActiveVideo();
      // If the page scrolled to a new video, swap the PiP window to it seamlessly!
      if (active && active !== document.pictureInPictureElement && !active.paused && active.readyState >= 2) {
        try {
          active.disablePictureInPicture = false;
          active.removeAttribute('disablepictureinpicture');
          await active.requestPictureInPicture();
          currentPipVideo = active;
        } catch (e) {
          console.log('[TikTok BG Play] Silent PiP swap failed:', e);
        }
      }
    }, 500);
  }

  // ── Toggle PiP mode ────────────────────────────────────────────
  async function togglePiP() {
    try {
      // If already in PiP, exit
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        pipButton.classList.remove('pip-active');
        currentPipVideo = null;
        if (pipTrackerInterval) clearInterval(pipTrackerInterval);
        return;
      }

      const video = findActiveVideo();
      if (!video) {
        showNotification('Видео не найдено — проскролльте к видео и попробуйте снова');
        return;
      }

      // Hard-force PiP enabling (fixes the "not available" error on some normal videos)
      video.disablePictureInPicture = false;
      video.removeAttribute('disablepictureinpicture');
      video.setAttribute('controlslist', 'nodownload'); // Sometimes helps trick browser policies

      if (video.readyState === 0) {
        showNotification('Видео еще загружается, подождите секунду');
        return;
      }

      try {
        await video.requestPictureInPicture();
        currentPipVideo = video;
        pipButton.classList.add('pip-active');
        
        // Start tracking to automatically swap PiP when scrolling
        startPipTracker();

        // Listen for PiP close
        video.addEventListener('leavepictureinpicture', () => {
          // Only remove active state if we didn't just swap to a new PiP video
          setTimeout(() => {
            if (!document.pictureInPictureElement) {
              pipButton.classList.remove('pip-active');
              currentPipVideo = null;
              if (pipTrackerInterval) clearInterval(pipTrackerInterval);
            }
          }, 100);
        }, { once: true });
        
      } catch (err) {
        console.error('[TikTok BG Play] PiP request error:', err);
        if (err.message.includes('not available') || err.name === 'NotSupportedError') {
          showNotification('PiP недоступен для этого поста (возможно, это фото-карусель)');
        } else {
          showNotification('Не удалось открыть PiP: ' + err.message);
        }
      }

    } catch (err) {
      console.error('[TikTok BG Play] PiP wrapper error:', err);
      showNotification('Произошла ошибка PiP');
    }
  }

  // ── Show a toast notification ───────────────────────────────────
  function showNotification(text) {
    const existing = document.getElementById('tiktok-pip-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'tiktok-pip-toast';
    toast.textContent = text;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // ── Watch for new videos loaded via SPA navigation ──────────────
  const observer = new MutationObserver(() => {
    if (!document.getElementById('tiktok-pip-btn')) {
      createPipButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // ── Keyboard shortcut: Alt+P to toggle PiP ─────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      togglePiP();
    }
  });

  // ── Initialize ──────────────────────────────────────────────────
  setupMediaSession();
  createPipButton();
  console.log('[TikTok BG Play] ✅ PiP button and smart-scrolling ready');
})();

