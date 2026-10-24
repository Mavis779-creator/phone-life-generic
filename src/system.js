const APPS_PAGE_1=CONFIG.desktopPages[0],APPS_PAGE_2=CONFIG.desktopPages[1],HOME_PAGES=CONFIG.desktopPages;
/* v1.0 — local world, navigation, media and KakaoTalk. No runtime dependencies. */
function uid(prefix='id'){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);}
function loadState(){
  let s={}; try{s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch{}
  return Object.assign({version:4,photos:CONFIG.photos.map((p,i)=>({...p,id:'seed-'+i})),notes:CONFIG.notes.map((p,i)=>({...p,id:'note-'+i})),chatMessages:CONFIG.chat.map(m=>({...m})),extraChats:{},notifications:CONFIG.initialNotifications.map((n,i)=>({...n,id:'n-'+i,read:false,time:Date.now()-i*60000,chatId:n.app==='KakaoTalk'?'default':null})),activeAccounts:{X:1,Instagram:0,Threads:0,TikTok:0},socialPosts:{},liked:{},comments:{},audioAssetIds:{},profileName:CONFIG.userName,profileBio:CONFIG.template.profileBio,currentTrack:-1,spotifyProgress:0},s);
}
function saveState(){
  if(typeof suppressSave!=='undefined'&&suppressSave)return true;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));state.storageFailed=false;return true;}
  catch{state.storageFailed=true;const el=$('#storageWarning');if(el)el.hidden=false;return false;}
}
function initializeWorld(){
  state.version=4; state.unlocked=false;
  for(const k of ['accounts','drafts','tasks','joinedRooms','followed','pageStates'])state[k]||={};
  state.events||=CONFIG.events.map((x,i)=>({...x,id:'event-'+i,date:localDate(),location:i?'公司 · B2 练习室':'宿舍'}));
  state.friends||=CONFIG.friends.map((f,i)=>({...f,id:'friend-'+i}));
  state.rooms||=CONFIG.template.openRooms||[];
  state.conversations||={};
  if(state.systemStoryRevision!==2)state.conversations.default||={id:'default',name:CONFIG.contactName,messages:state.chatMessages,category:'friends'};
  state.friends.forEach((f,i)=>{const id=state.story?.characters?.[f.storyCharacterId]?.chatId||(f.name===CONFIG.contactName?'default':String(i));state.conversations[id]||={id,name:f.name,friendIndex:i,category:f.handle==='work'?'work':'friends',messages:state.extraChats[id]||(state.systemStoryRevision===2?[]:[{text:f.preview,translation:translateAnyText(f.preview),from:'상대',time:timeNow(),read:false}])};});
  if(state.systemStoryRevision!==2)state.conversations['group-lumi']||={id:'group-lumi',name:'LUMI 练习室',category:'group',members:[0,1,2,3],messages:[{text:'내일 집합 시간 다시 확인해 줘!',translation:'再确认一下明天的集合时间！',from:'상대',read:false,time:timeNow()},{text:'응, 11:30까지 B2로 가면 돼.',translation:'嗯，11:30前到B2就可以。',from:'상대',read:false,time:timeNow()}]};
  Object.values(state.conversations).forEach(c=>c.messages.forEach(m=>{m.id||=uid('msg');m.read??=m.from==='나';m.translation||=translateAnyText(m.text);m.sentAt||=new Date().toISOString();}));
  for(const [platform,list] of Object.entries(CONFIG.socialAccounts)){
    state.accounts[platform]||={};list.forEach((profile,i)=>{
      if(state.accounts[platform][i])return;
      const posts=(state.socialPosts[platform]||[]).filter(p=>p.handle===profile.handle||(platform==='X'&&i===1&&p.handle===CONFIG.twitterHandle));
      state.accounts[platform][i]={profile:{...profile},posts,draft:{text:'',mediaId:null},liked:{},bookmarks:{},reposts:{},comments:{},notifications:[],dms:{},following:{},shares:[]};
    });
  }
  state.pendingReplies||=[];state.browser||={history:[],bookmarks:[],tabs:[]};state.callHistory||=[];
  state.mail||=[];
  state.spotifyPlaying=false; state.lastIncomingAt||=Date.now();initializeProductivity();initializeShop();initializeDelivery();
}
function localDate(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const nav={stack:[],route:{app:'home',params:{}},cache:new Map(),dirty:new Set(),pending:null};
let routeParams={}, mediaPickerTarget=null, cameraStream=null,suppressSave=false;
function routeKey(r=nav.route){return r.app+':'+JSON.stringify(r.params)+':'+(state.activeAccounts[currentSocial]??0);}
function capturePage(){
  if(isCreatorRoute(nav.route.app))return;
  if(nav.dirty.has(nav.route.app))return;
  if(!appContent.firstElementChild)return;
  const nodes=[appContent,...appContent.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+1||e.scrollTop);
  const snapshot={nodes:[...appContent.childNodes],scroll:nodes.map(el=>({el,top:el.scrollTop,left:el.scrollLeft}))};
  nav.cache.set(routeKey(),snapshot);
}
function navigate(app,params={},replace=false){
  leaveCreatorPage(app);leaveReferencePage(app);
  closeSheet();capturePage();stopCamera();
  if(app!=='spotify')playerOpen=false;
  if(!replace)nav.stack.push({...nav.route,params:{...nav.route.params}});
  nav.route={app,params};routeParams=params;currentApp=app;renderApp(app,false);
}
function goBack(){
  closeSheet(); if(activeCallSession&&!activeCallSession.minimized){minimizeLocalCall();return;}
  if(currentApp==='spotify'&&playerOpen){playerOpen=false;renderApp('spotify');return;}
  capturePage();stopCamera();const prev=nav.stack.pop();leaveCreatorPage(prev?.app||'home');leaveReferencePage(prev?.app||'home');
  if(!prev){if(currentApp!=='home')navigate('home',{},true);return;}
  nav.route=prev;routeParams=prev.params||{};currentApp=prev.app;
  if(routeParams.platform)currentSocial=routeParams.platform;
  if(routeParams.chatId)activeChat=routeParams.chatId;
  if(currentApp==='composer')composePlatform=routeParams.platform||currentSocial;
  renderApp(currentApp,false);
}
function goHome(){leaveReferencePage('home');leaveCreatorPage('home');closeSheet();if(activeCallSession&&!activeCallSession.minimized)minimizeLocalCall();capturePage();stopCamera();playerOpen=false;nav.stack=[];nav.route={app:'home',params:{}};routeParams={};currentApp='home';renderApp('home',false);}
function invalidate(app){for(const k of nav.cache.keys())if(!app||k.startsWith(app+':'))nav.cache.delete(k);nav.dirty.add(app||nav.route.app);}
function page(title,body,actions=''){return `<section class="app-page world-page">${renderHeader(title)}<div class="app-scroll world-scroll">${body}</div>${actions}</section>`;}
function renderHeader(title,left='‹',right=''){return `<header class="app-header"><button class="nav-side" data-action="back" aria-label="返回上一级">${uiIcon('back')}</button><h1>${esc(title)}</h1>${right?`<button class="nav-side right" data-action="${right==='保存'?'save-note':right==='＋'?'new-note':'edit-profile'}">${esc(right)}</button>`:'<span class="nav-side"></span>'}</header>`;}
function button(action,text,extra='',cls='plain-button'){return `<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;}
function input(id,placeholder,value='',type='text'){return `<input id="${id}" class="world-input" type="${type}" placeholder="${esc(placeholder)}" value="${esc(value)}">`;}
function empty(text){return `<div class="empty-state">${esc(text)}</div>`;}
function uiIcon(name){
  const paths={back:'<path d="m15 5-7 7 7 7"/>',home:'<path d="m3 11 9-8 9 8v10h-7v-7h-4v7H3z"/>',search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',heart:'<path d="M12 21 3 12C-2 5 6 0 12 7 18 0 26 5 21 12Z"/>',message:'<path d="M3 3h18v14H9l-6 4Z"/>',plus:'<path d="M12 3v18M3 12h18"/>',user:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3Z"/>',more:'<circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="20" cy="12" r="1"/>',bookmark:'<path d="M5 3h14v19l-7-5-7 5Z"/>',share:'<path d="m3 11 18-8-8 18-3-9Z"/>',reply:'<path d="M21 17v-3a6 6 0 0 0-6-6H4m6-5L4 8l6 5"/>',repost:'<path d="m3 7 4-4 4 4M7 3v14h7m7 0-4 4-4-4m4 4V7h-7"/>',bell:'<path d="M4 18h16l-2-4V8a6 6 0 0 0-12 0v6Zm5 3h6"/>',play:'<path d="m8 4 13 8-13 8Z"/>',pause:'<path d="M8 4v16M16 4v16"/>',grid:'<rect x="3" y="3" width="18" height="18"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',settings:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4M4 4l3 3m10 10 3 3M4 20l3-3M17 7l3-3"/>'};
  return `<svg viewBox="0 0 24 24" class="ui-icon" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.more}</svg>`;
}
function iconSvg(name){
if(name==='delivery')return '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#526b47"/><path d="M22 43h56a28 28 0 0 1-56 0Z" fill="#fff8e9"/><path d="M16 42h68M35 30c-8-8 7-8 0-17m17 17c-8-8 7-8 0-17m17 17c-8-8 7-8 0-17" fill="none" stroke="#fff8e9" stroke-width="4" stroke-linecap="round"/><path d="M38 77h24" stroke="#fff8e9" stroke-width="5" stroke-linecap="round"/></svg>';
if(name==='shop')return '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="shop-paper" x2="1" y2="1"><stop stop-color="#faf5e8"/><stop offset="1" stop-color="#d9bf91"/></linearGradient></defs><rect width="100" height="100" fill="url(#shop-paper)"/><path d="M25 34h50l4 48H21zM37 38V28a13 13 0 0 1 26 0v10" fill="none" stroke="#373b3c" stroke-width="5" stroke-linejoin="round"/><path d="m41 58 6 7 13-16" fill="none" stroke="#373b3c" stroke-width="4" stroke-linecap="round"/></svg>';
if(name==='calendar')return dynamicCalendarIcon();
const artwork=CONFIG.appStoreIcons?.[name];
if(artwork)return `<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><image href="${artwork}" x="0" y="0" width="100" height="100"/></svg>`;
const day=now().getDate();
const icons={
 phone:`<path d="M29 17 42 13 49 32 39 40C45 54 56 65 70 71L78 61 96 69 92 83C90 91 82 95 73 92 42 81 19 58 9 28 6 20 13 12 21 14Z" fill="#fff" transform="translate(7 4) scale(.86)"/>`,
 kakao:`<path d="M50 17C29 17 12 30 12 46c0 11 8 21 21 26l-5 14 20-11c1 .1 2 .1 3 .1 21 0 38-13 38-29S71 17 50 17Z" fill="#231f20"/><circle cx="39" cy="45" r="3.2" fill="#fee500"/><circle cx="50" cy="45" r="3.2" fill="#fee500"/><circle cx="61" cy="45" r="3.2" fill="#fee500"/>`,
 instagram:`<rect x="18" y="18" width="64" height="64" rx="19" fill="none" stroke="#fff" stroke-width="8"/><circle cx="50" cy="50" r="16" fill="none" stroke="#fff" stroke-width="8"/><circle cx="70" cy="30" r="5" fill="#fff"/>`,
 x:`<path d="M17 13h17l19 25 21-25h9L57 44l28 43H68L48 59 27 87h-9l26-33L17 13Zm14 7H27l41 60h5L31 20Z" fill="#fff"/>`,
 threads:`<path d="M68 43c-1-17-9-27-24-27-17 0-28 12-28 33 0 20 10 35 29 35 15 0 25-8 25-21 0-10-7-17-19-17-10 0-17 5-17 13 0 7 5 11 11 11 9 0 15-8 16-20 1-12-5-19-15-19-7 0-13 4-16 10" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
 tiktok:`<path d="M58 15v42c0 16-10 27-25 27-13 0-22-9-22-21 0-14 11-24 27-22v14c-7-2-13 1-13 8 0 5 4 8 9 8 7 0 11-5 11-14V15h13c2 11 9 18 22 19v14c-9 0-17-3-22-8" fill="#25F4EE" transform="translate(-4 1)"/><path d="M58 15v42c0 16-10 27-25 27-13 0-22-9-22-21 0-14 11-24 27-22v14c-7-2-13 1-13 8 0 5 4 8 9 8 7 0 11-5 11-14V15h13c2 11 9 18 22 19v14c-9 0-17-3-22-8" fill="#FE2C55" transform="translate(4 -1)"/><path d="M58 15v42c0 16-10 27-25 27-13 0-22-9-22-21 0-14 11-24 27-22v14c-7-2-13 1-13 8 0 5 4 8 9 8 7 0 11-5 11-14V15h13c2 11 9 18 22 19v14c-9 0-17-3-22-8" fill="#fff"/>`,
 spotify:`<circle cx="50" cy="50" r="39" fill="#1ED760"/><path d="M25 39c18-6 39-3 53 5M29 51c15-5 32-2 44 5M33 63c11-3 24-1 34 4" fill="none" stroke="#07130b" stroke-width="6" stroke-linecap="round"/>`,
 youtube:`<rect x="13" y="27" width="74" height="46" rx="15" fill="#ff0033"/><path d="M44 38 65 50 44 62Z" fill="#fff"/>`,
 weverse:`<image href="${CONFIG.weverseAppIcon}" x="0" y="0" width="100" height="100"/>`,
 photos:`<g transform="translate(50 50)"><ellipse cx="0" cy="-23" rx="11" ry="21" fill="#ff6259"/><ellipse cx="0" cy="-23" rx="11" ry="21" fill="#ffb340" transform="rotate(60)"/><ellipse cx="0" cy="-23" rx="11" ry="21" fill="#f7d94c" transform="rotate(120)"/><ellipse cx="0" cy="-23" rx="11" ry="21" fill="#54c66b" transform="rotate(180)"/><ellipse cx="0" cy="-23" rx="11" ry="21" fill="#49b8f2" transform="rotate(240)"/><ellipse cx="0" cy="-23" rx="11" ry="21" fill="#9b75ed" transform="rotate(300)"/><circle r="10" fill="#fff"/></g>`,
 calendar:`<rect x="14" y="12" width="72" height="76" rx="11" fill="#fff"/><path d="M14 23a11 11 0 0 1 11-11h50a11 11 0 0 1 11 11v13H14Z" fill="#ff3b30"/><path d="M32 9v15M68 9v15" stroke="#ff3b30" stroke-width="6" stroke-linecap="round"/><text x="50" y="70" text-anchor="middle" font-size="42" font-weight="750" fill="#17171a">${day}</text>`,
 notes:`<rect x="13" y="10" width="74" height="80" rx="10" fill="#fff"/><path d="M13 21a11 11 0 0 1 11-11h52a11 11 0 0 1 11 11v10H13Z" fill="#ffe86c"/><path d="M28 45h44M28 57h44M28 69h35" stroke="#b7b7bc" stroke-width="5" stroke-linecap="round"/>`,
 maps:`<rect x="12" y="10" width="76" height="80" rx="12" fill="#fff"/><path d="M15 28 38 18 61 29 85 18v54L61 83 38 72 15 83Z" fill="#e8f3e7" stroke="#b6d8d5" stroke-width="2"/><path d="M38 18v54M61 29v54" stroke="#8ec4a8" stroke-width="5"/><path d="M22 62 42 43 56 54 80 30" fill="none" stroke="#4e9ff5" stroke-width="7" stroke-linecap="round"/><path d="M52 25c-9 0-15 7-15 15 0 11 15 27 15 27s15-16 15-27c0-8-6-15-15-15Z" fill="#4285f4"/><circle cx="52" cy="40" r="5" fill="#fff"/>`,
 settings:`<defs><linearGradient id="settings-metal" x2="0" y2="1"><stop stop-color="#f4f4f6"/><stop offset="1" stop-color="#919399"/></linearGradient></defs><rect width="100" height="100" fill="#b8bac0"/><circle cx="50" cy="50" r="40" fill="#6d7076" stroke="#e3e4e8" stroke-width="3"/><g stroke="url(#settings-metal)" stroke-width="10">${Array.from({length:16},(_,i)=>`<path d="M50 11v12" transform="rotate(${i*22.5} 50 50)"/>`).join('')}</g><circle cx="50" cy="50" r="26" fill="none" stroke="url(#settings-metal)" stroke-width="9"/><circle cx="50" cy="50" r="14" fill="#74777d" stroke="#d8d9de" stroke-width="3"/><path d="m44 37 13 9-2 16m-12-2-2-15 14-7" fill="none" stroke="#b9bbc1" stroke-width="4" stroke-linejoin="round"/>`,
 safari:`<circle cx="50" cy="50" r="39" fill="#fff"/><circle cx="50" cy="50" r="33" fill="none" stroke="#1687e8" stroke-width="4"/><path d="m67 27-12 31-22 15 12-31Z" fill="#fa3c44"/><path d="m67 27-22 15 10 16Z" fill="#1687e8"/>`,
 mail:`<rect x="12" y="23" width="76" height="54" rx="7" fill="#fff"/><path d="m15 28 35 28 35-28" fill="none" stroke="#3a9df4" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
 company:`<path d="M15 27 24 12h62L77 27Z" fill="#d4d6dc"/><path d="M18 32h66v54H18Z" fill="#fff"/><path d="m26 13 12 14M48 13l12 14M70 13l10 14" stroke="#60636d" stroke-width="8"/><path d="m36 42 13 29M55 42l13 29" stroke="#60636d" stroke-width="7"/>`,
 notifications:`<path d="M50 15c-15 0-23 11-23 27 0 16-8 20-12 26h70c-4-6-12-10-12-26 0-16-8-27-23-27Z" fill="#fff"/><path d="M42 78c2 8 14 8 16 0" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
 camera:`<rect x="11" y="27" width="78" height="55" rx="10" fill="#f2f2f5"/><path d="M26 27 34 16h28l8 11" fill="#d4d5dc"/><circle cx="50" cy="54" r="21" fill="#4a4e59"/><circle cx="50" cy="54" r="14" fill="#121720"/><circle cx="44" cy="48" r="6" fill="#7db8ff"/><circle cx="50" cy="54" r="8" fill="none" stroke="#9aa8c1" stroke-width="2"/>`,
 plus:`<path d="M50 22v56M22 50h56" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>`
};
return `<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${icons[name]||icons.photos}</svg>`;
}

function appIcon(id,label,cls){
  const count=id==='gmail'?(state.mail||[]).filter(m=>m.box==='收件箱'&&!m.read).length:id==='reminders'?(state.productivity?.reminders||[]).filter(r=>!reminderDone(r)&&r.due&&Date.parse(r.due)<=Date.now()).length:id==='kakao'?Object.values(state.conversations||{}).reduce((a,c)=>a+unread(c),0):id==='notifications'?state.notifications.filter(n=>!n.read).length:['instagram','x','threads','tiktok'].includes(id)?Object.values(state.accounts[id==='instagram'?'Instagram':id==='x'?'X':id==='threads'?'Threads':'TikTok']||{})[state.activeAccounts[id==='instagram'?'Instagram':id==='x'?'X':id==='threads'?'Threads':'TikTok']||0]?.notifications?.filter(n=>!n.read).length||0:0;
  const supported=true;
  const aliases={chrome:'safari'};
  const marks={chrome:'◉'};
  let svg=iconSvg(aliases[id]||id);
  if(marks[id])svg=`<span class="brand-glyph">${marks[id]}</span>`;
  const badges=count||(['weverse','youtube'].includes(id)?state.notifications.filter(n=>!n.read&&n.creatorPlatform===id&&(id!=='youtube'||n.creatorOwner===state.youtube?.activeChannelId)).length:0);
  return `<button class="app-icon-button" data-app="${id}" aria-label="${esc(label)}"><span class="app-icon ${cls}${CONFIG.appStoreIcons?.[id]?' app-store-artwork':''}">${svg}</span>${badges?`<span class="badge">${badges>99?'99+':badges}</span>`:''}<span class="app-label">${esc(label)}</span></button>`;
}
function renderHome(){
  const today=now(),p=state.photos.find(p=>p.assetId&&p.type!=='video');
  return `<section class="home-screen" id="homeScreen"><div class="home-inner"><div class="widgets"><button class="widget calendar-widget" data-app="calendar"><div class="widget-label"><span>${today.toLocaleDateString('zh-CN',{weekday:'short'})}</span><span>${today.getMonth()+1}月</span></div><div class="calendar-number">${today.getDate()}</div><div class="widget-event">${esc(state.events.find(e=>e.date===localDate())?.title||'今天没有日程')}</div></button><button class="widget recent-widget" data-app="photos">${p?`<img src="${esc(assetSrc(p.assetId))}" alt="最近导入的照片">`:'<div class="photo-memory"><span>◯</span><span>◯</span></div>'}<span class="recent-caption">最近项目 · 照片</span></button></div><div class="app-grid">${(HOME_PAGES[homePage]||APPS_PAGE_1).map(a=>appIcon(...a)).join('')}</div><div class="home-bottom">${button('spotlight',uiIcon('search')+' 搜索','','search-pill')}<div class="page-dots">${HOME_PAGES.map((_,i)=>`<button data-home-page="${i}" class="${homePage===i?'active':''}" aria-label="第${i+1}页"></button>`).join('')}</div><div class="dock">${appIcon('phone','电话','app-phone')}${appIcon('kakao','KakaoTalk','app-kakao')}${appIcon('safari','Safari','app-safari')}${appIcon('applemusic','音乐','app-applemusic')}</div></div></div></section>`;
}
function setWallpaper(){const src=assetSrc(state.wallpaperId)||CONFIG.wallpaper;if(src)lockLayer.style.backgroundImage=`url("${src}")`;else lockLayer.style.removeProperty('background-image');const home=$('.home-screen');if(home){if(src)home.style.backgroundImage=`url("${src}")`;else home.style.removeProperty('background-image');}}
function setHomeBg(){setWallpaper();}
function account(platform){const i=state.activeAccounts[platform]||0;return state.accounts?.[platform]?.[i]?.profile||CONFIG.socialAccounts[platform]?.[i]||{};}
function activeAccount(platform=currentSocial,index=state.activeAccounts[platform]||0){return state.accounts[platform][index];}
function friendAvatarHtml(f,size=''){const palettes={pink:['#d9a6bd','#b4a0d5'],blue:['#a8cce2','#839acb'],green:['#a8d3be','#76a89c'],gray:['#c9cbd0','#9399a7'],purple:['#a18ceb','#d394bc'],orange:['#f0c9a1','#cf9f8a']};const pair=palettes[f?.tone]||palettes.purple;const src=assetSrc(f?.avatarId)||f?.avatar;return `<span class="avatar ${size}" style="background:${src?'transparent':`linear-gradient(135deg,${pair[0]},${pair[1]})`}">${src?`<img src="${esc(src)}" alt="头像">`:esc((f?.name||'?').slice(0,1))}</span>`;}
function profileAvatarHtml(size=''){const a=['x','threads','instagram-feed','tiktok','social-profile','composer','social-search','social-dms','social-chat','social-post'].includes(currentApp)?account(currentSocial):null;return friendAvatarHtml({name:a?.name||state.profileName,avatarId:a?.avatarId||(!a?state.avatarId:null),avatar:a?.avatar||(!a?CONFIG.avatar:'')},size);}
function bilingual(text,translation='',cls='translation'){return `<span class="original">${esc(text||'')}</span>${hasKorean(text)?`<span class="${cls}">中文：${esc(translation||translateAnyText(text)||'暂无译文')}</span>`:''}`;}
function conversation(id=activeChat){return state.conversations[id];}
function unread(c){return c.messages.filter(m=>m.from!=='나'&&!m.read&&!m.deleted).length;}
function readChat(id){const c=conversation(id);if(!c)return;c.messages.forEach(m=>m.read=true);state.notifications.filter(n=>n.app==='KakaoTalk'&&n.chatId===id).forEach(n=>n.read=true);saveState();renderLockNotifications();invalidate('kakao-chats');invalidate('home');}
function renderKakaoTabbar(active){const tabs=[['friends','好友','user'],['chats','聊天','message'],['open','现在','repost'],['more','更多','more']];return `<nav class="kakao-tabbar">${tabs.map(([id,label,ico])=>`<button data-tab="${id}" class="${active===id?'active':''}" aria-label="${label}">${uiIcon(ico)}<small>${label}</small>${id==='chats'&&Object.values(state.conversations).some(c=>unread(c))?'<i class="kakao-tab-dot"></i>':''}</button>`).join('')}</nav>`;}
function renderKakao(){return renderKKFriends();}
function renderKakaoChats(){return renderKKChats();}
function renderFriendProfile(){return renderKKProfile(true);}
function openFriend(i){navigate('friend-profile',{index:Number(i)});}
function chatTargetFor(i){const f=state.friends[i];return state.story?.characters?.[f?.storyCharacterId]?.chatId||(f?.name===CONFIG.contactName?'default':String(i));}
function openChatTarget(id){activeChat=String(id);if(!conversation(activeChat))return;if(state.rooms.some(r=>r.id===activeChat)&&!state.joinedRooms[activeChat]){navigate('room-detail',{id:activeChat});return;}readChat(activeChat);navigate('kakao-chat',{chatId:activeChat});}
function openDefaultChat(){openChatTarget('default');}
function getChatMessages(){return conversation()?.messages||[];}
function renderKakaoChat(){return renderKKConversation();}
function addChatMessage(text,from='나',chatId=activeChat,extra={}){const c=conversation(chatId);if(!c)return;const open=lockLayer.classList.contains('hidden')&&currentApp==='kakao-chat'&&activeChat===chatId;const m={id:uid('msg'),text,translation:translateAnyText(text),from,time:timeNow(),sentAt:new Date().toISOString(),read:from==='나'||open,...extra};c.messages.push(m);saveState();invalidate();if(from!=='나')addNotification('KakaoTalk',c.name,text,m.translation,{chatId,read:open});return m;}
function sendKakao(text,mediaId=null){
  if(conversation()?.fanAccountId&&!state.joinedRooms[activeChat])throw Error('请先重新加入聊天室');
  if(blockMainlineInput({channel:'kakao',chatId:activeChat}))return;
  if(state.rooms.some(r=>r.id===activeChat)&&!state.joinedRooms[activeChat])return;
  const clean=String(text||'').trim();if(!clean&&!mediaId)return;
  const draft=state.drafts['kakao:'+activeChat]||{};
  const sent=addChatMessage(clean,'나',activeChat,{mediaId,quote:draft.quote||''});state.drafts['kakao:'+activeChat]={text:''};
  if(scheduleKakaoGroupReply(clean,sent.id)){saveState();renderApp('kakao-chat');return;}if(conversation().self){saveState();renderApp('kakao-chat');return;}if(storyHandleInput({channel:'kakao',chatId:activeChat},clean,sent.id)){saveState();renderApp('kakao-chat');return;}const seq=(conversation().sendCount=(conversation().sendCount||0)+1);
  if(!CONFIG.npcReplies.length){saveState();renderApp('kakao-chat');return;}
  const reply=CONFIG.npcReplies[(seq-1)%CONFIG.npcReplies.length];
  if(seq%4!==0){state.pendingReplies.push({id:uid('pending'),kind:'kakao',chatId:activeChat,due:Date.now()+reply.delay,text:reply.text,translation:reply.translation});if(seq%3===0){const second=CONFIG.npcReplies[1];state.pendingReplies.push({id:uid('pending'),kind:'kakao',chatId:activeChat,due:Date.now()+reply.delay+4000,text:second.text,translation:second.translation});}}else state.pendingReplies.push({id:uid('pending'),kind:'read',chatId:activeChat,due:Date.now()+10000});
  saveState();renderApp('kakao-chat');showToast('消息已发送','已保存到当前会话。');
}
function processWorld(){
  const due=state.pendingReplies.filter(p=>p.due<=Date.now());state.pendingReplies=state.pendingReplies.filter(p=>p.due>Date.now());
  for(const p of due){if(p.kind==='read'){conversation(p.chatId)?.messages.filter(m=>m.from==='나').forEach(m=>m.read=true);invalidate('kakao-chat');if(currentApp==='kakao-chat'&&activeChat===p.chatId)renderApp(currentApp);}else if(p.kind==='kakao'){
    const c=conversation(p.chatId);if(!c)continue;c.messages.filter(m=>m.from==='나').forEach(m=>m.read=true);
    addChatMessage(p.text,'상대',p.chatId,{translation:p.translation});
    if(currentApp==='kakao-chat'&&activeChat===p.chatId&&lockLayer.classList.contains('hidden')){readChat(p.chatId);renderApp(currentApp);}
  }else receiveDM(p);}
  if(due.length)saveState();tickStory();tickMessageMainline();tickSocialWorld();tickPlayer();tickCreators();tickProductivity();tickShop();tickDelivery();
  if(CONFIG.npcReplies.length&&!storyEnabled()&&Date.now()-state.lastIncomingAt>120000&&!document.hidden){state.lastIncomingAt=Date.now();const r=CONFIG.npcReplies[Math.floor(Math.random()*CONFIG.npcReplies.length)];addChatMessage(r.text,'상대','default',{translation:r.translation});if(currentApp==='kakao-chat'&&activeChat==='default')renderApp(currentApp);saveState();}
}
function renderKakaoOpen(){return renderKakaoOpenPlus();}
function renderKakaoMore(){return renderKKMore();}
function renderRoom(){const r=state.rooms.find(r=>r.id===routeParams.id);if(!r)return page('聊天室',empty('这个聊天室已不存在'));const joined=!!state.joinedRooms[r.fanCircle?fanRoomChatId(r.id):r.id];return page(r.name,`<div class="world-form"><h2>${esc(r.name)}</h2><p>${esc(r.description)}</p><p>${r.members+(joined?1:0)} 位成员 · ${esc(r.category)}</p>${r.fanCircle?`<p class="small-note">以 X 账号 @${esc(account('X').handle)} 加入，聊天与其他账号独立。</p>`:''}${button('join-room',joined?'打开聊天':'加入聊天室',`data-id="${r.id}"`)}${joined?button('leave-room','退出聊天室',`data-id="${r.id}"`):''}</div>`);}

function renderChatMenu(){const c=conversation();return page('聊天室',`<h3 class="section-title">${esc(c.name)}</h3>${(c.members||[state.friends.findIndex(f=>f.name===c.name)]).filter(i=>i>=0).map(i=>`<button class="list-row" data-friend="${i}">${friendAvatarHtml(state.friends[i])}<span>${esc(state.friends[i].name)}</span></button>`).join('')}${button('kakao-call','模拟语音通话')}${button('kakao-video','模拟视频通话')}${button('clear-chat','清空会话消息')}`);}
function addNotification(app,title,body,translation='',extra={}){
  const n={id:uid('notice'),app,title,body,translation:translation||translateAnyText(body),read:false,time:Date.now(),...extra};state.notifications.unshift(n);trimStoryNotifications();saveState();renderLockNotifications();invalidate('notifications');invalidate('home');
  if(!n.read&&!(app==='KakaoTalk'&&state.muteKakao)&&(!lockPreferences().focus||n.kind==='call')){showToast(title,body,app,n.translation);$('#toast').dataset.notification=n.id;}return n;
}
function showToast(title,body,app='系统',translation=''){const t=$('#toast');t.removeAttribute('data-notification');$('#toastTitle').textContent=title;$('#toastBody').innerHTML=bilingual(body,translation,'toast-translation');$('.toast-app',t).textContent=app==='KakaoTalk'?'●':app==='Instagram'?'◎':app==='Spotify'?'♫':'◷';t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4200);}
function renderLockNotifications(){const root=$('#lockNotifications');root.innerHTML=state.notifications.filter(n=>!n.read).slice(0,3).map(n=>`<button class="lock-notification" data-action="open-notification" data-id="${n.id}"><span class="notif-icon">${uiIcon('message')}</span><span><strong>${esc(n.title)}</strong><span class="notification-copy">${bilingual(n.body,n.translation,'notif-translation')}</span></span></button>`).join('');}
function renderNotifications(){return page('通知中心',`${button('mark-all-read','全部已读')}${state.notifications.map(n=>`<button class="list-row notification-row" data-action="open-notification" data-id="${n.id}"><span class="notif-icon">${uiIcon('bell')}</span><span class="list-main"><strong>${esc(n.title)}</strong>${bilingual(n.body,n.translation)}</span><span>${n.read?'':'●'}</span></button>`).join('')||empty('没有新通知')}`);}
function openNotification(id){const n=state.notifications.find(n=>n.id===id);if(!n)return;if(!lockLayer.classList.contains('hidden')){nav.pending=id;showPasscode();return;}n.read=true;$('#toast').classList.remove('show');if(n.storyRoute){const r=n.storyRoute;if(r.params?.platform)currentSocial=r.params.platform;navigate(r.app,r.params||{});saveState();renderLockNotifications();return;}if(openDeliveryNotification(n)){saveState();renderLockNotifications();return;}if(openShopNotification(n)){saveState();renderLockNotifications();return;}if(openProductivityNotification(n)){saveState();renderLockNotifications();return;}if(openCreatorNotification(n)){saveState();renderLockNotifications();return;}if(n.kind==='call'){openCallNotification(n);saveState();renderLockNotifications();return;}if(n.app==='KakaoTalk')openChatTarget(n.chatId||'default');else if(n.platform&&n.peer){invalidate();nav.stack=[];state.activeAccounts[n.platform]=n.accountIndex;currentSocial=n.platform;n.read=true;openDM(n.platform,n.peer);}else if(n.app==='日历')navigate('calendar');else navigate('notifications');saveState();renderLockNotifications();}
function addDigit(d){if(passcode.length>=4)return;passcode+=d;$$('#passDots i').forEach((el,i)=>el.classList.toggle('filled',i<passcode.length));if(passcode.length!==4)return;if(passcode===devicePasscode()){lockLayer.classList.add('hidden');passcodeScreen.classList.remove('show');state.unlocked=true;const target=nav.pending;nav.pending=null;saveState();if(target==='camera')navigate('camera');else if(target?.island)openIslandTarget(target.activity);else if(target?.utilityRoute)navigate(target.utilityRoute,target.params||{});else if(target)openNotification(target);else goHome();storyPresentUpdates();}else{$('#passError').textContent='密码不正确，请重试';setTimeout(()=>{passcode='';$$('#passDots i').forEach(el=>el.classList.remove('filled'));},650);}}
function resetToLock(){leaveReferencePage('lock');leaveCreatorPage('lock');closeSheet();stopCamera();lockLayer.classList.remove('hidden');passcodeScreen.classList.remove('show');state.unlocked=false;passcode='';renderLockNotifications();saveState();}
function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}}
async function dbPut(file){if(!assetDB)throw new Error('浏览器未开放本地媒体存储，请使用普通浏览模式。');const id=uid('asset');await new Promise((resolve,reject)=>{const tx=assetDB.transaction('assets','readwrite');tx.objectStore('assets').put({id,name:file.name,type:file.type,blob:file});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});assetUrls[id]=URL.createObjectURL(file);return id;}
async function uploadFiles(files){let count=0;for(const file of files){if(!/^(image|video)\//.test(file.type))continue;const assetId=await dbPut(file);state.photos.unshift({id:uid('photo'),title:file.name,caption:'本地导入',assetId,type:file.type.startsWith('video/')?'video':'image',createdAt:Date.now(),favorite:false});count++;}saveState();invalidate();if(mediaPickerTarget){showMediaPicker(mediaPickerTarget);return;}renderApp(currentApp);showToast('导入完成',`已添加 ${count} 个项目到图库。`);}
async function uploadWallpaper(file){if(!file)return;await uploadFiles([file]);const p=state.photos[0];setPhotoAs(p.id,'wallpaper');}
async function uploadAvatar(file){if(!file)return;await uploadFiles([file]);setPhotoAs(state.photos[0].id,'avatar');}
function setPhotoAs(id,what){const p=state.photos.find(p=>p.id===id);if(!p?.assetId||p.type==='video'){showToast('请选择真实图片','请从本地导入一张照片。');return;}if(what==='wallpaper')state.wallpaperId=p.assetId;else if(what==='avatar')state.avatarId=p.assetId;else if(what==='post'){choosePostPlatform(id);return;}saveState();invalidate();setWallpaper();showToast('设置成功',what==='avatar'?'已更新手机个人头像。':'锁屏和桌面壁纸已更新。');}
function mediaHtml(p,cls=''){const src=p?.assetId?assetSrc(p.assetId):p?.src;if(!src)return `<div class="media-placeholder ${cls}"><span>◯</span><small>${esc(p?.title||'尚无媒体')}</small></div>`;return p.type==='video'?`<video class="${cls}" src="${esc(src)}" controls playsinline preload="metadata"></video>`:`<img class="${cls}" src="${esc(src)}" alt="${esc(p.title||'照片')}">`;}
function renderPhotos(){return page('照片',`${button('upload-photos','＋ 导入照片 / 视频')}${input('filterInput','搜索照片名称')}<div class="photo-toolbar"><strong>${routeParams.favorites?'收藏':'最近项目'}</strong>${button('photo-filter',routeParams.favorites?'全部项目':'只看收藏')}</div><div class="photo-grid">${state.photos.filter(p=>!routeParams.favorites||p.favorite).map(p=>`<button class="photo-tile searchable" data-photo="${p.id}" data-search="${esc(p.title)}">${p.type==='video'?`<video src="${esc(assetSrc(p.assetId))}" muted preload="metadata"></video><span class="video-label">视频</span>`:mediaHtml(p)}${p.favorite?'<span class="favorite-label">♥</span>':''}</button>`).join('')}</div>`,renderTabbar([['library','▦','图库'],['albums','♡','收藏'],['search','⌕','搜索']],'library'));}
function renderPhotoViewer(){const p=state.photos.find(p=>p.id===currentPhotoId);if(!p)return page('照片',empty('该照片已删除'));return `<section class="photo-viewer"><div class="photo-viewer-top">${button('back',uiIcon('back'))}<span>${esc(p.title)}</span>${button('delete-photo','删除',`data-id="${p.id}"`)}</div><div class="photo-stage">${mediaHtml(p)}</div><div class="photo-viewer-actions">${button('favorite-photo',p.favorite?'♥ 已收藏':'♡ 收藏',`data-id="${p.id}"`)}${p.type!=='video'?button('set-wallpaper','设为壁纸',`data-photoid="${p.id}"`)+button('set-avatar','设为头像',`data-photoid="${p.id}"`):''}${button('post-photo','用于发布',`data-photoid="${p.id}"`)}${p.assetId?button('pu-share-photo','分享',`data-id="${p.id}"`):''}</div></section>`;}
function sheet(title,body){closeSheet();const el=document.createElement('section');el.className='world-sheet';el.setAttribute('role','dialog');el.setAttribute('aria-label',title);el.innerHTML=`<div class="sheet-scrim" data-action="close-sheet"></div><div class="sheet-panel"><header><strong>${esc(title)}</strong>${button('close-sheet','关闭')}</header><div class="sheet-content">${body}</div></div>`;device.append(el);el.querySelector('input,textarea,button')?.focus();}
function closeSheet(){mediaPickerTarget=null;$$('.world-sheet,.account-picker,.compose-modal:not(#appContent .compose-modal)').forEach(el=>{el.querySelectorAll('video,audio').forEach(m=>m.pause());el.remove();});}
function showMediaPicker(target){sheet('选择本地媒体',`${button('upload-photos','＋ 导入本地文件')}<div class="photo-grid">${state.photos.filter(p=>p.assetId&&(target==='compose'||p.type!=='video')).map(p=>`<button class="photo-tile" data-action="pick-media" data-id="${p.id}">${mediaHtml(p)}</button>`).join('')}</div>`);mediaPickerTarget=target;}
function choosePostPlatform(id){sheet('发布到哪个账号？',Object.keys(CONFIG.socialAccounts).map(p=>button('photo-compose',p+': @'+esc(account(p).handle),`data-platform="${p}" data-id="${id}"`)).join(''));}
function renderApp(app,force=true){
  if(force&&isCreatorRoute(currentApp))pauseCreatorPlayback();
  if(force&&socialNightRoute(currentApp))pauseCreatorPlayback();
  const focused=force&&appContent.contains(document.activeElement)?document.activeElement:null;
  const focusState=focused?.id?{id:focused.id,start:focused.selectionStart,end:focused.selectionEnd}:null;
  const scrollBefore=force?[...appContent.querySelectorAll('.app-scroll,.reel-feed')].map(el=>el.scrollTop):[];
  const oldHistory=appContent.querySelector('.kakao-history');const historyPosition=force&&oldHistory&&oldHistory.scrollHeight-oldHistory.scrollTop-oldHistory.clientHeight>90?oldHistory.scrollTop:null;
  currentApp=app;routeParams=nav.route.params||{};$('#statusbar').dataset.app=app;appContent.dataset.platform=currentSocial;
  if(routeParams.platform)currentSocial=routeParams.platform;
  if(routeParams.chatId)activeChat=routeParams.chatId;
  if(routeParams.feedTab)currentSocialTab=routeParams.feedTab;
  if(app==='photo-viewer'&&routeParams.id)currentPhotoId=routeParams.id;
  if(app==='note-edit'&&routeParams.id)state.editingNote=state.notes.findIndex(n=>n.id===routeParams.id);
  if(force)invalidate(app);
  const cached=!force&&!isCreatorRoute(app)&&nav.cache.get(routeKey());
  appView.className=app==='home'?'home':'';
  appView.dataset.appearance=socialNightRoute(app)?'night':'';appContent.classList.toggle('social-night-surface',socialNightRoute(app));$('#statusbar').dataset.appearance=socialNightRoute(app)?'night':'';$('#statusbar').classList.toggle('dark',!socialNightRoute(app)&&!['home','photo-viewer','camera','x','tiktok'].includes(app));$('#homeIndicator').classList.toggle('dark',!socialNightRoute(app)&&!['home','photo-viewer','camera','x','tiktok'].includes(app));
  if(cached){appContent.replaceChildren(...cached.nodes);cached.scroll.forEach(s=>{s.el.scrollTop=s.top;s.el.scrollLeft=s.left;});}
  else{
    const renders={...CREATOR_ROUTES,home:renderHome,kakao:renderKakao,'kakao-chats':renderKakaoChats,'kakao-chat':renderKakaoChat,'kakao-open':renderKakaoOpen,'kakao-more':renderKakaoMore,'kakao-profile':renderKakaoProfile,'friend-profile':renderFriendProfile,'room-detail':renderRoom,'chat-menu':renderChatMenu,photos:renderPhotos,'photo-viewer':renderPhotoViewer,notifications:renderNotifications,settings:renderSettings,accounts:renderAccountManager,composer:renderComposer,x:()=>renderSocial('X'),threads:()=>renderSocial('Threads'),'instagram-feed':()=>renderSocial('Instagram'),tiktok:renderTikTok,'social-search':renderSocialSearch,'social-dms':renderDMs,'social-chat':renderDMChat,'social-post':renderPostDetail,'social-profile':renderSocialProfile,'social-activity':renderActivity,'story':renderStory,spotify:renderSpotify,'music-detail':renderMusicDetail,'ig-calls':renderIGCalls,calendar:renderCalendar,notes:renderNotes,'note-edit':renderNoteEdit,phone:renderPhone,mail:renderMail,safari:renderSafari,company:renderCompany,maps:renderMaps,camera:renderCamera,spotlight:renderSpotlight,'kakao-settings':renderKakaoSettings,'chat-files':()=>page('聊天文件',Object.values(state.conversations).flatMap(c=>c.messages.filter(m=>m.mediaId).map(m=>`<div class="file-row"><strong>${esc(c.name)}</strong><img class="chat-media" src="${esc(assetSrc(m.mediaId))}" alt="附件"></div>`)).join('')||empty('还没有聊天附件')),'emoji-page':()=>page('常用表情',CONFIG.emojis.map(x=>button('copy-emoji',esc(x),`data-text="${esc(x)}"`)).join(''))};
    appContent.innerHTML=(renders[app]||(()=>page('页面不存在',button('home','返回桌面'))))();appContent.scrollTop=0;
    if(app==='kakao-chat'&&$('#kakaoHistory'))$('#kakaoHistory').scrollTop=historyPosition??$('#kakaoHistory').scrollHeight;
    if(app==='social-chat'&&$('#dmHistory'))$('#dmHistory').scrollTop=historyPosition??$('#dmHistory').scrollHeight;
    if(force)[...appContent.querySelectorAll('.app-scroll,.reel-feed')].forEach((el,i)=>{el.scrollTop=scrollBefore[i]||0;});
  }
  if(focusState){const el=document.getElementById(focusState.id);if(el){el.focus({preventScroll:true});if(typeof focusState.start==='number'&&el.setSelectionRange)el.setSelectionRange(focusState.start,focusState.end);}}
  const surface=referenceSurface(app);appView.dataset.referenceSurface=surface;$('#statusbar').dataset.referenceSurface=surface;if(surface.endsWith('night')||surface==='kk-profile')$('#homeIndicator').classList.remove('dark');else if(surface)$('#homeIndicator').classList.add('dark');nav.dirty.delete(app);setWallpaper();updateClock();attachCreatorMedia();restoreSocialAlbums();saveState();
}
function openApp(app){const aliases={chrome:'safari',applemusic:'spotify',messages:'kakao'};app=aliases[app]||app;if(app==='instagram'){if(state.igIconIncoming){startInstagramCall();return;}app='instagram-feed';}if(['x','threads','instagram-feed','tiktok'].includes(app)){currentSocial=app==='x'?'X':app==='threads'?'Threads':app==='tiktok'?'TikTok':'Instagram';currentSocialTab='home';}playerOpen=false;navigate(app);}
function renderSpotlight(){return page('搜索手机',`${input('filterInput','搜索应用、联系人或备忘录')}${HOME_PAGES.flat().map(([id,name])=>`<button class="list-row searchable" data-app="${id}" data-search="${name}">${esc(name)}</button>`).join('')}${state.friends.map((f,i)=>`<button class="list-row searchable" data-friend="${i}" data-search="${esc(f.name)}">${esc(f.name)} · 联系人</button>`).join('')}${state.notes.map((n,i)=>`<button class="list-row searchable" data-note="${i}" data-search="${esc(n.title+' '+n.body)}">${esc(n.title)} · 备忘录</button>`).join('')}`);}
