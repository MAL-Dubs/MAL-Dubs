// ==UserScript==
// @name         AniList Dubs
// @version      1.5.0
// @description  Labels English dubbed titles on AniList.co, adds dub-only filtering
// @namespace    https://github.com/hamzaharoon1314/AniList-Dubs/
// @copyright    © 2019-2025 MAL-Dubs; Icons and glyphs within this project are TM MAL-Dubs
// @license      GNU AGPLv3; https://github.com/MAL-Dubs/MAL-Dubs/raw/main/LICENSE
// @author       HAMO (AniList support), MAL Dubs
// @supportURL   https://github.com/hamzaharoon1314/AniList-Dubs/issues
// @downloadURL  https://github.com/hamzaharoon1314/AniList-Dubs/raw/main/anilist-dubs.user.js
// @updateURL    https://github.com/hamzaharoon1314/AniList-Dubs/raw/main/anilist-dubs.user.js
// @match        https://anilist.co/*
// @iconURL      https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/images/icon.png
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @connect      githubusercontent.com
// @connect      github.com
// @connect      graphql.anilist.co
// @connect      anilist.co
// @run-at       document-end
// @noframes
// ==/UserScript==

'use strict';

const ANIME_ID_RE     = /\/anime\/(\d+)/;
const DUB_INFO_URL    = 'https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/data/dubInfo.json';
const GRAPHQL_URL     = 'https://graphql.anilist.co';
const CACHE_TTL_MS    = 600_000; // 10 minutes

// OAuth — implicit grant
const OAUTH_CLIENT_ID = '40465';
const OAUTH_AUTH_URL  = 'https://anilist.co/api/v2/oauth/authorize';

// Authenticated clients get 90 req/min; anonymous get 30 req/min.
// perPage hard cap is 50 for Page queries regardless of auth.
const GQL_PAGE_SIZE   = 50;
const GQL_QUERY = 'query($ids:[Int]){Page(perPage:' + GQL_PAGE_SIZE + '){media(id_in:$ids,type:ANIME){id idMal}}}';

// Filter cycle
const FILTER_OPTS   = ['filter-off', 'only-dubs', 'no-dubs'];
const FILTER_LABELS = ['Show All Anime', 'Only Dubbed', 'Hide Dubbed'];

/** Load a stored token and validate it hasn't expired. */
function loadToken() {
  try {
    const raw = GM_getValue('oauthToken', null);
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (t.expiresAt && Date.now() > t.expiresAt) {
      GM_deleteValue('oauthToken');
      return null;
    }
    return t;
  } catch (_) { return null; }
}

let oauthToken = loadToken(); 

function authHeader() {
  return oauthToken ? 'Bearer ' + oauthToken.accessToken : null;
}

function login() {
  const authURL = OAUTH_AUTH_URL +
    '?client_id=' + OAUTH_CLIENT_ID +
    '&response_type=token';

  const popup = window.open(authURL, 'anilist_oauth',
    'width=600,height=720,left=' + Math.round((screen.width  - 600) / 2) +
    ',top='  + Math.round((screen.height - 720) / 2));

  if (!popup) {
    showAuthToast('⚠️ Popup blocked — allow popups for anilist.co and try again.');
    return;
  }

  let done = false;

  function handleHash() {
    if (done) return;
    let hash;
    try { hash = popup.location.hash; } catch (_) { return; } // still cross-origin

    if (!hash || !hash.includes('access_token')) return;

    done = true;
    clearInterval(poll);
    popup.close();

    const params      = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    const expiresIn   = parseInt(params.get('expires_in') || '0', 10);

    if (!accessToken) {
      showAuthToast('❌ Login failed — no token in redirect.');
      return;
    }

    oauthToken = {
      accessToken,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
    };
    GM_setValue('oauthToken', JSON.stringify(oauthToken));
    showAuthToast('✅ Logged in! Reloading…');
    setTimeout(() => location.reload(), 1200);
  }
  
  popup.onload = handleHash;

  const poll = setInterval(() => {
    if (popup.closed) { clearInterval(poll); return; }
    handleHash();
  }, 50);
}

function logout() {
  oauthToken = null;
  GM_deleteValue('oauthToken');
  showAuthToast('🔓 Logged out. Reloading…');
  setTimeout(() => location.reload(), 1200);
}

function showAuthToast(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = [
    'position:fixed;bottom:24px;right:24px;z-index:99999',
    'background:#1a1a2e;color:#fff;padding:12px 18px',
    'border-radius:8px;font-size:13px;font-weight:600',
    'box-shadow:0 4px 20px rgba(0,0,0,.5)',
    'transition:opacity .4s ease',
  ].join(';');
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; }, 3600);
  setTimeout(() => el.remove(), 4100);
}

let dubInfo = null;
try { dubInfo = JSON.parse(GM_getValue('dubInfo', 'null')); } catch (_) {}

let dubLookup = new Map();

let anilistToMalMap = new Map();
try {
  const stored = JSON.parse(GM_getValue('anilistToMalMap', '{}'));
  anilistToMalMap = new Map(Object.entries(stored).map(([k, v]) => [+k, v]));
} catch (_) {}

// Active filter state
let dubFilter = GM_getValue('dubFilter', 'filter-off');
if (!FILTER_OPTS.includes(dubFilter)) dubFilter = 'filter-off';

function buildDubLookup() {
  dubLookup = new Map();
  if (!dubInfo) return;
  for (const [key, ids] of Object.entries(dubInfo)) {
    for (const id of ids) dubLookup.set(id, key);
  }
}

function getDubKey(malId) {
  return (malId && dubLookup.get(malId)) || 'no';
}

function cacheDubs() {
  const lastCached = GM_getValue('dubCacheDate', 0);
  if (dubInfo && Date.now() - lastCached < CACHE_TTL_MS) {
    buildDubLookup();
    return;
  }
  GM_xmlhttpRequest({
    method: 'GET',
    url: DUB_INFO_URL,
    nocache: true,
    revalidate: true,
    onload(res) {
      try {
        dubInfo = JSON.parse(res.responseText);
        buildDubLookup();
        GM_setValue('dubInfo', res.responseText);
        GM_setValue('dubCacheDate', Date.now());
        runAllLabelers();
      } catch (_) {}
    },
  });
}


function buildHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  const auth = authHeader();
  if (auth) headers['Authorization'] = auth;
  return headers;
}

function fetchMalIds(anilistIds, callback) {
  const unknownIds = anilistIds.filter(id => !anilistToMalMap.has(id));
  if (!unknownIds.length) { callback(); return; }

  const chunks = [];
  for (let i = 0; i < unknownIds.length; i += GQL_PAGE_SIZE) {
    chunks.push(unknownIds.slice(i, i + GQL_PAGE_SIZE));
  }

  let remaining = chunks.length;

  function onChunkDone() {
    if (--remaining > 0) return;
    const obj = {};
    anilistToMalMap.forEach((v, k) => { obj[k] = v; });
    GM_setValue('anilistToMalMap', JSON.stringify(obj));
    callback();
  }

  for (const chunk of chunks) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: GRAPHQL_URL,
      headers: buildHeaders(),  // ← auth header injected here when logged in
      data: JSON.stringify({ query: GQL_QUERY, variables: { ids: chunk } }),
      onload(res) {
        // Handle token expiry (401) — clear token and retry anonymously
        if (res.status === 401 || res.status === 403) {
          console.warn('[AniList Dubs] Token rejected (status ' + res.status + '). Clearing token.');
          oauthToken = null;
          GM_deleteValue('oauthToken');
          registerMenu();
          // Retry this chunk without auth
          GM_xmlhttpRequest({
            method: 'POST',
            url: GRAPHQL_URL,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            data: JSON.stringify({ query: GQL_QUERY, variables: { ids: chunk } }),
            onload(res2) {
              parseChunkResponse(res2, chunk);
              onChunkDone();
            },
            onerror: onChunkDone,
          });
          return;
        }
        parseChunkResponse(res, chunk);
        onChunkDone();
      },
      onerror: onChunkDone,
    });
  }
}

function parseChunkResponse(res, chunk) {
  try {
    const media = JSON.parse(res.responseText)?.data?.Page?.media ?? [];
    for (const m of media) anilistToMalMap.set(m.id, m.idMal ?? null);
    for (const id of chunk) {
      if (!anilistToMalMap.has(id)) anilistToMalMap.set(id, null);
    }
  } catch (_) {}
}


function getAnilistId(url) {
  if (!url) return null;
  const m = ANIME_ID_RE.exec(url);
  return m ? +m[1] : null;
}

function extractIds(elements, linkSelector) {
  const ids = new Set();
  for (const el of elements) {
    const link = el.querySelector(linkSelector);
    const id = link && getAnilistId(link.href || link.getAttribute('href'));
    if (id) ids.add(id);
  }
  return [...ids];
}

// Browse / Search  (.media-card)
function labelAllAnilistCards(root = document.body) {
  if (!dubInfo) return;
  const cards = [...root.querySelectorAll('.media-card:not([data-dub])')];
  if (!cards.length) return;

  const ids = extractIds(cards, 'a.cover, a.title');
  fetchMalIds(ids, () => {
    for (const card of cards) {
      const link = card.querySelector('a.cover') || card.querySelector('a.title');
      if (!link) continue;
      const id = getAnilistId(link.href || link.getAttribute('href'));
      if (id) card.dataset.dub = getDubKey(anilistToMalMap.get(id));
    }
  });
}

// User anime list  (.entry-card)
function labelListEntries(root = document.body) {
  if (!dubInfo) return;
  const entries = [...root.querySelectorAll('.entry-card:not([data-dub])')];
  if (!entries.length) return;

  const ids = extractIds(entries, '.title a[href*="/anime/"]');
  fetchMalIds(ids, () => {
    for (const entry of entries) {
      const link = entry.querySelector('.title a[href*="/anime/"]');
      if (!link) continue;
      const id = getAnilistId(link.href || link.getAttribute('href'));
      if (!id) continue;

      const dubKey = getDubKey(anilistToMalMap.get(id));
      entry.dataset.dub = dubKey;

      if (dubKey === 'no') continue;

      const titleEl = entry.querySelector('.title');
      if (!titleEl || titleEl.querySelector('.mal-dubs-list-badge')) continue;
      const badge = document.createElement('span');
      badge.className = dubKey === 'partial'
        ? 'mal-dubs-list-badge partial'
        : 'mal-dubs-list-badge';
      badge.textContent = dubKey === 'partial' ? 'PART DUB' : 'DUB';
      titleEl.insertBefore(badge, titleEl.firstChild);
    }
  });
}

// Anime detail page  (.media-page-unscoped)
function labelAnimePage() {
  if (!dubInfo) return;
  const id = getAnilistId(location.href);
  if (!id) return;
  const mediaEl = document.querySelector('.media.media-page-unscoped');
  if (!mediaEl || mediaEl.hasAttribute('data-dub')) return;

  fetchMalIds([id], () => {
    mediaEl.dataset.dub = getDubKey(anilistToMalMap.get(id));
  });
}



let menuIds = [];

function applyFilter() {
  for (const opt of FILTER_OPTS) document.body.classList.remove('mal-dubs-' + opt);
  document.body.classList.add('mal-dubs-' + dubFilter);
}

function setFilter(opt) {
  dubFilter = opt;
  GM_setValue('dubFilter', opt);
  applyFilter();
  registerMenu();
}



function registerMenu() {
  for (const id of menuIds) GM_unregisterMenuCommand(id);
  menuIds = [];

  // Auth status + login/logout
  const authLabel = oauthToken
    ? '🔐 AniList Account: Connected (90 req/min)'
    : '🔓 AniList Account: Anonymous (30 req/min)';
  menuIds.push(GM_registerMenuCommand(authLabel, () => {})); // status display

  if (oauthToken) {
    menuIds.push(GM_registerMenuCommand('   ↳ Log out of AniList', logout));
  } else {
    menuIds.push(GM_registerMenuCommand('   ↳ Log in to AniList (higher rate limit)', login));
  }

  // Separator-like spacer entry
  menuIds.push(GM_registerMenuCommand('─────────────────────', () => {}));

  // Filter options
  for (let i = 0; i < FILTER_OPTS.length; i++) {
    const opt   = FILTER_OPTS[i];
    const label = (dubFilter === opt ? '✓ ' : '\u2003') + '🎙 Dubs: ' + FILTER_LABELS[i];
    menuIds.push(GM_registerMenuCommand(label, () => setFilter(opt)));
  }
}


// CSS
function injectStyles() {
  GM_addStyle(`
    /* ── Browse/Search cards (.media-card) ── */
    .media-card[data-dub]:not([data-dub="no"]) .cover { position: relative; }
    .media-card[data-dub]:not([data-dub="no"]) .cover::after {
      content: 'DUB';
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(61,180,242,.90); color: #fff;
      font-size: 10px; font-weight: 700;
      padding: 4px 0; text-align: center; letter-spacing: 1.5px;
      z-index: 10; pointer-events: none;
    }
    .media-card[data-dub="partial"] .cover::after {
      content: 'PART DUB'; background: rgba(242,145,61,.90);
    }

    /* ── User list badges ── */
    .mal-dubs-list-badge {
      display: inline-block;
      background: #3db4f2; color: #fff !important;
      font-size: 9px; font-weight: 800;
      padding: 1px 5px; border-radius: 3px;
      letter-spacing: 0.8px; margin-right: 6px;
      vertical-align: middle; line-height: 1.6;
      text-decoration: none !important; pointer-events: none;
      flex-shrink: 0;
    }
    .mal-dubs-list-badge.partial { background: #f2913d; }

    /* ── Anime detail page ── */
    .media-page-unscoped[data-dub]:not([data-dub="no"]) .cover-wrap-inner { position: relative; }
    .media-page-unscoped[data-dub]:not([data-dub="no"]) .cover-wrap-inner::after {
      content: 'DUBBED';
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(61,180,242,.92); color: #fff;
      font-size: 11px; font-weight: 800;
      padding: 6px 0; text-align: center; letter-spacing: 2px;
      z-index: 10; pointer-events: none;
    }
    .media-page-unscoped[data-dub="partial"] .cover-wrap-inner::after {
      content: 'PARTIAL DUB'; background: rgba(242,145,61,.92);
    }

    /* ── Filter states ── */
    body.mal-dubs-only-dubs .media-card[data-dub="no"],
    body.mal-dubs-only-dubs .media-card:not([data-dub]),
    body.mal-dubs-only-dubs .entry-card[data-dub="no"],
    body.mal-dubs-only-dubs .entry-card:not([data-dub]) { display: none !important; }

    body.mal-dubs-no-dubs .media-card[data-dub]:not([data-dub="no"]),
    body.mal-dubs-no-dubs .entry-card[data-dub]:not([data-dub="no"]) { display: none !important; }
  `);
}



function runAllLabelers() {
  labelAllAnilistCards();
  labelListEntries();
  labelAnimePage();
}

function watchForChanges() {
  let debounce;
  let lastURL = location.href;

  new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const currentURL = location.href;
      if (currentURL !== lastURL) {
        lastURL = currentURL;
        document.querySelector('.media.media-page-unscoped')
          ?.removeAttribute('data-dub');
      }
      runAllLabelers();
    }, 300);
  }).observe(document.body, { childList: true, subtree: true });
}


// INIT
injectStyles();
applyFilter();
registerMenu();
cacheDubs();
runAllLabelers();
watchForChanges();
