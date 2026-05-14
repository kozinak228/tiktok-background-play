// inject.js — runs at document_start in MAIN world (page context)
// Overrides the Page Visibility API so TikTok cannot detect tab switches.
// Using "world": "MAIN" in manifest.json means this code runs directly
// in the page's JS context, bypassing CSP restrictions.

(function () {
  'use strict';

  // 1. Override document.hidden — always report "visible"
  Object.defineProperty(Document.prototype, 'hidden', {
    get: function () { return false; },
    configurable: true
  });

  // 2. Override document.visibilityState — always "visible"
  Object.defineProperty(Document.prototype, 'visibilityState', {
    get: function () { return 'visible'; },
    configurable: true
  });

  // 3. Override document.hasFocus() — always true
  Document.prototype.hasFocus = function () { return true; };

  // 4. Block the 'visibilitychange' event from firing
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'visibilitychange') {
      // Silently ignore — TikTok won't know the tab lost focus
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  // 5. Block window blur/focus events that TikTok might also use
  window.addEventListener('blur', function (e) {
    e.stopImmediatePropagation();
  }, true);

  // 6. Prevent the 'pagehide' event (some players use this)
  window.addEventListener('pagehide', function (e) {
    e.stopImmediatePropagation();
  }, true);

  console.log('[TikTok BG Play] ✅ Visibility API overrides active');
})();
