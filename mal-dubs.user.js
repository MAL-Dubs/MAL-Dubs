// ==UserScript==
// @name         MAL (MyAnimeList) Dubs
// @namespace    https://github.com/MAL-Dubs
// @version      1.2.0
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

const currentURL = document.location.href;
const currentBodyClassList = document.body.classList;
const animeURLregex = /^(https?:\/\/myanimelist\.net)?\/?anime(\/|\.php\?id=)(\d+)\/?.*$/;
const IDURL = 'https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/data/dubInfo.json';

let dubInfo = JSON.parse(localStorage.getItem('dubInfo'));

GM_addStyle(GM_getResourceText('CSS'));

function cacheDubs() {
  const lastCached = localStorage.getItem('dubCacheDate');
  if (
    lastCached === null
    || dubInfo === null
    || (lastCached !== undefined && parseInt(lastCached, 10) + 600000 < Date.now())
  ) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: IDURL,
      nocache: true,
      revalidate: true,
      onload(response) {
        dubInfo = JSON.parse(response.responseText);
        localStorage.setItem('dubInfo', JSON.stringify(dubInfo));
        localStorage.setItem('dubCacheDate', Date.now());
      },
    });
  }
}

function hasBodyClass(selector) {
  return document.body.classList.contains(selector);
}

function labelDub(linkNode, image = false, labelNode = false, linkURL = linkNode.href) {
  if (animeURLregex.test(linkURL)) {
    const linkID = parseInt(animeURLregex.exec(linkURL)[3], 10);
    let animeElement = linkNode;
    let dubData = 'no';

    if (labelNode) {
      animeElement = linkNode.querySelector(labelNode) || linkNode.closest(labelNode);
    }

    Object.keys(dubInfo).every((key) => {
      if (dubInfo[key].includes(linkID)) {
        dubData = key;
        if (image) { animeElement.classList.add('imagelink'); }
        return false;
      }
      return true;
    });
    animeElement.dataset.dub = dubData;
  }
}

function labelThumbnails(container = document.body) {
  const dubbedThumbs = 'div.auto-recommendations>div.items>a.item,div.recommendations div.items>a.item,div#widget-seasonal-video li.btn-anime>a.link,div#anime_recommendation li.btn-anime.auto>a.link,.js-seasonal-anime>.image>a:nth-child(1),#anime_favorites>.fav-slide-outer>ul>li>a';
  container.querySelectorAll(dubbedThumbs).forEach((e) => labelDub(e, true));
}

function watchForDubs(resultSelector, pageType, containerID = 'content') {
  const container = document.getElementById(containerID);
  const options = { childList: true, subtree: true };
  let args = [];
  if (pageType === 'search') {
    options.attributes = true;
    options.attributeFilter = ['href'];
    args = [undefined, 'div.info.anime>div.name'];
  } else if (pageType === 'statistics') { args = [true]; }

  new MutationObserver(() => {
    container.querySelectorAll(resultSelector).forEach((e) => labelDub(e, ...args));
  }).observe(container, options);
}

function filterContainers() {
  const dubDataLinks = document.body.querySelectorAll(':not([data-dub-container]) [data-dub]');
  const selectors = '.seasonal-anime.js-seasonal-anime.js-anime-type-all,.js-block-list.list>table>tbody>tr,tr.ranking-list';
  dubDataLinks.forEach((e) => {
    const container = e.closest(selectors);
    if (container !== undefined && container !== null) {
      container.dataset.dubContainer = e.dataset.dub;
    }
  });
}

function addDubFilter(targetNode, position = 'afterend') {
  filterContainers();
  const labelClass = 'fs11 fl-r fw-n fn-grey2 mr12';
  // if (mobile === true) {
  //   labelClass = 'btn-filter fa-stack fs14 mr12';
  // }
  if (targetNode !== null) {
    const filterButton = document.createElement('input');
    filterButton.type = 'button';
    filterButton.id = 'dub-filter';
    targetNode.insertAdjacentElement(position, filterButton);
    filterButton.insertAdjacentHTML('afterend', `
      <label for="dub-filter" class="btn-show-dubs ${labelClass}">
        <i class="fa-regular fa-square fa-stack-2x"></i>
        <i class="fa-solid fa-xmark fa-stack-1x"></i>
        <i class="fa-solid fa-check fa-stack-1x"></i>
        Dubbed
      </label>`.trim());

    const filterOptions = ['filter-off', 'only-dubs', 'no-dubs'];
    let filter = localStorage.getItem('dubFilter') || 'filter-off';
    currentBodyClassList.add(filter);
    let filterIndex = filterOptions.indexOf(filter);

    filterButton.addEventListener('click', () => {
      currentBodyClassList.replace(
        filter,
        (filter = filterOptions[(filterIndex += 1) % filterOptions.length]),
      );
      localStorage.setItem('dubFilter', filter);

      if (hasBodyClass('season')) {
        const titlesArray = [].slice.call(document.querySelectorAll('.seasonal-anime'));
        const showingArray = titlesArray.filter((el) => getComputedStyle(el).display !== 'none');
        const countDisplay = document.querySelector('.js-visible-anime-count');
        countDisplay.textContent = `${showingArray.length}/${titlesArray.length}`;
      }
    }, false);
  }
}

function hideOnClickOutside(element) {
  const outsideClickListener = (event) => {
    const isVisible = !!(element && element.offsetWidth && element.offsetHeight);
    if (!element.contains(event.target) && isVisible) {
      element.classList.remove('on');
      document.removeEventListener('click', outsideClickListener);
    }
  };
  document.addEventListener('click', outsideClickListener);
}

function placeHeaderMenu() {
  const menuContainer = document.createElement('div');
  const borderDiv = document.createElement('div');
  menuContainer.id = 'dubmenu';
  menuContainer.classList.add('header-menu-unit', 'header-dub');
  menuContainer.insertAdjacentHTML('afterbegin', '<a id="menu-toggle" title="MAL-Dubs" tabindex="0" class="header-dub-button text1"><span id="menu-toggle" class="dub-icon icon"></span></a><div id="dub-dropdown"><ul><li><a id="theme-toggle" href="#"><i class="dub-icon mr6"></i>Switch Style</a></li><li><a href="https://myanimelist.net/forum/?topicid=1692966"><i class="fa-solid fa-calendar-clock mr6"></i>Upcoming Dubs</a></li><li><a href="https://myanimelist.net/forum/?action=message&amp;topic_id=1952777&amp;action=message"><i class="fa-solid fa-comment-dots mr6"></i>Send Feedback</a></li><li><a href="https://github.com/MAL-Dubs/MAL-Dubs/issues/new/choose" target="_blank" rel="noreferrer"><i class="fa-brands fa-github mr6"></i>Report an Issue</a></li><li><a href="https://discord.gg/wMfD2RM7Vt" target="_blank" rel="noreferrer"><i class="fa-brands fa-discord mr6"></i>Discord</a></li><li><a href="https://ko-fi.com/maldubs" target="_blank" rel="noreferrer"><i class="fa-solid fa-circle-dollar-to-slot mr6"></i>Donate</a></li></ul></div>');
  borderDiv.classList.add('border');

  function toggleMenu() {
    const dropdown = document.getElementById('dubmenu');
    dropdown.classList.toggle('on');
    if (dropdown.classList.contains('on')) { hideOnClickOutside(dropdown); }
  }

  function switchStyle() {
    const isClassic = localStorage.getItem('classicTheme') === 'true';
    currentBodyClassList.toggle('classic', !isClassic);
    localStorage.setItem('classicTheme', !isClassic);
  }

  const headerMenu = document.querySelector('#header-menu');

  if (headerMenu) {
    const targetElement = headerMenu.querySelector('.header-profile')
      || headerMenu.querySelector('.header-menu-login');
    if (targetElement) { targetElement.before(menuContainer, borderDiv); }
  }
  document.getElementById('theme-toggle').addEventListener('click', switchStyle, false);
  document.getElementById('menu-toggle').addEventListener('click', toggleMenu, false);
}

cacheDubs();

if (currentBodyClassList.contains('page-common')) {
  const dubbedLinks = document.querySelectorAll("p.title-text>a,p.data a.title,.content-result .information>a:first-child,.list>.information>a:first-child,table.anime_detail_related_anime a[href^='/anime'],.content-result .title>a:first-child,td.data.title>a:first-child,.list td:nth-child(2)>a.hoverinfo_trigger,#content>table>tbody>tr>td>table>tbody>tr>td.borderClass>a[href*='myanimelist.net/anime/'],#content>div>div>table>tbody>tr>td>a[href*='/anime'],div[id^=raArea]+div>a:first-child,.news-container h2 a[href*='/anime/'],li.ranking-unit>div>h3>a,tr.ranking-list>td:nth-child(2)>div>div>h3>a,div.borderClass>a[href^='anime/'],#content>table>tbody>tr>td:nth-child(1)>a:nth-child(1),[id^='#revAreaItemTrigger'],.news-container a[href^='https://myanimelist.net/anime/'],.animeography>.title>a,.profile div.updates.anime>div.statistics-updates>div.data>a,.history_content_wrapper td:first-child>a,.forum-topic-message a[href^='https://myanimelist.net/anime/'],.forum-topic-message a[href^='/anime/'],.page-blog-detail a[href^='https://myanimelist.net/anime/'],.page-blog-detail a[href^='/anime/'],.pmessage-message-history a[href^='https://myanimelist.net/anime/'],.pmessage-message-history a[href^='/anime/'],a.js-people-title,.profile .anime>div>div.data>div.title>a,a[id^='sinfo'],[id^='#revAreaAnimeHover'],#dialog>tbody>tr>td>a,.company-favorites-ranking-table>tbody>tr>td.popularity>p>a,.company-favorites-ranking-table>tbody>tr>td.score>p>a,div.list.js-categories-seasonal>table>tbody>tr>td:nth-child(2)>div:nth-child(1)>a,.stacks #content>div.content-left>div.list-anime-list>div>div.head>div.title-text>h2>a,.footer-ranking li>a,#content > div:nth-child(3) > a[href^='/anime'],.blog_detail_content_wrapper a,div[id^=comment]>table>tbody>tr>td:nth-child(2)>a,.recommendations_h3>a,.reviews_h3>a,.friend_list_updates a.fw-b,.info>p>a.fw-b,#content>div.borderDark>table>tbody>tr>td>a,.js-history-updates-item .work-title>a:first-of-type,.review-element .titleblock .title,.video-info-title>a:nth-child(2),div.related-entries");
  const searchURLregex = /.*\/((anime\.php\??(?!id).*)|anime\/genre\/?.*)/;
  const filterableURLregex = /.*\/(((anime\.php\?(?!id).+|topanime\.php.*))|anime\/(genre|producer|season)\/?.*)/;

  dubbedLinks.forEach((e) => { labelDub(e); });
  watchForDubs('#top-search-bar>#topSearchResultList>div>div>a', 'search', 'menu_right');
  placeHeaderMenu();
  labelThumbnails();
  setTimeout(() => labelThumbnails(), 400);

  if (filterableURLregex.test(currentURL)) {
    const filterTarget = `.js-search-filter-block>div:last-of-type,
    div.horiznav-nav-seasonal>span.js-btn-show-sort:last-of-type,
    h2.top-rank-header2>span:last-of-type,
    .normal_header>div.view-style2:last-of-type,
    .normal_header>div.fl-r.di-ib.fs11.fw-n`;
    addDubFilter(document.querySelector(filterTarget));
  }

  if (searchURLregex.test(currentURL)) {
    watchForDubs('#advancedSearchResultList>div>div>a', 'search');
  }

  if (animeURLregex.test(currentURL)) {
    const animePageID = animeURLregex.exec(currentURL)[3];
    const recommendations = document.querySelectorAll('#anime_recommendation>div.anime-slide-outer>.anime-slide>li.btn-anime>a.link:not([href*="suggestion"])');
    labelDub(document.querySelector('h1.title-name'), false, currentURL);
    recommendations.forEach((e) => labelDub(e, true, e.href.replace(`-*${animePageID}-*`, '')));
  } else if (currentBodyClassList.contains('page-forum')) {
    watchForDubs('div.message-container>div.content>table.body a[href^="https://myanimelist.net/anime/"]:not([data-dub])');
  } else if (currentURL === 'https://myanimelist.net/addtolist.php') {
  } else if (currentBodyClassList.contains('statistics')) {
    watchForDubs('.quickAdd-anime-result-unit>table>tbody>tr>td:nth-child(1)>a');
    watchForDubs('#statistics-anime-score-diff-desc .container .item>a, #statistics-anime-score-diff-asc .container .item>a', 'statistics');
  }
} else if (currentBodyClassList.contains('ownlist')) {
  if (currentBodyClassList.contains('anime')) {
    watchForDubs('#list-container>div.list-block>div>table>tbody.list-item>tr.list-table-data>td.data.title>a.link:not([data-dub])', undefined, 'list-container');
  } else {
    const listDubs = document.body.querySelectorAll('div#list_surround>table>tbody>tr>td>a.animetitle');
    listDubs.forEach((e) => labelDub(e));
  }
}

if (localStorage.getItem('classicTheme') === 'true') { currentBodyClassList.add('classic'); }
