// ==UserScript==
// @name         MAL (MyAnimeList) Dubs
// @namespace    https://github.com/MAL-Dubs
// @version      0.9.38
// @description  Labels English dubbed titles on MyAnimeList.net and adds dub only filtering
// @author       MAL Dubs
// @supportURL   https://github.com/MAL-Dubs/MAL-Dubs/issues
// @downloadURL  https://github.com/MAL-Dubs/MAL-Dubs/raw/main/mal-dubs.user.js
// @updateURL    https://github.com/MAL-Dubs/MAL-Dubs/raw/main/mal-dubs.user.js
// @match        https://myanimelist.net/*
// @iconURL      https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/images/icon.png
// @license      GNU AGPLv3; https://www.gnu.org/licenses/agpl-3.0.html
// @resource     CSS https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/css/style.css
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @connect      githubusercontent.com
// @connect      github.com
// @run-at       document-end
// @noframes
// ==/UserScript==

const dubbedLinks = document.querySelectorAll("p.title-text>a,p.data a.title,.content-result .information>a:first-child,.list>.information>a:first-child,table.anime_detail_related_anime a[href^='/anime'],  .content-result .title>a:first-child,td.data.title>a:first-child,.list td:nth-child(2)>a.hoverinfo_trigger,#content>table>tbody>tr>td>table>tbody>tr>td.borderClass>a[href*='myanimelist.net/anime/'],#content>div>div>table>tbody>tr>td>a[href*='/anime'],div[id^=raArea]+div>a:first-child,.news-container h2 a[href*='/anime/'],li.ranking-unit>div>h3>a,tr.ranking-list>td:nth-child(2)>div>div>h3>a,div.borderClass>a[href^='anime/'],#content>table>tbody>tr>td:nth-child(1)>a:nth-child(1),[id^='#revAreaItemTrigger'],.news-container a[href^='https://myanimelist.net/anime/'],.animeography>.title>a,.profile div.updates.anime>div.statistics-updates>div.data>a,.history_content_wrapper td:first-child>a,.forum_topic_message a[href^='https://myanimelist.net/anime/'],.forum_topic_message a[href^='/anime/'],.page-blog-detail a[href^='https://myanimelist.net/anime/'],.page-blog-detail a[href^='/anime/'],.pmessage-message-history a[href^='https://myanimelist.net/anime/'],.pmessage-message-history a[href^='/anime/'],a.js-people-title,.profile .anime>div>div.data>div.title>a,a[id^='sinfo'],[id^='#revAreaAnimeHover'],#dialog>tbody>tr>td>a,.company-favorites-ranking-table>tbody>tr>td.popularity>p>a,.company-favorites-ranking-table>tbody>tr>td.score>p>a,div.list.js-categories-seasonal>table>tbody>tr>td:nth-child(2)>div:nth-child(1)>a,.stacks #content>div.content-left>div.list-anime-list>div>div.head>div.title-text>h2>a,.footer-ranking li>a,#content > div:nth-child(3) > a[href^='/anime'],.blog_detail_content_wrapper a,div[id^=comment]>table>tbody>tr>td:nth-child(2)>a,.recommendations_h3>a,.reviews_h3>a,.friend_list_updates a.fw-b,.info>p>a.fw-b,#content>div.borderDark>table>tbody>tr>td>a");
const dubbedThumbs = 'div.auto-recommendations>div.items>a.item,div.recommendations div.items>a.item,div#widget-seasonal-video li.btn-anime>a.link,div#anime_recommendation li.btn-anime.auto>a.link,.js-seasonal-anime>.image>a:nth-child(1),#anime_favorites>.fav-slide-outer>ul>li>a';
const animeURLregex = /^(https?:\/\/myanimelist\.net)?\/?anime(\/|\.php\?id=)(\d+)\/?.*$/;
const filterableURLregex = /.*\/(((anime\.php\?(?!id).+|topanime\.php.*))|anime\/(genre|producer|season)\/?.*)/;
const IDURL = 'https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/data/dubInfo.json';

let dubbedIDs = JSON.parse(localStorage.getItem('dubIDs'));
let incompleteDubs = JSON.parse(localStorage.getItem('incompleteIDs'));

GM_addStyle(GM_getResourceText('CSS'));

function dubCache() {
  if (localStorage.getItem('dubCacheDate') === null) { localStorage.setItem('dubCacheDate', Date.now()); }
  if (parseInt(localStorage.getItem('dubCacheDate'), 10) + 600000 < Date.now()) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: IDURL,
      nocache: true,
      revalidate: true,
      onload(response) {
        const data = JSON.parse(response.responseText);
        localStorage.setItem('dubIDs', JSON.stringify(data.dubbed));
        localStorage.setItem('incompleteIDs', JSON.stringify(data.incomplete));
        localStorage.setItem('dubCacheDate', Date.now());
      },
    });
  }
}

function labelDub(anime) {
  const animeElement = anime;
  if (animeURLregex.test(anime.href)) {
    const linkID = parseInt(anime.href.match(/(\/|\.php\?id=)(\d+)\/?/)[2], 10);
    if (dubbedIDs.includes(linkID)) {
      animeElement.title = 'Dubbed';
      if (incompleteDubs.includes(linkID)) { animeElement.title = 'Incomplete Dub'; }
    } else { animeElement.title = 'Undubbed'; }
  }
}

function labelThumbnails() {
  document.querySelectorAll(dubbedThumbs).forEach((e) => {
    labelDub(e);
    e.classList.add('imagelink');
  });
}

function quickAddSearch() {
  const recEntries = document.querySelectorAll('.quickAdd-anime-result-unit>table>tbody>tr>td:nth-child(1)>a');
  recEntries.forEach((e) => labelDub(e));
}

function quickAdd() {
  const searchResults = document.getElementById('content');
  new MutationObserver(() => quickAddSearch()).observe(searchResults, {
    childList: true, subtree: true,
  });
}

function animePages() {
  const thispage = animeURLregex.exec(document.location.href)[3];
  const recommendations = document.querySelectorAll("div#anime_recommendation>div.anime-slide-outer>.anime-slide>li.btn-anime>a.link:not([href*='suggestion'])");
  const recrgx = /^(https?:\/\/myanimelist\.net)?\/recommendations\/anime\/(\d+-\d+)\/?.*/;
  if (dubbedIDs.includes(parseInt(thispage, 10))) {
    const pagetitle = document.querySelectorAll('h1.title-name')[0];
    pagetitle.title = 'Dubbed';
    if (incompleteDubs.includes(parseInt(thispage, 10))) { pagetitle.title = 'Incomplete Dub'; }
  }
  recommendations.forEach((e) => {
    const recElement = e;
    const recID = parseInt(recrgx.exec(e.href)[2].replace(`${thispage}-`, '').replace(`-${thispage}`, ''), 10);
    if (dubbedIDs.includes(recID)) {
      recElement.title = 'Dubbed';
      recElement.classList.add('imagelink');
      if (incompleteDubs.includes(recID)) { recElement.title = 'Incomplete Dub'; }
    }
  });
}

function hideUndubbed(links) {
  links.forEach((e) => {
    if (document.location.href.match(/.*\/topanime\.php.*/)) {
      e.parentNode.parentNode.parentNode.parentNode.parentNode.classList.add('hidden');
    } else if (document.location.href.match(/.*anime\.php\?.*q=.*/)) {
      e.parentNode.parentNode.parentNode.classList.add('hidden');
    } else if (document.querySelector('div.list.js-categories-seasonal')) {
      e.parentNode.parentNode.parentNode.classList.add('hidden');
    } else { e.parentNode.parentNode.classList.add('hidden'); }
  });
}

function showUndubbed(links) {
  links.forEach((e) => {
    if (document.location.href.match(/.*\/topanime\.php.*/)) {
      e.parentNode.parentNode.parentNode.parentNode.parentNode.classList.remove('hidden');
    } else if (document.location.href.match(/.*anime\.php\?.*q=.*/)) {
      e.parentNode.parentNode.parentNode.classList.remove('hidden');
    } else if (document.querySelector('div.list.js-categories-seasonal')) {
      e.parentNode.parentNode.parentNode.classList.remove('hidden');
    } else { e.parentNode.parentNode.classList.remove('hidden'); }
  });
}

function searchFilter() {
  const undubbed = document.querySelectorAll('[title="Undubbed"]');
  const filterTarget = document.querySelector('.js-search-filter-block>div.fl-r.di-ib.mt4.mr12,div.horiznav-nav-seasonal>span[data-id="sort"],h2.top-rank-header2>span.fs10.fw-n.ff-Verdana.di-ib.ml16,.normal_header.js-search-filter-block>.di-ib,.normal_header>div.fl-r.di-ib.fs11.fw-n');
  const filterCheckbox = document.createElement('input');
  const label = document.createElement('label');
  if (filterTarget !== null) {
    filterCheckbox.type = 'checkbox';
    filterCheckbox.id = 'undubbed-filter';
    label.setAttribute('for', 'undubbed-filter');
    label.className = 'fs11 fl-r btn-show-undubbed mr12 fw-n fn-grey2';
    label.appendChild(document.createTextNode('Dubs Only'));
    filterTarget.after(filterCheckbox);
    filterCheckbox.after(label);
  }

  let filter = true;
  let filterUndubbed = (localStorage.getItem('dubOnlySearch') === 'true');
  if (filterUndubbed === null) {
    filterUndubbed = false;
    localStorage.setItem('dubOnlySearch', filterUndubbed);
    filterCheckbox.checked = filterUndubbed;
    filter = false;
  }

  if (filter) {
    filterCheckbox.checked = filterUndubbed;
    if (filterCheckbox.checked === true) { hideUndubbed(undubbed); }
  }

  filterCheckbox.addEventListener('change', () => {
    if (filterCheckbox.checked === true) { hideUndubbed(undubbed); }
    if (filterCheckbox.checked === false) { showUndubbed(undubbed); }
    localStorage.setItem('dubOnlySearch', filterCheckbox.checked);
  }, false);
}

// hide function from jquery
function isVisible(elem) {
  return !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}

function hideOnClickOutside(element) {
  const outsideClickListener = (event) => {
    if (!element.contains(event.target) && isVisible(element)) {
      element.classList.remove('on');
      removeClickListener();
    }
  };
  const removeClickListener = () => document.removeEventListener('click', outsideClickListener);
  document.addEventListener('click', outsideClickListener);
}
// source (2018-03-11): https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js

function toggleMenu() {
  const dropdown = document.getElementById('dubmenu');
  if (dropdown.classList.contains('on')) {
    dropdown.classList.remove('on');
  } else {
    dropdown.classList.add('on');
    hideOnClickOutside(dropdown);
  }
}

function setTheme() {
  if (localStorage.getItem('classicTheme') === 'true') {
    document.body.classList.add('classic');
  }
}

function toggleClassic() {
  if (localStorage.getItem('classicTheme') === 'true') {
    document.body.classList.remove('classic');
    localStorage.setItem('classicTheme', false);
  } else {
    document.body.classList.add('classic');
    localStorage.setItem('classicTheme', true);
  }
}

function placeHeaderMenu() {
  const menuContainer = document.createElement('div');
  const borderDiv = document.createElement('div');
  menuContainer.id = 'dubmenu';
  menuContainer.classList.add('header-menu-unit', 'header-dub');
  menuContainer.innerHTML += '<a id="menu-toggle" title="MAL-Dubs" tabindex="0" class="header-dub-button text1"><span id="menu-toggle" class="dub-icon icon"></span></a><div id="dub-dropdown"><ul><li><a id="theme-toggle" href="#"><i class="dub-icon mr6"></i>Switch Style</a></li><li><a href="https://myanimelist.net/forum/?topicid=1692966"><i class="fa-solid fa-calendar-clock mr6"></i>Upcoming Dubs</a></li><li><a href="https://myanimelist.net/forum/?action=message&amp;topic_id=1952777&amp;action=message"><i class="fa-solid fa-comment-dots mr6"></i>Send Feedback</a></li><li><a href="https://github.com/MAL-Dubs/MAL-Dubs/issues/new/choose" target="_blank" rel="noreferrer"><i class="fa-brands fa-github mr6"></i>Report an Issue</a></li><li><a href="https://discord.gg/wMfD2RM7Vt" target="_blank" rel="noreferrer"><i class="fa-brands fa-discord mr6"></i>Anime Dub Club</a></li><li><a href="https://ko-fi.com/maldubs" target="_blank" rel="noreferrer"><i class="fa-solid fa-circle-dollar-to-slot mr6"></i>Donate</a></li></ul></div>';
  borderDiv.classList.add('border');
  if (document.body.contains(document.querySelector('.header-profile'))) {
    document.querySelector('#header-menu>div.header-profile').before(menuContainer, borderDiv);
  } else if (document.body.contains(document.querySelector('.header-menu-login'))) {
    document.querySelector('#header-menu>div.header-menu-login').after(menuContainer);
  }
  document.getElementById('theme-toggle').addEventListener('click', toggleClassic, false);
  document.getElementById('menu-toggle').addEventListener('click', toggleMenu, false);
}

function labelList() {
  const listEntries = document.querySelectorAll('#list-container>div.list-block>div>table>tbody.list-item>tr.list-table-data>td.data.title>a.link,div#list_surround>table>tbody>tr>td>a.animetitle');
  listEntries.forEach((e) => {
    if (!['Undubbed', 'Dubbed', 'Incomplete Dub'].includes(e.title)) {
      labelDub(e);
    }
  });
}

function processList() {
  const listContainer = document.getElementById('list-container');
  if (!listContainer) {
    labelList();
  } else {
    new MutationObserver(() => labelList()).observe(listContainer, {
      childList: true, subtree: true,
    });
  }
}

function processSite() {
  labelThumbnails();
  dubbedLinks.forEach((e) => { labelDub(e); });
}

function onComplete() {
  if (document.location.href.match(/.*\/animelist\/.*/)) {
    processList();
  } else {
    processSite();
    if (document.location.href.match(filterableURLregex)) { searchFilter(); }
    if (document.location.href.match(animeURLregex)) { animePages(); }
    if (document.location.href.match(/https:\/\/myanimelist\.net\/addtolist\.php/)) { quickAdd(); }
    placeHeaderMenu();
    setTimeout(() => labelThumbnails(), 400);
  }
  setTheme();
}

if (dubbedIDs === null || incompleteDubs === null) {
  GM_xmlhttpRequest({
    method: 'GET',
    nocache: true,
    url: IDURL,
    onload(response) {
      const data = JSON.parse(response.responseText);
      dubbedIDs = data.dubbed;
      incompleteDubs = data.incomplete;
      localStorage.setItem('dubIDs', JSON.stringify(dubbedIDs));
      localStorage.setItem('incompleteIDs', JSON.stringify(incompleteDubs));
      onComplete();
      localStorage.setItem('dubCacheDate', Date.now());
    },
  });
} else {
  onComplete();
  dubCache();
}
