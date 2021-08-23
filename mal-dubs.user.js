// ==UserScript==
// @name         MAL (MyAnimeList) Dubs
// @namespace    https://github.com/MAL-Dubs
// @version      0.9.02
// @description  Labels English dubbed titles on MyAnimeList.net and adds dub only filtering to search, seasonal and top anime pages.
// @author       MAL Dubs
// @downloadURL  https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/master/mal-dubs.user.js
// @updateURL    https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/master/mal-dubs.user.js
// @supportURL   https://github.com/MAL-Dubs/MAL-Dubs/issues
// @match        http://myanimelist.net/*
// @match        https://myanimelist.net/*
// @match        http://*.myanimelist.net/*
// @match        https://*.myanimelist.net/*
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
		dubbedRecs = document.querySelectorAll("div#anime_recommendation>div.anime-slide-outer>.anime-slide>li.btn-anime>a.link:not([href*='suggestion'])"),
		dubbedThumbs = "div.auto-recommendations>div.items>a.item,div.recommendations div.items>a.item,div#widget-seasonal-video li.btn-anime>a.link,div#anime_recommendation li.btn-anime.auto>a.link,.js-seasonal-anime>.image>a:nth-child(1)",
		rgx = /^(https?:\/\/myanimelist\.net)?\/?anime\/(\d+)\/?.*/,
		recrgx = /^(https?:\/\/myanimelist\.net)?\/recommendations\/anime\/(\d+\-\d+)\/?.*/,
		filteruri = /.*\/(((anime\.php\?(?!id).+|topanime\.php.*))|anime\/(genre|producer|season)\/?.*)/;
		const IDURL = `https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/data/dubIDs.json`,
			incompleteDubs = [122,170,235,250,516,687,738,918,966,967,1486,2280,7674,8687,10033,40010];

	GM_addStyle(GM_getResourceText('CSS'));

	var dubbedIDs = JSON.parse(localStorage.getItem('dubIDs'));
	if(dubbedIDs === null){
		GM_xmlhttpRequest({
			method: "GET",
			nocache: true,
			url: IDURL,
			onload: function(response) {
				dubbedIDs = JSON.parse(response.responseText);
				localStorage.setItem('dubIDs',response.responseText);
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
			setTimeout(()=>labelThumbnails(),400);
		}
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
					localStorage.setItem('dubIDs',response.responseText);
					localStorage.setItem('dubCacheDate',Date.now());
				}
			});
		}
	}

	function scanList() {
		let listEntries = document.querySelectorAll('#list-container>div.list-block>div>table>tbody[class=list-item]>tr.list-table-data>td.data.title>a.link,div#list_surround>table>tbody>tr>td>a.animetitle');
		listEntries.forEach( e => {
			var id = parseInt(e.href.match(/\/(\d+)\//)[1]);
			if (e.id === 'checked') {
				return true;
			} else {
				e.id = 'checked';
				if (dubbedIDs.includes(id)){
					e.title = "Dubbed";
					if (incompleteDubs.includes(id)) {e.title = "Incomplete Dub";}
				}
			}
		});
	}

	function parseSite() {
		labelThumbnails();
		for (var entry of dubbedLinks.entries()) {
			if (rgx.test(dubbedLinks.item(entry[0]).getAttribute('href'))) {
				var linkid = parseInt(rgx.exec(dubbedLinks.item(entry[0]).getAttribute('href'))[2]);
				if (dubbedIDs.includes(linkid)) {
					dubbedLinks.item(entry[0]).title = "Dubbed";
					if (incompleteDubs.includes(linkid)) {dubbedLinks.item(entry[0]).title = "Incomplete Dub";}
				} else {dubbedLinks.item(entry[0]).title = "Undubbed";}
			}
		}
	}

	function animePages() {
		var thispage = rgx.exec(document.location.href)[2];
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
				if (incompleteDubs.includes(recID)) {dubbedRecs.item(rec[0]).title = "Incomplete Dub"}
			}
		}
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
			var thumbID = parseInt(e.href.match(/\/(\d+)\//)[1]);
			if (dubbedIDs.includes(thumbID)) {
				e.title = "Dubbed";
				e.classList.add("imagelink");
				if (incompleteDubs.includes(thumbID)) {e.title = "Incomplete Dub"}
			} else {e.title = "Undubbed";}
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
})();
