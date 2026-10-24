/* Shared local media and LIVE lifecycle. No network service or fabricated recording. */
let creatorMediaTarget=null,creatorUploadTarget=null,creatorStream=null,creatorCameraToken=0;
const CREATOR_ROUTES={weverse:renderWeverse,'wv-post':renderWeversePost,'wv-compose':renderWeverseCompose,youtube:renderYouTube,'yt-watch':renderYouTubeWatch,'yt-channel':renderYouTubeChannel,'yt-upload':renderYouTubeUpload,'yt-list':renderYouTubeList,'yt-compose-post':renderYouTubePostCompose,'creator-live-setup':renderCreatorLiveSetup,'creator-live':renderCreatorLive};
function isCreatorRoute(app){return Object.hasOwn(CREATOR_ROUTES,app);}
function creatorSheet(title,body){sheet(title,body);const el=$('.world-sheet');if(el){el.classList.add('creator-sheet');el.dataset.platform=currentApp.startsWith('yt-')||currentApp==='youtube'||routeParams.platform==='youtube'?'youtube':'weverse';}}
function initializeCreators(){
  initializeWeverse();initializeYouTube();initializeStory();
  if(state.creatorLive){finalizeCreatorLive('interrupted',state.creatorLive.lastTick||state.creatorLive.startedAt);}
}
function creatorCommit(){saveState();invalidate();renderLockNotifications();}
function creatorRefresh(){const oldVideo=currentApp==='yt-watch'?$('#ytVideo'):null,playing=oldVideo&&!oldVideo.paused;creatorCommit();renderApp(currentApp);const replacement=currentApp==='yt-watch'?$('#ytVideo'):null;if(oldVideo&&replacement&&replacement!==oldVideo&&replacement.src===oldVideo.src&&replacement.replaceWith){replacement.replaceWith(oldVideo);if(playing)oldVideo.play().catch(()=>{});}}
function creatorTextarea(id,placeholder,value=''){return `<textarea id="${id}" class="creator-textarea" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;}
function creatorMedia(m,cls=''){if(!m)return '';if(m.description)return `<div class="creator-described-media"><small>情景画面 · 文字描述</small><p>${esc(m.description)}</p></div>`;const src=assetSrc(m.assetId);if(!src)return empty('媒体文件不可用，请重新导入');if(m.type==='audio')return `<audio class="creator-audio" src="${esc(src)}" controls preload="metadata"></audio>`;return mediaHtml(m,'creator-media '+cls);}
function creatorAttachments(list){return (list||[]).map(m=>creatorMedia(m)).join('');}
function creatorTime(ms){return new Date(ms).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function creatorDuration(n){n=Math.max(0,Math.floor(n||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
function creatorDraftFor(t){
  if(t.kind==='wv-post')return state.weverse.draft;
  if(t.kind==='wv-dm')return state.weverse.dmDraft;
  if(t.kind==='yt-upload')return ytState(t.owner).draft;
  if(t.kind==='yt-post')return ytState(t.owner).postDraft;
  if(t.kind==='live')return liveDraft(t.platform,t.owner);
}
function pickCreatorMedia(kind,owner='',platform=''){
  const target={kind,owner,platform};const onlyVideo=kind==='yt-upload'||kind==='live';
  const items=state.photos.filter(p=>p.assetId&&(!onlyVideo||p.type==='video')&&(kind!=='yt-post'||p.type!=='video'));
  creatorSheet(onlyVideo?'选择本地视频':'选择照片 / 视频',`${button('cr-import','＋ 从设备导入')}<div class="photo-grid">${items.map(p=>`<button class="photo-tile" data-action="cr-pick" data-id="${p.id}">${p.type==='video'?`<video src="${esc(assetSrc(p.assetId))}" muted preload="metadata"></video><span class="video-label">视频</span>`:mediaHtml(p)}</button>`).join('')}</div>${!items.length?empty('还没有可用文件，可以从设备导入'):''}`);
  creatorMediaTarget=target;
}
function requestCreatorUpload(target){creatorUploadTarget={...target};const el=$('#creatorUpload');el.accept=target.kind==='wv-dm'?'image/*,video/*,audio/*':['yt-thumbnail','yt-post'].includes(target.kind)?'image/*':target.kind==='yt-upload'||target.kind==='live'?'video/*':'image/*,video/*';el.click();}
function readCreatorMetadata(file){
  return new Promise((resolve,reject)=>{const type=file.type.split('/')[0];if(!['image','video','audio'].includes(type)){reject(new Error('请选择图片、视频或音频文件'));return;}if(type==='image'){resolve({type});return;}
    const el=document.createElement(type),url=URL.createObjectURL(file);let done=false;
    const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);const result={type,duration:el.duration,width:el.videoWidth||0,height:el.videoHeight||0};el.removeAttribute('src');el.load?.();URL.revokeObjectURL(url);error?reject(error):resolve(result);};
    const timer=setTimeout(()=>finish(new Error('媒体读取超时，请更换可播放的文件')),12000);
    el.preload='metadata';el.onloadedmetadata=()=>Number.isFinite(el.duration)&&el.duration>0?finish():finish(new Error('无法读取媒体时长'));el.onerror=()=>finish(new Error('浏览器无法解码此媒体'));el.src=url;
  });
}
async function importCreatorMedia(file){
  const target=creatorUploadTarget;creatorUploadTarget=null;if(!file||!target)return;
  const meta=await readCreatorMetadata(file);validateCreatorMedia(target,meta);
  const assetId=await dbPut(file),m={id:uid('media'),assetId,title:file.name,...meta};
  if(m.type!=='audio')state.photos.unshift({...m,createdAt:Date.now(),favorite:false,caption:'本地导入'});
  applyCreatorMedia(target,m);
}
function validateCreatorMedia(t,m){if(['yt-upload','live'].includes(t.kind)&&m.type!=='video')throw new Error('此处需要真实视频文件');if(t.kind==='yt-thumbnail'&&m.type!=='image')throw new Error('封面需要图片');if(t.kind==='yt-post'&&m.type!=='image')throw new Error('频道帖子附件需要图片');if(t.kind!=='wv-dm'&&m.type==='audio')throw new Error('此处不支持音频附件');if(['audio','video'].includes(m.type)&&(!Number.isFinite(m.duration)||m.duration<=0))throw new Error('媒体时长无效，请重新导入');}
async function selectCreatorMedia(id){const target=creatorMediaTarget,p=state.photos.find(p=>p.id===id);if(!target||!p)return;let m={...p};if(p.type==='video'&&!p.duration){const src=assetSrc(p.assetId);if(!src)throw new Error('本地视频不存在');const meta=await new Promise((resolve,reject)=>{const v=document.createElement('video');const timer=setTimeout(()=>reject(new Error('读取视频超时')),12000);v.onloadedmetadata=()=>{clearTimeout(timer);resolve({duration:v.duration,width:v.videoWidth,height:v.videoHeight});v.removeAttribute('src');v.load?.();};v.onerror=()=>{clearTimeout(timer);reject(new Error('视频格式不可播放'));};v.preload='metadata';v.src=src;});Object.assign(m,meta);Object.assign(p,meta);}validateCreatorMedia(target,m);applyCreatorMedia(target,m);}
function applyCreatorMedia(t,m){
  validateCreatorMedia(t,m);const draft=t.kind==='yt-thumbnail'?ytState(t.owner).draft:creatorDraftFor(t);if(!draft)return;
  if(t.kind==='yt-thumbnail')draft.thumbnailId=m.assetId;
  else if(t.kind==='yt-upload'||t.kind==='live'){draft.media=m;if(t.kind==='live'){stopCreatorCamera();draft.source='file';}}
  else{draft.media||=[];draft.media.push(m);}
  closeSheet();creatorMediaTarget=null;if(t.kind==='yt-upload'&&currentApp==='yt-create-camera'&&t.owner===state.youtube.activeChannelId){creatorCommit();navigate('yt-upload');}else creatorRefresh();
}
function pauseCreatorPlayback(){const v=currentApp==='yt-watch'?$('#ytVideo'):null;if(v&&state.youtube){ytState().progress[routeParams.id]=v.currentTime||0;saveState();}appContent.querySelectorAll('video,audio').forEach(el=>{el.pause();});}
function pauseOtherAudio(except){if(state.spotifyPlaying){state.spotifyPlaying=false;spotifyAudio?.pause();invalidate('spotify');}document.querySelectorAll('video,audio').forEach(el=>{if(el!==except)el.pause();});}
function bindCreatorMedia(){
  document.addEventListener('play',e=>{const el=e.target;if(!['VIDEO','AUDIO'].includes(el.tagName)||!el.closest?.('.creator-app,.creator-sheet'))return;if(activeCallSession){el.pause();showToast('通话进行中','挂断后再播放媒体');return;}pauseOtherAudio(el);if(el.id==='ytVideo')ytRecordWatch(routeParams.id);},true);
  document.addEventListener('loadedmetadata',e=>{if(e.target.id==='ytVideo'){const v=ytVideo(routeParams.id);if(v){const p=ytState().progress[v.id]||0;if(p<e.target.duration)e.target.currentTime=p;}}},true);
  document.addEventListener('timeupdate',e=>{if(e.target.id==='ytVideo'){const s=ytState();s.progress[routeParams.id]=e.target.currentTime;if(Math.floor(e.target.currentTime)%5===0)saveState();}},true);
  document.addEventListener('ended',e=>{if(e.target.id==='creatorLiveVideo'&&state.creatorLive?.source==='file')endCreatorLive('completed',false);},true);
}
function leaveCreatorPage(next){
  pauseCreatorPlayback();
  if(next!=='creator-live'&&state.creatorLive){finalizeCreatorLive('interrupted');showToast('本地直播已中断','离开直播间已停止画面，记录已保存');}
  if(next!=='creator-live'&&next!=='creator-live-setup')stopCreatorCamera();
}
function liveDraft(platform,owner){if(platform==='weverse')return state.weverse.liveDraft;const s=ytState(owner);s.liveDraft||={title:'',source:'file',visibility:'public',scheduledAt:''};return s.liveDraft;}
function liveOwner(){return routeParams.platform==='weverse'?'mavis':routeParams.owner||state.youtube.activeChannelId;}
function liveName(platform,owner){return platform==='weverse'?state.weverse.profile.name:state.youtube.channels.find(c=>c.id===owner)?.name||'频道';}
function openCreatorLive(platform){if(state.creatorLive){navigate('creator-live',{platform:state.creatorLive.platform,owner:state.creatorLive.owner});return;}navigate('creator-live-setup',{platform,owner:platform==='weverse'?'mavis':state.youtube.activeChannelId});}
function renderCreatorLiveSetup(){
  const platform=routeParams.platform,owner=liveOwner(),d=liveDraft(platform,owner),camera=d.source==='camera';
  return `<section class="creator-app ${platform==='weverse'?'wv-app':'yt-app yr-app'} world-page">${renderHeader(platform==='weverse'?'Weverse LIVE':'YouTube · 直播')}<div class="app-scroll creator-pad"><span class="creator-kicker">${esc(liveName(platform,owner))} · 本地开播</span><h2>和大家见面吧</h2><form id="creatorLiveForm">${input('crLiveTitle','直播标题',d.title)}<div class="creator-preview">${d.source==='description'?`<div class="creator-described-media"><small>文字直播</small><p>${esc(d.description||'写下你所在的场景与正在做的事')}</p></div>`:camera?'<video id="creatorCameraPreview" autoplay muted playsinline></video>':d.media?creatorMedia(d.media):empty('选择一段视频作为本地片源，或主动开启摄像头')}</div><div class="creator-actions">${button('cr-live-description','文字描述','type="button"')}${button('cr-live-file','选择视频','type="button"')}${button('cr-live-camera',creatorStream?'重新开启摄像头':'开启摄像头预览','type="button"')}</div><p class="small-note">${d.source==='description'?'文字直播不需要摄像头或视频文件；场景与互动会写入记录。':camera?'摄像头画面仅本地预览，不录制。':'文件直播使用本地视频；结束后保留片源与时间记录。'}观众、弹幕和喜欢数为情景模拟。</p>${platform==='youtube'?`<label>可见性${ytVisibilitySelect('crLiveVisibility',d.visibility)}</label>`:''}${creatorTextarea('crLiveDescription','文字直播：描述场景、正在做的事或想说的话…',d.description||'')}<label>预约时间（留空立即开始）<input class="world-input" id="crLiveSchedule" type="datetime-local" value="${esc(d.scheduledAt||'')}"></label><button class="creator-primary" type="submit">${d.scheduledAt?'保存预约':'开始本地直播'}</button></form>${renderLiveArchiveList(platform,owner)}</div></section>`;
}
async function previewCreatorCamera(){
  if(activeCallSession)throw new Error('请先结束通话再启用直播摄像头');if(!navigator.mediaDevices?.getUserMedia)throw new Error('此浏览器无法使用摄像头，请导入视频');
  stopCreatorCamera();const token=creatorCameraToken;const platform=routeParams.platform,owner=liveOwner();
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
  if(token!==creatorCameraToken||currentApp!=='creator-live-setup'){stream.getTracks().forEach(t=>t.stop());return;}
  creatorStream=stream;stream.getVideoTracks().forEach(t=>t.onended=()=>{if(state.creatorLive)endCreatorLive('interrupted',false);else{stopCreatorCamera();showToast('摄像头已关闭','请重新选择媒体来源');}});liveDraft(platform,owner).source='camera';creatorRefresh();attachCreatorMedia();
}
function stopCreatorCamera(){creatorCameraToken++;if(creatorStream){creatorStream.getTracks().forEach(t=>{t.onended=null;t.stop();});creatorStream=null;}}
function attachCreatorMedia(){const preview=$('#creatorCameraPreview');if(preview&&creatorStream){preview.srcObject=creatorStream;preview.play().catch(()=>{});}if(state.creatorLive){const v=$('#creatorLiveVideo');if(v){if(state.creatorLive.source==='camera'&&creatorStream)v.srcObject=creatorStream;else if(state.creatorLive.source==='file'&&assetSrc(state.creatorLive.media?.assetId)){v.src=assetSrc(state.creatorLive.media.assetId);v.currentTime=state.creatorLive.filePosition||0;}if(!state.creatorLive.paused)v.play().catch(()=>showToast('点击画面播放','浏览器暂停了自动播放'));}}}
function submitCreatorLive(){const p=routeParams.platform,o=liveOwner(),d=liveDraft(p,o);d.title=$('#crLiveTitle').value.trim();d.description=$('#crLiveDescription')?.value.trim()||d.description||'';if(d.description&&d.source!=='camera'&&!d.media)d.source='description';d.scheduledAt=$('#crLiveSchedule').value;d.visibility=$('#crLiveVisibility')?.value||'public';if(!d.title)throw new Error('请填写直播标题');if(d.scheduledAt){const at=new Date(d.scheduledAt).getTime();if(!(at>Date.now()))throw new Error('请选择未来的预约时间');const scheduled={id:uid('scheduled'),platform:p,owner:o,title:d.title,at,visibility:d.visibility,source:d.source,description:d.description||'',media:d.media||null,status:'scheduled'};state.creatorSchedules||=[];state.creatorSchedules.push(scheduled);state.events.push({id:scheduled.id,date:localDate(new Date(at)),time:new Date(at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),title:d.title+' · '+(p==='weverse'?'Weverse':'YouTube')+' LIVE',location:'本地直播间'});d.scheduledAt='';stopCreatorCamera();creatorRefresh();showToast('预约已保存','已加入日历，到时提醒后手动开播');return;}startCreatorLive(p,o);}
function startCreatorLive(p,o){
  if(state.creatorLive)throw new Error('已有直播进行中');if(activeCallSession)throw new Error('请先结束通话');const d=liveDraft(p,o);if(!d.title?.trim())throw new Error('请填写标题');if(d.source==='camera'&&!creatorStream)throw new Error('请先开启摄像头预览');if(d.source==='description'&&!d.description?.trim())throw new Error('请写下直播画面描述');if(!['camera','description'].includes(d.source)&&(!d.media||!assetSrc(d.media.assetId)))throw new Error('请选择可播放的本地视频');
  if(!['camera','description'].includes(d.source))validateCreatorMedia({kind:'live'},d.media);if(d.scheduledId){const scheduled=(state.creatorSchedules||[]).find(s=>s.id===d.scheduledId);if(scheduled)scheduled.status='started';delete d.scheduledId;}pauseOtherAudio();state.creatorLive={id:uid('live'),platform:p,owner:o,title:d.title,source:d.source,description:d.description||'',media:['camera','description'].includes(d.source)?null:d.media,visibility:d.visibility||'public',startedAt:Date.now(),lastTick:Date.now(),seconds:0,likes:0,chat:[],status:'live',filePosition:0,draft:''};saveState();navigate('creator-live',{platform:p,owner:o});
}
function renderCreatorLive(){const s=state.creatorLive;if(!s)return page('LIVE',empty('直播已结束，回到应用查看记录'));return `<section class="creator-app ${s.platform==='weverse'?'wv-app':'yt-app yr-app'} world-page live-room">${renderHeader(s.platform==='weverse'?'Weverse LIVE':'YouTube LIVE')}<div class="app-scroll"><div class="live-stage">${s.source==='description'?`<div class="creator-live-description"><small>文字直播</small><p>${esc(s.description)}</p></div>`:`<video id="creatorLiveVideo" playsinline ${s.source==='camera'?'muted':'controls'}></video>`}<span class="live-pill">LIVE · 本地</span><span id="creatorLiveClock">${creatorDuration(s.seconds)}</span></div><div class="creator-pad"><h2>${esc(s.title)}</h2><p>${esc(liveName(s.platform,s.owner))} · <span id="creatorLiveStats">0 模拟观众 · 0 喜欢</span></p><div class="creator-actions">${button('cr-live-like','♡ 喜欢')}${button('cr-live-end','结束直播')}</div>${s.source==='description'?`<form id="creatorLiveSceneForm">${creatorTextarea('crLiveScene','更新当前直播画面…',s.description)}<button class="creator-primary" type="submit">更新场景</button></form>`:''}<div id="creatorLiveChat" class="live-chat">${renderLiveChat(s)}</div><form id="creatorLiveChatForm" class="creator-inline">${input('crLiveChatInput','回应大家…',s.draft)}<button type="submit">发送</button></form><p class="small-note">离开本页面会中断并保存记录；摄像头画面未录制。</p></div></div></section>`;}
function renderLiveChat(s){return s.chat.map(m=>`<div><strong>${esc(m.name)}${m.artist?' ✓':''}</strong>${bilingual(m.text,m.translation)}</div>`).join('')||empty('等待第一条模拟弹幕');}
function tickCreators(){
  const nowMs=Date.now();for(const job of state.creatorSchedules||[]){if(job.status==='scheduled'&&job.at<=nowMs){job.status='reminded';creatorNotify(job.platform,'直播预约提醒',job.title,'',{app:'creator-live-setup',params:{platform:job.platform,owner:job.owner}},job.owner);}}
  tickWeverse(nowMs);tickYouTube(nowMs);const s=state.creatorLive;if(!s)return;s.seconds=Math.floor((nowMs-s.startedAt)/1000);const v=$('#creatorLiveVideo');if(v&&s.source==='file'){s.filePosition=v.currentTime||0;s.paused=v.paused;}
  if(CONFIG.creator.fans.length&&Math.floor(s.seconds/CONFIG.creator.liveChatEverySeconds)>Math.floor((s.lastTick-s.startedAt)/1000/CONFIG.creator.liveChatEverySeconds)){
    const fan=CONFIG.creator.fans[Math.floor(s.seconds/CONFIG.creator.liveChatEverySeconds)%CONFIG.creator.fans.length];if(s.visibility!=='private'){s.chat.push({...fan,id:uid('livechat'),at:nowMs});s.chat=s.chat.slice(-200);s.likes+=3;const chat=$('#creatorLiveChat');if(chat){chat.innerHTML=renderLiveChat(s);chat.scrollTop=chat.scrollHeight;}}
  }s.lastTick=nowMs;const clock=$('#creatorLiveClock'),stats=$('#creatorLiveStats');if(clock)clock.textContent=creatorDuration(s.seconds);if(stats)stats.textContent=`${s.visibility==='private'?0:12+Math.floor(s.seconds/8)} 模拟观众 · ${s.likes} 喜欢`;if(s.seconds%5===0)saveState();
}
function finalizeCreatorLive(result='completed',endedAt=Date.now()){
  const s=state.creatorLive;if(!s)return null;s.status=result;s.endedAt=endedAt;s.seconds=Math.max(0,Math.floor((s.endedAt-s.startedAt)/1000));const archive=s.platform==='weverse'?state.weverse.liveHistory:state.youtube.liveHistory;
  if(!archive.some(x=>x.id===s.id))archive.unshift({...s,chat:[...s.chat]});state.creatorLive=null;pauseCreatorPlayback();stopCreatorCamera();creatorCommit();return s;
}
function endCreatorLive(result='completed',ask=true){if(!state.creatorLive)return;if(ask&&!confirm('结束这场本地直播并保存记录？'))return;const s=finalizeCreatorLive(result);navigate(s.platform==='weverse'?'weverse':'youtube',{tab:s.platform==='weverse'?'live':'you'},true);}
function renderLiveArchiveList(p,o){const list=(p==='weverse'?state.weverse.liveHistory:state.youtube.liveHistory).filter(s=>s.owner===o);const scheduled=(state.creatorSchedules||[]).filter(s=>s.platform===p&&s.owner===o&&['scheduled','reminded'].includes(s.status));return `<h3>预约与记录</h3>${scheduled.map(s=>`<div class="creator-card"><strong>${esc(s.title)}</strong><p>${creatorTime(s.at)} · ${s.status==='scheduled'?'已预约':'已提醒'}</p>${button('cr-schedule-open','载入开播准备',`data-id="${s.id}"`)}${button('cr-schedule-cancel','取消预约',`data-id="${s.id}"`)}</div>`).join('')}${list.map(s=>`<button class="creator-card creator-row" data-action="cr-archive" data-id="${s.id}" data-platform="${p}"><strong>${esc(s.title)}</strong><small>${creatorTime(s.startedAt)} · ${creatorDuration(s.seconds)} · ${s.status==='interrupted'?'已中断':'已结束'} · ${s.media?'片源记录':'文字记录'}</small></button>`).join('')||empty('还没有直播记录')}`;}
function creatorNotify(platform,title,text,translation,route,owner='mavis'){
  const id=uid('activity'),n={id,title,text,translation,route,owner,read:false,time:Date.now()};(platform==='weverse'?state.weverse.notifications:ytState(owner).notifications).unshift(n);
  addNotification(platform==='weverse'?'Weverse':'YouTube',title,text,translation,{creatorRoute:route,creatorOwner:owner,creatorPlatform:platform,creatorActivityId:id});invalidate('home');return n;
}
function openCreatorNotification(n){if(!n.creatorRoute)return false;if(n.creatorPlatform==='youtube')state.youtube.activeChannelId=n.creatorOwner;const list=n.creatorPlatform==='weverse'?state.weverse.notifications:ytState(n.creatorOwner).notifications;const a=list.find(x=>x.id===n.creatorActivityId);if(a)a.read=true;invalidate();navigate(n.creatorRoute.app,{...n.creatorRoute.params});return true;}
function renderCreatorActivity(platform){const list=platform==='weverse'?state.weverse.notifications:ytState().notifications;return `<h2>通知</h2>${list.map(n=>`<button class="creator-card creator-row ${n.read?'':'is-unread'}" data-action="cr-activity" data-platform="${platform}" data-id="${n.id}"><strong>${esc(n.title)}</strong>${bilingual(n.text,n.translation)}<small>${creatorTime(n.time)}</small></button>`).join('')||empty('暂时没有新通知')}`;}
const CREATOR_ACTIONS={
  'cr-import':()=>requestCreatorUpload(creatorMediaTarget),
  'cr-pick':b=>selectCreatorMedia(b.dataset.id),
  'cr-live-file':()=>pickCreatorMedia('live',liveOwner(),routeParams.platform),
  'cr-live-camera':()=>previewCreatorCamera(),
  'cr-live-open':b=>openCreatorLive(b.dataset.platform),
  'cr-live-end':()=>endCreatorLive(),
  'cr-live-like':()=>{if(state.creatorLive){state.creatorLive.likes++;creatorCommit();}},
  'cr-schedule-cancel':b=>{const s=state.creatorSchedules.find(s=>s.id===b.dataset.id);if(s){s.status='cancelled';state.events=state.events.filter(e=>e.id!==s.id);creatorRefresh();}},
  'cr-schedule-open':b=>{const s=state.creatorSchedules.find(s=>s.id===b.dataset.id);if(!s)return;const d=liveDraft(s.platform,s.owner);d.title=s.title;d.scheduledAt='';d.visibility=s.visibility;d.source=s.source||'file';d.description=s.description||'';d.media=s.media||null;d.scheduledId=s.id;navigate('creator-live-setup',{platform:s.platform,owner:s.owner});},
  'cr-archive':b=>{const list=b.dataset.platform==='weverse'?state.weverse.liveHistory:state.youtube.liveHistory,s=list.find(s=>s.id===b.dataset.id);if(!s)return;creatorSheet(s.title,`<p>${s.status==='interrupted'?'中断':'结束'} · ${creatorDuration(s.seconds)}</p>${s.description?`<div class="creator-described-media"><small>直播场景</small><p>${esc(s.description)}</p></div>`:''}${s.media?creatorMedia(s.media)+`<p class="small-note">原始片源，结束位置 ${creatorDuration(s.filePosition)}；未生成新的录像。</p>`:empty('没有录像，仅保留文字时间线')}${renderLiveChat(s)}`);},
  'cr-activity':b=>{const platform=b.dataset.platform,list=platform==='weverse'?state.weverse.notifications:ytState().notifications,n=list.find(n=>n.id===b.dataset.id);if(!n)return;n.read=true;state.notifications.filter(x=>x.creatorActivityId===n.id).forEach(x=>x.read=true);creatorCommit();navigate(n.route.app,{...n.route.params});}
};
function creatorInput(el){const id=el.id;
  if(id==='crLiveDescription'){liveDraft(routeParams.platform,liveOwner()).description=el.value;saveState();}if(id==='crLiveTitle'||id==='crLiveSchedule'||id==='crLiveVisibility'){const d=liveDraft(routeParams.platform,liveOwner());d[id==='crLiveTitle'?'title':id==='crLiveSchedule'?'scheduledAt':'visibility']=el.value;saveState();}
  if(id==='crLiveChatInput'&&state.creatorLive){state.creatorLive.draft=el.value;saveState();}
  weverseInput(el);youtubeInput(el);
}
function submitCreatorForm(f){
  if(f.id==='wvDescriptionForm'){const text=$('#wvDescription').value.trim();if(!text)throw Error('请描述画面');const d=f.dataset.kind==='dm'?state.weverse.dmDraft:state.weverse.draft;d.media.push({type:'description',description:text});closeSheet();creatorRefresh();return true;}
  if(f.id==='creatorLiveSceneForm'){const s=state.creatorLive,text=$('#crLiveScene').value.trim();if(!s||s.source!=='description'||!text)return true;s.description=text;s.sceneHistory||=[];s.sceneHistory.push({text,at:Date.now()});s.chat.push({id:uid('scene'),artist:true,name:liveName(s.platform,s.owner),text:'[场景] '+text,at:Date.now()});creatorRefresh();return true;}if(f.id==='creatorLiveForm'){submitCreatorLive();return true;}
  if(f.id==='creatorLiveChatForm'){const s=state.creatorLive,text=$('#crLiveChatInput').value.trim();if(s&&text){s.chat.push({id:uid('livechat'),artist:true,name:liveName(s.platform,s.owner),text,at:Date.now()});s.draft='';$('#crLiveChatInput').value='';$('#creatorLiveChat').innerHTML=renderLiveChat(s);creatorCommit();}return true;}
  return submitWeverseForm(f)||submitYouTubeForm(f);
}
