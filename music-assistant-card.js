(function(){async function e(e,n=`media-source://`){if(!e.callWS)throw Error(`Home Assistant media browsing is unavailable.`);let r=await e.callWS({type:`media_source/browse_media`,media_content_id:n});if(!r||typeof r!=`object`||typeof r.title!=`string`||!Array.isArray(r.children)||!r.children.every(t))throw Error(`Home Assistant returned an invalid media browser response.`);return r}function t(e){if(!e||typeof e!=`object`)return!1;let t=e;return typeof t.media_content_id==`string`&&typeof t.media_content_type==`string`&&typeof t.title==`string`}async function n(e,t){let n=await e.callService(`music_assistant`,`search`,{name:t,limit:12},void 0,!0,!0);if(!n.response||typeof n.response!=`object`)return{};let i=n.response,a={};for(let e of Object.keys(i)){let t=i[e];Array.isArray(t)&&(a[e]=t.filter(r))}return a}function r(e){if(!e||typeof e!=`object`)return!1;let t=e;return typeof t.name==`string`&&typeof t.uri==`string`}function i(e){return Object.entries(e).flatMap(([e,t])=>(t??[]).map(t=>({...t,group:e})))}async function a(e,t){let n={config_entry_id:t.configEntryId,media_type:t.mediaType,limit:t.limit,offset:t.offset,order_by:t.orderBy};t.favorite===!0&&(n.favorite=!0),t.search&&(n.search=t.search);let r=await e.callService(`music_assistant`,`get_library`,n,void 0,!0,!0);if(!r.response||typeof r.response!=`object`)return{items:[]};let i=r.response;return{items:Array.isArray(i.items)?i.items.filter(o).map(e=>({...e,media_type:e.media_type??t.mediaType})):[],limit:typeof i.limit==`number`?i.limit:void 0,offset:typeof i.offset==`number`?i.offset:void 0,order_by:typeof i.order_by==`string`?i.order_by:void 0,media_type:typeof i.media_type==`string`?i.media_type:void 0}}function o(e){if(!e||typeof e!=`object`)return!1;let t=e;return typeof t.name==`string`&&typeof t.uri==`string`}async function s(e,t){let n=(await e.callService(`music_assistant`,`get_queue`,void 0,{entity_id:t},!1,!0)).response;if(!n)return{};if(c(n))return n;if(typeof n==`object`&&n){let e=n[t];return c(e)?e:{}}return{}}function c(e){if(!e||typeof e!=`object`)return!1;let t=e;return Array.isArray(t.items)}var l=globalThis,u=e=>e,d=l.trustedTypes,f=d?d.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,p=`$lit$`,m=`lit$${Math.random().toFixed(9).slice(2)}$`,h=`?`+m,ee=`<${h}>`,g=document,_=()=>g.createComment(``),v=e=>e===null||typeof e!=`object`&&typeof e!=`function`,y=Array.isArray,te=e=>y(e)||typeof e?.[Symbol.iterator]==`function`,b=`[ 	
\f\r]`,x=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,S=/-->/g,ne=/>/g,C=RegExp(`>|${b}(?:([^\\s"'>=/]+)(${b}*=${b}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),w=/'/g,T=/"/g,re=/^(?:script|style|textarea|title)$/i,E=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),D=Symbol.for(`lit-noChange`),O=Symbol.for(`lit-nothing`),ie=new WeakMap,k=g.createTreeWalker(g,129);function A(e,t){if(!y(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return f===void 0?t:f.createHTML(t)}var j=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=x;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===x?c[1]===`!--`?o=S:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=C):(re.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=C):o=ne:o===C?c[0]===`>`?(o=i??x,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?C:c[3]===`"`?T:w):o===T||o===w?o=C:o===S||o===ne?o=x:(o=C,i=void 0);let d=o===C&&e[t+1].startsWith(`/>`)?` `:``;a+=o===x?n+ee:l>=0?(r.push(s),n.slice(0,l)+p+n.slice(l)+m+d):n+m+(l===-2?t:d)}return[A(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},M=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=j(t,n);if(this.el=e.createElement(l,r),k.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=k.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(p)){let t=u[o++],n=i.getAttribute(e).split(m),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?ae:r[1]===`?`?oe:r[1]===`@`?se:I}),i.removeAttribute(e)}else e.startsWith(m)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(re.test(i.tagName)){let e=i.textContent.split(m),t=e.length-1;if(t>0){i.textContent=d?d.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],_()),k.nextNode(),c.push({type:2,index:++a});i.append(e[t],_())}}}else if(i.nodeType===8){if(i.data===h)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(m,e+1))!==-1;)c.push({type:7,index:a}),e+=m.length-1}}a++}}static createElement(e,t){let n=g.createElement(`template`);return n.innerHTML=e,n}};function N(e,t,n=e,r){if(t===D)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=v(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=N(e,i._$AS(e,t.values),i,r)),t}var P=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??g).importNode(t,!0);k.currentNode=r;let i=k.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new F(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new L(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=k.nextNode(),a++)}return k.currentNode=g,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},F=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=O,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=N(this,e,t),v(e)?e===O||e==null||e===``?(this._$AH!==O&&this._$AR(),this._$AH=O):e!==this._$AH&&e!==D&&this._(e):e._$litType$===void 0?e.nodeType===void 0?te(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==O&&v(this._$AH)?this._$AA.nextSibling.data=e:this.T(g.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=M.createElement(A(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new P(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=ie.get(e.strings);return t===void 0&&ie.set(e.strings,t=new M(e)),t}k(t){y(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(_()),this.O(_()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=u(e).nextSibling;u(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},I=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=O,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=O}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=N(this,e,t,0),a=!v(e)||e!==this._$AH&&e!==D,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=N(this,r[n+o],t,o),s===D&&(s=this._$AH[o]),a||=!v(s)||s!==this._$AH[o],s===O?e=O:e!==O&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===O?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},ae=class extends I{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===O?void 0:e}},oe=class extends I{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==O)}},se=class extends I{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=N(this,e,t,0)??O)===D)return;let n=this._$AH,r=e===O&&n!==O||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==O&&(n===O||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},L=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){N(this,e)}},ce={M:p,P:m,A:h,C:1,L:j,R:P,D:te,V:N,I:F,H:I,N:oe,U:se,B:ae,F:L},le=l.litHtmlPolyfillSupport;le?.(M,F),(l.litHtmlVersions??=[]).push(`3.3.3`);var ue=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new F(t.insertBefore(_(),e),e,void 0,n??{})}return i._$AI(e),i},de=`
  /* Host & shell */
  :host { --music-bg: var(--card-background-color, #101416); --music-surface: #171d20; --music-raised: #20282b; --music-line: #2d383b; --music-text: var(--primary-text-color, #f2f6f5); --music-muted: var(--secondary-text-color, #9ba9aa); --music-accent: var(--primary-color, #65d6c7); display: block; color: var(--music-text); font-family: var(--paper-font-body1_-_font-family, 'Segoe UI', sans-serif); }
  .card { min-height: 240px; box-sizing: border-box; padding: 14px; border: 1px solid var(--music-line); border-radius: 12px; background: var(--music-bg); box-shadow: 0 12px 28px rgb(0 0 0 / 24%); }
  .card { --music-card-height: 430px; --music-header-height: 45px; --music-touch-target: 48px; --music-list-row-height: 56px; --music-flyout-width: clamp(360px, 50%, 500px); position: relative; height: min(var(--music-card-height), calc(100dvh - var(--music-dashboard-chrome, 0px))); max-height: calc(100dvh - var(--music-dashboard-chrome, 0px)); overflow: hidden; }

  /* Top menu */
  .top-menu { position: absolute; z-index: 10; inset: 14px 14px auto; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; min-height: var(--music-header-height); pointer-events: none; }
  .top-menu .player-action { min-width: 0; justify-content: flex-start; text-align: left; pointer-events: auto; }
  .top-menu .menu-actions { display: flex; justify-content: flex-end; gap: 6px; pointer-events: none; }
  .top-menu .menu-action { min-width: var(--music-touch-target); min-height: var(--music-touch-target); pointer-events: auto; }
  .top-menu .menu-label { flex: 1 1 auto; min-width: 0; max-width: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Now playing */
  .primary-view { position: absolute; z-index: 1; inset: 14px; min-height: 0; overflow: hidden; }
  .now-playing-screen { padding-top: var(--music-header-height); }
  .now-playing-screen .playback { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto; height: 100%; box-sizing: border-box; gap: 12px; margin: 0; padding: 18px 10px 8px; border: 0; background: transparent; }
  .now-playing-layout { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 28px; min-height: 0; }
  .now-playing-art { width: min(180px, 30vh, 40vw); aspect-ratio: 1; display: grid; place-items: center; overflow: hidden; border-radius: 8px; background: var(--music-raised); color: var(--music-muted); }
  .now-playing-art img { width: 100%; height: 100%; object-fit: cover; }
  .now-playing-art ha-icon { --mdc-icon-size: 42px; }
  .now-playing-details { display: grid; gap: 6px; min-width: 0; width: 100%; max-width: 80%; justify-self: start; text-align: left; }
  .playback-state { color: var(--music-muted); font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
  .now-playing-title { display: -webkit-box; overflow: hidden; color: var(--music-text); font-size: 28px; font-weight: 650; line-height: 1.12; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
  .now-playing-subtitle { display: -webkit-box; overflow: hidden; color: var(--music-muted); font-size: 21px; line-height: 1.2; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
  .now-playing-controls { justify-content: space-between; margin: 0; }
  .playback-controls { display: flex; align-items: center; gap: 14px; }
  .utility-controls { display: flex; align-items: center; gap: 7px; }
  .utility-controls .repeat-control { margin-left: 14px; }
  .repeat-control.active { border-color: var(--music-accent); color: var(--music-accent); }
  .repeat-control.muted { color: var(--music-muted); opacity: .72; }

  /* Search / browse */
  .search-screen { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; padding-top: var(--music-header-height); }
  .search-layout { display: grid; grid-template-columns: 156px minmax(0, 1fr); gap: 16px; min-height: 0; }
  .search-navigation, .search-results { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .library-navigation { display: grid; align-content: start; gap: 4px; min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .library-category { width: 100%; min-height: var(--music-touch-target); display: flex; align-items: center; gap: 9px; padding: 7px 9px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--music-muted); font: inherit; text-align: left; cursor: pointer; }
  .library-category:hover, .library-category:focus-visible { background: var(--music-raised); color: var(--music-text); outline: none; }
  .library-category:focus-visible { box-shadow: 0 0 0 2px var(--music-accent) inset; }
  .library-category.selected { border-color: var(--music-accent); background: rgb(101 214 199 / 10%); color: var(--music-accent); }
  .library-category span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .library-list { padding-right: 4px; }
  .load-more { width: 100%; margin-top: 8px; }
  .search-results { padding-right: 4px; }
  .primary-header, .flyout-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: var(--music-header-height); }

  /* Flyouts (queue / speakers / volume) & confirm dialog */
  .flyout-backdrop { position: absolute; z-index: 20; inset: 0; border: 0; background: rgb(0 0 0 / 38%); cursor: pointer; }
  .flyout { position: absolute; z-index: 30; inset: 0 0 0 auto; display: grid; grid-template-rows: var(--music-header-height) minmax(0, 1fr); width: var(--music-flyout-width); box-sizing: border-box; padding: 14px; border-left: 1px solid var(--music-line); background: var(--music-surface); box-shadow: -12px 0 28px rgb(0 0 0 / 28%); }
  .flyout[data-flyout="volume"] { width: 33.333%; }
  .flyout-body { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .flyout[data-flyout="queue"] .flyout-body { overflow: hidden; }
  .flyout[data-flyout="queue"] .queue { height: 100%; }
  .flyout[data-flyout="queue"] .queue-list { height: 100%; max-height: none; }
  .confirm-backdrop { position: absolute; z-index: 40; inset: 0; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / 52%); }
  .confirm-dialog { display: grid; gap: 14px; width: min(100%, 360px); box-sizing: border-box; padding: 20px; border: 1px solid var(--music-line); border-radius: 8px; background: var(--music-raised); box-shadow: 0 16px 36px rgb(0 0 0 / 35%); }
  .confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .control.danger { border-color: var(--error-color, #ff8f8f); color: var(--error-color, #ff8f8f); }
  .flyout-body .speaker-sheet, .flyout-body .playlist-sheet { display: block; margin: 0; padding: 0; border: 0; background: transparent; }
  .flyout-body .speaker-sheet .panel-header, .flyout-body .playlist-sheet .panel-header { display: none; }
  .volume-flyout-body { display: grid; place-items: center; min-height: 100%; }
  .volume-slider-flyout { width: 40px; height: 80%; justify-self: center; --control-slider-color: var(--music-accent); --control-slider-thickness: 40px; }
  .now-playing-screen .playback > .queue, .now-playing-screen .playback [data-control="shuffle"], .now-playing-screen .playback [data-control="speaker"], .now-playing-screen .playback [data-control="playlist"], .now-playing-screen .playback .volume-control { display: none; }

  /* Lists (queue / speakers / playlists / media browse) */
  .queue-list, .speaker-list, .playlist-list { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .queue-row, .speaker-row, .playlist-list > .control { min-height: var(--music-list-row-height); }
  .speaker-actions { display: flex; align-items: left; justify-content: space-between; gap: 10px; min-height: var(--music-touch-target); margin-bottom: 8px; }
  .speaker-select { flex: 1; justify-content: flex-start; min-height: var(--music-touch-target); border: 0; background: transparent; text-align: left; }
  .speaker-row .row-action { border: 0; background: transparent; }
  .speaker-actions { position: sticky; bottom: 0; z-index: 1; padding-top: 8px; background: var(--music-surface); }
  h1, h2, p { margin: 0; }
  .columns { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 20px; }
  .panel { min-height: 0; padding: 4px 0; }
  .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .panel-title { color: var(--music-text); font-size: 15px; letter-spacing: .01em; }
  .path { color: var(--music-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .media-list { display: grid; gap: 3px; }
  .media-row, .back-button { width: 100%; min-height: 50px; box-sizing: border-box; display: flex; align-items: center; gap: 11px; padding: 7px; border: 0; border-radius: 7px; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; transition: background-color 140ms ease, transform 140ms ease; }
  .media-row:hover, .media-row:focus-visible, .back-button:hover, .back-button:focus-visible { background: var(--music-raised); outline: none; }
  .media-row:active, .back-button:active { transform: scale(.99); }
  .media-row:focus-visible, .back-button:focus-visible { box-shadow: 0 0 0 2px var(--music-accent) inset; }
  .thumb { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; overflow: hidden; border-radius: 6px; background: var(--music-raised); color: var(--music-muted); font-size: 18px; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .media-copy { min-width: 0; display: grid; gap: 2px; }
  .media-title { overflow: hidden; color: var(--music-text); font-size: 14px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
  .media-meta, .panel-copy { color: var(--music-muted); font-size: 12px; line-height: 1.4; }
  .media-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .state { padding: 22px 8px; color: var(--music-muted); font-size: 13px; line-height: 1.45; text-align: center; }
  .error { color: var(--error-color, #ff8f8f); }
  .back-button { min-height: 34px; padding-block: 3px; color: var(--music-accent); font-size: 12px; }
  .back-button span:first-child { font-size: 20px; line-height: 1; }

  /* Search input & result groups */
  .search { display: flex; align-items: center; align-self: start; gap: 8px; min-height: 0; height: auto; box-sizing: border-box; margin: 0; padding: 6px 9px; border: 1px solid var(--music-line); border-radius: 7px; background: var(--music-surface); }
  .search:focus-within { border-color: var(--music-accent); box-shadow: 0 0 0 1px var(--music-accent); }
  .search-icon { color: var(--music-muted); font-size: 17px; }
  .search input { width: 100%; min-height: 0; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: 13px; line-height: 1.4; }
  .search input::placeholder { color: var(--music-muted); }
  .result-group { display: grid; gap: 4px; margin-bottom: 14px; }
  .result-heading { margin: 0 7px 2px; color: var(--music-muted); font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }

  /* Playback bar, controls & timeline */
  .playback { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, 1fr); gap: 22px; margin-top: 12px; padding: 14px 16px 12px; border-top: 1px solid var(--music-line); background: var(--music-surface); }
  .now-playing { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .now-playing .thumb { width: 64px; height: 64px; flex-basis: 64px; border-radius: 7px; }
  .controls { display: flex; align-items: center; gap: 7px; margin-top: 11px; }
  .control, .queue-action { min-width: 38px; min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 9px; border: 1px solid var(--music-line); border-radius: 7px; background: transparent; color: var(--music-text); font: inherit; cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease; }
  .control:hover, .control:focus-visible, .queue-action:hover, .queue-action:focus-visible { background: var(--music-raised); border-color: var(--music-accent); outline: none; }
  .control:focus-visible, .queue-action:focus-visible { box-shadow: 0 0 0 1px var(--music-accent) inset; }
  .control.primary { background: var(--music-accent); border-color: var(--music-accent); color: #102022; }
  .timeline { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-top: 8px; color: var(--music-muted); font-size: 11px; }
  .progress { width: 100%; accent-color: var(--music-accent); }
  .volume-control { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; color: var(--music-muted); font-size: 13px; }
  .volume-slider { width: 28px; height: 72px; writing-mode: vertical-lr; direction: rtl; }

  /* Queue */
  .queue { min-width: 0; }
  .queue-list { max-height: 112px; overflow-y: auto; }
  .queue-row { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 3px 0 3px 8px; border-bottom: 1px solid var(--music-line); }
  .queue-row.current { border-left: 2px solid var(--music-accent); background: rgb(101 214 199 / 8%); color: var(--music-accent); font-weight: 600; }
  .queue-row .media-copy { flex: 1; }
  .queue-action { min-width: 0; min-height: 30px; padding: 4px 8px; color: var(--music-muted); font-size: 12px; }
  .queue-header-actions { display: flex; gap: 6px; }
  .queue-header-actions .queue-action { min-width: var(--music-touch-target); min-height: var(--music-touch-target); }
  .queue-header-actions .queue-action.active { border-color: var(--music-accent); color: var(--music-accent); }
  .row-actions { display: flex; gap: 4px; margin-left: auto; }
  .row-action { min-width: 30px; min-height: 30px; padding: 4px; }

  /* Speakers & playlists */
  .speaker-sheet { margin-top: 12px; padding: 12px; border-top: 1px solid var(--music-line); background: var(--music-raised); }
  .speaker-list { display: grid; gap: 4px; margin-top: 8px; }
  .speaker-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px; border: 1px solid var(--music-line); border-radius: 6px; background: var(--music-surface); color: inherit; text-align: left; }
  .speaker-row.selected { border-color: var(--music-accent); }
  .playlist-sheet { margin-top: 12px; padding: 12px; border-top: 1px solid var(--music-line); background: var(--music-raised); }
  .playlist-list { display: grid; gap: 4px; max-height: 180px; overflow-y: auto; margin-top: 8px; }
  .playlist-create { display: flex; gap: 6px; margin-top: 8px; }
  .playlist-create input { min-width: 0; flex: 1; border: 1px solid var(--music-line); border-radius: 6px; background: var(--music-surface); color: inherit; padding: 7px; font: inherit; }

  /* Shared interaction states & icons */
  .control:active, .queue-action:active { transform: scale(.96); }
  ha-icon { display: block; --mdc-icon-size: 20px; }
  .thumb ha-icon { --mdc-icon-size: 22px; }
  .back-button ha-icon { --mdc-icon-size: 18px; }

  /* Media queries */
  @media (prefers-reduced-motion: reduce) { .media-row, .back-button, .control, .queue-action { transition: none; } }
  @media (max-width: 680px) { .search-layout, .playback { grid-template-columns: 1fr; } .search-layout { grid-template-rows: auto minmax(0, 1fr); gap: 8px; } .library-navigation { display: flex; overflow-x: auto; overflow-y: hidden; } .library-category { width: auto; flex: 0 0 auto; } .playback { gap: 12px; } .top-menu { grid-template-columns: minmax(0, 1fr) auto; gap: 6px; } .flyout { width: min(100%, 440px); } }
`;function R(e){if(!Number.isFinite(e)||e<=0)return`0:00`;let t=Math.floor(e);return`${Math.floor(t/60)}:${String(t%60).padStart(2,`0`)}`}function fe(e){return{media_content_id:e.uri,media_content_type:e.media_type??`music`,title:e.name,thumbnail:e.image,can_play:e.is_playable!==!1,can_expand:e.can_expand===!0,artist:e.artist,album:e.album}}function z(e){let t=e.attributes.group_members;return Array.isArray(t)?t.filter(e=>typeof e==`string`):[]}function B(){return{browseState:{loading:!1,path:[]},searchState:{query:``,loading:!1},libraryState:{selectedCategory:`favorites`,query:``,loading:!1,loadingMore:!1,items:[],limit:50,offset:0,hasMore:!1},queueState:{loading:!1},speakerState:{loading:!1},uiState:{primaryView:`now-playing`,activeFlyout:null,clearQueueConfirmOpen:!1}}}var pe=class{state=B();onChange;notifying=!1;pendingNotify=!1;constructor(e){this.onChange=e}getState(){return this.state}setState(e){this.state={...this.state,...e},this.notify()}reset(){this.state=B()}notify(){if(this.notifying){this.pendingNotify=!0;return}this.notifying=!0;try{this.onChange()}finally{this.notifying=!1}this.pendingNotify&&(this.pendingNotify=!1,this.notify())}},V=class{requestId=0;invalidate(){this.requestId+=1}begin(){let e=++this.requestId;return{isCurrent:()=>e===this.requestId}}};async function H(e,t,n,r,i){let a=e.getHass(),o=e.getConfig();if(!a||!o)throw Error(`Home Assistant is unavailable.`);await a.callService(t,n,r,i??{entity_id:o.player},!0,!1)}async function U(e,t,n,r){let i=e.getConfig();if(!e.getHass()||!i)return;let a=r??(i.click_action===`queue`?`add`:`replace`);await H(e,`music_assistant`,`play_media`,{media_id:t,media_type:n,enqueue:a},{entity_id:i.player}),(a===`add`||i.click_action===`queue`)&&await e.loadQueue()}async function me(e,t,n){t===`transfer`&&await H(e,`media_player`,`transfer_playback`,{},{entity_id:n}),await e.loadQueue(),await e.loadSpeakers()}async function he(e){let t=e.getConfig()?.player;if(!t)throw Error(`The current Music Assistant speaker is unavailable.`);let n=new Set(e.getCurrentSpeakerSelection()),r=new Set(e.getState().speakerState.selectedPlayerIds??[t]),i=[...r].filter(e=>e!==t&&!n.has(e)),a=[...n].filter(e=>e!==t&&!r.has(e));i.length>0&&await H(e,`media_player`,`join`,{},{entity_id:[t,...i]}),a.length>0&&await H(e,`media_player`,`unjoin`,{},{entity_id:a}),await e.loadQueue(),await e.loadSpeakers();let o=e.getState().uiState;e.setState({uiState:{...o,activeFlyout:null}})}async function ge(e,t){let n=e.getHass(),r=e.getConfig();if(t===`discover`){let t=e.getState().uiState;e.setState({uiState:{primaryView:t.primaryView===`search`?`now-playing`:`search`,activeFlyout:null,clearQueueConfirmOpen:!1}}),e.getState().uiState.primaryView===`search`&&e.loadLibrary();return}if(t.startsWith(`library-category:`)){let n=t.slice(17),r=e.getState().libraryState,i=r.selectedCategory===n?null:n;e.setState({libraryState:{...r,selectedCategory:i,query:``,items:[],offset:0,hasMore:!1,error:void 0}}),i&&e.loadLibrary();return}if(t===`library-load-more`){e.loadLibrary(!0);return}if(t===`close-flyout`){let t=e.getState();e.setState({uiState:{...t.uiState,activeFlyout:null,clearQueueConfirmOpen:!1},...t.uiState.activeFlyout===`speakers`?{speakerState:{...t.speakerState,selectedPlayerIds:e.getCurrentSpeakerSelection()}}:{}});return}if(t===`clear-queue-request`){e.setState({uiState:{...e.getState().uiState,clearQueueConfirmOpen:!0}});return}if(t===`clear-queue-cancel`){e.setState({uiState:{...e.getState().uiState,clearQueueConfirmOpen:!1}});return}if(t===`clear-queue-confirm`){await H(e,`media_player`,`clear_playlist`),e.setState({uiState:{...e.getState().uiState,clearQueueConfirmOpen:!1}}),await e.loadQueue();return}if(t===`queue`||t===`volume`){e.setState({uiState:{...e.getState().uiState,activeFlyout:t}}),t===`queue`&&!e.isQueueRequested()&&(e.setQueueRequested(!0),e.loadQueue());return}if(t===`speaker`){let t=e.getState();if(t.speakerState.players||t.speakerState.loading||t.speakerState.error){let n=t.uiState.activeFlyout!==`speakers`;e.setState({uiState:{...t.uiState,activeFlyout:n?`speakers`:null},speakerState:n?t.speakerState:{loading:!1}})}else e.setState({uiState:{...t.uiState,activeFlyout:`speakers`}}),e.loadSpeakers();return}if(t===`play-pause`&&await H(e,`media_player`,n?.states[r?.player??``]?.state===`playing`?`media_pause`:`media_play`),t===`next`&&await H(e,`media_player`,`media_next`),t===`shuffle`){let t=n?.states[r?.player??``];await H(e,`media_player`,`shuffle_set`,{shuffle:!t?.attributes.shuffle})}if(t===`repeat`){let t=String(n?.states[r?.player??``]?.attributes.repeat??`off`);await H(e,`media_player`,`repeat_set`,{repeat:t===`off`?`all`:t===`all`?`one`:`off`})}t===`clear-queue`&&e.setState({uiState:{...e.getState().uiState,clearQueueConfirmOpen:!0}})}async function W(e,t){e.getState().operationError!==void 0&&e.setState({operationError:void 0});try{await t()}catch(t){e.setState({operationError:t instanceof Error?t.message:`The playback action failed.`})}}var _e=`media-source://`,ve=`[data-speaker-action], [data-speaker-id], [data-item-action], [data-item-index], [data-search-uri], [data-path-index], [data-path-root], [data-path-back], [data-control], [data-queue-index]`;function ye(e){return t=>{let n=t.target instanceof Element?t.target.closest(ve):null;if(n){if(n.dataset.speakerId){let t=e.getConfig(),r=e.getState().speakerState,i=new Set(r.selectedPlayerIds??(t?.player?[t.player]:[]));if(n.dataset.speakerId===t?.player)return;i.has(n.dataset.speakerId)?i.delete(n.dataset.speakerId):i.add(n.dataset.speakerId),e.setState({speakerState:{...r,selectedPlayerIds:[...i]}});return}if(n.dataset.speakerAction){if(n.dataset.speakerAction===`apply`){W(e,()=>he(e));return}let t=n.dataset.speakerTarget;if(!t)return;W(e,()=>me(e,n.dataset.speakerAction??``,t));return}if(n.dataset.itemAction){let t=n.closest(`[data-item-index], [data-search-uri]`),r=n.dataset.itemAction===`queue`?`add`:`replace`;if(t?.dataset.itemIndex!==void 0){let n=e.getState().browseState.response?.children[Number(t.dataset.itemIndex)];n&&!n.can_expand&&W(e,()=>U(e,n.media_content_id,n.media_content_type,r))}else if(t?.dataset.searchUri){let n=t.dataset.searchUri;W(e,()=>U(e,n,t.dataset.searchType??`music`,r))}return}if(n.dataset.itemIndex!==void 0){let t=e.getState().browseState,r=t.response?.children[Number(n.dataset.itemIndex)];if(!r)return;r.can_expand?e.loadMedia(r.media_content_id,[...t.path,r]):W(e,()=>U(e,r.media_content_id,r.media_content_type));return}if(n.dataset.searchUri){let{browseState:t,searchState:r}=e.getState();if(n.dataset.searchExpand===`true`){let a=i(r.response??{}).find(e=>e.uri===n.dataset.searchUri);a&&e.loadMedia(n.dataset.searchUri,[...t.path,fe(a)])}else W(e,()=>U(e,n.dataset.searchUri,n.dataset.searchType??`music`));return}if(n.dataset.pathRoot!==void 0){e.loadMedia(_e,[]);return}if(n.dataset.pathBack!==void 0){let t=e.getState().browseState.path.slice(0,-1);e.loadMedia(t.at(-1)?.media_content_id??`media-source://`,t);return}if(n.dataset.pathIndex!==void 0){let t=Number(n.dataset.pathIndex),r=e.getState().browseState.path,i=r[t];e.loadMedia(i?.media_content_id??`media-source://`,r.slice(0,t+1));return}if(n.dataset.queueIndex!==void 0){let t=Number(n.dataset.queueIndex);W(e,async()=>{let n=e.getState().queueState.details?.items;await H(e,`media_player`,`play_media`,{media_content_id:n?.[t]?.uri,media_content_type:n?.[t]?.media_type}),await e.loadQueue();let r=e.getState().uiState;e.setState({uiState:{...r,activeFlyout:null}})});return}W(e,()=>ge(e,n.dataset.control??``))}}}function be(e,t){return E`<nav class="top-menu" aria-label="Music controls">
    <button
      class="control menu-action player-action"
      data-control="speaker"
      type="button"
      aria-label="Choose player"
      title="Choose player"
    >
      <ha-icon icon="mdi:speaker"></ha-icon><span class="menu-label">${e}</span></button
    ><span class="menu-actions"
      ><button
        class="control menu-action"
        data-control="queue"
        type="button"
        aria-label="Open queue"
        title="Open queue"
      >
        <ha-icon icon="mdi:playlist-music"></ha-icon></button
      >${t===`search`?E`<button
          class="control menu-action"
          data-control="discover"
          type="button"
          aria-label="Close search"
          title="Close search"
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </button>`:E`<button
          class="control menu-action"
          data-control="discover"
          type="button"
          aria-label="Open search"
          title="Open search"
        >
          <ha-icon icon="mdi:magnify"></ha-icon>
        </button>`}</span
    >
  </nav>`}function xe(e,t){let n=e?.attributes??{},r=typeof n.media_title==`string`?n.media_title.trim():``,i=r.length>0||e?.state===`playing`||e?.state===`paused`,a=e?r||(i?`Now playing`:`Nothing playing`):`Player unavailable`,o=typeof n.media_artist==`string`?n.media_artist.trim():``,s=typeof n.entity_picture==`string`?n.entity_picture:void 0,c=e?.state===`playing`,l=Number(n.media_duration??0),u=t??Number(n.media_position??0),d=String(n.repeat??`off`).toLowerCase(),f=d===`one`?`repeat-once`:d===`all`?`repeat`:`repeat-off`,p=d===`off`?`muted`:`active`;return E`<section class="playback" aria-label="Now playing">
    <div class="now-playing-layout">
      <span class="now-playing-art"
        >${s?E`<img src="${s}" alt="" />`:E`<ha-icon icon="mdi:music-note"></ha-icon>`}</span
      >
      <div class="now-playing-details">
        <span class="playback-state">${c?`Now playing`:`Paused`}</span
        ><span class="now-playing-title">${a}</span
        >${o?E`<span class="now-playing-subtitle">${o}</span>`:O}
      </div>
    </div>
    <div class="timeline">
      <span>${R(u)}</span
      ><input
        class="progress"
        data-seek
        type="range"
        min="0"
        max="${l||1}"
        .value="${String(Math.min(u,l||1))}"
        aria-label="Playback position"
      /><span>${R(l)}</span>
    </div>
    <div class="controls now-playing-controls">
      <span class="playback-controls"
        ><button
          class="control primary"
          data-control="play-pause"
          type="button"
          aria-label="${c?`Pause`:`Play`}"
        >
          <ha-icon icon="mdi:${c?`pause`:`play`}"></ha-icon></button
        ><button class="control" data-control="next" type="button" aria-label="Next track">
          <ha-icon icon="mdi:skip-next"></ha-icon></button></span
      ><span class="utility-controls"
        ><button
          class="control repeat-control ${p}"
          data-control="repeat"
          type="button"
          aria-label="Change repeat mode"
          aria-pressed="${d!==`off`}"
        >
          <ha-icon icon="mdi:${f}"></ha-icon></button
        ><button class="control" data-control="volume" type="button" aria-label="Open volume" title="Open volume">
          <ha-icon icon="mdi:volume-high"></ha-icon></button
      ></span>
    </div>
  </section>`}var Se={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},Ce=e=>(...t)=>({_$litDirective$:e,values:t}),we=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,n){this._$Ct=e,this._$AM=t,this._$Ci=n}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}},{I:Te}=ce,G=e=>e,Ee=()=>document.createComment(``),K=(e,t,n)=>{let r=e._$AA.parentNode,i=t===void 0?e._$AB:t._$AA;if(n===void 0)n=new Te(r.insertBefore(Ee(),i),r.insertBefore(Ee(),i),e,e.options);else{let t=n._$AB.nextSibling,a=n._$AM,o=a!==e;if(o){let t;n._$AQ?.(e),n._$AM=e,n._$AP!==void 0&&(t=e._$AU)!==a._$AU&&n._$AP(t)}if(t!==i||o){let e=n._$AA;for(;e!==t;){let t=G(e).nextSibling;G(r).insertBefore(e,i),e=t}}}return n},q=(e,t,n=e)=>(e._$AI(t,n),e),De={},Oe=(e,t=De)=>e._$AH=t,ke=e=>e._$AH,J=e=>{e._$AR(),e._$AA.remove()},Ae=(e,t,n)=>{let r=new Map;for(let i=t;i<=n;i++)r.set(e[i],i);return r},Y=Ce(class extends we{constructor(e){if(super(e),e.type!==Se.CHILD)throw Error(`repeat() can only be used in text expressions`)}dt(e,t,n){let r;n===void 0?n=t:t!==void 0&&(r=t);let i=[],a=[],o=0;for(let t of e)i[o]=r?r(t,o):o,a[o]=n(t,o),o++;return{values:a,keys:i}}render(e,t,n){return this.dt(e,t,n).values}update(e,[t,n,r]){let i=ke(e),{values:a,keys:o}=this.dt(t,n,r);if(!Array.isArray(i))return this.ut=o,a;let s=this.ut??=[],c=[],l,u,d=0,f=i.length-1,p=0,m=a.length-1;for(;d<=f&&p<=m;)if(i[d]===null)d++;else if(i[f]===null)f--;else if(s[d]===o[p])c[p]=q(i[d],a[p]),d++,p++;else if(s[f]===o[m])c[m]=q(i[f],a[m]),f--,m--;else if(s[d]===o[m])c[m]=q(i[d],a[m]),K(e,c[m+1],i[d]),d++,m--;else if(s[f]===o[p])c[p]=q(i[f],a[p]),K(e,i[d],i[f]),f--,p++;else if(l===void 0&&(l=Ae(o,p,m),u=Ae(s,d,f)),l.has(s[d])){if(l.has(s[f])){let t=u.get(o[p]),n=t===void 0?null:i[t];if(n===null){let t=K(e,i[d]);q(t,a[p]),c[p]=t}else c[p]=q(n,a[p]),K(e,i[d],n),i[t]=null;p++}else J(i[f]),f--}else J(i[d]),d++;for(;p<=m;){let t=K(e,c[m+1]);q(t,a[p]),c[p++]=t}for(;d<=f;){let e=i[d++];e!==null&&J(e)}return this.ut=o,Oe(e,c),D}});function X(){return E`<span class="row-actions"
    ><button class="control row-action" data-item-action="play" type="button" aria-label="Play now" title="Play now">
      <ha-icon icon="mdi:play"></ha-icon></button
    ><button
      class="control row-action"
      data-item-action="queue"
      type="button"
      aria-label="Add to queue"
      title="Add to queue"
    >
      <ha-icon icon="mdi:playlist-plus"></ha-icon></button
  ></span>`}function je(e,t){return e.loading?E`<p class="state" aria-live="polite">Loading media sources...</p>`:e.error?E`<p class="state error" role="alert">${e.error}</p>`:t.length===0?E`<p class="state">This location has no media items.</p>`:E`<div class="media-list">
    ${Y(t,e=>e.media_content_id,(e,t)=>Me(e,t))}
  </div>`}function Me(e,t){let n=e.can_expand?E`<ha-icon icon="mdi:folder-music"></ha-icon>`:E`<ha-icon icon="mdi:music-note"></ha-icon>`,r=e.thumbnail?E`<img src="${e.thumbnail}" alt="" loading="lazy" />`:n,i=[e.artist,e.album,e.media_class??e.media_content_type].filter(Boolean).join(` · `);return E`<div
    class="media-row"
    data-item-index="${t}"
    role="${e.can_expand?`button`:`group`}"
    tabindex="${e.can_expand?`0`:`-1`}"
  >
    <span class="thumb" aria-hidden="true">${r}</span
    ><span class="media-copy"
      ><span class="media-title">${e.title}</span
      ><span class="media-meta">${i||(e.can_expand?`Open folder`:`Media`)}</span></span
    >${e.can_play&&!e.can_expand?X():O}
  </div>`}function Ne(e){let t=E`<button class="back-button" data-path-root type="button">
    <ha-icon icon="mdi:home-outline" aria-hidden="true"></ha-icon><span>Media sources</span>
  </button>`;return e.length===0?E`${t}
      <p class="panel-copy">Choose a source to begin browsing.</p>`:E`<div class="media-list">
    ${t}${E`<button class="back-button" data-path-back type="button">
    <ha-icon icon="mdi:arrow-left" aria-hidden="true"></ha-icon><span>Back</span>
  </button>`}${e.map((e,t)=>E`<button class="back-button" data-path-index="${t}" type="button">
          <ha-icon icon="mdi:chevron-right" aria-hidden="true"></ha-icon><span>${e.title}</span>
        </button>`)}
  </div>`}function Pe(e){return E`<label class="search"
    ><ha-icon class="search-icon" icon="mdi:magnify" aria-hidden="true"></ha-icon
    ><input data-search type="search" .value="${e}" placeholder="Search all music" aria-label="Search all music"
  /></label>`}var Fe=[{id:`favorites`,label:`Favorites`,icon:`mdi:star`},{id:`artist`,label:`Artists`,icon:`mdi:account-music`},{id:`album`,label:`Albums`,icon:`mdi:album`},{id:`track`,label:`Tracks`,icon:`mdi:music-note`},{id:`playlist`,label:`Playlists`,icon:`mdi:playlist-music`},{id:`podcast`,label:`Podcasts`,icon:`mdi:podcast`},{id:`radio`,label:`Radio`,icon:`mdi:radio`}];function Ie(e){return E`<nav class="library-navigation" aria-label="Music library categories">
    ${Fe.map(t=>E`<button
        class="library-category${e===t.id?` selected`:``}"
        data-control="library-category:${t.id}"
        type="button"
        aria-current=${e===t.id?`page`:O}
      >
        <ha-icon icon="${t.icon}"></ha-icon><span>${t.label}</span>
      </button>`)}
  </nav>`}function Le(e){return e.selectedCategory?e.loading?E`<p class="state" aria-live="polite">Loading ${e.selectedCategory}...</p>`:e.error?E`<p class="state error" role="alert">${e.error}</p>`:e.items.length===0?E`<p class="state">No ${e.query?`results for “${e.query}”`:`items`}.</p>`:E`<div class="media-list library-list">
    ${Y(e.items,e=>e.uri,t=>Re(t,e.selectedCategory))}
    ${e.hasMore?E`<button class="control load-more" data-control="library-load-more" type="button" ?disabled=${e.loadingMore}>
          ${e.loadingMore?`Loading...`:`Load more`}
        </button>`:O}
  </div>`:e.query?E`<p class="state">Search all music to see results.</p>`:E`<p class="state">Select a library category.</p>`}function Re(e,t){let n=e.can_expand===!0||[`artist`,`album`,`playlist`,`podcast`].includes(t),r=e.is_playable!==!1&&t!==`artist`,i=e.media_type??(t===`favorites`?`track`:t),a=[e.artist,e.album,e.provider].filter(Boolean).join(` · `)||t,o=e.image?E`<img src="${e.image}" alt="" loading="lazy" />`:E`<ha-icon icon="mdi:music-note"></ha-icon>`;return E`<div
    class="media-row"
    data-search-uri="${e.uri}"
    data-search-type="${i}"
    data-search-expand="${n}"
    role="${n?`button`:`group`}"
    tabindex="${n?`0`:`-1`}"
  >
    <span class="thumb" aria-hidden="true">${o}</span
    ><span class="media-copy"><span class="media-title">${e.name}</span><span class="media-meta">${a}</span></span
    >${r?X():O}
  </div>`}function ze(e){if(e.loading)return E`<p class="state" aria-live="polite">Searching Music Assistant...</p>`;if(e.error)return E`<p class="state error" role="alert">${e.error}</p>`;let t=i(e.response??{});return t.length===0?E`<p class="state">No results for “${e.query}”.</p>`:E`${[...new Set(t.map(e=>e.group))].map(e=>E`<section class="result-group">
        <h3 class="result-heading">${e}</h3>
        ${Y(t.filter(t=>t.group===e),e=>e.uri,e=>Be(e))}
      </section>`)}`}function Be(e){let t=[e.artist,e.album,e.provider].filter(Boolean).join(` · `)||e.group,n=e.image?E`<img src="${e.image}" alt="" loading="lazy" />`:E`<ha-icon icon="mdi:music-note"></ha-icon>`,r=e.can_expand===!0,i=e.is_playable!==!1;return E`<div
    class="media-row"
    data-search-uri="${e.uri}"
    data-search-type="${e.media_type??e.group}"
    data-search-expand="${r}"
  >
    <span class="thumb" aria-hidden="true">${n}</span
    ><span class="media-copy"
      ><span class="media-title">${e.name}</span
      ><span class="media-meta">${r?`${t} · Open`:t}</span></span
    >${i?X():O}
  </div>`}function Ve(e){if(e.loading)return E`<div class="queue"><p class="state">Loading queue...</p></div>`;if(e.error)return E`<div class="queue"><p class="state error">${e.error}</p></div>`;let t=e.details?.items??[];if(t.length===0)return E`<div class="queue"><p class="state">Queue is empty.</p></div>`;let n=e.details?.current_index??-1;return E`<div class="queue">
    <div class="queue-list">
      ${Y(t,(e,t)=>`${e.uri??`item`}:${t}`,(e,t)=>He(e,t===n))}
    </div>
  </div>`}function He(e,t){let n=[e.artist,e.album].filter(Boolean).join(` · `);return E`<div class="queue-row${t?` current`:``}">
    <span class="media-copy"
      ><span class="media-title">${String(e.name??`Untitled`)}</span
      ><span class="media-meta">${n||`Queue item`}</span></span
    >
  </div>`}function Z(e){let t=e.attributes.friendly_name;return typeof t==`string`&&t.trim()?t.trim():e.entity_id}function Ue(e){let t=e.attributes.supported_features;return typeof t==`number`?!!(t&512):Array.isArray(t)&&t.includes(`grouping`)}function We(e,t){if(!e.players&&!e.loading&&!e.error)return O;if(e.loading)return E`<section class="speaker-sheet" aria-label="Speakers">
      <p class="state">Loading speakers...</p>
    </section>`;if(e.error)return E`<section class="speaker-sheet" aria-label="Speakers">
      <p class="state error">${e.error}</p>
    </section>`;let n=new Set(e.selectedPlayerIds??(t?[t]:[]));return E`<section class="speaker-sheet" aria-label="Players">
    <div class="speaker-list">
      ${Y((e.players??[]).sort((e,t)=>Z(e).localeCompare(Z(t),void 0,{sensitivity:`base`})),e=>e.entity_id,e=>{let r=n.has(e.entity_id);return E`<div class="speaker-row${r?` selected`:``}">
          <button
            class="control speaker-select"
            data-speaker-id="${e.entity_id}"
            type="button"
            aria-pressed="${r}"
          >
            <span class="media-copy"
              ><span class="media-title">${Z(e)}</span
              ><span class="media-meta"
                >${e.entity_id===t?`Current player`:r?`Selected`:`Available`}</span
              ></span
            ></button
          >${e.entity_id!==t&&Ue(e)?E`<span class="row-actions"
                  ><button
                    class="control row-action"
                    data-speaker-action="transfer"
                    data-speaker-target="${e.entity_id}"
                    type="button"
                    aria-label="Transfer playback"
                    title="Transfer playback"
                  >
                    <ha-icon icon="mdi:transfer"></ha-icon></button
                ></span>`:O}
        </div>`})}
    </div>
    <div class="speaker-actions">
      <span class="panel-copy">Select players for playback</span
      ><button class="control primary" data-speaker-action="apply" type="button">Apply</button>
    </div>
  </section>`}function Ge(e){return E`<div class="flyout-header">
    <h2 class="panel-title">Queue</h2>
    <span class="queue-header-actions"
      ><button
        class="queue-action"
        data-control="clear-queue-request"
        type="button"
        aria-label="Clear Queue"
        title="Clear Queue"
      >
        <ha-icon icon="mdi:delete"></ha-icon></button
      ><button
        class="queue-action${e?` active`:``}"
        data-control="shuffle"
        type="button"
        aria-pressed="${e}"
        aria-label="Toggle Shuffle"
        title="Toggle shuffle"
      >
        <ha-icon icon="mdi:shuffle"></ha-icon></button
      ><button class="queue-action" data-control="close-flyout" type="button" aria-label="Close Queue" title="Close">
        <ha-icon icon="mdi:close"></ha-icon></button
    ></span>
  </div>`}function Ke(e){return E`<div class="volume-flyout-body">
    <ha-control-slider
      class="volume-slider-flyout"
      data-volume
      min="0"
      max="100"
      step="1"
      value="${Math.max(0,Math.min(100,Math.round(e)))}"
      vertical
      show-handle
      tooltip-mode="never"
      aria-label="Volume"
    ></ha-control-slider>
  </div>`}function qe(e){let{activeFlyout:t,clearQueueConfirmOpen:n,queueState:r,speakerState:i,currentPlayerId:a,volumePercent:o}=e;if(!t)return O;let s=t===`queue`?`Queue`:t===`speakers`?`Players`:`Volume`,c=t===`queue`?Ve(r):t===`speakers`?We(i,a):Ke(o),l=n?E`<div class="confirm-backdrop">
        <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-queue-title">
          <h2 class="panel-title" id="clear-queue-title">Clear queue?</h2>
          <p class="panel-copy">This removes all queued items.</p>
          <div class="confirm-actions">
            <button class="control" data-control="clear-queue-cancel" type="button">Cancel</button
            ><button class="control danger" data-control="clear-queue-confirm" type="button">Clear queue</button>
          </div>
        </section>
      </div>`:O;return E`<button
      class="flyout-backdrop"
      data-control="close-flyout"
      type="button"
      aria-label="Close ${s}"
    ></button>
    <aside class="flyout" data-flyout="${t}" aria-label="${s}">
      ${t===`queue`?Ge(r.details?.shuffle_enabled===!0):E`<div class="flyout-header">
          <h2 class="panel-title">${s}</h2>
          <button class="control" data-control="close-flyout" type="button" aria-label="Close ${s}" title="Close">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>`}
      <div class="flyout-body">${c}</div>
    </aside>
    ${l}`}var Q=`music-assistant-card-editor`,Je=class extends HTMLElement{_hass;config={type:`custom:music-assistant-card`,player:``,music_assistant_config_entry_id:``,players:[],layout:`two-column`,show_search:!0,show_queue:!0,click_action:`play`};setConfig(e){let t={...this.config,...e};Array.isArray(t.players)||(t.players=[]),this.config=t,this.render()}set hass(e){this._hass=e,this.render()}render(){this.innerHTML=`
      <style>
        :host { display: block; color: var(--primary-text-color); }
        .editor { display: grid; gap: 16px; padding: 4px 0; }
        .field { display: grid; gap: 6px; }
        .hint { margin: -2px 0 0; color: var(--secondary-text-color); font-size: 12px; line-height: 1.4; }
        ha-entity-picker, ha-input, ha-select { display: block; width: 100%; }
        .switches { display: grid; gap: 4px; }
        ha-switch { --mdc-typography-body1-font-size: 14px; }
      </style>
      <form class="editor" aria-label="Music Assistant card settings">
        <div class="field">
          <ha-entity-picker id="player" label="Player entity"></ha-entity-picker>
          <p class="hint">Choose a Music Assistant player or synchronized group from Home Assistant.</p>
        </div>
        <div class="field">
          <ha-textfield id="config-entry-id" label="Music Assistant config entry ID"></ha-textfield>
          <p class="hint">Required for Favorites and category library loading. Find it in the Music Assistant integration entry.</p>
        </div>
        <div class="field">
          <ha-entity-picker id="players" label="Permitted Players"></ha-entity-picker>
          <p class="hint">Optional. Leave blank to permit all players. The primary player is always included.</p>
        </div>
        <div class="field">
          <ha-select id="action" label="When a song is selected">
            <ha-list-item value="play">Play now</ha-list-item>
            <ha-list-item value="queue">Add to queue</ha-list-item>
          </ha-select>
        </div>
        <div class="switches" aria-label="Show in card">
          <ha-switch id="show-search">Global search</ha-switch>
          <ha-switch id="show-queue">Playback queue</ha-switch>
        </div>
      </form>`;let e=this.getControl(`player`);e.hass=this._hass,e.value=this.config.player,e.includeDomains=[`media_player`],e.label=`Player entity`,this.listenValue(e,`player`);let t=this.getControl(`config-entry-id`);t.value=this.config.music_assistant_config_entry_id??``,t.label=`Music Assistant config entry ID`,this.listenValue(t,`music_assistant_config_entry_id`);let n=this.getControl(`players`);n.hass=this._hass,n.value=this.config.players??[],n.includeDomains=[`media_player`],n.multiple=!0,n.label=`Permitted Players`,this.listenValue(n,`players`);let r=this.getControl(`action`);r.value=this.config.click_action??`play`,this.listenSelect(r,`click_action`);let i=this.getControl(`show-search`);i.checked=this.config.show_search!==!1,this.listenChecked(i,`show_search`);let a=this.getControl(`show-queue`);a.checked=this.config.show_queue!==!1,this.listenChecked(a,`show_queue`)}getControl(e){return this.querySelector(`#${e}`)}listenValue(e,t){let n=e=>{let n=Ye(e)??e.currentTarget.value;t===`players`?this.updateConfig(t,Array.isArray(n)?n:n?[n]:[]):(typeof n==`string`||Array.isArray(n))&&this.updateConfig(t,n)};e.addEventListener(`value-changed`,n),e.addEventListener(`selected`,n)}listenSelect(e,t){let n=e.value,r=e=>{typeof e==`string`&&e!==n&&(n=e,this.updateConfig(t,e))},i=e=>{let t=Ye(e);r(typeof t==`string`?t:e.currentTarget.value)};e.addEventListener(`value-changed`,i),e.addEventListener(`selected`,i),e.querySelectorAll(`[value]`).forEach(e=>{e.addEventListener(`click`,()=>r(e.getAttribute(`value`)))})}listenChecked(e,t){e.addEventListener(`change`,()=>this.updateConfig(t,!!e.checked))}updateConfig(e,t){this.config={...this.config,[e]:t},this.dispatchEvent(new CustomEvent(`config-changed`,{bubbles:!0,composed:!0,detail:{config:this.config}}))}};customElements.get(Q)||customElements.define(Q,Je);function Ye(e){return e.detail?.value}var $=`music-assistant-card`,Xe=class extends HTMLElement{static getConfigElement(){return document.createElement(`music-assistant-card-editor`)}static getStubConfig(){return{type:`custom:music-assistant-card`,player:``,layout:`two-column`,music_assistant_config_entry_id:``,show_search:!0,show_queue:!0,click_action:`play`}}config;_hass;root;container;store=new pe(()=>this.render());queueRequested=!1;searchTimer;mediaRequests=new V;queueRequests=new V;searchRequests=new V;libraryRequests=new V;progressTimer;progressStartedAt=0;progressStartPosition=0;needsReconnectLoad=!1;eventsBound=!1;lastHass;sessionIdentity;actionContext={getHass:()=>this._hass,getConfig:()=>this.config,getState:()=>this.store.getState(),setState:e=>this.store.setState(e),isQueueRequested:()=>this.queueRequested,setQueueRequested:e=>{this.queueRequested=e},loadQueue:()=>this.loadQueue(),loadMedia:(e,t)=>this.loadMedia(e,t),loadSpeakers:()=>this.loadSpeakers(),loadLibrary:e=>this.loadLibrary(void 0,void 0,e),getCurrentSpeakerSelection:()=>this.getCurrentSpeakerSelection()};constructor(){super(),this.root=this.attachShadow({mode:`open`});let e=document.createElement(`style`);e.textContent=de,this.root.appendChild(e),this.container=document.createElement(`div`),this.root.appendChild(this.container),this.bindEvents()}setConfig(e){if(!e||typeof e!=`object`)throw Error(`Music Assistant Card: configuration is required.`);if(typeof e.player!=`string`||!e.player.trim())throw Error(`Music Assistant Card: a player entity is required.`);if(e.players!==void 0&&(!Array.isArray(e.players)||e.players.some(e=>typeof e!=`string`)))throw Error(`Music Assistant Card: players must be a list of entity IDs.`);if(e.click_action&&![`play`,`queue`].includes(String(e.click_action)))throw Error(`Music Assistant Card: click_action must be "play" or "queue".`);let t=this.config,n=Object.fromEntries(Object.entries(e).filter(([e])=>e!==`type`&&!e.startsWith(`music_assistant_`)));this.config={type:$,layout:`two-column`,music_assistant_config_entry_id:typeof e.music_assistant_config_entry_id==`string`?e.music_assistant_config_entry_id.trim():``,show_search:!0,show_queue:!0,click_action:`play`,...n,player:e.player.trim(),players:Array.isArray(e.players)?e.players.filter(e=>typeof e==`string`&&e.trim().length>0):[]},this.config.music_assistant_config_entry_id||this.store.setState({libraryState:{...this.store.getState().libraryState,selectedCategory:null}}),t&&(t.player!==this.config.player||JSON.stringify(t.players)!==JSON.stringify(this.config.players)||t.music_assistant_config_entry_id!==this.config.music_assistant_config_entry_id)?(this.queueRequested=!1,this.mediaRequests.invalidate(),this.queueRequests.invalidate(),this.searchRequests.invalidate(),this.libraryRequests.invalidate(),this.store.setState(B())):this.render()}disconnectedCallback(){this.needsReconnectLoad=!0,this.queueRequested=!1,this.clearSearchTimer(),this.clearProgressTimer(),this.invalidateRequests()}connectedCallback(){!this.needsReconnectLoad||!this._hass||(this.needsReconnectLoad=!1,this.hass=this._hass)}set hass(e){let t=this.sessionIdentity!==void 0&&(this.sessionIdentity.callWS!==e.callWS||this.sessionIdentity.callService!==e.callService);this.sessionIdentity={callWS:e.callWS,callService:e.callService};let n=this.lastHass;this.lastHass=e,this._hass=e,t&&this.invalidateRequests(),this.hasRelevantHassChange(n,e)&&this.render(),this.syncProgressTimer(),this.config?.show_queue&&!this.queueRequested&&(this.queueRequested=!0,this.loadQueue());let r=this.store.getState().libraryState;this.config?.music_assistant_config_entry_id&&this.store.getState().uiState.primaryView===`search`&&!r.loading&&!r.loadingMore&&r.items.length===0&&this.loadLibrary()}hasRelevantHassChange(e,t){if(!e||!this.config)return!0;let n=new Set([this.config.player,...this.config.players??[]]),r=t.states[this.config.player];if(r)for(let e of z(r))n.add(e);let i=e.states[this.config.player];if(i)for(let e of z(i))n.add(e);for(let r of n)if(e.states[r]!==t.states[r])return!0;return!1}getCardSize(){return 6}computeLivePosition(e){if(!e||e.state!==`playing`)return;let t=e.attributes,n=Number(t.media_duration??0),r=Number(t.media_position??this.progressStartPosition),i=Date.parse(String(t.media_position_updated_at??``)),a=Number.isFinite(i)?(Date.now()-i)/1e3:(Date.now()-this.progressStartedAt)/1e3;return Math.max(0,Math.min(r+Math.max(0,a),n||1/0))}syncProgressTimer(){let e=this.config?this._hass?.states[this.config.player]:void 0;if(this.store.getState().uiState.primaryView!==`now-playing`||e?.state!==`playing`){this.clearProgressTimer();return}this.progressTimer||=(this.progressStartedAt=Date.now(),this.progressStartPosition=Number(e.attributes.media_position??0),setInterval(()=>this.updateProgress(),1e3))}clearProgressTimer(){this.progressTimer&&clearInterval(this.progressTimer),this.progressTimer=void 0}updateProgress(){if(!this.config||this.store.getState().uiState.primaryView!==`now-playing`)return;let e=this._hass?.states[this.config.player];if(!e||e.state!==`playing`){this.syncProgressTimer();return}this.render()}async loadMedia(t,n){if(!this._hass||!this.config)return;let r=this.mediaRequests.begin();this.store.setState({browseState:{loading:!0,path:n}});try{let i=await e(this._hass,t);if(!r.isCurrent())return;this.store.setState({browseState:{loading:!1,response:i,path:n}})}catch(e){if(!r.isCurrent())return;this.store.setState({browseState:{loading:!1,path:n,error:e instanceof Error?e.message:`Unable to load media.`}})}}async loadQueue(){if(!this._hass||!this.config)return;let e=this.queueRequests.begin();this.store.setState({queueState:{loading:!0}});try{let t=await s(this._hass,this.config.player);if(!e.isCurrent())return;this.store.setState({queueState:{loading:!1,details:t}})}catch(t){if(!e.isCurrent())return;this.store.setState({queueState:{loading:!1,error:t instanceof Error?t.message:`Unable to load queue.`}})}}render(){if(!this.config)return;this.syncProgressTimer();let{browseState:e,searchState:t,libraryState:n,queueState:r,speakerState:i,uiState:a,operationError:o}=this.store.getState(),s=e.response?.children??[],c=this._hass?.states[this.config.player],l=a.primaryView===`search`?E`<section class="search-screen primary-view" data-primary-view="search">
            ${this.config.show_search?Pe(n.query||t.query):O}
            <div class="search-layout">
              ${Ie(n.selectedCategory)}
              <section class="search-results" aria-label="Media results">
                ${n.selectedCategory?Le(n):t.query?ze(t):E`${Ne(e.path)}${je(e,s)}`}
              </section>
            </div>
          </section>`:E`<section class="now-playing-screen primary-view" data-primary-view="now-playing">
            ${xe(c,this.computeLivePosition(c))}
          </section>`;ue(E`<section class="card" aria-label="Music Assistant">
        ${be(this.getSpeakerLabel(),a.primaryView)} ${l}
        ${qe({activeFlyout:a.activeFlyout,clearQueueConfirmOpen:a.clearQueueConfirmOpen,queueState:r,speakerState:i,currentPlayerId:this.config.player,volumePercent:Number(this._hass?.states[this.config.player]?.attributes.volume_level??0)*100})}
        ${o?E`<p class="state error" role="alert">${o}</p>`:O}
      </section>`,this.container)}getSpeakerLabel(){let e=this._hass?.states[this.config?.player??``],t=(e?[e.entity_id,...z(e)]:[]).map(e=>this._hass?.states[e]?.attributes.friendly_name).filter(e=>typeof e==`string`&&e.trim().length>0);if(t.length>0)return t.join(` + `);let n=this.config?this._hass?.states[this.config.player]?.attributes.friendly_name:void 0;return typeof n==`string`&&n.trim()?n.trim():this.config?.player??`Speaker`}async runSearch(e){if(!this._hass||!e.trim()){this.store.setState({searchState:{query:e.trim(),loading:!1}});return}let t=e.trim(),r=this.searchRequests.begin();this.store.setState({searchState:{query:t,loading:!0}});try{let e=await n(this._hass,t);if(!r.isCurrent()||this.store.getState().searchState.query!==t)return;this.store.setState({searchState:{query:t,loading:!1,response:e}})}catch(e){if(!r.isCurrent()||this.store.getState().searchState.query!==t)return;this.store.setState({searchState:{query:t,loading:!1,error:e instanceof Error?e.message:`Search failed.`}})}}async loadLibrary(e=this.store.getState().libraryState.selectedCategory,t=this.store.getState().libraryState.query,n=!1){if(!(!this._hass||!this.config?.music_assistant_config_entry_id||!e)){if(e===`favorites`){await this.loadFavorites(t,n);return}await this.loadLibraryPage(e,t,n,!1)}}async loadFavorites(e,t){let n=this.store.getState().libraryState;if(n.selectedCategory!==`favorites`||!this._hass||!this.config?.music_assistant_config_entry_id)return;let r=this.libraryRequests.begin(),i=t?n.offset+n.items.length:0;this.store.setState({libraryState:{...n,loading:!t,loadingMore:t,error:void 0,items:t?n.items:[],offset:i}});try{let o=await Promise.all([`artist`,`album`,`track`,`playlist`,`podcast`,`radio`].map(t=>a(this._hass,{configEntryId:this.config.music_assistant_config_entry_id,mediaType:t,favorite:!0,search:e.trim()||void 0,limit:n.limit,offset:i,orderBy:`name`})));if(!r.isCurrent()||this.store.getState().libraryState.selectedCategory!==`favorites`)return;let s=o.flatMap(e=>e.items).filter((e,t,n)=>n.findIndex(t=>t.uri===e.uri)===t),c=t?[...n.items,...s.filter(e=>!n.items.some(t=>t.uri===e.uri))]:s;this.store.setState({libraryState:{...this.store.getState().libraryState,loading:!1,loadingMore:!1,items:c,offset:i,hasMore:o.some(e=>e.items.length===n.limit)}})}catch(e){if(!r.isCurrent())return;this.store.setState({libraryState:{...this.store.getState().libraryState,loading:!1,loadingMore:!1,error:e instanceof Error?e.message:`Unable to load favorites.`}})}}async loadLibraryPage(e,t,n,r){let i=this.store.getState().libraryState,o=i.selectedCategory;if(!o||!this._hass||!this.config?.music_assistant_config_entry_id)return;let s=n?i.offset+i.items.length:0,c=this.libraryRequests.begin();this.store.setState({libraryState:{...i,loading:!n,loadingMore:n,error:void 0,items:n?i.items:[],offset:s}});try{let l=await a(this._hass,{configEntryId:this.config.music_assistant_config_entry_id,mediaType:e,favorite:r,search:t.trim()||void 0,limit:i.limit,offset:s,orderBy:`name`}),u=this.store.getState().libraryState;if(!c.isCurrent()||u.selectedCategory!==o||u.query!==t)return;let d=n?[...u.items,...l.items.filter(e=>!u.items.some(t=>t.uri===e.uri))]:l.items;this.store.setState({libraryState:{...u,loading:!1,loadingMore:!1,items:d,offset:s,hasMore:l.items.length===u.limit}})}catch(e){if(!c.isCurrent())return;this.store.setState({libraryState:{...this.store.getState().libraryState,loading:!1,loadingMore:!1,error:e instanceof Error?e.message:`Unable to load library.`}})}}bindEvents(){this.eventsBound||(this.eventsBound=!0,this.root.addEventListener(`click`,ye(this.actionContext)),this.root.addEventListener(`input`,e=>{let t=e.target;t.matches(`[data-search]`)&&(this.clearSearchTimer(),this.searchTimer=setTimeout(()=>{let e=this.store.getState().libraryState;e.selectedCategory?(this.store.setState({libraryState:{...e,query:t.value.trim()}}),this.loadLibrary(e.selectedCategory,t.value.trim())):this.runSearch(t.value)},350))}),this.root.addEventListener(`change`,e=>{let t=e.target;t.matches(`[data-seek]`)&&W(this.actionContext,async()=>{await H(this.actionContext,`media_player`,`media_seek`,{seek_position:Number(t.value)})})}),this.root.addEventListener(`value-changed`,e=>{let t=e.target;if(!t.matches(`[data-volume]`))return;let n=typeof t.value==`number`?t.value:Number(e.detail?.value);Number.isFinite(n)&&W(this.actionContext,async()=>{await H(this.actionContext,`media_player`,`volume_set`,{volume_level:n/100})})}))}async loadSpeakers(){this.store.setState({speakerState:{loading:!0}});try{let e=Object.values(this._hass?.states??{}).filter(e=>e.entity_id.startsWith(`media_player.`)&&this.isVisiblePlayer(e)),t=this.getCurrentSpeakerSelection();this.store.setState({speakerState:{loading:!1,players:e,selectedPlayerIds:t}})}catch(e){this.store.setState({speakerState:{loading:!1,error:e instanceof Error?e.message:`Unable to load speakers.`}})}}getCurrentSpeakerSelection(){let e=this._hass?.states[this.config?.player??``];return e?[e.entity_id,...z(e)]:[]}isVisiblePlayer(e){return!this.config?.players?.length||e.entity_id===this.config.player||(this.config.players??[]).includes(e.entity_id)}clearSearchTimer(){this.searchTimer&&clearTimeout(this.searchTimer),this.searchTimer=void 0}invalidateRequests(){this.mediaRequests.invalidate(),this.queueRequests.invalidate(),this.searchRequests.invalidate(),this.libraryRequests.invalidate()}};customElements.get($)||customElements.define($,Xe),window.customCards=window.customCards??[],window.customCards.some(e=>e.type===$)||window.customCards.push({type:$,name:`Echo Show Music Assistant Card`,description:`Browse and control Music Assistant from Home Assistant.`,preview:!0})})();