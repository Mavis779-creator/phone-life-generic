/* Versioned world model, durable jobs and authored Chinese intent branches. */
function initializeStory(){
 if(state.story?.version>STORY_VERSION)return;
 if(!state.story){
  state.story={version:STORY_VERSION,configured:false,enabled:false,mode:'semi',clock:{offset:0,lastTick:0},
   player:{realName:state.profileName||'',stageName:state.profileName||'',koreanName:'',gender:'',age:20,nationality:'',company:'',groupName:'',groupType:'group',roleInGroup:[],debutYears:0,popularityTier:'rising',fandomName:'',languages:['中文'],publicImage:'',privatePersonality:''},
   characters:{},relationships:{},slots:Object.fromEntries(Object.keys(STORY_SLOTS).map(k=>[k,[]])),fans:{},
   season:null,events:[],nodes:{},queue:[],done:{},commitments:[],evidence:[],knowledge:[],facts:[],
   publicPosts:{Instagram:[],X:[],Threads:[],TikTok:[]},propagation:[],rumors:[],brandDeals:[],activity:[],inputLog:[],metrics:{career:0,social:0,life:0},accountIds:{}};
  Object.values(state.conversations||{}).filter(c=>!c.self&&c.category!=='group').forEach(c=>storyRegisterCharacter({id:'legacy-'+c.id,name:c.name,chatId:c.id,handle:state.friends[c.friendIndex]?.handle||state.friends.find(f=>f.name===c.name)?.handle||'',slot:c.category==='work'?'manager':'industryFriends'}));
 }
 const s=state.story;s.slots||={};for(const k of Object.keys(STORY_SLOTS))s.slots[k]||=[];
 for(const [platform,accounts] of Object.entries(state.accounts||{}))for(const [i,a] of Object.entries(accounts)){a.storyId||=platform+':'+i;a.profile.type||=a.profile.private?'private':Number(i)===0?'main':'fan_alt';s.accountIds[a.storyId]={platform,index:Number(i)};}
 if(!Object.keys(s.fans).length)for(const f of STORY_FANS)s.fans[f.id]={...f,platforms:['X','Threads','Weverse'],fandomAge:'长期关注',pastInteractions:[],knowsPlayerReplies:[],suspicion:0};
 rebuildPhoneSystem();
 if(s.enabled&&s.season){if(s.season.status==='running')storyEnsureAutonomy();ensureMessageMainline();}
}
function storyEnsureInitialCast(){
 const s=state.story;if(!s||s.initialCastVersion>=1)return;
 s.initialCastApplied||={};
 for(const seed of STORY_INITIAL_CAST){
  const c=Object.values(s.characters).find(c=>c.handle===seed.legacyHandle||c.seedKey===seed.key||c.handle===seed.handle||c.name===seed.name);
  if(c){
   // Configured saves keep their chosen relationships, names, jobs and chat history.
   if(!s.configured&&!s.season&&!c.userEdited&&c.id.startsWith('legacy-')){storyRegisterCharacter({...c,slot:seed.slot,profession:c.profession||seed.profession,familyRelation:c.familyRelation||seed.familyRelation||''});}
   s.characters[c.id].bio||=seed.bio;s.initialCastApplied[seed.key]=c.id;continue;
  }
  if(s.initialCastApplied[seed.key])continue;
  const fresh=storyRegisterCharacter({...seed,id:'initial-'+seed.key});fresh.seedKey=seed.key;fresh.bio=seed.bio;
  s.initialCastApplied[seed.key]=fresh.id;
  if(seed.greeting)state.conversations[fresh.chatId].messages.push({id:'initial-greeting-'+seed.key,text:seed.greeting,translation:'',from:'상대',read:true,time:timeNow(),sentAt:new Date().toISOString(),initial:true});
 }
 s.initialCastVersion=1;
}
function storyState(){if(!state.story)initializeStory();return state.story;}
function storyEnabled(){return !!state.story?.enabled&&state.story.version===STORY_VERSION;}
function storyNow(){return Date.now()+(state.story?.clock.offset||0);}
function storyAtomic(fn){
 const snapshot=JSON.stringify(state),oldSuppress=suppressSave;let result;
 try{suppressSave=true;result=fn();suppressSave=oldSuppress;if(!oldSuppress&&!saveState())throw Error('剧情未能保存，本次变动已撤销。请检查存储空间。');}
 catch(e){suppressSave=oldSuppress;state=JSON.parse(snapshot);throw e;}
 invalidate();return result;
}
function storyText(value,max=160){return String(value??'').trim().slice(0,max);}
function storyRegisterCharacter(values){
 const s=storyState(),slot=values.slot||'industryFriends';if(!STORY_SLOTS[slot])throw Error('关系槽位无效');
 const name=storyText(values.name,40);if(!name)throw Error('请填写人物姓名');
 const existing=values.chatId?state.conversations[values.chatId]:Object.values(state.conversations).find(c=>!c.self&&c.name===name&&c.category!=='group');
 const id=values.id||Object.values(s.characters).find(c=>c.name===name||existing&&c.chatId===existing.id)?.id||uid('character'),old=s.characters[id];
 if(slot==='boyfriend'&&s.slots.boyfriend.some(x=>x!==id))throw Error('男友槽位最多一人，请先调整原有关系');
 const chatId=old?.chatId||existing?.id||'story-chat-'+id,handle=storyText(values.handle||old?.handle||'npc_'+Object.keys(s.characters).length,60);
 if(/[\s<>"']/.test(handle)||Object.values(s.characters).some(c=>c.id!==id&&c.handle===handle))throw Error('人物账号需要唯一且不能包含空白');
 const c=s.characters[id]={...old,id,name,handle,chatId,slot,profession:storyText(values.profession||old?.profession||''),familyRelation:storyText(values.familyRelation||old?.familyRelation||'',20),isPublicFigure:!!values.isPublicFigure,fictionalAU:true,publicRelationshipKnown:!!values.publicRelationshipKnown,
  npc:old?.npc||{currentActivity:'休息',location:'私人地点',availability:'free',mood:'平静',fatigue:0,phoneAccess:true,readDelayRange:[5000,12000],replyDelayRange:[12000,24000],busyUntil:0},memories:old?.memories||[]};
 for(const k of Object.keys(s.slots))s.slots[k]=s.slots[k].filter(x=>x!==id);s.slots[slot].push(id);
 s.relationships[id]||={characterId:id,trust:60,closeness:40,jealousy:0,history:[]};
 state.conversations[chatId]||={id:chatId,name,category:slot==='manager'?'work':'friends',messages:[]};state.conversations[chatId].name=name;
 if(!state.friends.some(f=>f.storyCharacterId===id||f.name===name)){state.friends.push({id:'story-friend-'+id,storyCharacterId:id,name,handle,status:'',preview:'',avatar:''});}
 else{const f=state.friends.find(f=>f.storyCharacterId===id||f.name===name);f.storyCharacterId=id;f.name=name;f.handle=handle;}
 if(state.systemStoryRevision===2&&s.mainline)ensureFanCircles();return c;
}
function storyCharacter(ctx){const s=storyState();return ctx.npcId?s.characters[ctx.npcId]:Object.values(s.characters).find(c=>ctx.channel==='kakao'?c.chatId===ctx.chatId:c.handle===ctx.peer);}
function storySlot(slot){return storyState().characters[storyState().slots[slot]?.[0]];}
function storyKnow(subjectId,factId,status,source){
 const s=storyState(),rank={unknown:0,suspect:1,partial:2,knows:3};if(!(status in rank))throw Error('知情状态无效');
 const old=s.knowledge.find(k=>k.subjectId===subjectId&&k.factId===factId);
 if(old){if(rank[status]>rank[old.status])Object.assign(old,{status,source,timestamp:storyNow()});return old;}
 const k={subjectId,factId,status,source,timestamp:storyNow()};s.knowledge.push(k);return k;
}
function storyKnowledge(subjectId,factId){return storyState().knowledge.find(k=>k.subjectId===subjectId&&k.factId===factId)?.status||'unknown';}
function storySchedule(id,kind,due,payload={}){const s=storyState();if(!['event-phase','daily','message','read','typing','withdraw','commitment','spread','fan-clue','opening','ambient'].includes(kind)||!Number.isFinite(due)||!id)throw Error('剧情队列任务无效');if(s.done[id]||s.queue.some(j=>j.id===id))return;const job={id,kind,due,payload,createdAt:storyNow()};s.queue.push(job);return job;}
function storyRecord(kind,text,extra={}){const s=storyState();s.activity.unshift({id:uid('trace'),kind,text,at:storyNow(),...extra});s.activity=s.activity.slice(0,400);}
function storyStartSeason(){ /* Blank template: author automation explicitly. */ }
function storyEnsureAutonomy(){ /* Blank template: author automation explicitly. */ }
function storyOpeningPost(){const s=storyState(),id=s.season.instanceId+':opening-social';storyFanPost('fan-campus','Threads','今天也想听听'+s.player.stageName+'最近在听什么歌。下课后再来看看有没有新动态。',id);storyNotify('Threads','粉丝在聊你','有一条新的日常讨论。','',{storyRoute:{app:'social-post',params:{platform:'Threads',postId:id}}});}
function storyAmbient(){ /* Blank template: author automation explicitly. */ }
function storyUnderstand(text,ctx={}){
 const s=storyState(),c=storyCharacter(ctx),raw=storyText(text,5000),t=raw.replace(/\s/g,''),intents=[];
 const has=r=>r.test(t),intent=(name,condition)=>{if(condition)intents.push(name);};
 intent('tease_jealousy',has(/吃醋|醋坛|酸了|酸不酸|明明.{0,4}在意|因为.{0,8}(生气|不爽)|看到.{0,12}(和|跟|同台|录).{0,12}(不爽|生气|不高兴)|突然.{0,5}(不理|冷淡)/)&&!has(/^(我|他|她|你)?(真的|并|才)?(没有|不是)吃醋[。！!]*$/));
 intent('reassure_partner',has(/只.{0,3}(工作|同事|朋友)|别(担心|多想|生气)|放心|想你|抱抱|最.{0,3}(爱|喜欢).{0,3}你|回去.{0,6}(找你|陪你|电话)|给你打电话/));
 intent('promise_call',has(/(回去|晚点|待会|结束|一会|今晚|到家).{0,12}(打|回).{0,3}电话|给你打电话/)&&!has(/(不|没法|不能|别).{0,3}(打|回).{0,3}电话|不想.{0,5}电话/));
 intent('cancel_call',has(/(不|不能|没法|取消).{0,6}(打|回|电话)/));
 intent('memory_first_date',has(/第一次.{0,6}(约会|出去|意面)|圣水.{0,5}(那家|意面)|还记得.{0,8}约会/));
 intent('ask_schedule',has(/几点|行程|集合|安排|到哪|什么时候|录制|开工/));
 intent('daily_care',has(/吃(了|饭|点)|晚饭|午饭|睡|休息|洗澡|累|等车|收拾行李/));
 intent('avoid',has(/先不说|待会再说|不聊了|忙着呢|之后再说/));
 intent('cold',has(/随你|那算了|别烦|无所谓|不关我事|^行[。.]$/));
 intent('secret_flex',has(/(他|男友|对象|女朋友).{0,12}(宠|幸福|卡|外套|家)|同款|两份夜宵|借穿|懂的都懂|刷.{0,8}卡/));
 const secretKnowledgeUsed=s.facts.filter(f=>f.private&&f.phrases?.some(p=>t.includes(p))).map(f=>f.id);
 const referencedPeople=Object.values(s.characters).filter(p=>t.includes(p.name)).map(p=>p.id);if(c&&!referencedPeople.includes(c.id))referencedPeople.push(c.id);
 const tone=has(/❤️|🤍|♡|抱抱|爱你/)?'affectionate':has(/\?{2,}|？{2,}/)?'incredulous':has(/ㅋㅋ|哈哈|笑死|你少来|别太爱/)?'playful':has(/……|\.\.\.|行吧/)?'reluctant':intents.includes('cold')?'cold':has(/呀|好哒|好啊/)?'warm':'neutral';
 return {intents,tone,emotion:tone==='cold'?'distant':tone==='playful'?'amused':'calm',referencedPeople,referencedEvents:s.events.filter(e=>t.includes(e.title)).map(e=>e.id),commitments:intents.includes('promise_call')?[{type:'call',target:c?.id,due:'after_work'}]:[],secretKnowledgeUsed,riskTags:secretKnowledgeUsed.length?['information_leak']:intents.includes('secret_flex')?['ambiguous_clue']:[],confidence:intents.length?'rule-supported':'uncertain'};
}
function storyConversation(ctx){if(ctx.channel==='kakao')return state.conversations[ctx.chatId];if(ctx.channel==='dm')return state.accounts[ctx.platform]?.[ctx.accountIndex]?.dms[ctx.peer];return null;}
function storyNotify(app,title,body,translation='',extra={}){const n={id:uid('story-notice'),story:true,app,title,body,translation,read:false,time:Date.now(),storyAt:storyNow(),...extra};state.notifications.unshift(n);trimStoryNotifications();return n;}
function storyDeliver(ctx,text,translation='',extra={}){
 const c=storyConversation(ctx),npc=storyCharacter(ctx);if(!c)return;
 if((/[가-힣ぁ-ゟァ-ヿ]/.test(text)||/[A-Za-z]{2,}/.test(text)&&!/[\u4e00-\u9fff]/.test(text))&&!translation)throw Error('剧情外语消息缺少中文翻译');
 const open=!!state.unlocked&&(ctx.channel==='kakao'?currentApp==='kakao-chat'&&activeChat===ctx.chatId:currentApp==='social-chat'&&currentSocial===ctx.platform&&(state.activeAccounts[ctx.platform]||0)===ctx.accountIndex&&routeParams.peer===ctx.peer);
 const m={id:uid('story-msg'),from:'상대',text,translation,read:open,time:new Date(storyNow()).toTimeString().slice(0,5),sentAt:new Date(storyNow()).toISOString(),story:true,npcId:npc?.id,...extra};c.messages.push(m);c.updatedAt=storyNow();
 const n=storyNotify(ctx.channel==='kakao'?'KakaoTalk':ctx.platform,c.name,text,translation,ctx.channel==='kakao'?{chatId:ctx.chatId,read:open}:{platform:ctx.platform,accountIndex:ctx.accountIndex,peer:ctx.peer,read:open});
 if(ctx.channel==='dm')state.accounts[ctx.platform][ctx.accountIndex].notifications.unshift(n);
 return m;
}
function storyHandleInput(ctx,text,messageId){
 if(!storyEnabled())return false;const c=storyCharacter(ctx);if(!c)return storyHandleFanInput(ctx,text,messageId);
 return storyAtomic(()=>{
  const s=storyState(),u=storyUnderstand(text,ctx),now=storyNow(),id='input:'+messageId;
  if(s.done[id])return true;s.done[id]=now;s.inputLog.unshift({id,messageId,npcId:c.id,ctx:{...ctx},text:storyText(text,5000),understanding:u,at:now});s.inputLog=s.inputLog.slice(0,300);
  const playerMessage=storyConversation(ctx)?.messages.find(m=>m.id===messageId);if(playerMessage){playerMessage.read=false;playerMessage.translation='';}
  const r=s.relationships[c.id],busy=!c.npc.phoneAccess||c.npc.busyUntil>now||!c.npc.busyUntil&&['recording','stage','sleep','flight'].includes(c.npc.availability);
  const unavailableUntil=busy?Math.max(c.npc.busyUntil||0,now+1800000):0;
  const readAt=Math.max(now+5000,unavailableUntil)+(busy?15000:0),replyAt=readAt+12000+(s.inputLog.length%3)*3000;
  let reply=STORY_REPLY_POOLS[c.slot]||STORY_REPLY_POOLS.default,branch='ordinary';
  const jealousy=c.slot==='boyfriend'&&(u.intents.includes('tease_jealousy')||r.jealousy>=3);
  if(jealousy){branch=u.intents.includes('cold')?'cold':u.intents.includes('avoid')?'avoid':u.intents.includes('reassure_partner')?'reassure':'tease';reply=STORY_NODES.jealousy.branches[branch];r.trust=Math.max(0,Math.min(100,r.trust+reply.trust));r.jealousy=Math.max(0,r.jealousy+reply.jealousy);s.nodes[c.id+':jealousy']={nodeId:'jealousy',branch,at:now,messageId};}
  else if(u.intents.includes('ask_schedule'))reply={ko:'일정표에 적어 뒀어. 끝나고 다시 연락할게.',zh:'记在日程表里了，结束后我再联系你。'};
  else if(u.intents.includes('daily_care'))reply={ko:'나도 이제 밥 먹으려고. 너도 좀 쉬어.',zh:'我也正准备吃饭，你也休息一会儿。'};
  else if(u.confidence==='uncertain')reply={ko:'잠깐, 어떤 얘기야? 조금만 더 말해 줘.',zh:'等一下，你指的是哪件事？再跟我说一点。'};
  const memory=c.memories.find(m=>m.tag==='first_date');
  if(u.intents.includes('memory_first_date')&&memory&&!s.done[c.id+':memory:'+memory.id]){reply={ko:'기억하지. 다음에 같이 다시 가자.',zh:'当然记得。'+memory.summary+'，下次再一起去吧。'};s.done[c.id+':memory:'+memory.id]=now;}
  if(u.intents.includes('cancel_call'))for(const p of s.commitments.filter(p=>p.target===c.id&&p.status==='pending'))p.status='cancelled';
  if(u.intents.includes('promise_call')){let p=s.commitments.find(p=>p.target===c.id&&p.type==='call'&&p.status==='pending');if(!p){const active=s.events.find(e=>e.startTime<=now&&e.endTime>=now);p={id:uid('promise'),type:'call',target:c.id,ctx:{...ctx},sourceMessageId:messageId,createdAt:now,due:active?active.endTime+300000:now+900000,status:'pending'};s.commitments.push(p);storySchedule(p.id+':remind','commitment',p.due,{id:p.id});}}
  storySchedule(id+':read','read',readAt,{ctx:{...ctx},messageId,npcId:c.id,factsToLearn:u.secretKnowledgeUsed});
  const readOnly=u.intents.includes('cold')&&!jealousy;
  if(!readOnly){storySchedule(id+':typing','typing',replyAt-3000,{ctx:{...ctx},npcId:c.id,until:replyAt});storySchedule(id+':reply','message',replyAt,{ctx:{...ctx},text:reply.ko,translation:reply.zh,npcId:c.id});
   if(u.intents.includes('promise_call'))storySchedule(id+':second','message',replyAt+4000,{ctx:{...ctx},text:'끝나면 전화해.',translation:'忙完给我打电话。',npcId:c.id,commitmentId:s.commitments.find(p=>p.target===c.id&&p.status==='pending')?.id});}
  r.history.push({at:now,messageId,branch});r.history=r.history.slice(-100);return true;
 });
}
function storyPeerProfile(peer){if(!storyEnabled())return null;const s=storyState();return Object.values(s.characters).find(c=>c.handle===peer)||Object.values(s.fans).find(f=>f.handle===peer);}
function storyHandleFanInput(ctx,text,messageId){if(ctx.channel!=='dm')return false;const fan=Object.values(storyState().fans).find(f=>f.handle===ctx.peer);if(!fan)return false;return storyAtomic(()=>{const s=storyState(),id='input:'+messageId;if(s.done[id])return true;s.done[id]=storyNow();fan.pastInteractions.push({type:'dm',platform:ctx.platform,accountIndex:ctx.accountIndex,messageId,at:storyNow()});const m=storyConversation(ctx)?.messages.find(m=>m.id===messageId);if(m){m.read=false;m.translation='';}storySchedule(id+':read','read',storyNow()+8000,{ctx:{...ctx},messageId});storySchedule(id+':reply','message',storyNow()+20000,{ctx:{...ctx},text:'답장해 줘서 고마워요. 오늘도 응원할게요!',translation:'谢谢你回复我，今天也会为你加油！'});return true;});}
function storyFulfillCall(name,peer){if(!storyEnabled())return;storyAtomic(()=>{const s=storyState(),c=Object.values(s.characters).find(c=>c.name===name||peer&&c.handle===peer);if(c)for(const p of s.commitments.filter(p=>p.target===c.id&&['pending','reminded'].includes(p.status))){p.status='fulfilled';p.fulfilledAt=storyNow();}});}
function storyWithdrawInput(messageId){if(!storyEnabled())return;storyAtomic(()=>{const s=storyState();s.queue=s.queue.filter(j=>!j.id.startsWith('input:'+messageId+':'));for(const p of s.commitments.filter(p=>p.sourceMessageId===messageId&&p.status==='pending'))p.status='cancelled';for(const c of Object.values(state.conversations))if(c.storyTypingUntil)c.storyTypingUntil=0;for(const list of Object.values(state.accounts))for(const a of Object.values(list))for(const c of Object.values(a.dms||{}))if(c.storyTypingUntil)c.storyTypingUntil=0;storyRecord('withdraw','已撤回的消息停止尚未发生的回复与承诺提醒',{messageId});});}
function storyPost(platform,post){const s=storyState();s.publicPosts[platform]||=[];if(!s.publicPosts[platform].some(p=>p.id===post.id))s.publicPosts[platform].unshift({...post,story:true,createdAt:storyNow(),date:'刚刚',likes:0,reposts:0,comments:post.comments||[]});return post;}
function storyVisiblePosts(platform){if(!storyEnabled())return [];const a=activeAccount(platform);return (storyState().publicPosts[platform]||[]).filter(p=>!p.accountId||p.accountId===a?.storyId);}
function storyFanPost(fanId,platform,text,id,extra={}){const f=storyState().fans[fanId];return storyPost(platform,{id,handle:f.handle,display:f.name,fanId,text,translation:'',...extra});}
function storyOnReply(platform,postId,text,replyId){
 if(!storyEnabled())return;const p=platform==='Weverse'?wvPost(postId):findPost(platform,postId),fanId=p?.fanId||Object.values(storyState().fans).find(f=>f.handle===p?.handle||f.name===p?.name)?.id;
 if(!fanId)return;storyAtomic(()=>{const s=storyState(),f=s.fans[fanId],a=platform==='Weverse'?{storyId:'Weverse:artist',profile:{private:false}}:activeAccount(platform),key='fan-reply:'+replyId;
  if(s.done[key])return;s.done[key]=storyNow();f.knowsPlayerReplies.push(replyId);f.pastInteractions.push({platform,postId,replyId,at:storyNow()});
  // A closed account response stays with its audience; never create a public screenshot automatically.
  if(a.profile.private){storyRecord('private-reply','私密账号回复，未进入公开传播',{accountId:a.storyId});return;}
  const chain={id:uid('spread'),fanId,sourcePlatform:platform,sourcePostId:postId,sourceReplyId:replyId,accountId:a.storyId,snapshot:storyText(text,5000),stage:'seen',startedAt:storyNow(),expiresAt:storyNow()+10800000};s.propagation.push(chain);
  for(const [stage,delay] of [['screenshot',60000],['friend_reply',180000],['repost',600000],['community',1200000],['faded',10800000]])storySchedule(chain.id+':'+stage,'spread',storyNow()+delay,{id:chain.id,stage});
 });
}
function storyObservePost(platform,post){
 if(!storyEnabled())return;const a=activeAccount(platform),s=storyState(),u=storyUnderstand(post.text,{channel:'public'});
 storyAtomic(()=>{
  post.accountId=a.storyId;const observers=Object.values(s.fans).filter(f=>!a.profile.private||(a.followers||[]).includes(f.id)||(a.followers||[]).includes(f.handle));
  const types=[];if(u.intents.includes('secret_flex'))types.push(['same_item',1]);if(/(他家|男友家|沙发|背景)/.test(post.text))types.push(['background',2]);if(u.secretKnowledgeUsed.length)types.push(['insider_info',3]);
  for(const [type,weight] of types){const id=post.id+':'+type;if(s.evidence.some(e=>e.id===id))continue;const evidence={id,type,weight,accountId:a.storyId,sourcePostId:post.id,platform,observedBy:observers.map(f=>f.id),linkedPeople:[],timestamp:storyNow()};s.evidence.push(evidence);
   for(const f of observers){f.suspicionByAccount||={};f.suspicionByAccount[a.storyId]=(f.suspicionByAccount[a.storyId]||0)+weight;f.suspicion+=weight;const status=f.suspicionByAccount[a.storyId]>=f.threshold?'suspect':'unknown';storyKnow(f.id,'account-owner:'+a.storyId,status,id);if(status==='suspect'&&!s.rumors.some(r=>r.accountId===a.storyId&&r.fanId===f.id)){s.rumors.push({id:uid('rumor'),accountId:a.storyId,fanId:f.id,status:'suspect',evidenceIds:s.evidence.filter(e=>e.accountId===a.storyId&&e.observedBy.includes(f.id)).map(e=>e.id)});storySchedule(id+':fan:'+f.id,'fan-clue',storyNow()+180000,{fanId:f.id,accountId:a.storyId});}}
  }
  if(types.length)storyRecord('evidence','动态留下了可见线索',{postId:post.id,accountId:a.storyId});
 });
}
function storyPublishWeverse(text,id){if(storyEnabled())storyRecord('weverse','发布社区动态',{postId:id});}
function storyEventPhase(eventId,phase){
 const s=storyState(),e=s.events.find(e=>e.id===eventId);if(!e)return;const ph=e.phases.find(p=>p.name===phase);if(ph.status==='done')return;ph.status='done';e.phase=phase;e.status=phase==='private_followup'?'completed':'active';
 const manager=storySlot('manager'),ctx=manager?{channel:'kakao',chatId:manager.chatId,npcId:manager.id}:null,player=s.player.stageName||state.profileName;
 const trace=(app,id)=>e.traces.push({app,id,phase,at:storyNow()});
 if(phase==='before'){
  if(ctx){const m=storyDeliver(ctx,'오늘 일정 확인해 주세요. 출발 전에 준비물도 챙겨 주세요.',e.title+'即将开始。请确认集合时间，出发前检查随身物品。');trace('KakaoTalk',m.id);}
  const file={id:'story-file-'+e.id,name:e.title+' · 通告单.txt',content:`${s.player.company||'艺人管理团队'}\n${player} · ${e.title}\n地点：${e.location}\n集合：${new Date(e.startTime).toLocaleString('zh-CN')}\n负责人：${manager?.name||'工作团队'}\n准备：证件、充电器、水杯。\n本次为虚构 AU 工作行程。`,folderId:'work',mime:'text/plain',source:'剧情通告',createdAt:storyNow(),storyEventId:e.id};state.productivity.files.unshift(file);
  const mail={id:'story-mail-'+e.id,threadId:'story-mail-'+e.id,from:manager?.name||'工作团队',fromAddress:'schedule@story.example',to:'artist@phone.example',subject:'[通告] '+e.title,body:'地点、集合时间与负责人见附件；日历已同步。',box:'收件箱',category:'updates',time:storyNow(),attachments:[file.id],read:false,storyEventId:e.id};state.mail.unshift(mail);trace('Gmail',mail.id);trace('日历','calendar-'+e.id);trace('公司',e.id);
 }
 if(phase==='travel'){
  if(ctx)trace('KakaoTalk',storyDeliver(ctx,'지금 어디쯤이에요? 도착하면 알려 주세요.','现在到哪里了？到了告诉我。').id);
  const source=state.photos.find(p=>e.mediaIds?.includes(p.id));if(source){trace('照片','story-photo-'+e.id+'-'+source.id);}else storyRecord('media-needed','可为 '+e.title+' 关联本地照片',{eventId:e.id});
 }
 if(phase==='onsite'){
  for(const id of e.participants){const c=s.characters[id];if(c){c.npc.currentActivity=e.title;c.npc.location=e.location;c.npc.availability='recording';c.npc.busyUntil=e.endTime;}}
  const friend=storySlot('industryFriends')||storySlot('groupMembers');if(friend)trace('KakaoTalk',storyDeliver({channel:'kakao',npcId:friend.id,chatId:friend.chatId},'오늘도 잘하고 와. 끝나고 얘기해!','今天也加油，结束后再聊！').id);
 }
 if(phase==='after'){
  for(const id of e.participants){const c=s.characters[id];if(c){c.npc.currentActivity='休息';c.npc.availability='free';c.npc.busyUntil=0;}}
  const media=state.photos.filter(p=>p.storyEventId===e.id);const ref=media[0];
  trace('Instagram',storyPost('Instagram',{id:e.id+':official',display:s.player.company||'活动官方',handle:'event_official',text:player+' · '+e.title+'，今天也辛苦了。',location:e.location,...(ref?.assetId?{mediaId:ref.assetId,mediaType:ref.type,attachments:[{assetId:ref.assetId,type:ref.type}]}:{attachments:[{description:e.title+' · 活动结束记录，可在公司工作台关联本地媒体。',tone:'sage'}]})}).id);
 }
 if(phase==='online_reaction'){
  trace('X',storyFanPost('fan-rational','X',player+'今天的'+e.title+'，细节慢慢整理。',e.id+':fan-x').id);
  trace('Threads',storyFanPost('fan-campus','Threads','下课后看到'+player+'的活动消息。今天也有被鼓励到。',e.id+':fan-th').id);
  trace('TikTok',storyPost('TikTok',{id:e.id+':challenge',display:'舞台剪辑记录',handle:'stage_diary',text:'#'+player+' #'+e.title+' 今日片段讨论',storyEventId:e.id,attachments:[]}).id);
  const fan=s.fans['fan-group'],p={id:e.id+':wv',name:fan.name,fanId:fan.id,role:'fan',text:player+'今天工作辛苦了！想听你说说最喜欢的瞬间。',translation:'',createdAt:storyNow(),media:[],comments:[],likes:0,storyEventId:e.id};if(!state.weverse.posts.some(x=>x.id===p.id))state.weverse.posts.unshift(p);trace('Weverse',p.id);
  storyNotify('X','活动后的新讨论',e.title+'已有粉丝反馈。','',{storyRoute:{app:'social-post',params:{platform:'X',postId:e.id+':fan-x'}}});
 }
 if(phase==='private_followup'){
  e.completed=true;const partner=storySlot('boyfriend');if(partner){storyKnow(partner.id,'public-event:'+e.id,'knows',e.id+':official');storyDeliver({channel:'kakao',chatId:partner.chatId,npcId:partner.id},'오늘 나온 사진 봤어. 수고했어.','看到今天的活动照片了，辛苦了。');if(e.type==='variety')s.relationships[partner.id].jealousy+=3;}
  for(const d of s.brandDeals.filter(d=>d.eventId===e.id)){d.stage=e.week>=7?'campaign':'event';d.status='discussion';d.history.push({stage:d.stage,at:storyNow()});}
  s.metrics.career++;storyRecord('event',e.title+'完成手机痕迹联动',{eventId:e.id});
 }
}
function storySpread(id,stage){
 const s=storyState(),chain=s.propagation.find(c=>c.id===id);if(!chain)return;chain.stage=stage;const f=s.fans[chain.fanId];
 if(stage==='screenshot')storyFanPost(f.id,'Threads','她真的回复我了！先存下这一句：'+chain.snapshot,id+':capture',{snapshotOf:chain.sourceReplyId});
 if(stage==='friend_reply')storyFanPost('fan-campus','Threads','看到你的记录啦，这句回复好温柔。',id+':friend',{sourceChainId:id});
 if(stage==='repost')storyFanPost('fan-group','X','搬运一条今天的粉丝互动：'+chain.snapshot,id+':repost',{snapshotOf:chain.sourceReplyId});
 if(stage==='community')state.weverse.posts.unshift({id:id+':community',name:s.fans['fan-group'].name,fanId:'fan-group',role:'fan',text:'有人看到今天那条粉丝互动了吗？'+chain.snapshot,translation:'',createdAt:storyNow(),media:[],comments:[],likes:0,sourceChainId:id});
 if(stage==='faded')chain.fadedAt=storyNow();storyRecord('spread','粉丝互动传播：'+stage,{chainId:id});
}
function storyDaily(){ /* Blank template: author automation explicitly. */ }
function storyRunJob(j){
 const s=storyState(),p=j.payload,now=storyNow();
 if(j.kind==='event-phase')storyEventPhase(p.eventId,p.phase);
 else if(j.kind==='read'){const npc=s.characters[p.npcId],c=storyConversation(p.ctx);if(npc&&(!npc.npc.phoneAccess||npc.npc.busyUntil>now)){storySchedule(j.id+':deferred','read',Math.max(now+1800000,npc.npc.busyUntil||0),p);return;}const sent=c?.messages.find(m=>m.id===p.messageId);if(sent)sent.read=true;for(const fact of p.factsToLearn||[])if(p.npcId)storyKnow(p.npcId,fact,'knows',p.messageId);}
 else if(j.kind==='typing'){const npc=s.characters[p.npcId],c=storyConversation(p.ctx);if(c&&(!npc||npc.npc.phoneAccess&&npc.npc.busyUntil<=now))c.storyTypingUntil=p.until;}
 else if(j.kind==='message'){
  if(p.commitmentId&&!['pending','reminded'].includes(s.commitments.find(c=>c.id===p.commitmentId)?.status))return;
  const c=s.characters[p.npcId||p.ctx.npcId];if(c&&(!c.npc.phoneAccess||c.npc.busyUntil>now)){storySchedule(j.id+':deferred','message',Math.max(now+1800000,c.npc.busyUntil||0)+12000,p);return;}
  storyDeliver(p.ctx,p.text,p.translation,p.extra||{});const conversation=storyConversation(p.ctx);if(conversation)conversation.storyTypingUntil=0;
 }else if(j.kind==='withdraw'){const m=storyConversation(p.ctx)?.messages.find(m=>m.id===p.messageId);if(m){m.deleted=true;m.withdrawn=true;}}
 else if(j.kind==='commitment'){const c=s.commitments.find(c=>c.id===p.id);if(c?.status==='pending'){const npc=s.characters[c.target];if(npc&&(!npc.npc.phoneAccess||npc.npc.busyUntil>now)){storySchedule(j.id+':deferred','commitment',Math.max(now+1800000,npc.npc.busyUntil||0),p);return;}storyDeliver(c.ctx,'전화 안 해?','不是说忙完要给我打电话吗？');c.status='reminded';c.remindedAt=now;}}
 else if(j.kind==='spread')storySpread(p.id,p.stage);
 else if(j.kind==='daily')storyDaily(p.day);
 else if(j.kind==='opening')storyOpeningPost();
 else if(j.kind==='ambient')storyAmbient(p.step);
 else if(j.kind==='fan-clue')storyFanPost(p.fanId,'X','这个账号的线索有点巧，但还不能下结论。','clue:'+j.id,{accountId:p.accountId});
}
function tickStory(){
 if(!storyEnabled())return;const s=storyState(),now=storyNow();if(!s.queue.some(j=>j.due<=now)&&!(s.season?.status==='running'&&s.season.endsAt<=now)&&!Object.values(s.characters).some(c=>c.npc.busyUntil&&c.npc.busyUntil<=now)){storyPresentUpdates();return;}
 try{storyAtomic(()=>{
  let processed=0;while(processed<160){const list=storyState().queue.filter(j=>j.due<=now).sort((a,b)=>a.due-b.due||a.id.localeCompare(b.id)),j=list[0];if(!j)break;storyState().queue=storyState().queue.filter(x=>x.id!==j.id);if(!storyState().done[j.id]){storyRunJob(j);storyState().done[j.id]=now;}processed++;}
  const s=storyState();for(const c of Object.values(s.characters))if(c.npc.busyUntil&&c.npc.busyUntil<=now){c.npc.availability='free';c.npc.busyUntil=0;c.npc.currentActivity='休息';}
  if(s.season){s.season.week=Math.min(8,Math.floor((now-s.season.startedAt)/(7*86400000))+1);if(now>=s.season.endsAt&&s.events.every(e=>e.completed))s.season.status='completed';}s.clock.lastTick=now;
 });renderLockNotifications();
 // Preserve active drafts, scroll, media and sheets. New feed content appears on normal refresh/navigation.
 if(!$('.world-sheet')&&['company','story-settings','story-event','kakao-chat','social-chat'].includes(currentApp)&&document.activeElement?.tagName!=='TEXTAREA'&&document.activeElement?.tagName!=='INPUT')renderApp(currentApp);
 storyPresentUpdates();
 }catch(e){console.error('剧情推进未保存',e.message);}
}
function storyPresentUpdates(){
 const welcomeCount=$('#stWelcomeUnread');if(welcomeCount)welcomeCount.textContent=String(state.notifications.filter(n=>n.story&&!n.read).length);
 if(document.hidden||$('#storyWelcome')||storyOnboarding||$('.world-sheet')||!state.unlocked||lockPreferences().focus)return;
 const s=storyState(),pending=state.notifications.filter(n=>n.story&&!n.read&&!n.announcedAt).sort((a,b)=>(b.priority||0)-(a.priority||0)||a.time-b.time);
 if(!pending.length||s.presentation?.lastBannerAt&&Date.now()-s.presentation.lastBannerAt<12000)return;
 const next=pending[0];try{storyAtomic(()=>{next.announcedAt=Date.now();s.presentation={lastBannerAt:Date.now()};});}catch{return;}
 showToast(next.title,next.body,next.app,next.translation);$('#toast').dataset.notification=next.id;
 if(['home','kakao','kakao-chats','social-dms','notifications'].includes(currentApp)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))renderApp(currentApp);
}

function storyAdvance(){if(!storyEnabled())return;const next=storyState().queue.filter(j=>j.due>storyNow()).sort((a,b)=>a.due-b.due)[0];if(!next)return;storyAtomic(()=>{storyState().clock.offset+=next.due-storyNow()+1;});tickStory();}
function storyRescheduleCalendar(values){
 const calendar=state.events.find(e=>e.id===values.id),event=storyState().events.find(e=>e.id===calendar?.storyEventId);if(!event)return false;
 const start=new Date(values.date+'T'+values.time+':00').getTime();if(!Number.isFinite(start))throw Error('活动日期或时间无效');if(event.completed)throw Error('已结束活动的历史通告不能改期，可新增其他日程');
 return storyAtomic(()=>{const s=storyState(),shift=start-event.startTime,oldTitle=event.title;Object.assign(calendar,values);Object.assign(event,{title:values.title,location:values.location,startTime:start,endTime:event.endTime+shift});
  for(const p of event.phases){p.at+=shift;const j=s.queue.find(j=>j.id===event.id+':'+p.name);if(j)j.due=p.at;}
  for(const id of event.participants){const c=s.characters[id];if(c?.npc.currentActivity===oldTitle){c.npc.currentActivity=event.title;c.npc.busyUntil=event.endTime;}}
  storyRecord('schedule',event.title+'改期，待执行阶段已同步',{eventId:event.id});return true;
 });
}
function storyCancelCalendar(calendarId){const c=state.events.find(e=>e.id===calendarId),event=storyState().events.find(e=>e.id===c?.storyEventId);if(!event)return false;return storyAtomic(()=>{event.status='cancelled';event.cancelledAt=storyNow();event.completed=true;storyState().queue=storyState().queue.filter(j=>j.payload.eventId!==event.id);state.events=state.events.filter(e=>e.id!==calendarId);for(const id of event.participants){const c=storyState().characters[id];if(c?.npc.currentActivity===event.title){c.npc.currentActivity='休息';c.npc.availability='free';c.npc.busyUntil=0;}}storyRecord('schedule',event.title+'已取消',{eventId:event.id});return true;});}
