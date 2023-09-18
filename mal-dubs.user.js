// ==UserScript==
// @name         MAL (MyAnimeList) Dubs
// @namespace    https://github.com/MAL-Dubs
// @version      0.9.46
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
// @icon         data:image/svg+xml;charset=utf8,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 460 460"><circle fill="#FFFFFF" cx="230" cy="230" r="230"/><g><circle fill="#2E51A2" cx="230" cy="230" r="210"/></g><path fill="#FFFFFF" d="M407.1,242.3c10.4-19.7,2.6-44.2-17.3-54.2c-3.4-1.7-5.9-4.5-7.2-7.9c-1.4-3.8-1.2-7.9,0.7-11.5 c10.1-18.9,1.9-44.3-17.4-53.6c-17.6-9-38.8-3.9-50.3,12.1c0,0-36.3,50-36.3,50c6.6,6.2,11.9,13.6,15.8,21.7l16.6-5.4 c4.6-10.5,19.8-10.7,24.5-0.1c5.3,11.9-7.7,23.7-19,17.2c0,0-16.6,5.4-16.6,5.4c1.7,8.9,1.7,18.1,0,26.9l58.8,19.1 C378,268.2,398.2,259.9,407.1,242.3z"/><path fill="#FFFFFF" d="M239,158.4c9,1.1,17.7,4,25.7,8.4c0,0,36.3-50,36.3-50c27.8-40.6-25.4-85.9-61-51.8 c-5.4,5.7-14.9,5.7-20.3,0.2c-14.8-15.4-41.6-15.4-56.4,0c-13.9,14-15.7,35.7-4.1,51.6l36.3,49.9c7.9-4.3,16.6-7.2,25.5-8.3l0-17.5 c-6.1-5.1-6.1-16.2,1.2-21.1c14.5-9.1,28.8,9.6,16.7,21.1C239,140.9,239,158.4,239,158.4z"/><path fill="#FFFFFF" d="M335.2,356.5c21.1,3.8,42.7-12,45.6-33.1c3.1-19.5-8.3-38.1-27.1-44.2l-58.8-19.1c-2.2,4.6-4.9,9-8,13.1 c0,0-7.7,129.3-7.7,129.3c19.5,0.1,36.5-14.4,39.5-33.6C319.7,361,327.4,355.1,335.2,356.5z"/><path fill="#FFFFFF" d="M165.1,260.1c0,0-58.6,19.1-58.6,19.1c-18.8,6.1-30.1,24.7-27.1,44.2c3,21.8,24.4,37.4,45.7,33.6 c7.8-1.6,15.6,3.8,16.8,11.8c3,18.9,19.2,32.9,38,33.6c0,0-7.7-130.4-7.7-130.4C169.4,268.2,167,264.2,165.1,260.1z"/><path fill="#FFFFFF" d="M191.2,289.9l7.2,120.9c20.5,3.6,41.9,3.6,62.5,0.2c0,0,7.1-120.5,7.1-120.5 C245.1,305.1,213.8,304.9,191.2,289.9z"/><path fill="#FFFFFF" d="M53,242.2C42.5,222.5,50.4,198,70.3,188c3.4-1.7,5.9-4.5,7.2-7.9c1.4-3.8,1.2-7.9-0.7-11.5 c-10.1-18.9-1.9-44.3,17.4-53.6c17.6-9,38.8-3.9,50.3,12.1c0,0,36.3,50,36.3,50c-6.6,6.2-11.9,13.6-15.8,21.7l-16.6-5.4 c-4.6-10.5-19.8-10.7-24.5-0.1c-5.3,11.9,7.7,23.7,19,17.2c0,0,16.6,5.4,16.6,5.4c-1.7,8.9-1.7,18.1,0,26.9L100.8,262 C82,268.1,61.9,259.8,53,242.2z"/><circle fill="#FFFFFF" cx="230" cy="230" r="54"/></svg>
// ==/UserScript==

const currentURL = document.location.href;
const currentBodyClassList = document.body.classList;

const dubbedLinks = document.querySelectorAll("p.title-text>a,p.data a.title,.content-result .information>a:first-child,.list>.information>a:first-child,table.anime_detail_related_anime a[href^='/anime'],.content-result .title>a:first-child,td.data.title>a:first-child,.list td:nth-child(2)>a.hoverinfo_trigger,#content>table>tbody>tr>td>table>tbody>tr>td.borderClass>a[href*='myanimelist.net/anime/'],#content>div>div>table>tbody>tr>td>a[href*='/anime'],div[id^=raArea]+div>a:first-child,.news-container h2 a[href*='/anime/'],li.ranking-unit>div>h3>a,tr.ranking-list>td:nth-child(2)>div>div>h3>a,div.borderClass>a[href^='anime/'],#content>table>tbody>tr>td:nth-child(1)>a:nth-child(1),[id^='#revAreaItemTrigger'],.news-container a[href^='https://myanimelist.net/anime/'],.animeography>.title>a,.profile div.updates.anime>div.statistics-updates>div.data>a,.history_content_wrapper td:first-child>a,.forum-topic-message a[href^='https://myanimelist.net/anime/'],.forum-topic-message a[href^='/anime/'],.page-blog-detail a[href^='https://myanimelist.net/anime/'],.page-blog-detail a[href^='/anime/'],.pmessage-message-history a[href^='https://myanimelist.net/anime/'],.pmessage-message-history a[href^='/anime/'],a.js-people-title,.profile .anime>div>div.data>div.title>a,a[id^='sinfo'],[id^='#revAreaAnimeHover'],#dialog>tbody>tr>td>a,.company-favorites-ranking-table>tbody>tr>td.popularity>p>a,.company-favorites-ranking-table>tbody>tr>td.score>p>a,div.list.js-categories-seasonal>table>tbody>tr>td:nth-child(2)>div:nth-child(1)>a,.stacks #content>div.content-left>div.list-anime-list>div>div.head>div.title-text>h2>a,.footer-ranking li>a,#content > div:nth-child(3) > a[href^='/anime'],.blog_detail_content_wrapper a,div[id^=comment]>table>tbody>tr>td:nth-child(2)>a,.recommendations_h3>a,.reviews_h3>a,.friend_list_updates a.fw-b,.info>p>a.fw-b,#content>div.borderDark>table>tbody>tr>td>a,.js-history-updates-item .work-title>a:first-of-type");
const animeURLregex = /^(https?:\/\/myanimelist\.net)?\/?anime(\/|\.php\?id=)(\d+)\/?.*$/;
const IDURL = 'https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/data/dubInfo.json';

let dubbedIDs = JSON.parse(localStorage.getItem('dubIDs'));
let incompleteDubs = JSON.parse(localStorage.getItem('incompleteIDs'));

GM_addStyle(GM_getResourceText('CSS'));

function cacheDubs() {
  const lastCached = localStorage.getItem('dubCacheDate');
  if (
    lastCached === null
    || (lastCached !== undefined && parseInt(lastCached, 10) + 600000 < Date.now())
  ) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: IDURL,
      nocache: true,
      revalidate: true,
      onload(response) {
        const data = JSON.parse(response.responseText);
        dubbedIDs = data.dubbed;
        incompleteDubs = data.incomplete;
        localStorage.setItem('dubIDs', JSON.stringify(dubbedIDs));
        localStorage.setItem('incompleteIDs', JSON.stringify(incompleteDubs));
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
  const dubbedThumbs = 'div.auto-recommendations>div.items>a.item,div.recommendations div.items>a.item,div#widget-seasonal-video li.btn-anime>a.link,div#anime_recommendation li.btn-anime.auto>a.link,.js-seasonal-anime>.image>a:nth-child(1),#anime_favorites>.fav-slide-outer>ul>li>a';
  document.querySelectorAll(dubbedThumbs).forEach((e) => {
    labelDub(e);
    e.classList.add('imagelink');
  });
}

function watchForDubs(containerID, resultSelector, pageType) {
  const container = document.getElementById(containerID);
  const options = { childList: true, subtree: true };
  if (pageType === 'search') {
    options.attributes = true;
    options.attributeFilter = ['href'];
  }

  new MutationObserver(() => {
    container.querySelectorAll(resultSelector).forEach((e) => labelDub(e));
  }).observe(container, options);
}

function animePages() {
  const animePageID = animeURLregex.exec(currentURL)[3];
  const animePageIDNum = parseInt(animePageID, 10);
  const recommendations = document.querySelectorAll("div#anime_recommendation>div.anime-slide-outer>.anime-slide>li.btn-anime>a.link:not([href*='suggestion'])");
  const recrgx = /^(https?:\/\/myanimelist\.net)?\/recommendations\/anime\/(\d+-\d+)\/?.*/;

  if (dubbedIDs.includes(animePageIDNum)) {
    const pagetitle = document.querySelectorAll('h1.title-name')[0];
    pagetitle.title = 'Dubbed';
    if (incompleteDubs.includes(animePageIDNum)) { pagetitle.title = 'Incomplete Dub'; }
  }

  recommendations.forEach((e) => {
    const recElement = e;
    const recID = parseInt(recrgx.exec(e.href)[2].replace(`-*${animePageID}-*`, ''), 10);
    if (dubbedIDs.includes(recID)) {
      recElement.title = 'Dubbed';
      recElement.classList.add('imagelink');
      if (incompleteDubs.includes(recID)) { recElement.title = 'Incomplete Dub'; }
    }
  });
}

function filterContainers(parent, selectors) {
  const undubbed = parent.querySelectorAll(':not(.noDub) [title="Undubbed"]');
  undubbed.forEach((e) => {
    const container = e.closest(selectors);
    if (container !== undefined) { container.classList.add('noDub'); }
  });
}

function addDubFilter(targetNode) {
  filterContainers(document, '.seasonal-anime.js-seasonal-anime.js-anime-type-all,.js-block-list.list>table>tbody>tr,tr.ranking-list');
  if (targetNode !== null) {
    const filterCheckbox = document.createElement('input');
    filterCheckbox.type = 'checkbox';
    filterCheckbox.id = 'undubbed-filter';
    targetNode.after(filterCheckbox);
    filterCheckbox.insertAdjacentHTML('afterend', `
      <label for="undubbed-filter" class="fs11 fl-r btn-show-undubbed mr12 fw-n fn-grey2">
        <i class="fa-regular fa-square fa-stack-2x"></i>
        <i class="fa-solid fa-check fa-stack-1x"></i>
        Dubs Only
      </label>`.trim());

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
      if (filterCheckbox.checked === true) { currentBodyClassList.add('filterOn'); }
    }

    filterCheckbox.addEventListener('change', () => {
      if (filterCheckbox.checked === true) { currentBodyClassList.add('filterOn'); }
      if (filterCheckbox.checked === false) { currentBodyClassList.remove('filterOn'); }
      localStorage.setItem('dubOnlySearch', filterCheckbox.checked);
      if (currentBodyClassList.contains('season')) {
        const titlesArray = [].slice.call(document.querySelectorAll('.seasonal-anime'));
        const showingArray = titlesArray.filter((el) => getComputedStyle(el).display !== 'none');
        const countDisplay = document.querySelector('.js-visible-anime-count');
        countDisplay.textContent = `${showingArray.length}/${titlesArray.length}`;
      }
    }, false);
  }
}

// hide function from jquery
function isVisible(elem) {
  return !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}

function hideOnClickOutside(element) {
  const outsideClickListener = (event) => {
    if (!element.contains(event.target) && isVisible(element)) {
      element.classList.remove('on');
      document.removeEventListener('click', outsideClickListener);
    }
  };
  document.addEventListener('click', outsideClickListener);
}
// source (2018-03-11): https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js

function placeHeaderMenu() {
  const menuContainer = document.createElement('div');
  const borderDiv = document.createElement('div');
  menuContainer.id = 'dubmenu';
  menuContainer.classList.add('header-menu-unit', 'header-dub');
  menuContainer.insertAdjacentHTML('afterbegin', '<a id="menu-toggle" title="MAL-Dubs" tabindex="0" class="header-dub-button text1"><span id="menu-toggle" class="dub-icon icon"></span></a><div id="dub-dropdown"><ul><li><a id="theme-toggle" href="#"><i class="dub-icon mr6"></i>Switch Style</a></li><li><a href="https://myanimelist.net/forum/?topicid=1692966"><i class="fa-solid fa-calendar-clock mr6"></i>Upcoming Dubs</a></li><li><a href="https://myanimelist.net/forum/?action=message&amp;topic_id=1952777&amp;action=message"><i class="fa-solid fa-comment-dots mr6"></i>Send Feedback</a></li><li><a href="https://github.com/MAL-Dubs/MAL-Dubs/issues/new/choose" target="_blank" rel="noreferrer"><i class="fa-brands fa-github mr6"></i>Report an Issue</a></li><li><a href="https://discord.gg/wMfD2RM7Vt" target="_blank" rel="noreferrer"><i class="fa-brands fa-discord mr6"></i>Discord</a></li><li><a href="https://ko-fi.com/maldubs" target="_blank" rel="noreferrer"><i class="fa-solid fa-circle-dollar-to-slot mr6"></i>Donate</a></li></ul></div>');
  borderDiv.classList.add('border');

  function toggleMenu() {
    const dropdown = document.getElementById('dubmenu');
    if (dropdown.classList.contains('on')) {
      dropdown.classList.remove('on');
    } else {
      dropdown.classList.add('on');
      hideOnClickOutside(dropdown);
    }
  }

  function switchStyle() {
    if (localStorage.getItem('classicTheme') === 'true') {
      currentBodyClassList.remove('classic');
      localStorage.setItem('classicTheme', false);
    } else {
      currentBodyClassList.add('classic');
      localStorage.setItem('classicTheme', true);
    }
  }

  if (document.body.contains(document.querySelector('.header-profile'))) {
    document.querySelector('#header-menu>div.header-profile').before(menuContainer, borderDiv);
  } else if (document.body.contains(document.querySelector('.header-menu-login'))) {
    document.querySelector('#header-menu>div.header-menu-login').after(menuContainer);
  }
  document.getElementById('theme-toggle').addEventListener('click', switchStyle, false);
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
  labelList();
  if (currentBodyClassList.contains('anime')) {
    watchForDubs('list-container', '#list-container>div.list-block>div>table>tbody.list-item>tr.list-table-data>td.data.title>a.link:not([title="Dubbed"],[title="Undubbed"],[title="Incomplete Dub"])');
  }
}

function processSite() {
  labelThumbnails();
  dubbedLinks.forEach((e) => { labelDub(e); });
  watchForDubs('menu_right', '#top-search-bar>#topSearchResultList>div>div>a', 'search');
}

function onComplete() {
  if (currentURL.match(/.*\/animelist\/.*/)) {
    processList();
  } else {
    processSite();
    const filterableURLregex = /.*\/(((anime\.php\?(?!id).+|topanime\.php.*))|anime\/(genre|producer|season)\/?.*)/;
    const searchURLregex = /.*\/((anime\.php\??(?!id).*)|anime\/genre\/?.*)/;
    if (filterableURLregex.test(currentURL)) { addDubFilter(document.querySelector('.js-search-filter-block>div:last-of-type,div.horiznav-nav-seasonal>span.js-btn-show-sort:last-of-type,h2.top-rank-header2>span:last-of-type,.normal_header>div.view-style2:last-of-type,.normal_header>div.fl-r.di-ib.fs11.fw-n')); }
    if (searchURLregex.test(currentURL)) {
      watchForDubs('content', '#advancedsearch>div>#advancedSearchResultList>div>div>a', 'search')
    }
    if (animeURLregex.test(currentURL)) { animePages(); }
    if (currentURL.match(/https:\/\/myanimelist\.net\/addtolist\.php/)) {
      watchForDubs('content', '.quickAdd-anime-result-unit>table>tbody>tr>td:nth-child(1)>a');
    }
    placeHeaderMenu();
    setTimeout(() => labelThumbnails(), 400);
  }
}

if (dubbedIDs === null || incompleteDubs === null) {
  cacheDubs();
}

onComplete();
if (localStorage.getItem('classicTheme') === 'true') { currentBodyClassList.add('classic'); }
