// content.js — runs at document_idle on TikTok pages
// Adds a Picture-in-Picture (PiP) floating button

(function () {
  'use strict';

  let pipButton = null;
  let currentPipVideo = null;

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
    // TikTok uses <video> tags — find the one that's currently playing
    // or the most visible one
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return null;

    // Filter videos that are actually visible on screen
    const visibleVideos = videos.filter(v => {
      const rect = v.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && 
             rect.top < window.innerHeight && rect.bottom > 0;
    });

    if (visibleVideos.length === 0) return null;

    // Prefer a video that's currently playing and has data loaded
    for (const v of visibleVideos) {
      if (!v.paused && v.readyState >= 2) return v;
    }

    // Fallback: find the visible video closest to the center of the viewport
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

  // ── Toggle PiP mode ────────────────────────────────────────────
  async function togglePiP() {
    try {
      // If already in PiP, exit
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        pipButton.classList.remove('pip-active');
        currentPipVideo = null;
        return;
      }

      const video = findActiveVideo();
      if (!video) {
        showNotification('Видео не найдено — проскролльте к видео и попробуйте снова');
        return;
      }

      // Some videos might not allow PiP, handle gracefully
      if (video.disablePictureInPicture) {
        video.disablePictureInPicture = false;
      }

      if (video.readyState === 0) {
        showNotification('Видео еще загружается, подождите секунду');
        return;
      }

      try {
        await video.requestPictureInPicture();
        currentPipVideo = video;
        pipButton.classList.add('pip-active');

        // Listen for PiP close
        video.addEventListener('leavepictureinpicture', () => {
          pipButton.classList.remove('pip-active');
          currentPipVideo = null;
        }, { once: true });
      } catch (err) {
        console.error('[TikTok BG Play] PiP error:', err);
        // "Picture-in-Picture is not available" usually means it's an audio-only video track (like a photo carousel)
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

  // ── Auto-resume logic removed to prevent unpausing intentionally paused videos ──


  // ── Watch for new videos loaded via SPA navigation ──────────────
  const observer = new MutationObserver(() => {
    // Keep monitoring — TikTok is a SPA, new videos appear dynamically
    if (!document.getElementById('tiktok-pip-btn')) {
      createPipButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // ── Keyboard shortcut: Alt+P to toggle PiP ─────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      togglePiP();
    }
  });

  // ── Initialize ──────────────────────────────────────────────────
  createPipButton();
  console.log('[TikTok BG Play] ✅ PiP button and auto-resume ready');
})();
