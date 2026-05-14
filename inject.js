// inject.js — runs at document_start in MAIN world (page context)
// Overrides the Page Visibility API and Permissions Policy so TikTok
// cannot detect tab switches and cannot block Picture-in-Picture.

(function () {
  'use strict';

  // ── 1. Override document.hidden — always report "visible" ───────
  Object.defineProperty(Document.prototype, 'hidden', {
    get: function () { return false; },
    configurable: true
  });

  // ── 2. Override document.visibilityState — always "visible" ─────
  Object.defineProperty(Document.prototype, 'visibilityState', {
    get: function () { return 'visible'; },
    configurable: true
  });

  // ── 3. Override document.hasFocus() — always true ───────────────
  Document.prototype.hasFocus = function () { return true; };

  // ── 4. Block the 'visibilitychange' event from firing ───────────
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'visibilitychange') {
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  // ── 5. Block window blur events ─────────────────────────────────
  window.addEventListener('blur', function (e) {
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('pagehide', function (e) {
    e.stopImmediatePropagation();
  }, true);

  // ── 6. Force-enable PiP at the document level ───────────────────
  // Override the pictureInPictureEnabled property to always return true
  try {
    Object.defineProperty(Document.prototype, 'pictureInPictureEnabled', {
      get: function () { return true; },
      configurable: true
    });
  } catch (e) {}

  // ── 7. Prevent TikTok from setting disablePictureInPicture ──────
  // Override the property setter so TikTok can't disable PiP on videos
  try {
    Object.defineProperty(HTMLVideoElement.prototype, 'disablePictureInPicture', {
      get: function () { return false; },
      set: function () { /* ignore TikTok trying to disable PiP */ },
      configurable: true
    });
  } catch (e) {}

  // ── 8. Remove disablepictureinpicture attribute from all videos ─
  const origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (name.toLowerCase() === 'disablepictureinpicture') {
      return; // silently ignore
    }
    return origSetAttribute.call(this, name, value);
  };

  console.log('[TikTok BG Play] ✅ Visibility API + PiP overrides active');
})();
