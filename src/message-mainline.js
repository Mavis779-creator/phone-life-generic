/* Authored private-message DAG. Time paces visible bubbles, never unlocks a node. */
function messageContextKey(c){return c?.channel==='kakao'?'kakao:'+c.chatId:c?.channel==='wv'?'wv:'+c.peer:c?.channel==='dm'?'dm:'+c.platform+':'+c.accountIndex+':'+c.peer:'';}
function activeMessageContext(){if(currentApp==='kakao-chat')return {channel:'kakao',chatId:activeChat};if(currentApp==='social-chat')return {channel:'dm',platform:currentSocial,accountIndex:state.activeAccounts[currentSocial]||0,peer:routeParams.peer};if(currentApp==='wv-private')return {channel:'wv',peer:routeParams.peer};return null;}
function mainlineConversation(ctx){if(ctx.channel==='wv')return storyState().privateWV?.[ctx.peer];return storyConversation(ctx);}
function mainlineCurrent(ctx=activeMessageContext()){if(!storyEnabled()||!ctx)return null;return storyState().mainline?.queue.find(n=>!['locked','completed'].includes(n.status)&&messageContextKey(n.ctx)===messageContextKey(ctx))||null;}
function mainlineCharacter(slot,fallback){return storySlot(slot)||storySlot(fallback)||storySlot('manager');}
function ensureMessageMainline(){
 const s=storyState();if(!s.enabled||!s.season||s.mainline||!CONFIG.template.scenario?.nodes.length)return;
 initializeTemplateMainline();
}
function ensureMainlineConversation(n){const ctx=n.ctx;
 if(ctx.channel==='wv'){const f=storyState().characters[n.ctx.npcId]||storyState().fans[n.fanId];storyState().privateWV||={};return storyState().privateWV[ctx.peer]||=( {peer:ctx.peer,name:f.name,messages:[]} );}
 if(ctx.channel==='dm'){const a=state.accounts[ctx.platform][ctx.accountIndex],p=storyState().characters[ctx.npcId]||storyState().fans[n.fanId];return a.dms[ctx.peer]||=( {peer:ctx.peer,name:p.name,fanId:n.fanId,messages:[],draft:''} );}
 if(!state.conversations[ctx.chatId]&&ctx.groupName)state.conversations[ctx.chatId]={id:ctx.chatId,name:ctx.groupName,category:'group',members:state.friends.map((f,i)=>storyState().characters[f.storyCharacterId]?.slot).map((slot,i)=>['manager','staff','groupMembers'].includes(slot)?i:-1).filter(i=>i>=0),messages:[],storyGroup:true};return state.conversations[ctx.chatId];
}
function appendMainlineLine(n,line,notify=false){const c=ensureMainlineConversation(n),key=storyState().mainline.id+':'+n.id+':'+n.messageIds.length;
 if(c.messages.some(m=>m.id===key))return;
 const m={...line,senderName:line.from==='나'?'':storyState().characters[n.ctx.npcId]?.name||c.name,id:key,read:!notify,time:timeNow(),sentAt:Date.now(),story:true,mainlineNodeId:n.id};c.messages.push(m);n.messageIds.push(key);c.updatedAt=Date.now();
 if(notify){const app=n.ctx.channel==='kakao'?'KakaoTalk':n.ctx.channel==='wv'?'Weverse':n.ctx.platform;
  const extra={mainlineNodeId:n.id,priority:n.priority};if(n.ctx.channel==='kakao')extra.chatId=n.ctx.chatId;else if(n.ctx.channel==='wv')extra.storyRoute={app:'wv-private',params:{peer:n.ctx.peer}};else Object.assign(extra,{platform:n.ctx.platform,accountIndex:n.ctx.accountIndex,peer:n.ctx.peer});
  const notice=storyNotify(app,c.name,line.text,line.translation,extra);n.notificationId=notice.id;if(n.ctx.channel==='dm')state.accounts[n.ctx.platform][n.ctx.accountIndex].notifications.unshift(notice);
 }
}
function applyMessageHistory(n){templateApplyHistory(n);}
function resolveMessageNodes(){const m=storyState().mainline;if(!m)return;for(const n of m.queue){if(n.status!=='locked'||!n.dependsOn.every(id=>m.queue.find(p=>p.id===id)?.status==='completed'))continue;applyMessageHistory(n);n.status='available';appendMainlineLine(n,n.lines[0],true);n.cursor=1;n.status='notified';n.deliveredAt=Date.now();}}
function completeMessageNode(n){n.status='completed';n.completedAt=Date.now();if(n.flag)worldStoryFlag(n.flag);
 resolveMessageNodes();if(storyState().mainline.queue.every(n=>n.status==='completed')){storyState().mainline.status='completed';storyState().mainline.completedAt=Date.now();storyRecord('message-ending',storyState().mainline.title+' · 已完成');}}
function markMainlineOpened(n){n.status='opened';const c=mainlineConversation(n.ctx);for(const m of c.messages.filter(m=>m.mainlineNodeId===n.id))m.read=true;const notice=state.notifications.find(x=>x.id===n.notificationId);if(notice)notice.read=true;n.nextUIAt=Date.now()+1000;}
function tickMessageMainline(){if(!storyEnabled()||!state.unlocked||document.hidden||$('#storyWelcome')||storyOnboarding||$('.world-sheet'))return;
 const n=mainlineCurrent();if(!n||n.status==='waiting_choice')return;
 try{let changed=false;storyAtomic(()=>{if(['available','notified'].includes(n.status)){markMainlineOpened(n);changed=true;return;}if(n.nextUIAt>Date.now())return;
  if(n.cursor<n.lines.length){appendMainlineLine(n,n.lines[n.cursor]);n.cursor++;n.nextUIAt=Date.now()+1400;changed=true;}
  else{if(n.choice)n.status='waiting_choice';else completeMessageNode(n);changed=true;}
 });if(changed){renderApp(currentApp);renderLockNotifications();storyPresentUpdates();}}catch(e){console.error('消息剧情未保存',e.message);}
}
function chooseMainline(nodeId,value){const n=mainlineCurrent();if(!n||n.id!==nodeId||n.status!=='waiting_choice')return false;const option=n.choice.options.find(o=>o[0]===value);if(!option)return false;
 storyAtomic(()=>{appendMainlineLine(n,{from:'나',text:option[1],translation:''});appendMainlineLine(n,{from:'상대',text:option[2],translation:''});storyState().mainline.choices[n.id]=value;
  completeMessageNode(n);});renderApp(currentApp);renderLockNotifications();storyPresentUpdates();return true;
}
function mainlinePanel(ctx){const n=mainlineCurrent(ctx);if(!n)return '';
 return `<div class="msg-story-panel" aria-label="消息剧情"><div class="msg-story-caption"><span>${esc(n.title)}</span><small>${n.index+1} / ${storyState().mainline.queue.length} · ${n.status==='waiting_choice'?'等待你的回应':'对话继续中'}</small></div>${n.status==='waiting_choice'?`<p>${esc(n.choice.prompt)}</p><div class="msg-story-choices">${n.choice.options.map(o=>button('msg-choice',esc(o[1]),`data-node="${esc(n.id)}" data-value="${esc(o[0])}"`)).join('')}</div>`:'<p class="msg-story-pacing" role="status">普通回复会自动出现…</p>'}<small>可以随时离开，下次继续这段对话。</small></div>`;
}
function blockMainlineInput(ctx){if(!mainlineCurrent(ctx))return false;showToast('这段对话使用剧情回复','普通回复自动出现，关键处选择你的态度。随时可以返回手机。');return true;}
function mainlineBadge(ctx){return mainlineCurrent(ctx)?'<em class="msg-unfinished">未完成</em>':'';}
function mainlineSummary(){const m=storyState().mainline;if(!m)return '';const done=m.queue.filter(n=>n.status==='completed').length,next=m.queue.find(n=>!['locked','completed'].includes(n.status));return `<section class="st-card"><header class="st-card-heading"><h2>${esc(m.title)}<span>${done} / ${m.queue.length}</span></h2></header><p class="st-caption">${next?esc(next.title)+' · '+(next.status==='waiting_choice'?'等待你的选择':'新消息已送达'):'已完成作者配置的全部内容。'}</p>${next?button('msg-resume','回到这条消息','','st-primary'):''}<small>进度保存在这部手机中。</small></section>`;}
function resumeMessageMainline(){const n=storyState().mainline?.queue.find(n=>!['locked','completed'].includes(n.status));if(!n)return;const c=n.ctx;if(c.channel==='kakao')openChatTarget(c.chatId);else if(c.channel==='wv')navigate('wv-private',{peer:c.peer});else{state.activeAccounts[c.platform]=c.accountIndex;currentSocial=c.platform;openDM(c.platform,c.peer);}}
function renderWeversePrivate(){const ctx={channel:'wv',peer:routeParams.peer},c=mainlineConversation(ctx);if(!c)return wvShell(empty('这段对话不存在'),'dm');return `<section class="creator-app wv-app world-page msg-private">${renderHeader(c.name)}<div class="app-scroll msg-private-history">${c.messages.map(m=>`<div class="wv-dm-message ${m.from==='나'?'artist':'fan'}"><small>${esc(m.from==='나'?state.weverse.profile.name:c.name)}</small>${bilingual(m.text,m.translation)}</div>`).join('')}</div>${mainlinePanel(ctx)||'<p class="wv-dm-note">这段来信已读完，可以回到粉丝回信流继续交流。</p>'}${wvNav('dm')}</section>`;}
function mainlineWeverseLinks(){return Object.entries(storyState().privateWV||{}).map(([peer,c])=>button('msg-wv-open',`<strong>${esc(c.name)}</strong><small>${esc(c.messages.at(-1)?.text||'来信')}${mainlineBadge({channel:'wv',peer})}</small>`,`data-peer="${esc(peer)}"`,'msg-wv-thread')).join('');}
Object.assign(CREATOR_ROUTES,{'wv-private':renderWeversePrivate});
Object.assign(STORY_ACTIONS,{'msg-choice':b=>chooseMainline(b.dataset.node,b.dataset.value),'msg-wv-open':b=>navigate('wv-private',{peer:b.dataset.peer}),'msg-resume':resumeMessageMainline});

function trimStoryNotifications(){state.notifications=[...state.notifications.filter(n=>n.mainlineNodeId&&!n.read),...state.notifications.filter(n=>!n.mainlineNodeId||n.read).slice(0,200)];}
