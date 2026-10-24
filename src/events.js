/* A single delegated dispatcher owns actions, forms and draft updates. */
const ACTIONS={
  back:()=>goBack(),home:()=>goHome(),lock:()=>resetToLock(),'close-sheet':()=>closeSheet(),spotlight:()=>navigate('spotlight'),
  'kakao-profile':()=>navigate('kakao-profile'),'kakao-search':()=>$('#filterInput')?.focus(),'kakao-search-chats':()=>$('#filterInput')?.focus(),
  'kakao-friends-mode':b=>{kakaoFriendsMode=b.dataset.mode;renderApp('kakao');},
  'kakao-filter':b=>{kakaoChatFilter=b.dataset.filter;renderApp('kakao-chats');},
  'kakao-new-chat':()=>navigate('kakao'),'kakao-settings':()=>navigate('kakao-settings'),
  'kakao-add':()=>sheet('添加本地好友',`<form id="friendForm"><label>昵称${input('friendName','好友昵称')}</label><label>用户名${input('friendHandle','本地用户名')}</label><button type="submit">添加好友</button></form>`),
  'friend-profile':b=>openFriend(b.dataset.index),
  'friend-chat':b=>openChatTarget(chatTargetFor(Number(b.dataset.index))),
  'friend-call':b=>simulateCall(state.friends[b.dataset.index].name),
  'kakao-room-menu':()=>navigate('chat-menu',{chatId:activeChat}),
  'kakao-call':()=>simulateCall(conversation().name),
  'kakao-video':()=>simulateCall(conversation().name,true),
  'clear-chat':()=>{if(confirm('清空这个会话的全部消息？')){conversation().messages=conversation().messages.filter(m=>m.mainlineNodeId);state.notifications.filter(n=>n.chatId===activeChat).forEach(n=>n.read=true);saveState();invalidate();goBack();}},
  'kakao-attachment':()=>showMediaPicker('kakao'),
  'clear-quote':()=>{state.drafts['kakao:'+activeChat].quote='';saveState();renderApp('kakao-chat');},
  emoji:()=>sheet('发送表情',CONFIG.emojis.map(x=>button('send-emoji',esc(x),`data-text="${esc(x)}"`)).join('')),
  'send-emoji':b=>{closeSheet();sendKakao(b.dataset.text);},
  'copy-emoji':b=>sheet('常用表情',`${input('emojiCopy','表情',b.dataset.text)}<p>可选择并复制到聊天输入框。</p>`),
  'message-menu':b=>{const m=conversation().messages.find(m=>m.id===b.dataset.id);if(!m||m.deleted)return;if(m.mainlineNodeId){showToast('剧情记录','这段消息会保留，方便稍后继续。');return;}sheet('消息操作',button('quote-message','引用回复',`data-id="${m.id}"`)+(m.from==='나'?button('delete-message','撤回消息',`data-id="${m.id}"`):button('delete-message','本地删除',`data-id="${m.id}"`)));},
  'quote-message':b=>{const m=conversation().messages.find(m=>m.id===b.dataset.id);state.drafts['kakao:'+activeChat]||={text:''};state.drafts['kakao:'+activeChat].quote=m.text||(m.mediaType==='audio'?'[语音]':'[图片]');closeSheet();saveState();renderApp('kakao-chat');$('#kakaoInput').focus();},
  'delete-message':b=>{if(!confirm('删除 / 撤回这条消息？'))return;const c=conversation(),m=c.messages.find(m=>m.id===b.dataset.id);if(!m||m.mainlineNodeId)return;if(m.from==='나'){storyWithdrawInput(m.id);m.deleted=true;m.text='';m.mediaId=null;m.quote='';}else c.messages=c.messages.filter(x=>x.id!==m.id);closeSheet();saveState();invalidate();renderApp('kakao-chat');},
  'room-category':b=>{routeParams.category=b.dataset.category;renderApp('kakao-open');},
  'openchat-room':b=>navigate('room-detail',{id:b.dataset.id}),
  'create-room':()=>sheet('创建开放聊天',`<form id="roomForm"><label>房间名${input('roomName','房间名称')}</label><label>介绍${input('roomDescription','简介')}</label><button type="submit">创建</button></form>`),
  'join-room':b=>{const id=b.dataset.id,r=state.rooms.find(r=>r.id===id);state.joinedRooms[id]=true;state.conversations[id]||={id,name:r.name,category:'group',members:[0,1,2],messages:[]};saveState();invalidate();openChatTarget(id);showToast('已加入聊天室',r.name);},
  'leave-room':b=>{if(confirm('退出这个开放聊天室？历史消息保留。')){delete state.joinedRooms[b.dataset.id];saveState();invalidate();renderApp('room-detail');showToast('已退出','可以再次加入继续聊天。');}},
  'more-route':b=>navigate(b.dataset.route),
  'open-notification':b=>openNotification(b.dataset.id),
  'mark-all-read':()=>{state.notifications.forEach(n=>n.read=true);Object.values(state.conversations).forEach(c=>c.messages.forEach(m=>m.read=true));saveState();invalidate();renderLockNotifications();renderApp('notifications');},
  'upload-photos':()=>$('#photoUpload').click(),'upload-wallpaper':()=>$('#wallpaperUpload').click(),'upload-avatar':()=>$('#avatarUpload').click(),
  'upload-caller-video':()=>$('#callerVideoUpload').click(),'upload-self-video':()=>$('#selfVideoUpload').click(),
  'choose-wallpaper':()=>showMediaPicker('wallpaper'),'choose-avatar':()=>showMediaPicker('avatar'),
  'choose-composer-photo':()=>{showMediaPicker('compose');if(polishedSocial(composePlatform))markSocialSheet();},
  'pick-media':b=>{
    const target=mediaPickerTarget,p=state.photos.find(p=>p.id===b.dataset.id);if(!p)return;
    if(target==='profile-avatar'){const form=$('#profileForm');if(form){form.dataset.avatar=p.assetId;$('.sheet-content').insertAdjacentHTML('beforeend','<p>已选中头像，保存后生效。</p>');}return;}
    if(applyReferenceMedia(target,p))return;closeSheet();if(target==='kakao')sendKakao('',p.assetId);else if(target==='dm')sendDM('',p.assetId);else if(target==='compose'){appendSocialMedia(p);}else setPhotoAs(p.id,target);
  },
  'set-wallpaper':b=>setPhotoAs(b.dataset.photoid,'wallpaper'),'set-avatar':b=>setPhotoAs(b.dataset.photoid,'avatar'),'post-photo':b=>choosePostPlatform(b.dataset.photoid),
  'photo-compose':b=>{const p=b.dataset.platform,id=b.dataset.id;closeSheet();openComposer(p,id);},
  'favorite-photo':b=>{const p=state.photos.find(p=>p.id===b.dataset.id);p.favorite=!p.favorite;saveState();invalidate();renderApp('photo-viewer');},
  'delete-photo':async b=>{
    if(!confirm('从图库删除这个项目？已用于聊天、帖子或壁纸的媒体仍保留。'))return;
    const p=state.photos.find(p=>p.id===b.dataset.id);state.photos=state.photos.filter(x=>x.id!==p.id);saveState();
    if(p.assetId&&!JSON.stringify(state).includes(p.assetId)&&assetDB){await new Promise((resolve,reject)=>{const tx=assetDB.transaction('assets','readwrite');tx.objectStore('assets').delete(p.assetId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});URL.revokeObjectURL(assetUrls[p.assetId]);delete assetUrls[p.assetId];}
    invalidate();goBack();showToast('已从图库删除',p.title);
  },
  'photo-filter':()=>{routeParams.favorites=!routeParams.favorites;renderApp('photos');},
  'edit-profile':()=>openProfileEdit(),'profile-avatar':()=>{
    const form=$('#profileForm');if(!form)return;const content=$('.sheet-content');
    if(content.querySelector('.profile-avatar-choices'))return;
    content.insertAdjacentHTML('beforeend',`<div class="photo-grid profile-avatar-choices">${state.photos.filter(p=>p.assetId&&p.type!=='video').map(p=>`<button type="button" class="photo-tile" data-action="select-profile-avatar" data-id="${p.assetId}">${mediaHtml(p)}</button>`).join('')||empty('先在照片中导入图片')}</div>`);
  },
  'select-profile-avatar':b=>{$('#profileForm').dataset.avatar=b.dataset.id;$$('.profile-avatar-choices button').forEach(el=>el.classList.toggle('selected',el===b));},
  'account-manager':()=>navigate('accounts'),accounts:()=>navigate('accounts'),'account-picker':b=>openAccountPicker(b.dataset.platform||currentSocial),
  'switch-account':b=>switchAccount(b.dataset.platform,b.dataset.index),
  'open-social-platform':b=>platformHome(b.dataset.platform),
  'compose':b=>openComposer(b.dataset.platform||currentSocial),'remove-compose-media':()=>{activeAccount(composePlatform).draft.mediaId=null;activeAccount(composePlatform).draft.attachments=[];saveState();renderApp('composer');},
  'preview-post':()=>previewPost(),'publish-post':()=>publishPost(),
  'social-me':b=>{currentSocial=b.dataset.platform;navigate('social-profile',{platform:currentSocial});},
  'social-search':b=>{currentSocial=b.dataset.platform||currentSocial;navigate('social-search',{platform:currentSocial});},
  'feed-tab':b=>{currentSocial=b.dataset.platform;currentSocialTab=b.dataset.tab;if(currentSocial==='X')delete routeParams.listId;nav.route.params.feedTab=currentSocialTab;renderApp(socialAppFor(currentSocial));},
  'visit-profile':b=>{currentSocial=b.dataset.platform||currentSocial;worldInteraction('profile',currentSocial,b.dataset.handle);navigate('social-profile',{platform:currentSocial,handle:b.dataset.handle});},
  'follow':b=>{const a=activeAccount(b.dataset.platform||currentSocial),h=b.dataset.handle;a.following[h]=!a.following[h];saveState();invalidate();renderApp(currentApp);},
  'profile-filter':b=>{routeParams.profileTab=b.dataset.tab;renderApp(currentApp);},
  'like-post':b=>toggleLike(b.dataset.platform||currentSocial,b.dataset.postid),
  'bookmark-post':b=>{const a=activeAccount(b.dataset.platform||currentSocial);a.bookmarks[b.dataset.postid]=!a.bookmarks[b.dataset.postid];saveState();invalidate();renderApp(currentApp);showToast(a.bookmarks[b.dataset.postid]?'已收藏':'已取消收藏','操作已保存到当前账号。');},
  'reply-post':b=>showReply(b.dataset.platform||currentSocial,b.dataset.postid),
  'post-detail':b=>{currentSocial=b.dataset.platform;navigate('social-post',{platform:currentSocial,postId:b.dataset.postid});},
  'repost':b=>{const a=activeAccount(b.dataset.platform||currentSocial),id=b.dataset.postid;a.reposts[id]=!a.reposts[id];saveState();invalidate();renderApp(currentApp);showToast(a.reposts[id]?'已转发':'已取消转发','可在个人主页的“转帖”中查看。');},
  'share-post':b=>sharePost(b.dataset.platform||currentSocial,b.dataset.postid),
  'copy-share':async()=>{const el=$('#shareText');try{await navigator.clipboard.writeText(el.value);showToast('已复制','分享文字已复制到剪贴板。');}catch{el.select();document.execCommand('copy');}},
  'share-to-kakao':b=>{const p=findPost(b.dataset.platform,b.dataset.postid);closeSheet();openDefaultChat();sendKakao(`${b.dataset.platform} @${p.handle}\n${p.text}`);},
  'post-more':b=>{const a=activeAccount(b.dataset.platform||currentSocial),id=b.dataset.postid,own=a.posts.some(p=>p.id===id);sheet('帖子操作',button('post-detail','打开详情',`data-platform="${b.dataset.platform}" data-postid="${id}"`)+button('quote-post','引用发帖',`data-platform="${b.dataset.platform}" data-postid="${id}"`)+(own?button('delete-post','删除帖子',`data-platform="${b.dataset.platform}" data-postid="${id}"`):button('bookmark-post','收藏',`data-platform="${b.dataset.platform}" data-postid="${id}"`)));},
  'quote-post':b=>{const platform=b.dataset.platform,p=findPost(platform,b.dataset.postid);closeSheet();activeAccount(platform).draft.text=`引用 @${p.handle}：${p.text}\n\n`;openComposer(platform);},
  'delete-post':b=>{if(!confirm('删除当前账号的这条帖子？'))return;const a=activeAccount(b.dataset.platform);a.posts=a.posts.filter(p=>p.id!==b.dataset.postid);closeSheet();saveState();invalidate();platformHome(b.dataset.platform);showToast('帖子已删除','本地记录已更新。');},
  'dm-peer':b=>openDM(b.dataset.platform||currentSocial,b.dataset.peer),'dm-attachment':()=>polishedSocial()?socialAttachmentMenu():showMediaPicker('dm'),
  'activity-open':b=>{const n=activeAccount().notifications.find(n=>n.id===b.dataset.id);if(!n)return;n.read=true;saveState();invalidate();if(n.peer)openDM(currentSocial,n.peer);else if(n.postId)navigate('social-post',{platform:currentSocial,postId:n.postId});},
  story:b=>navigate('story',{platform:'Instagram',index:Number(b.dataset.index)}),
  'story-prev':()=>{routeParams.index=Math.max(0,(routeParams.index||0)-1);renderApp('story');},
  'story-next':()=>{routeParams.index=((routeParams.index||0)+1)%state.friends.length;renderApp('story');},
  'toggle-video':async b=>{const v=b.closest('.reel-card').querySelector('video');if(v){if(v.paused)await v.play();else v.pause();}},
  'open-player':()=>{playerOpen=true;renderApp('spotify');},'close-player':()=>{playerOpen=false;renderApp('spotify');},
  'spotify-play':()=>state.currentTrack<0?spotifyStart(0):spotifyToggle(),'spotify-toggle':()=>spotifyToggle(),'spotify-next':()=>spotifyNext(),'spotify-prev':()=>spotifyPrev(),
  'spotify-shuffle':()=>{state.spotifyShuffle=!state.spotifyShuffle;saveState();renderApp('spotify');},'spotify-repeat':()=>{state.spotifyRepeat=!state.spotifyRepeat;saveState();renderApp('spotify');},
  'spotify-more':()=>spotifyMore(),'track-more':b=>spotifyMore(Number(b.dataset.track)),'spotify-queue':()=>showQueue(),'spotify-lyrics':()=>showLyrics(),
  'music-artist':b=>{const t=CONFIG.spotify.tracks[Number(b.dataset.track)];navigate('music-detail',{kind:'artist',name:t.artist});},
  'music-album':b=>{const t=CONFIG.spotify.tracks[Number(b.dataset.track)];navigate('music-detail',{kind:'album',name:t.album||CONFIG.spotify.playlistName});},
  'upload-track-audio':b=>{audioUploadTrack=Number(b.dataset.track);closeSheet();$('#audioUpload').click();},'play-track':b=>{closeSheet();spotifyStart(Number(b.dataset.track));},
  'calendar-month':b=>{const d=calendarViewDate();d.setMonth(d.getMonth()+Number(b.dataset.delta));routeParams.month=localDate(d).slice(0,7)+'-01T12:00:00';renderApp('calendar');},
  'calendar-day':b=>{routeParams.date=b.dataset.date;renderApp('calendar');},'calendar-today':()=>navigate('calendar',{},true),
  'new-event':()=>eventForm(),'edit-event':b=>eventForm(b.dataset.id),'delete-event':b=>{if(confirm('删除这条日程？')){if(!(storyEnabled()&&storyCancelCalendar(b.dataset.id)))state.events=state.events.filter(e=>e.id!==b.dataset.id);closeSheet();saveState();invalidate();renderApp(currentApp);}},
  'new-note':()=>{state.notes.unshift({id:uid('note'),title:'',body:''});state.editingNote=0;saveState();navigate('note-edit',{id:state.notes[0].id});},'save-note':()=>saveNote(),
  'delete-note':()=>{if(confirm('删除这条备忘录？')){state.notes.splice(state.editingNote,1);saveState();invalidate();goBack();}},
  'phone-tab':b=>navigate('phone',{tab:b.dataset.tab},true),
  'phone-filter':b=>{routeParams.missed=b.dataset.filter==='missed';renderApp('phone');},
  'dial-digit':b=>{state.dialNumber=(state.dialNumber||'')+b.dataset.digit;$('#dialNumber').value=state.dialNumber;saveState();},
  'dial-delete':()=>{state.dialNumber=(state.dialNumber||'').slice(0,-1);$('#dialNumber').value=state.dialNumber;saveState();},
  'phone-call':()=>{const number=$('#dialNumber')?.value.trim();if(number)simulateCall(number);},
  'contact-detail':b=>{const f=state.friends.find(f=>f.id===b.dataset.id);sheet(f.name,button('contact-call','模拟通话',`data-id="${f.id}"`)+button('contact-favorite',state.phoneFavorites?.[f.id]?'取消收藏':'收藏联系人',`data-id="${f.id}"`));},
  'contact-call':b=>simulateCall(state.friends.find(f=>f.id===b.dataset.id).name),
  'contact-favorite':b=>{state.phoneFavorites||={};state.phoneFavorites[b.dataset.id]=!state.phoneFavorites[b.dataset.id];saveState();closeSheet();renderApp('phone');},
  'call-record':b=>recordCallDetails(b.dataset.id),
  'call-mute':()=>toggleCallMic(),
  'hangup-local':()=>finishLocalCall(),
  'open-mail':b=>{const m=state.mail.find(m=>m.id===b.dataset.id);if(m.box==='草稿箱')composeMail(m.id);else navigate('mail',{mailId:m.id});},
  'compose-mail':()=>composeMail(),'reply-mail':b=>composeMail(b.dataset.id),'save-mail-draft':()=>storeMail('草稿箱'),
  'mail-box':b=>navigate('mail',{box:b.dataset.box},true),
  'delete-mail':b=>{if(confirm('删除这封邮件？')){state.mail=state.mail.filter(m=>m.id!==b.dataset.id);saveState();invalidate();goBack();}},
  'browser-home':()=>navigate('safari'),
  'browser-go':b=>{closeSheet();browserGo(b.dataset.url);},
  'browser-history':()=>sheet('浏览历史',state.browser.history.slice(0,100).map(p=>button('browser-go',esc(p.url),`data-url="${esc(p.url)}"`)).join('')||empty('还没有历史')),
  'browser-bookmarks':()=>sheet('书签',state.browser.bookmarks.map(url=>button('browser-go',esc(url),`data-url="${esc(url)}"`)).join('')||empty('还没有书签')),
  'browser-bookmark':()=>{const url=routeParams.url;state.browser.bookmarks=state.browser.bookmarks.includes(url)?state.browser.bookmarks.filter(x=>x!==url):[...state.browser.bookmarks,url];saveState();renderApp('safari');},
  'browser-tabs':()=>sheet('标签页',state.browser.tabs.map((url,i)=>`<div class="browser-tab">${button('browser-go',esc(url),`data-url="${esc(url)}"`)}${button('browser-close-tab','关闭',`data-index="${i}"`)}</div>`).join('')||empty('还没有标签页')),
  'browser-close-tab':b=>{state.browser.tabs.splice(Number(b.dataset.index),1);saveState();ACTIONS['browser-tabs']();},
  'map-place':b=>navigate('maps',{placeId:b.dataset.id}),
  'map-favorite':b=>{state.mapFavorites||={};state.mapFavorites[b.dataset.id]=!state.mapFavorites[b.dataset.id];saveState();renderApp('maps');},
  'map-route':b=>{routeParams.route=!routeParams.route;renderApp('maps');},
  'company-calendar':()=>navigate('calendar'),'company-manager':()=>openChatTarget(chatTargetFor(state.friends.findIndex(f=>f.handle==='work'))),
  'camera-roll':()=>navigate('photos'),'camera-start':()=>startCamera(),'camera-shutter':()=>takePhoto(),
  'export-save':()=>exportSave(),'import-save':()=>$('#saveUpload').click(),reset:()=>resetWorld(),
  'torch':b=>lockToggleTorch(b),
  'camera-unlock':()=>{nav.pending='camera';showPasscode();}
};
async function dispatchAction(b){const handler=ACTIONS[b.dataset.action]||CALL_ACTIONS[b.dataset.action]||CREATOR_ACTIONS[b.dataset.action]||WV_ACTIONS[b.dataset.action]||YT_ACTIONS[b.dataset.action]||SOCIAL_UI_ACTIONS[b.dataset.action]||REFERENCE_ACTIONS[b.dataset.action]||PRODUCTIVITY_ACTIONS[b.dataset.action]||LOCK_ACTIONS[b.dataset.action]||SHOP_ACTIONS[b.dataset.action]||DELIVERY_ACTIONS[b.dataset.action]||STORY_ACTIONS[b.dataset.action];if(handler){if(!['close-sheet','pick-media','select-profile-avatar','copy-share','copy-emoji','save-mail-draft','upload-photos','profile-avatar','preview-post','publish-post'].includes(b.dataset.action)&&b.closest('.world-sheet')&&!['kakao-add','spotify-more'].includes(b.dataset.action)){
    if(['post-detail','visit-profile','play-track','browser-go','share-to-kakao'].includes(b.dataset.action))closeSheet();
  }await handler(b);if((socialNightRoute(currentApp)||['threads-night','x-night'].includes(referenceSurface(currentApp)))&&$('.world-sheet'))markSocialSheet();}}
function bindEvents(){
  let suppressClick=false;
  document.addEventListener('click',async e=>{
    const toast=e.target.closest('#toast[data-notification]');if(toast){openNotification(toast.dataset.notification);return;}
    const b=e.target.closest('button,[data-track-row],[data-app],[data-action]');if(!b||b.disabled)return;
    if(suppressClick||Date.now()<productivitySuppressClickUntil){e.preventDefault();return;}
    if(b.type==='submit'&&b.closest('form'))return;
    try{
      if(b.dataset.action){e.stopPropagation();await dispatchAction(b);return;}
      if(b.dataset.digit&&passcodeScreen.classList.contains('show')){addDigit(b.dataset.digit);return;}
      if(b.dataset.app){openApp(b.dataset.app);return;}
      if(b.dataset.friend!==undefined){openFriend(b.dataset.friend);return;}
      if(b.dataset.chatTarget){openChatTarget(b.dataset.chatTarget);return;}
      if(b.dataset.photo){currentPhotoId=b.dataset.photo;navigate('photo-viewer',{id:currentPhotoId});return;}
      if(b.dataset.note!==undefined){state.editingNote=Number(b.dataset.note);navigate('note-edit',{id:state.notes[state.editingNote].id});return;}
      if(b.dataset.trackRow!==undefined){spotifyStart(Number(b.dataset.trackRow));return;}
      if(b.dataset.homePage!==undefined){homePage=Number(b.dataset.homePage);renderApp('home');return;}
      if(b.dataset.socialNav){socialNavigate(b.dataset.platform,b.dataset.socialNav);return;}
      if(b.dataset.tab){tabNavigate(b.dataset.tab);return;}
      if(b.dataset.ig){switch(b.dataset.ig){case'accept':clearIgTimers();renderCallView();break;case'hangup':endInstagramCall();break;case'mic':callMuted=!callMuted;b.classList.toggle('off',callMuted);b.setAttribute('aria-pressed',String(!callMuted));break;case'camera':callCamera=!callCamera;$('#igSelf').style.visibility=callCamera?'visible':'hidden';b.classList.toggle('off',!callCamera);break;case'flip':callFacing=!callFacing;$('#igVideo')?.classList.toggle('flip',callFacing);break;}return;}
    }catch(err){console.error('操作失败',err);showToast('操作未完成',err.message||'请重试。');}
  });
  document.addEventListener('submit',async e=>{
    if(!e.target.closest('#device'))return;e.preventDefault();const f=e.target;
    try{if(kakaoPlusSubmit(f)||onboardingSubmit(f)||storySubmit(f)||deliverySubmit(f)||musicSubmit(f)||shopSubmit(f))return;if(await productivitySubmit(f))return;if(submitReferenceForm(f)||submitSocialUIForm(f)||submitCreatorForm(f))return;switch(f.id){
      case'kakaoForm':sendKakao($('#kakaoInput').value);break;
      case'dmForm':sendDM($('#dmInput').value);break;
      case'replyForm':sendReply();break;
      case'reelReplyForm':sendReelReply();break;
      case'igMessageForm':{const el=$('#igMessageInput');if(el.value.trim()){showIgMessage('나',el.value.trim());activeCallSession.draft='';el.value='';}break;}
      case'storyReplyForm':{const text=$('#storyReply').value.trim();if(!text)return;const peer=state.friends[routeParams.index||0].handle;openDM('Instagram',peer);sendDM(text);break;}
      case'friendForm':{const name=$('#friendName').value.trim(),handle=$('#friendHandle').value.trim();if(!name||!handle)return;if(state.friends.some(f=>f.handle===handle)){showToast('已有这位好友','请使用其他用户名。');return;}const i=state.friends.length;state.friends.push({id:uid('friend'),name,handle,status:'新好友',preview:'안녕!',avatar:''});state.conversations[String(i)]={id:String(i),name,friendIndex:i,category:'friends',messages:[]};closeSheet();saveState();invalidate();renderApp('kakao');showToast('好友已添加',name);break;}
      case'roomForm':{const name=$('#roomName').value.trim();if(!name)return;state.rooms.push({id:uid('open'),name,description:$('#roomDescription').value,members:0,category:'生活'});closeSheet();saveState();invalidate();renderApp('kakao-open');break;}
      case'profileForm':{const name=$('#profileNameInput').value.trim();if(!name)return;const bio=$('#profileBioInput').value,music=$('#profileMusicInput').value;if(f.dataset.social==='true'){Object.assign(account(currentSocial),{name,bio,music});if(f.dataset.avatar)account(currentSocial).avatarId=f.dataset.avatar;}else{state.profileName=name;state.profileBio=bio;state.profileMusic=music;if(f.dataset.avatar)state.avatarId=f.dataset.avatar;}closeSheet();saveState();invalidate();renderApp(currentApp);showToast('资料已保存','修改已应用。');break;}
      case'eventForm':saveEvent(f);break;
      case'mailForm':storeMail('已发送');break;
      case'safariForm':browserGo($('#safariSearch').value);break;
    }}catch(err){console.error('保存失败',err);showToast('保存失败',err.message);}
  });
  document.addEventListener('input',e=>{
    const el=e.target,id=el.id;storyInput(el);deliveryInput(el);musicInput(el);shopInput(el);lockSettingInput(el);productivityInput(el);creatorInput(el);if(id==='igMessageInput'&&activeCallSession){activeCallSession.draft=el.value;}
    if(id==='filterInput'){const q=el.value.toLowerCase();$$('.searchable').forEach(row=>row.hidden=!(row.dataset.search||row.textContent).toLowerCase().includes(q));}
    if(id==='socialSearch'){routeParams.query=el.value;$('#socialSearchResults').innerHTML=searchSocial(el.value);}
    if(id==='kakaoInput'){state.drafts['kakao:'+activeChat]||={};state.drafts['kakao:'+activeChat].text=el.value;saveState();}
    if(id==='dmInput'){activeAccount().dms[routeParams.peer].draft=el.value;saveState();}
    if(id==='composerText'){activeAccount(composePlatform).draft.text=el.value;saveState();updateSocialComposer();}
    if(id==='replyText'){activeAccount().replyDrafts||={};activeAccount().replyDrafts[routeParams.postId]=el.value;saveState();}
    if(id==='reelReplyText'&&reelReplyContext){const a=activeAccount(reelReplyContext.platform);a.replyDrafts||={};a.replyDrafts[reelReplyContext.id]=el.value;saveState();}
    if(id==='noteTitle'||id==='noteBody')autoSaveNote();
    if(id==='spotifySeek'){state.spotifyProgress=Number(el.value);if(spotifyAudio)spotifyAudio.currentTime=state.spotifyProgress;updatePlayerUI();saveState();}
    if(id==='dialNumber'){state.dialNumber=el.value;saveState();}
    if(['mailTo','mailSubject','mailBody'].includes(id)){state.mailDraft=collectMail();syncLegacyMailDraft();saveState();}referenceInput(el);
  });
  document.addEventListener('change',async e=>{
    const el=e.target;if(el.id==='amVideoUpload'){try{await musicUploadVideo(el.files?.[0]);}catch(err){showToast('视频未保存',err.message);}finally{el.value='';}return;}deliveryInput(el);musicInput(el);shopInput(el);lockSettingInput(el);productivityInput(el);creatorInput(el);referenceInput(el);
    if(el.dataset.task!==undefined){state.tasks[el.dataset.task]=el.checked;saveState();return;}
    if(el.id==='igIconIncoming'){state.igIconIncoming=el.checked;saveState();return;}
    if(el.id==='muteKakao'){state.muteKakao=el.checked;saveState();return;}
    const upload={kakaoDocumentUpload:()=>{const ctx=kakaoUploadContext;kakaoUploadContext=null;return importKakaoDocument([...el.files],ctx);},productivityUpload:()=>{const target=productivityUploadTarget;productivityUploadTarget=null;if(!target)return;return importProductivityFiles([...el.files],target);},referenceAudioUpload:()=>importKakaoAudio(el.files[0]),creatorUpload:()=>importCreatorMedia(el.files[0]),photoUpload:()=>uploadFiles([...el.files]),wallpaperUpload:()=>uploadWallpaper(el.files[0]),avatarUpload:()=>uploadAvatar(el.files[0]),callerVideoUpload:()=>uploadVideo(el.files[0],'caller'),selfVideoUpload:()=>uploadVideo(el.files[0],'self'),audioUpload:()=>uploadAudio(el.files[0]),phoneAudioUpload:()=>uploadPhoneAudio(el.files[0]),saveUpload:()=>importSave(el.files[0])}[el.id];
    if(upload)try{await upload();}catch(err){console.error('文件处理失败',err);showToast('文件未保存',err.message||'存储不可用。');}finally{el.value='';}
  });
  $('#homeIndicator').addEventListener('click',()=>{if(!lockLayer.classList.contains('hidden'))showPasscode();else goHome();});
  $('#lockBar').addEventListener('click',showPasscode);$('#unlockHint').addEventListener('click',showPasscode);
  $('#cancelPasscode').addEventListener('click',()=>{passcodeScreen.classList.remove('show');passcode='';nav.pending=null;});
  $('#deleteDigit').addEventListener('click',()=>{passcode=passcode.slice(0,-1);$$('#passDots i').forEach((x,i)=>x.classList.toggle('filled',i<passcode.length));});
  document.addEventListener('keydown',e=>{if($('#storyWelcome'))return;
    if(passcodeScreen.classList.contains('show')){if(/^\d$/.test(e.key))addDigit(e.key);if(e.key==='Backspace')$('#deleteDigit').click();if(e.key==='Escape')$('#cancelPasscode').click();return;}
    if(e.key==='Enter'&&!e.shiftKey&&['kakaoInput','dmInput','replyText'].includes(e.target.id)){e.preventDefault();e.target.closest('form').requestSubmit();}
    if(e.key==='Escape'){e.preventDefault();if(islandExpandedKey){closeDynamicIsland();return;}if($('.world-sheet'))closeSheet();else if(activeCallSession&&!activeCallSession.minimized)minimizeLocalCall();else if(lockLayer.classList.contains('hidden'))goBack();}
  });
  let pointer=null;
  device.addEventListener('pointerdown',e=>{if($('#storyWelcome'))return;if(!lockLayer.classList.contains('hidden')&&!passcodeScreen.classList.contains('show'))pointer={x:e.clientX,y:e.clientY,kind:'lock'};else if(e.target.closest('#homeScreen'))pointer={x:e.clientX,y:e.clientY,kind:'home'};});
  device.addEventListener('pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
    if(pointer.kind==='lock'&&dy<-45&&Math.abs(dy)>Math.abs(dx))showPasscode();
    if(pointer.kind==='home'&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)){homePage=Math.max(0,Math.min(HOME_PAGES.length-1,homePage+(dx<0?1:-1)));renderApp('home');suppressClick=true;setTimeout(()=>suppressClick=false,250);}pointer=null;
  });device.addEventListener('pointercancel',()=>pointer=null);
  window.addEventListener('pagehide',()=>{finishLocalCall('interrupted',{silent:true});finalizeCreatorLive('interrupted');releaseYTReferenceCapture();stopCreatorCamera();saveState();stopCamera();});
}
function socialNavigate(platform,tab){currentSocial=platform;if(tab==='compose'){openComposer(platform);return;}if(tab==='search'){navigate('social-search',{platform});return;}if(tab==='messages'){navigate('social-dms',{platform});return;}if(tab==='activity'){navigate('social-activity',{platform});return;}if(tab==='me'){navigate('social-profile',{platform});return;}currentSocialTab=tab;navigate(socialAppFor(platform),{platform,feedTab:tab});}
function tabNavigate(tab){if(currentApp.startsWith('kakao')){const routes={friends:'kakao',chats:'kakao-chats',open:'kakao-open',calls:'kakao-calls',more:'kakao-more'};navigate(routes[tab]||'kakao',{},true);}else if(currentApp==='spotify'){navigate('spotify',{musicTab:tab},true);}else if(currentApp==='photos'){if(tab==='search')$('#filterInput').focus();else{routeParams.favorites=tab==='albums';renderApp('photos');}}}
function renderKakaoProfile(){return renderKKProfile();}
async function boot(){
  initializeWorld();initializeCalls();initializeCreators();assetDB=await initDB();await dbLoadAll();bindEvents();bindCreatorMedia();bindSocialUI();bindReferenceUI();bindProductivityUI();bindLockScreenUI();renderApp('home');setWallpaper();renderLockNotifications();updateClock();
  $('#deleteDigit').textContent='删除';$('#homeIndicator').setAttribute('aria-label','返回桌面');
  $('.lock-status span:last-child').innerHTML=$('.status-icons').innerHTML;
  const torch=$('.lock-round[aria-label="手电筒"]');torch.dataset.action='torch';torch.setAttribute('aria-label','屏幕照明（模拟）');
  $('[data-open-camera]').dataset.action='camera-unlock';
  if(!assetDB){$('#storageWarning').hidden=false;$('#storageWarning').textContent='本地媒体存储不可用，上传功能将明确报错。';}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)processWorld();});
  showStoryWelcome();setInterval(updateClock,1000);setInterval(processWorld,1000);window.idolReady=true;
}
