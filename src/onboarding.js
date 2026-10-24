/* The opening choice is separate from the device lock and never clears a save. */
let storyOnboarding=false;
function devicePasscode(){return /^\d{4}$/.test(state.deviceSecurity?.pin||'')?state.deviceSecurity.pin:templateDefaultPin();}
function storyWelcomeHtml(){
 const s=storyState(),running=!!s.season,active=s.enabled&&(s.mainline?.status==='running'||s.season?.status==='running'),unread=state.notifications.filter(n=>n.story&&!n.read).length,name=s.player.stageName||state.profileName||'新的一天';
 const mode=({semi:'半架空 AU',au:'完全 AU',realistic:'高现实度 AU'})[s.mode]||'AU';
 const identity=friendAvatarHtml({name,avatarId:state.avatarId,avatar:CONFIG.avatar},'st-welcome-avatar');
 return `<div class="st-welcome-top"><span>IDOL<br>PHONE LIFE<span class="st-wordmark-dot" aria-hidden="true">.</span></span><span class="st-welcome-edition">YOUR EVERYDAY, REIMAGINED</span></div>
 <div class="st-welcome-scroll"><div class="st-welcome-hero"><div class="st-welcome-eyebrow"><span class="st-live-dot" aria-hidden="true"></span>${active?'你的故事，正在继续':s.configured?'一切就绪，等你出发':'一部手机，无限种日常'}</div><h1>${running?'欢迎回来，':'你好，'}<br><span>${esc(name)}</span><span class="st-hero-star" aria-hidden="true">✦</span></h1><p>下一条消息，下一场舞台。<br>生活的下一页，由你打开。</p><div class="st-welcome-moments" aria-label="消息、舞台与日常"><span>${uiIcon('message')}消息</span><span>${uiIcon('heart')}关系</span><span>${uiIcon('home')}日常</span></div></div>
 <section class="st-welcome-save" aria-label="当前人物与故事"><div class="st-section-tools"><span>${running?'STORY IN PROGRESS':'YOUR NEXT CHAPTER'}</span><span class="st-status">${active?'正在连载':running?'本季已完成':'准备就绪'}</span></div><div class="st-welcome-identity">${identity}<div><h2>${esc(s.mainline?.title||s.season?.title||STORY_SEASON.title)}</h2><p>${s.mainline?'已读完 '+s.mainline.queue.filter(n=>n.status==='completed').length+' / '+s.mainline.queue.length+' 段 · ':running?'第 '+s.season.week+' 周 · ':''}${esc(s.player.company||s.player.groupName||'日常与舞台')} · ${esc(mode)}</p></div></div><div class="st-welcome-stats"><span><strong>${Object.keys(s.characters).length}</strong>关系人物</span><span><strong>${s.events.length}</strong>工作日程</span><span><strong id="stWelcomeUnread">${unread}</strong>新消息</span></div></section>
 <div class="st-welcome-options">${button('st-welcome-start',`<span><strong>${running?'继续我的生活':s.configured?'以当前设定开始':'开始我的生活'}</strong><small>${active?'接着上次的故事，回到你的日常':running?'带着全部回忆，回到你的手机':'从第一条消息开始，认识这个世界'}</small></span><span class="st-primary-arrow" aria-hidden="true">${uiIcon('back')}</span>`,'','st-welcome-primary')}<div class="st-welcome-secondary">${button('st-welcome-custom',`<span class="st-choice-icon">${uiIcon('user')}</span><strong>${s.configured||running?'调整人物设定':'自定义人物'}</strong><small>定义属于你的身份与关系</small>`,'','st-welcome-choice')}${button('st-welcome-direct',`<span class="st-choice-icon">${uiIcon('grid')}</span><strong>直接进入手机</strong><small>${active?'随心探索，保留当前进度':'先逛手机，消息会自然到来'}</small>`,'','st-welcome-choice')}</div></div>
 <div class="st-welcome-footer">${button('st-passcode',uiIcon('settings')+' 解锁密码','','st-inline-action')}<span>${devicePasscode()===templateDefaultPin()?templateInitialPinLabel():'已设置自定义密码'}</span><p>你的聊天、照片与回忆，都会好好保留。</p></div></div>`;
}
function showStoryWelcome(){
 closeSheet();storyOnboarding=false;resetToLock();let el=$('#storyWelcome');if(!el){el=document.createElement('section');el.id='storyWelcome';el.className='st-welcome';el.setAttribute('aria-label','开始你的手机生活');device.appendChild(el);}el.innerHTML=storyWelcomeHtml();
}
function dismissStoryWelcome(){const el=$('#storyWelcome');if(el)el.remove();}
function finishStoryOnboarding(){storyAtomic(()=>{const s=storyState();if(s.profileDraft)storySaveProfile({...s.player,...s.profileDraft},s.mode);storyStartSeason();});storyOnboarding=false;dismissStoryWelcome();resetToLock();goHome();tickStory();}
function enterStoryPhone(mode){
 if(mode==='start'||mode==='direct'){storyStartSeason();tickStory();}
 dismissStoryWelcome();storyOnboarding=false;
 if(mode==='custom'){storyOnboarding=true;lockLayer.classList.add('hidden');state.unlocked=true;storyOpenSettings();}
 else{goHome();resetToLock();}
}
function showDevicePasscodeForm(){sheet('解锁密码',`<form id="storyPinForm" class="st-form"><p class="st-caption">设置这部手机的 4 位数字密码。</p><label class="st-field"><span>当前密码</span><input id="st-currentPin" class="world-input" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="off" placeholder="${devicePasscode()===templateDefaultPin()?templateInitialPinLabel():'输入当前密码'}" required></label><label class="st-field"><span>新密码</span><input id="st-newPin" class="world-input" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" placeholder="4 位数字" required></label><label class="st-field"><span>再次输入</span><input id="st-confirmPin" class="world-input" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" placeholder="确认新密码" required></label><button type="submit" class="st-primary">保存密码</button></form>`);$('.world-sheet')?.classList.add('st-pin-sheet');}
function setDevicePasscode(current,pin,confirm){if(String(current)!==devicePasscode())throw Error('当前密码不正确');if(!/^\d{4}$/.test(String(pin)))throw Error('新密码需要 4 位数字');if(String(pin)!==String(confirm))throw Error('两次输入的新密码不一致');storyAtomic(()=>{state.deviceSecurity={...(state.deviceSecurity||{}),pin:String(pin),updatedAt:Date.now()};});passcode='';const error=$('#passError');if(error)error.textContent='';$$('#passDots i').forEach(el=>el.classList.remove('filled'));}
function onboardingSubmit(form){if(form.id!=='storyPinForm')return false;setDevicePasscode($('#st-currentPin').value,$('#st-newPin').value,$('#st-confirmPin').value);closeSheet();if($('#storyWelcome'))$('#storyWelcome').innerHTML=storyWelcomeHtml();else if(currentApp==='settings')renderApp('settings');showToast('密码已更新','下次解锁使用新的 4 位数字密码。');return true;}
Object.assign(STORY_ACTIONS,{
 'st-welcome':()=>showStoryWelcome(),'st-finish':()=>finishStoryOnboarding(),
 'st-welcome-start':()=>enterStoryPhone('start'),'st-welcome-custom':()=>enterStoryPhone('custom'),
 'st-welcome-direct':()=>enterStoryPhone('direct'),'st-passcode':()=>showDevicePasscodeForm()
});
