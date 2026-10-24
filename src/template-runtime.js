/* Blank edition: no cast, historical posts, message plot or unsolicited replies. */
function templateDefaultPin(){return CONFIG.template.app.defaultPin;}
function templateInitialPinLabel(){return '初始密码 '+templateDefaultPin();}
Object.assign(STORY_PROFILE_FIELDS,{stageName:'显示名',koreanName:'其他语言名',company:'工作/学习地点',groupName:'团队/社群',roleInGroup:'职责',debutYears:'参与年数',popularityTier:'使用情景',fandomName:'社群名称',publicImage:'对外介绍',privatePersonality:'自己的性格'});
Object.assign(STORY_SLOTS,{boyfriend:'伴侣',exPartners:'过去的关系',flirtTargets:'想进一步认识的人',secretAdmirers:'尚未表明心意',maleIdolsWhoInitiateContact:'新认识的人',groupMembers:'团队同伴',industryFriends:'同事与同行',manager:'协调人',staff:'项目伙伴',brandContacts:'合作联系人',pdDirectorsProducers:'策划与创作'});
Object.assign(STORY_MODES,{semi:'自由生活',au:'自定义世界',realistic:'贴近日常'});
const templateOriginalInitializeStory=initializeStory;
initializeStory=function(){
 const fresh=!state.templateConfigured&&!state.story?.configured;
 templateOriginalInitializeStory();
 if(fresh){const s=storyState();Object.assign(s.player,CONFIG.template.player);state.profileName=s.player.stageName;state.profileBio=CONFIG.template.profileBio;Object.assign(state.weverse.profile,{name:s.player.stageName,bio:CONFIG.template.profileBio,community:s.player.groupName||'我的社区'});state.deviceSecurity||={pin:templateDefaultPin()};
  for(const person of CONFIG.template.contacts){const c=storyRegisterCharacter({...person,id:'custom-'+person.key});c.bio=person.bio||'';c.userEdited=true;}
  for(const [i,event] of CONFIG.template.calendar.entries())state.events.push({id:'custom-event-'+i,...event});
 }
 state.templateConfigured=true;
};
storyWelcomeHtml=function(){const s=storyState(),name=s.player.stageName||'我';return `<div class="st-welcome-top"><span>${esc(CONFIG.template.app.title)}</span><span class="st-welcome-edition">YOUR PHONE, YOUR WORLD</span></div><div class="st-welcome-scroll"><div class="st-welcome-hero"><div class="st-welcome-eyebrow">从空白开始</div><h1>你好，<br><span>${esc(name)}</span></h1><p>${esc(CONFIG.template.app.hero)}<br>自己添加人物、照片与生活记录。</p></div><section class="st-welcome-save"><div class="st-welcome-stats"><span><strong>${state.friends.length}</strong>联系人</span><span><strong>${state.photos.length}</strong>照片与视频</span><span><strong>${state.notes.length}</strong>备忘录</span></div></section><div class="st-welcome-options">${button('st-welcome-start','进入我的手机','','st-welcome-primary')}<div class="st-welcome-secondary">${button('st-welcome-custom','编辑人物与关系','','st-welcome-choice')}${button('st-welcome-direct','直接进入手机','','st-welcome-choice')}</div></div><div class="st-welcome-footer">${button('st-passcode','设置解锁密码','','st-inline-action')}<span>${devicePasscode()===templateDefaultPin()?templateInitialPinLabel():'已设置自定义密码'}</span><p>没有预置消息或剧情。内容保存在当前浏览器。</p></div></div>`;};
function templateContact(key){return storyState().characters['custom-'+key];}
function initializeTemplateMainline(){
 const s=storyState(),scenario=CONFIG.template.scenario;if(!s.enabled||s.mainline||!scenario?.nodes.length)return;
 const nodes=scenario.nodes.map((item,i)=>{
  const person=templateContact(item.contact);if(!person)throw Error('找不到剧情联系人：'+item.contact);
  const app=item.app||'kakao',ctx=app==='kakao'?{channel:'kakao',chatId:person.chatId,npcId:person.id}:app==='weverse'?{channel:'wv',peer:person.handle,npcId:person.id}:{channel:'dm',platform:app==='x'?'X':'Instagram',accountIndex:0,peer:person.handle,npcId:person.id};
  return {...JSON.parse(JSON.stringify(item)),index:i,ctx,priority:item.priority??100-i,dependsOn:item.dependsOn||(!i?[]:[scenario.nodes[i-1].id]),lines:item.lines.map(l=>({from:l.role==='player'?'나':'상대',text:l.text,translation:l.translation||''})),status:'locked',cursor:0,messageIds:[]};
 });
 s.mainline={version:1,id:s.season.instanceId+':'+scenario.id,title:scenario.title,status:'running',startedAt:Date.now(),choices:{},queue:nodes};resolveMessageNodes();
}
function templateApplyHistory(n){for(const v of n.variants||[])if(storyState().mainline.choices[v.nodeId]===v.value){n.lines[v.lineIndex].text=v.text;n.lines[v.lineIndex].translation=v.translation||'';}}
storyStartSeason=function(){return storyAtomic(()=>{const s=storyState();s.configured=true;s.enabled=true;const custom=CONFIG.template.scenario;if(custom?.nodes.length&&!s.season)s.season={id:custom.id,instanceId:uid('custom'),title:custom.title,durationWeeks:8,startedAt:storyNow(),endsAt:storyNow()+56*86400000,status:'running',week:1};ensureMessageMainline();return s.season;});};
storyEnsureAutonomy=function(){};storyAmbient=function(){};
initializeSocialWorld=function(){const s=storyState();s.socialWorld||={version:1,step:0,nextAt:0,flags:{},eggs:{},visits:{}};};
tickSocialWorld=function(){};worldInteraction=function(){};ensureFanCircles=function(){};
worldStoryFlag=function(flag,text){const content=CONFIG.template.scenario?.publicTexts?.[flag];if(!content)return;const w=storyState().socialWorld;if(w.flags[flag])return;w.flags[flag]=true;for(const platform of ['Instagram','X','Threads','TikTok'])storyPost(platform,{id:'custom-flag-'+flag,display:state.profileName,handle:CONFIG.template.accountHandle,text:content,translation:'',attachments:[]});};
// Free chat and broadcasts do not invent counterpart messages. Authors may implement replies here.
storyHandleInput=function(){return true;};scheduleKakaoGroupReply=function(){return conversation()?.category==='group';};
const templateOriginalTickWeverse=tickWeverse;
tickWeverse=function(now){if(!CONFIG.creator.fans.length){state.weverse.pending=[];return;}return templateOriginalTickWeverse(now);};
const templateOriginalTickYouTube=tickYouTube;
tickYouTube=function(now){if(!CONFIG.creator.fans.length){state.youtube.pending=[];return;}return templateOriginalTickYouTube(now);};
storyWorldPanel=function(){return `<section class="st-card"><h2>我的世界</h2><p>人物、内容和生活记录由你创建。</p>${mainlineSummary()}<p>在自己的节奏里，开始新的一天。</p></section>`;};
storyCompanyPanel=function(){return `<section class="st-company"><h2>${esc(storyState().player.company||'生活计划')}</h2><p>日历、待办与自己的安排。</p>${mainlineSummary()}${button('st-open','人物与世界','','st-inline-action')}</section>`;};
// User-imported track metadata follows the save; Blob bytes use the isolated asset DB.
const templateBaseTracks=JSON.parse(JSON.stringify(CONFIG.spotify.tracks));
const templateInitializeWorld=initializeWorld;
initializeWorld=function(){CONFIG.spotify.tracks=[...templateBaseTracks,...(state.localMusicTracks||[])];templateInitializeWorld();};
const templateSpotifyMore=spotifyMore;
spotifyMore=function(index=Math.max(0,state.currentTrack)){if(!CONFIG.spotify.tracks[index]){audioUploadTrack=-1;$('#audioUpload').click();return;}return templateSpotifyMore(index);};
const templateUploadAudio=uploadAudio;
uploadAudio=async function(file){if(!file)return;if(audioUploadTrack>=0&&CONFIG.spotify.tracks[audioUploadTrack])return templateUploadAudio(file);const metadata=await readCreatorMetadata(file);if(metadata.type!=='audio')throw Error('请选择音频文件');const assetId=await dbPut(file),track={title:file.name.replace(/\.[^.]+$/,''),artist:'本地导入',duration:metadata.duration||1,audio:''},index=CONFIG.spotify.tracks.length;state.localMusicTracks||=[];state.localMusicTracks.push(track);CONFIG.spotify.tracks.push(track);state.audioAssetIds[index]=assetId;saveState();invalidate();renderApp('spotify');};
ACTIONS['am-more']=()=>sheet('音乐',button('template-import-audio','导入新歌曲')+button('spotify-queue','播放队列')+button('am-new-playlist','新建播放列表')+button('am-import-video','导入音乐视频'));
ACTIONS['template-import-audio']=()=>{audioUploadTrack=-1;closeSheet();$('#audioUpload').click();};
const templateKKFriends=renderKKFriends;
renderKKFriends=function(){return templateKKFriends().replace(/<section[^>]*>\s*<button[^>]*data-action="kk-collapse"[^>]*data-id="plus"[\s\S]*?<\/section>/,'');};
renderCompany=function(){return page('生活计划',`${storyCompanyPanel()}<div class="toolbar">${button('new-event','新增日程')}${button('company-calendar','打开日历')}</div>${state.events.filter(e=>e.date===localDate()).map(e=>`<button class="event-row" data-action="edit-event" data-id="${e.id}"><time>${esc(e.time)}</time><strong>${esc(e.title)}</strong></button>`).join('')||empty('今天还没有安排')}`);};
renderXReferenceExplore=function(){currentSocial='X';const query=routeParams.query||'',posts=seedPosts('X').filter(p=>(p.text+' '+p.display+' '+p.handle).toLowerCase().includes(query.toLowerCase()));return xRefShell(`<div class="xr-search-box">${input('xrSearchInput','搜索动态或用户',query)}</div><h2 class="section-title">${query?'搜索结果':'探索'}</h2>${posts.map(renderXReferencePost).join('')||empty(query?'没有匹配的动态':'还没有动态，发布第一条记录吧')}`,'search','探索');};
