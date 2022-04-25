// ==UserScript==
// @name         MAL (MyAnimeList) Dubs
// @namespace    https://github.com/MAL-Dubs
// @version      0.9.32
// @description  Labels English dubbed titles on MyAnimeList.net and adds dub only filtering to search, seasonal and top anime pages.
// @author       MAL Dubs
// @supportURL   https://github.com/MAL-Dubs/MAL-Dubs/issues
// @updateURL    https://github.com/MAL-Dubs/MAL-Dubs/raw/main/mal-dubs.user.js
// @include      /^https?:\/\/myanimelist\.net(\/.*)?$/
// @exclude      /^https?:\/\/myanimelist\.net\/(editprofile\.php.*|notification\/setting|ownlist\/style|account\/?.*|apiconfig|watch\/.*|store\/?.*|about\/?.*|advertising\/?.*|membership\/?.*|modules\/?.*)$/
// @iconURL      https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/images/icon.png
// @license      GPL version 3.0; http://www.gnu.org/licenses/gpl-3.0.txt
// @resource     CSS https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/css/style.css
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @connect      githubusercontent.com
// @connect      github.com
// @run-at       document-end
// @noframes
// ==/UserScript==

(function() {
	const dubbedLinks = document.querySelectorAll("p.title-text>a, content-result .information>a:first-child, .list>.information>a:first-child, table.anime_detail_related_anime a[href^='/anime'], p.data a.title, td.data.title a:first-child, .list td:nth-child(2)>a.hoverinfo_trigger, #content>table>tbody>tr>td>table>tbody>tr>td.borderClass>a[href*='myanimelist.net/anime/'], #content>div>div>table>tbody>tr>td>a[href*='/anime'], #content>table>tbody>tr>td:nth-child(2)>div.js-scrollfix-bottom-rel>div>table>tbody>tr>td:nth-child(2)>div:nth-child(2)>a:nth-child(1), .news-container h2 a[href*='/anime/'], li.ranking-unit>div>h3>a, tr.ranking-list>td:nth-child(2)>div>div>h3>a, div.borderClass>a[href^='anime/'], #content>table>tbody>tr>td:nth-child(1)>a:nth-child(1), [id^='#revAreaItemTrigger'], .news-container a[href^='https://myanimelist.net/anime/'],.animeography>.title>a,body.profile div.updates.anime>div.statistics-updates>div.data>a,body.page-history #content>div.history_content_wrapper>table>tbody>tr>td:nth-child(1)>a,.forum_topic_message a[href^='https://myanimelist.net/anime/'],.forum_topic_message a[href^='/anime/'],.page-blog-detail a[href^='https://myanimelist.net/anime/'],.page-blog-detail a[href^='/anime/'],a.js-people-title,div.boxlist-container.anime>div>div.data>div.title>a,[id^='sinfo'],[id^='#revAreaAnimeHover'],#dialog>tbody>tr>td>a,div.history_content_wrapper>table>tbody>tr>td:nth-child(1)>a,table.company-favorites-ranking-table>tbody>tr>td.popularity>p>a,table.company-favorites-ranking-table>tbody>tr>td.score>p>a,div.list.js-categories-seasonal>table>tbody>tr>td:nth-child(2)>div:nth-child(1)>a,.stacks #content>div.content-left>div.list-anime-list>div>div.head>div.title-text>h2>a,table.pmessage-message-history>tbody>tr>td.subject.word-break>a"),
		dubbedThumbs = "div.auto-recommendations>div.items>a.item,div.recommendations div.items>a.item,div#widget-seasonal-video li.btn-anime>a.link,div#anime_recommendation li.btn-anime.auto>a.link,.js-seasonal-anime>.image>a:nth-child(1),#anime_favorites>.fav-slide-outer>ul>li>a",
		rgx = /^(https?:\/\/myanimelist\.net)?\/?anime(\/|\.php\?id=)(\d+)\/?.*$/,
		filteruri = /.*\/(((anime\.php\?(?!id).+|topanime\.php.*))|anime\/(genre|producer|season)\/?.*)/;
		const IDURL = `https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/data/dubInfo.json`;

	GM_addStyle(GM_getResourceText('CSS'));

	var dubbedIDs = JSON.parse(localStorage.getItem('dubIDs')),
		incompleteDubs = JSON.parse(localStorage.getItem('incompleteIDs'));
	if(dubbedIDs === null || incompleteDubs === null) {
		GM_xmlhttpRequest({
			method: "GET",
			nocache: true,
			url: IDURL,
			onload: function(response) {
				var data = JSON.parse(response.responseText);
				dubbedIDs = data.dubbed;
				incompleteDubs = data.incomplete;
				localStorage.setItem('dubIDs', JSON.stringify(dubbedIDs));
				localStorage.setItem('incompleteIDs', JSON.stringify(incompleteDubs));
				onComplete();
				localStorage.setItem('dubCacheDate',Date.now());
			}
		});
	} else {
		onComplete();
		dubCache();
	}

	function onComplete() {
		if (document.location.href.match(/.*\/animelist\/.*/)) {
			setTimeout(()=>parseList(),0);
		} else {
			parseSite();
			if (document.location.href.match(filteruri)) {searchFilter();}
			if (document.location.href.match(rgx)) {animePages();}
			if (document.location.href.match(/https:\/\/myanimelist\.net\/addtolist\.php/)) {quickAdd();}
			placeHeaderMenu();
			setTimeout(()=>labelThumbnails(),400);
		}
		setTheme();
	}

	function dubCache() {
		if (localStorage.getItem('dubCacheDate') === null){localStorage.setItem('dubCacheDate',Date.now());}
		if(parseInt(localStorage.getItem('dubCacheDate'))+600000<Date.now()){
			GM_xmlhttpRequest({
				method: "GET",
				url: IDURL,
				nocache: true,
				revalidate: true,
				onload: function(response) {
					var data = JSON.parse(response.responseText);
					localStorage.setItem('dubIDs', JSON.stringify(data.dubbed));
					localStorage.setItem('incompleteIDs', JSON.stringify(data.incomplete));
					localStorage.setItem('dubCacheDate',Date.now());
				}
			});
		}
	}

	function labelDub(anime) {
		if (rgx.test(anime.href)) {
			var linkID = parseInt(anime.href.match(/(\/|\.php\?id=)(\d+)\/?/)[2]);
			if (dubbedIDs.includes(linkID)) {
				anime.title = "Dubbed";
				if (incompleteDubs.includes(linkID)) {anime.title = "Incomplete Dub";}
			} else {anime.title = "Undubbed";}
		}
	}

	function parseSite() {
		labelThumbnails();
		dubbedLinks.forEach (e => {labelDub(e);});
	}

	function quickAdd() {
		let searchResults = document.getElementById("content");
		new MutationObserver(function() {quickAddSearch();}).observe(searchResults, { childList: true, subtree: true } );
	}

	function quickAddSearch() {
		let recEntries = document.querySelectorAll('.quickAdd-anime-result-unit>table>tbody>tr>td:nth-child(1)>a');
		recEntries.forEach (e => {labelDub(e);});
	}

	function animePages() {
		var thispage = rgx.exec(document.location.href)[3],
			dubbedRecs = document.querySelectorAll("div#anime_recommendation>div.anime-slide-outer>.anime-slide>li.btn-anime>a.link:not([href*='suggestion'])"),
			recrgx = /^(https?:\/\/myanimelist\.net)?\/recommendations\/anime\/(\d+\-\d+)\/?.*/;
		if (dubbedIDs.includes(parseInt(thispage))) {
			var pagetitle = document.querySelectorAll("h1.title-name")[0];
			pagetitle.title = "Dubbed";
			if (incompleteDubs.includes(parseInt(thispage))) {pagetitle.title = "Incomplete Dub";}
		}
		for (var rec of dubbedRecs.entries()) {
			var recID = parseInt(recrgx.exec(dubbedRecs.item(rec[0]))[2].replace(thispage+"-", "").replace("-"+thispage,""));
			if (dubbedIDs.includes(recID)) {
				dubbedRecs.item(rec[0]).title = "Dubbed";
				dubbedRecs.item(rec[0]).classList.add("imagelink");
				if (incompleteDubs.includes(recID)) {dubbedRecs.item(rec[0]).title = "Incomplete Dub";}
			}
		}
	}

	function scanList() {
		let listEntries = document.querySelectorAll('#list-container>div.list-block>div>table>tbody[class=list-item]>tr.list-table-data>td.data.title>a.link,div#list_surround>table>tbody>tr>td>a.animetitle');
		listEntries.forEach( e => {
			if (e.classList.contains('checked')) {
				return true;
			} else {
				labelDub(e);
				e.classList.add('checked');
			}
		});
	}

	function addScrollListener() {
		document.addEventListener("scroll", function scroll(event) {
			event.currentTarget.removeEventListener(event.type, scroll);
			scanList();
			setTimeout(() => addScrollListener(), 1000);
		});
	}

	function parseList() {
		window.addEventListener('load', function() {
			scanList();
			addScrollListener();
		});
	}

	function labelThumbnails() {
		document.querySelectorAll(dubbedThumbs).forEach(e => {
			labelDub(e);
			e.classList.add("imagelink");
		});
	}

	function hideUndubbed(links) {
		links.forEach(e => {
			if(document.location.href.match(/.*\/topanime\.php.*/)){
				e.parentNode.parentNode.parentNode.parentNode.parentNode.classList.add("hidden");
			} else if(document.location.href.match(/.*anime\.php\?.*q=.*/)) {
				e.parentNode.parentNode.parentNode.classList.add("hidden");
			} else if(document.querySelector("div.list.js-categories-seasonal")) {
				e.parentNode.parentNode.parentNode.classList.add("hidden");
			} else {e.parentNode.parentNode.classList.add("hidden");}
		});
	}

	function showUndubbed(links) {
		links.forEach(e => {
			if(document.location.href.match(/.*\/topanime\.php.*/)){
				e.parentNode.parentNode.parentNode.parentNode.parentNode.classList.remove("hidden");
			} else if(document.location.href.match(/.*anime\.php\?.*q=.*/)) {
				e.parentNode.parentNode.parentNode.classList.remove("hidden");
			} else if(document.querySelector("div.list.js-categories-seasonal")) {
				e.parentNode.parentNode.parentNode.classList.remove("hidden");
			} else {e.parentNode.parentNode.classList.remove("hidden");}
		});
	}

	function searchFilter() {
		let undubbed = document.querySelectorAll('[title="Undubbed"]'),
			filterTarget = document.querySelector('.js-search-filter-block>div.fl-r.di-ib.mt4.mr12,div.horiznav-nav-seasonal>span[data-id="sort"],h2.top-rank-header2>span.fs10.fw-n.ff-Verdana.di-ib.ml16,.normal_header.js-search-filter-block>.di-ib,.normal_header>div.fl-r.di-ib.fs11.fw-n'),
			filterCheckbox = document.createElement('input'),
			label = document.createElement('label');
		if(filterTarget !== null){
			filterCheckbox.type = 'checkbox';
			filterCheckbox.id = 'undubbed-filter';
			label.setAttribute('for','undubbed-filter');
			label.className = 'fs11 fl-r btn-show-undubbed mr12 fw-n';
			label.appendChild(document.createTextNode('Dubs Only'));
			filterTarget.after(filterCheckbox);
			filterCheckbox.after(label);
		}

		let filter = true;
		let filterUndubbed = (localStorage.getItem('dubOnlySearch') === "true");
		if(filterUndubbed === null){
			filterUndubbed = false;
			localStorage.setItem('dubOnlySearch', filterUndubbed);
			filterCheckbox.checked = filterUndubbed;
			filter = false;
		}

		if (filter) {
			filterCheckbox.checked = filterUndubbed;
			if(filterCheckbox.checked === true) {hideUndubbed(undubbed);}
		}

		filterCheckbox.addEventListener('change',function () {
			if(filterCheckbox.checked === true){hideUndubbed(undubbed);}
			if(filterCheckbox.checked === false){showUndubbed(undubbed);}
			localStorage.setItem('dubOnlySearch', filterCheckbox.checked);
		},false);
	}

	function setTheme() {
		if (localStorage.getItem('classicTheme') === 'true') {
			document.body.classList.add('classic');
		}
	}

	function toggleClassic() {
		if (localStorage.getItem('classicTheme') === 'true' ) {
			document.body.classList.remove('classic');
			localStorage.setItem('classicTheme', false);
		} else {
			document.body.classList.add('classic');
			localStorage.setItem('classicTheme', true);
		}
	}

	function placeHeaderMenu(){
		var menuContainer = document.createElement('div', {class : 'header-menu-unit header-dub'}),
		borderDiv = document.createElement('div');
		menuContainer.id = "dubmenu";
		menuContainer.classList.add('header-menu-unit','header-dub');
		menuContainer.innerHTML += `<a id="menu-toggle" title="MAL-Dubs" tabindex="0" class="header-dub-button text1"><span id="menu-toggle" class="dub-icon icon"></span></a><div id="dub-dropdown"><ul><li><a id="theme-toggle" href="#">Switch Style</a></li><li><a href="https://myanimelist.net/forum/?topicid=1692966">Upcoming Dubs</a></li><li><a href="https://discord.gg/wMfD2RM7Vt" target="_blank" rel="noreferrer">Dub Club Discord</a></li><li><a href="https://myanimelist.net/forum/?action=message&amp;topic_id=1952777&amp;action=message">Send Feedback</a></li><li><a href="https://github.com/MAL-Dubs/MAL-Dubs/issues/new/choose" target="_blank" rel="noreferrer">Report Issues</a></li><li><a href="https://ko-fi.com/maldubs" target="_blank" rel="noreferrer">Please Donate<i class="fa-regular fa-heart ml4" style="color: #ff5f5f;"></i></a></li></ul></div>`;
		borderDiv.classList.add('border');
		if (document.body.contains (document.querySelector('.header-profile'))) {
			document.querySelector('#header-menu>div.header-profile').before(menuContainer,borderDiv);
		} else if (document.body.contains (document.querySelector('.header-menu-login'))) {
			document.querySelector('#header-menu>div.header-menu-login').after(menuContainer);
		}

		document.getElementById('theme-toggle').addEventListener('click', toggleClassic, false);
		document.getElementById('menu-toggle').addEventListener('click', toggleMenu, false);
	}

	function toggleMenu() {
		var dropdown = document.getElementById('dubmenu');
		if(dropdown.classList.contains("on")) {
			dropdown.classList.remove("on");
		} else {
			dropdown.classList.add("on");
			hideOnClickOutside(dropdown);
		}
	}

	// hide function from jquery
	function hideOnClickOutside(element) {
		const outsideClickListener = event => {
			if (!element.contains(event.target) && isVisible(element)) {
				element.classList.remove("on");
				removeClickListener();
			}
		};
		const removeClickListener = () => document.removeEventListener('click', outsideClickListener);
		document.addEventListener('click', outsideClickListener);
	}

	const isVisible = elem => !!elem && !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
	// source (2018-03-11): https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js
})();
