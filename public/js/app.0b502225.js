(function(t){function e(e){for(var n,s,c=e[0],u=e[1],o=e[2],l=0,p=[];l<c.length;l++)s=c[l],Object.prototype.hasOwnProperty.call(r,s)&&r[s]&&p.push(r[s][0]),r[s]=0;for(n in u)Object.prototype.hasOwnProperty.call(u,n)&&(t[n]=u[n]);m&&m(e);while(p.length)p.shift()();return i.push.apply(i,o||[]),a()}function a(){for(var t,e=0;e<i.length;e++){for(var a=i[e],n=!0,s=1;s<a.length;s++){var c=a[s];0!==r[c]&&(n=!1)}n&&(i.splice(e--,1),t=u(u.s=a[0]))}return t}var n={},s={app:0},r={app:0},i=[];function c(t){return u.p+"js/"+({matchup:"matchup",matchups:"matchups",standings:"standings"}[t]||t)+"."+{matchup:"403afe26",matchups:"167f4d54",standings:"38a1a131"}[t]+".js"}function u(e){if(n[e])return n[e].exports;var a=n[e]={i:e,l:!1,exports:{}};return t[e].call(a.exports,a,a.exports,u),a.l=!0,a.exports}u.e=function(t){var e=[],a={matchup:1,matchups:1,standings:1};s[t]?e.push(s[t]):0!==s[t]&&a[t]&&e.push(s[t]=new Promise((function(e,a){for(var n="css/"+({matchup:"matchup",matchups:"matchups",standings:"standings"}[t]||t)+"."+{matchup:"d9485dbe",matchups:"90b4646a",standings:"a380c58a"}[t]+".css",r=u.p+n,i=document.getElementsByTagName("link"),c=0;c<i.length;c++){var o=i[c],l=o.getAttribute("data-href")||o.getAttribute("href");if("stylesheet"===o.rel&&(l===n||l===r))return e()}var p=document.getElementsByTagName("style");for(c=0;c<p.length;c++){o=p[c],l=o.getAttribute("data-href");if(l===n||l===r)return e()}var m=document.createElement("link");m.rel="stylesheet",m.type="text/css",m.onload=e,m.onerror=function(e){var n=e&&e.target&&e.target.src||r,i=new Error("Loading CSS chunk "+t+" failed.\n("+n+")");i.code="CSS_CHUNK_LOAD_FAILED",i.request=n,delete s[t],m.parentNode.removeChild(m),a(i)},m.href=r;var d=document.getElementsByTagName("head")[0];d.appendChild(m)})).then((function(){s[t]=0})));var n=r[t];if(0!==n)if(n)e.push(n[2]);else{var i=new Promise((function(e,a){n=r[t]=[e,a]}));e.push(n[2]=i);var o,l=document.createElement("script");l.charset="utf-8",l.timeout=120,u.nc&&l.setAttribute("nonce",u.nc),l.src=c(t);var p=new Error;o=function(e){l.onerror=l.onload=null,clearTimeout(m);var a=r[t];if(0!==a){if(a){var n=e&&("load"===e.type?"missing":e.type),s=e&&e.target&&e.target.src;p.message="Loading chunk "+t+" failed.\n("+n+": "+s+")",p.name="ChunkLoadError",p.type=n,p.request=s,a[1](p)}r[t]=void 0}};var m=setTimeout((function(){o({type:"timeout",target:l})}),12e4);l.onerror=l.onload=o,document.head.appendChild(l)}return Promise.all(e)},u.m=t,u.c=n,u.d=function(t,e,a){u.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:a})},u.r=function(t){"undefined"!==typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},u.t=function(t,e){if(1&e&&(t=u(t)),8&e)return t;if(4&e&&"object"===typeof t&&t&&t.__esModule)return t;var a=Object.create(null);if(u.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var n in t)u.d(a,n,function(e){return t[e]}.bind(null,n));return a},u.n=function(t){var e=t&&t.__esModule?function(){return t["default"]}:function(){return t};return u.d(e,"a",e),e},u.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},u.p="/",u.oe=function(t){throw console.error(t),t};var o=window["webpackJsonp"]=window["webpackJsonp"]||[],l=o.push.bind(o);o.push=e,o=o.slice();for(var p=0;p<o.length;p++)e(o[p]);var m=l;i.push([0,"chunk-vendors"]),a()})({0:function(t,e,a){t.exports=a("56d7")},"0675":function(t,e,a){"use strict";var n=a("44c8"),s=a.n(n);s.a},"230c":function(t,e,a){"use strict";a.d(e,"a",(function(){return n}));a("6b54"),a("28a5");function n(t){var e=t.toString().split(".")[0],a=t.toString().split(".")[1];return a||(a="00"),1==a.length&&(a+="0"),"".concat(e,'<span class="score-num-fractional">.').concat(a,"</span>")}},"44c8":function(t,e,a){},"56d7":function(t,e,a){"use strict";a.r(e);a("cadf"),a("551c"),a("f751"),a("097d");var n=a("2b0e"),s=function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("div",{staticClass:"app",attrs:{id:"app"}},[a("div",{staticClass:"header"},[a("h1",[a("router-link",{attrs:{to:"/"}},[a("strong",[t._v("NCOL")]),t._v(" FFB 2019")])],1),a("div",{staticClass:"nav"},[a("router-link",{attrs:{to:"/"}},[t._v("League")]),a("router-link",{attrs:{to:"/standings"}},[t._v("Standings")]),a("router-link",{attrs:{to:"/matchups"}},[t._v("Matchups")])],1)]),a("main",{staticClass:"main"},[a("router-view")],1)])},r=[],i=(a("5c0b"),a("2877")),c={},u=Object(i["a"])(c,s,r,!1,null,null,null),o=u.exports,l=a("8c4f"),p=function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("div",{staticClass:"league"},[a("div",{staticClass:"league__inner"},[t._m(0),a("div",{staticClass:"league-page"},[t.week?a("div",{staticClass:"league-matchups"},[a("h3",{staticClass:"title"},[t._v("Week "+t._s(t.week)+" Matchups")]),a("matchup-previews",{attrs:{matchups:t.matchups}}),a("div",{staticClass:"league-matchups__more"},[a("router-link",{attrs:{to:"/matchups"}},[t._v("Previous Weeks")])],1)],1):t._e(),t.teams?a("div",{staticClass:"league-standings"},[a("h3",{staticClass:"title"},[t._v("Current Standings")]),a("standings-summary",{attrs:{teams:t.teams}}),a("div",{staticClass:"league-standings__more"},[a("router-link",{attrs:{to:"/standings"}},[t._v("Full Standings")])],1)],1):t._e()])])])},m=[function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("h2",{staticClass:"page-title"},[a("div",{staticClass:"page-title__sub"},[t._v("Home")]),a("div",{staticClass:"page-title__main"},[t._v("League")])])}],d=(a("96cf"),a("3b8d")),h=a("bc3a"),v=a.n(h),f=function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("ol",{staticClass:"standings-mini"},t._l(t.teams,(function(e){return a("li",{staticClass:"standings-mini__item"},[a("div",{staticClass:"standings-mini__photo",class:"owner-photo--"+e.ownerId}),a("div",{staticClass:"standings-mini__name"},[t._v(t._s(e.displayName))]),a("div",{staticClass:"standings-mini__record"},[t._v(t._s(e.wins)+"-"+t._s(e.losses))]),a("div",{staticClass:"standings-mini__streak"},[t._v(t._s(e.streak))])])})),0)},_=[],g={name:"StandingsSummary",props:{teams:Array}},w=g,y=(a("0675"),Object(i["a"])(w,f,_,!1,null,null,null)),C=y.exports,b=a("b802"),k={name:"League",components:{StandingsSummary:C,MatchupPreviews:b["a"]},data:function(){return{teams:[],matchups:[],week:void 0}},mounted:function(){var t=Object(d["a"])(regeneratorRuntime.mark((function t(){var e,a,n,s,r;return regeneratorRuntime.wrap((function(t){while(1)switch(t.prev=t.next){case 0:return t.next=2,v.a.get("/api/");case 2:e=t.sent,a=e.data,n=a.teams,s=a.week,r=a.matchups,this.teams=n,this.week=s,this.matchups=r;case 10:case"end":return t.stop()}}),t,this)})));function e(){return t.apply(this,arguments)}return e}()},O=k,S=(a("b9da"),Object(i["a"])(O,p,m,!1,null,null,null)),P=S.exports;n["a"].use(l["a"]);var j=new l["a"]({mode:"history",base:"/",routes:[{path:"/",name:"league",component:P},{path:"/standings/",name:"standings",component:function(){return a.e("standings").then(a.bind(null,"9d46"))}},{path:"/matchups/",name:"matchups",component:function(){return a.e("matchups").then(a.bind(null,"45df"))}},{path:"/matchup/:id",name:"matchup",component:function(){return a.e("matchup").then(a.bind(null,"3b3f"))}}]}),x=a("2f62");n["a"].use(x["a"]);var E=new x["a"].Store({state:{},mutations:{},actions:{}}),L=a("230c");n["a"].config.productionTip=!1,n["a"].filter("scoreFormatter",L["a"]),new n["a"]({router:j,store:E,render:function(t){return t(o)}}).$mount("#app")},"5c0b":function(t,e,a){"use strict";var n=a("e332"),s=a.n(n);s.a},"704d":function(t,e,a){},a12c:function(t,e,a){},b802:function(t,e,a){"use strict";var n=function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("ul",{staticClass:"matchup-previews"},t._l(t.matchups,(function(e){return a("li",{staticClass:"matchup-preview",class:{"matchup-preview--expanded":t.expanded}},[a("router-link",{staticClass:"matchup-preview__link",attrs:{to:"/matchup/"+e._id}},[a("div",{staticClass:"matchup-preview__player matchup-preview__player--first"},[a("div",{staticClass:"matchup-preview__photo",class:"owner-photo--"+e.home}),a("div",{staticClass:"matchup-preview__name"},[a("div",{staticClass:"matchup-preview__display-name"},[t._v(t._s(e.homeOwner.displayName))]),a("div",{staticClass:"matchup-preview__record"},[t._v(t._s(e.homeOwner.wins)+"-"+t._s(e.homeOwner.losses))]),a("div",{staticClass:"matchup-preview__points",domProps:{innerHTML:t._s(t.teamFantasyPoints(e.homeScore))}})])]),a("div",{staticClass:"matchup-preview__vs"},[t._v("vs")]),a("div",{staticClass:"matchup-preview__player matchup-preview__player--second"},[a("div",{staticClass:"matchup-preview__photo",class:"owner-photo--"+e.away}),a("div",{staticClass:"matchup-preview__name"},[a("div",{staticClass:"matchup-preview__display-name"},[t._v(t._s(e.awayOwner.displayName))]),a("div",{staticClass:"matchup-preview__record"},[t._v(t._s(e.awayOwner.wins)+"-"+t._s(e.awayOwner.losses))]),a("div",{staticClass:"matchup-preview__points",domProps:{innerHTML:t._s(t.teamFantasyPoints(e.awayScore))}})])])])],1)})),0)},s=[],r=a("230c"),i={name:"MatchupPreviews",props:{matchups:Array,expanded:{type:Boolean,default:!1}},methods:{teamFantasyPoints:function(t){return Object(r["a"])(t)}}},c=i,u=(a("ed8f"),a("2877")),o=Object(u["a"])(c,n,s,!1,null,null,null);e["a"]=o.exports},b9da:function(t,e,a){"use strict";var n=a("a12c"),s=a.n(n);s.a},e332:function(t,e,a){},ed8f:function(t,e,a){"use strict";var n=a("704d"),s=a.n(n);s.a}});
//# sourceMappingURL=app.0b502225.js.map