// ==UserScript==
// @name         MAL (MyAnimeList) Dubs
// @namespace    https://github.com/MAL-Dubs
// @version      0.9.05
// @description  Labels English dubbed titles on MyAnimeList.net and adds dub only filtering to search, seasonal and top anime pages.
// @author       MAL Dubs
// @downloadURL  https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/mal-dubs.user.js
// @updateURL    https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/mal-dubs.user.js
// @supportURL   https://github.com/MAL-Dubs/MAL-Dubs/issues
// @match        http://myanimelist.net/*
// @match        https://myanimelist.net/*
// @match        http://*.myanimelist.net/*
// @match        https://*.myanimelist.net/*
// @exclude      /^https?:\/\/myanimelist.net\/(editprofile\.php.*|notification\/setting|ownlist\/style|account\/?.*|apiconfig|forum\/?.*|watch\/.*|store\/?.*|about\/?.*|advertising\/?.*|membership\/?.*|modules\/?.*)$/
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
	const dubbedLinks = document.querySelectorAll("p.title-text>a,content-result .information>a:first-child,.list>.information>a:first-child,table.anime_detail_related_anime a[href^='/anime'],p.data a.title,td.data.title a:first-child,.list td:nth-child(2)>a.hoverinfo_trigger,#content>table>tbody>tr>td>table>tbody>tr>td.borderClass>a[href*='myanimelist.net/anime/'],#content>div>div>table>tbody>tr>td>a[href*='/anime'],#content>table>tbody>tr>td:nth-child(2)>div.js-scrollfix-bottom-rel>div>table>tbody>tr>td:nth-child(2)>div:nth-child(2)>a:nth-child(1),.news-container h2 a[href*='/anime/'],li.ranking-unit>div>h3>a,tr.ranking-list>td:nth-child(2)>div>div>h3>a,div.borderClass>a,#content>table>tbody>tr>td:nth-child(1)>a:nth-child(1),[id^='#revAreaItemTrigger'],.news-container a[href^='https://myanimelist.net/anime/'],.animeography>.title>a,#content>div:nth-child(3)>a"),
		dubbedThumbs = "div.auto-recommendations>div.items>a.item,div.recommendations div.items>a.item,div#widget-seasonal-video li.btn-anime>a.link,div#anime_recommendation li.btn-anime.auto>a.link,.js-seasonal-anime>.image>a:nth-child(1)",
		rgx = /^(https?:\/\/myanimelist\.net)?\/?anime\/(\d+)\/?.*/,
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
			var linkID = parseInt(anime.href.match(/\/(\d+)\//)[1]);
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

	function animePages() {
		var thispage = rgx.exec(document.location.href)[2],
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
		setTimeout(function() {
			scanList();
			addScrollListener();
		}, 50);
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
			} else {e.parentNode.parentNode.classList.add("hidden");}
		});
	}

	function showUndubbed(links) {
		links.forEach(e => {
			if(document.location.href.match(/.*\/topanime\.php.*/)){
				e.parentNode.parentNode.parentNode.parentNode.parentNode.classList.remove("hidden");
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
			label.appendChild(document.createTextNode('Dub Only'));
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
		if (localStorage.getItem('classicTheme')) {
		  var classicSetting = localStorage.getItem('classicTheme');
		} else {
		  classicSetting = 'false';
		}

		if (localStorage.getItem('classicTheme') == 'true') {
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
		let menuContainer = document.createElement("div");
		menuContainer.id = "dubmenu";
		menuContainer.classList.add('header-right');
		menuContainer.innerHTML += `<a id="menu-toggle"><i class="fa fa-volume-up mr4"></i>Dubs</a>
		<div id="dub-dropdown"><ul>
		<li><a id="theme-toggle" href="#">Switch Style</a></li>
		<li><a href="https://github.com/MAL-Dubs/MAL-Dubs/issues/new/choose" target="blank">Report Issues</a></li>
		<li><a href="https://discord.gg/wMfD2RM7Vt" target="blank">Join Discord</a></li>
		<li><a href="https://ko-fi.com/maldubs" target="blank">Donate<i class="fa fa-heart-o ml4" style="color: #ff5f5f;"></i></a></li>
		</ul></div>`;
		if (document.body.contains(document.querySelector('#contentWrapper>div:nth-child(1)>a.header-right'))) {
			menuContainer.classList.add("header-right");
			document.querySelector('#contentWrapper > div:nth-child(1)>a.header-right').after(menuContainer);
		} else if (document.body.contains(document.querySelector('#contentWrapper>div:nth-child(1)>.h1.edit-info>div.header-right'))) {
			menuContainer.classList.remove("header-right");
			menuContainer.classList.add("mr16");
			document.querySelector("div.header-right").prepend(menuContainer);
		} else {
			document.querySelector('#contentWrapper > div:nth-child(1)').prepend(menuContainer);
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
