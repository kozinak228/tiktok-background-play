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

  // ── Document PiP fallback (floating browser window) ──────────────
  let docPipWindow = null;

  async function openDocumentPiP(video) {
    try {
      if (!('documentPictureInPicture' in window)) {
        showNotification('Document PiP не поддерживается вашим браузером. Обновите Opera.');
        return false;
      }

      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 400,
        height: 720
      });

      docPipWindow = pipWindow;

      // Add styles to the PiP window
      const style = pipWindow.document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .pip-controls {
          position: fixed;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 16px;
          z-index: 10;
          opacity: 0;
          transition: opacity 0.25s;
        }
        body:hover .pip-controls { opacity: 1; }
        .pip-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          color: white;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .pip-btn:hover { background: rgba(255,255,255,0.3); }
      `;
      pipWindow.document.head.appendChild(style);

      // Move the actual video element from TikTok into the PiP window.
      // This is the most reliable way — blob URLs and MediaSource stay attached.
      const videoParent = video.parentNode;
      const videoNextSibling = video.nextSibling;

      // Create a placeholder so we know where to put the video back
      const placeholder = document.createElement('div');
      placeholder.id = '__tiktok_pip_placeholder__';
      placeholder.style.display = 'none';
      videoParent.insertBefore(placeholder, videoNextSibling);

      // Style the video for the PiP window
      video.style.cssText = 'width:100%;height:100%;object-fit:contain;';
      pipWindow.document.body.appendChild(video);
      video.play().catch(() => {});

      // Add scroll controls (prev/next)
      const controls = pipWindow.document.createElement('div');
      controls.className = 'pip-controls';
      controls.innerHTML = `
        <button class="pip-btn" id="pip-prev" title="Предыдущее видео">⬆</button>
        <button class="pip-btn" id="pip-next" title="Следующее видео">⬇</button>
      `;
      pipWindow.document.body.appendChild(controls);

      // Connect scroll buttons to the main page
      pipWindow.document.getElementById('pip-next').addEventListener('click', () => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true, cancelable: true
        }));
        // Wait for new video to load, then swap it
        setTimeout(() => swapDocPipVideo(pipWindow), 800);
      });

      pipWindow.document.getElementById('pip-prev').addEventListener('click', () => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, bubbles: true, cancelable: true
        }));
        setTimeout(() => swapDocPipVideo(pipWindow), 800);
      });

      // Clean up on close — move video back to original parent
      pipWindow.addEventListener('pagehide', () => {
        const ph = document.getElementById('__tiktok_pip_placeholder__');
        const movedVideo = pipWindow.document.querySelector('video');
        if (movedVideo && ph && ph.parentNode) {
          movedVideo.style.cssText = '';
          ph.parentNode.insertBefore(movedVideo, ph);
          ph.remove();
        }
        docPipWindow = null;
        pipButton.classList.remove('pip-active');
      });

      pipButton.classList.add('pip-active');
      return true;

    } catch (err) {
      console.error('[TikTok BG Play] Document PiP error:', err);
      return false;
    }
  }

  function swapDocPipVideo(pipWindow) {
    const newVideo = findActiveVideo();
    if (!newVideo) return;

    // Return old video to its placeholder first
    const oldPlaceholder = document.getElementById('__tiktok_pip_placeholder__');
    const oldVideo = pipWindow.document.querySelector('video');
    if (oldVideo && oldPlaceholder && oldPlaceholder.parentNode) {
      oldVideo.style.cssText = '';
      oldPlaceholder.parentNode.insertBefore(oldVideo, oldPlaceholder);
      oldPlaceholder.remove();
    }

    // Create new placeholder for the new video
    const newParent = newVideo.parentNode;
    const newNextSibling = newVideo.nextSibling;
    const newPlaceholder = document.createElement('div');
    newPlaceholder.id = '__tiktok_pip_placeholder__';
    newPlaceholder.style.display = 'none';
    newParent.insertBefore(newPlaceholder, newNextSibling);

    // Move new video into PiP
    newVideo.style.cssText = 'width:100%;height:100%;object-fit:contain;';
    pipWindow.document.body.insertBefore(newVideo, pipWindow.document.querySelector('.pip-controls'));
    newVideo.play().catch(() => {});
  }

  // ── Toggle PiP mode ────────────────────────────────────────────
  async function togglePiP() {
    try {
      // If Document PiP is open, close it
      if (docPipWindow && !docPipWindow.closed) {
        docPipWindow.close();
        docPipWindow = null;
        pipButton.classList.remove('pip-active');
        return;
      }

      // If standard PiP is active, exit
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

      // Hard-force PiP enabling
      video.disablePictureInPicture = false;
      video.removeAttribute('disablepictureinpicture');

      if (video.readyState < 2) {
        showNotification('Видео еще загружается, подождите секунду');
        return;
      }

      // Ensure video is playing
      if (video.paused) {
        try { await video.play(); } catch (e) {}
      }

      // Try standard PiP first
      try {
        await video.requestPictureInPicture();
        currentPipVideo = video;
        pipButton.classList.add('pip-active');
        startPipTracker();

        video.addEventListener('leavepictureinpicture', () => {
          setTimeout(() => {
            if (!document.pictureInPictureElement) {
              pipButton.classList.remove('pip-active');
              currentPipVideo = null;
              if (pipTrackerInterval) clearInterval(pipTrackerInterval);
            }
          }, 100);
        }, { once: true });
        return; // Success!
        
      } catch (err) {
        console.warn('[TikTok BG Play] Standard PiP failed, trying Document PiP...', err.name);
      }

      // Fallback: Document PiP (floating browser window)
      const success = await openDocumentPiP(video);
      if (!success) {
        showNotification('PiP недоступен — попробуйте включить флаг opera://flags/#document-picture-in-picture-api');
      }

    } catch (err) {
      console.error('[TikTok BG Play] PiP error:', err);
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

