/** Contract for the offline story engine. Timestamps are epoch milliseconds in story time. */
type StoryId = string;
type StoryTime = number;
type StoryPlatform = 'Instagram' | 'X' | 'Threads' | 'TikTok';
type RelationSlot = 'boyfriend' | 'exPartners' | 'flirtTargets' | 'secretAdmirers' |
 'maleIdolsWhoInitiateContact' | 'groupMembers' | 'industryFriends' | 'nonIndustryFriends' |
 'familyMembers' | 'manager' | 'staff' | 'brandContacts' | 'pdDirectorsProducers';
interface PlayerProfile {
 realName:string; stageName:string; koreanName:string; gender:string; age:number;
 nationality:string; company:string; groupName:string; groupType:'group'|'solo'|'group+solo';
 roleInGroup:string[]; debutYears:number; popularityTier:'trainee'|'rookie'|'rising'|'top'|'superstar';
 fandomName:string; languages:string[]; publicImage:string; privatePersonality:string;
}
interface NPCState {
 currentActivity:string; location:string; availability:'free'|'busy'|'recording'|'stage'|'sleep'|'travel'|'flight';
 mood:string; fatigue:number; phoneAccess:boolean; readDelayRange:[number,number];
 replyDelayRange:[number,number]; busyUntil:StoryTime;
}
interface EasterEgg { id:StoryId; tag:string; summary:string }
interface Character {
 id:StoryId; name:string; handle:string; chatId:StoryId; slot:RelationSlot; profession:string;
 familyRelation:string; isPublicFigure:boolean; fictionalAU:true; publicRelationshipKnown:boolean;
 npc:NPCState; memories:EasterEgg[]; bio?:string; seedKey?:string; userEdited?:boolean;
}
interface Relationship {
 characterId:StoryId; trust:number; closeness:number; jealousy:number;
 history:Array<{at:StoryTime; messageId:StoryId; branch:string}>;
}
interface Message {
 id:StoryId; text:string; translation?:string; from:'나'|'상대'; time:string; read:boolean;
 sentAt?:string|number; story?:boolean; npcId?:StoryId; deleted?:boolean;
 mediaId?:StoryId; quote?:string;
}
interface Conversation {
 id?:StoryId; name:string; messages:Message[]; draft?:string; category?:string;
 peer?:string; storyTypingUntil?:StoryTime; updatedAt?:StoryTime;
}
interface StoryContext {
 channel:'kakao'|'dm'|'public'; chatId?:StoryId; platform?:StoryPlatform;
 accountIndex?:number; peer?:string; npcId?:StoryId;
}
interface InputUnderstanding {
 intents:string[]; tone:string; emotion:string; referencedPeople:StoryId[];
 referencedEvents:StoryId[]; commitments:Array<{type:'call';target?:StoryId;due:'after_work'}>;
 secretKnowledgeUsed:StoryId[]; riskTags:string[]; confidence:'rule-supported'|'uncertain';
}
interface FutureCommitment {
 id:StoryId; type:'call'; target:StoryId; ctx:StoryContext; sourceMessageId:StoryId;
 createdAt:StoryTime; due:StoryTime; status:'pending'|'reminded'|'fulfilled'|'cancelled';
 fulfilledAt?:StoryTime; remindedAt?:StoryTime;
}
interface Notification {
 id:StoryId; app:string; title:string; body:string; translation:string; read:boolean;
 time:number; story?:boolean; storyAt?:StoryTime; announcedAt?:number; chatId?:StoryId;
 platform?:StoryPlatform; accountIndex?:number; peer?:string;
 storyRoute?:{app:string;params:Record<string,unknown>};
}
interface MediaAsset {
 id:StoryId; assetId:StoryId; title:string; type:'image'|'video'; createdAt?:StoryTime;
 storyEventId?:StoryId; caption?:string;
}
interface Comment {id:StoryId; text:string; translation?:string; handle?:string; parentId?:StoryId; createdAt?:StoryTime}
interface Post {
 id:StoryId; handle:string; display:string; text:string; translation?:string;
 accountId?:StoryId; fanId?:StoryId; story?:boolean; createdAt:StoryTime;
 mediaId?:StoryId; mediaType?:string; attachments?:unknown[]; comments:Comment[];
 snapshotOf?:StoryId; storyEventId?:StoryId;
}
interface SocialAccount {
 storyId:StoryId; profile:{name:string;handle:string;type:'main'|'private'|'fan_alt';private:boolean};
 posts:Post[]; draft:{text:string;mediaId?:StoryId|null}; dms:Record<string,Conversation>;
 liked:Record<StoryId,boolean>; bookmarks:Record<StoryId,boolean>; reposts:Record<StoryId,boolean>;
 comments:Record<StoryId,Comment[]>; notifications:Notification[]; following:Record<string,boolean>;
 followers?:string[]; shares:unknown[];
}
interface FanNPC {
 id:StoryId; handle:string; name:string; fanType:'solo'|'group'|'cp'|'casual'|'fansite'|'anti';
 personality:string; threshold:number; platforms:string[]; fandomAge:string;
 pastInteractions:unknown[]; knowsPlayerReplies:StoryId[]; suspicion:number;
 suspicionByAccount?:Record<StoryId,number>;
}
interface AntiFanNPC extends FanNPC {fanType:'anti'}
interface KnowledgeState {
 subjectId:StoryId; factId:StoryId; status:'unknown'|'suspect'|'partial'|'knows';
 source:StoryId; timestamp:StoryTime;
}
interface Evidence {
 id:StoryId; type:'same_item'|'background'|'insider_info'|'same_location'|'same_time'|'accidental_like';
 weight:number; accountId:StoryId; sourcePostId:StoryId; platform:StoryPlatform;
 observedBy:StoryId[]; linkedPeople:StoryId[]; timestamp:StoryTime;
}
interface RumorThread {id:StoryId;accountId:StoryId;fanId:StoryId;status:'suspect';evidenceIds:StoryId[]}
interface StoryNode {id:StoryId;branches:Record<string,{ko:string;zh:string;trust:number;jealousy:number}>}
interface IntentReplyPool {ko:string;zh:string}
interface CalendarEvent {id:StoryId;storyEventId?:StoryId;title:string;date:string;time:string;location:string}
interface EventPackage {
 id:StoryId; week:number; title:string; type:string; location:string; participants:StoryId[];
 startTime:StoryTime; endTime:StoryTime; status:'scheduled'|'active'|'completed'|'cancelled';
 phase:string|null; phases:Array<{name:string;at:StoryTime;status:'pending'|'done'}>;
 traces:Array<{app:string;id:StoryId;phase:string;at:StoryTime}>; completed:boolean; mediaIds?:StoryId[];
}
interface SeasonSeed {id:StoryId;title:string;durationWeeks:number;events:Array<{week:number;title:string;type:string;location:string;brand?:boolean}>}
interface BrandDeal {id:StoryId;eventId:StoryId;brandName:string;stage:'loan'|'event'|'campaign';history:Array<{stage:string;at:StoryTime}>;status:'proposed'|'discussion'}
interface StoryJob {id:StoryId;kind:'event-phase'|'daily'|'message'|'read'|'typing'|'withdraw'|'commitment'|'spread'|'fan-clue'|'opening'|'ambient';due:StoryTime;payload:Record<string,unknown>;createdAt:StoryTime}
interface WorldState {
 version:1; initialCastVersion?:number; initialCastApplied?:Record<string,StoryId>; configured:boolean; enabled:boolean; mode:'realistic'|'semi'|'au';
 clock:{offset:number;lastTick:StoryTime}; autonomy?:{version:1;step:number;nextAt:StoryTime}; presentation?:{lastBannerAt:number}; player:PlayerProfile;
 characters:Record<StoryId,Character>; relationships:Record<StoryId,Relationship>; slots:Record<RelationSlot,StoryId[]>;
 fans:Record<StoryId,FanNPC>; season:null|{id:StoryId;instanceId:StoryId;title:string;durationWeeks:8;startedAt:StoryTime;endsAt:StoryTime;status:'running'|'completed';week:number};
 events:EventPackage[]; nodes:Record<StoryId,unknown>; queue:StoryJob[]; done:Record<StoryId,StoryTime>;
 commitments:FutureCommitment[]; evidence:Evidence[]; knowledge:KnowledgeState[];
 facts:Array<{id:StoryId;private:boolean;phrases:string[];summary:string}>;
 publicPosts:Record<StoryPlatform,Post[]>; propagation:Array<{id:StoryId;fanId:StoryId;accountId:StoryId;sourcePlatform:string;sourcePostId:StoryId;sourceReplyId:StoryId;snapshot:string;stage:string;startedAt:StoryTime;expiresAt:StoryTime;fadedAt?:StoryTime}>;
 rumors:RumorThread[]; brandDeals:BrandDeal[]; activity:unknown[]; inputLog:unknown[];
 metrics:{career:number;social:number;life:number}; accountIds:Record<StoryId,{platform:string;index:number}>;
}

// Message-driven story layer. UI pacing is not an unlock condition.
type PendingStoryStatus='locked'|'available'|'notified'|'opened'|'waiting_choice'|'completed';
interface PrivateMessageContext {channel:'kakao'|'dm'|'wv';chatId?:string;platform?:StoryPlatform;accountIndex?:number;peer?:string;npcId?:StoryId}
interface PendingStoryNode {
 id:StoryId;index:number;title:string;dependsOn:StoryId[];priority:number;status:PendingStoryStatus;
 ctx:PrivateMessageContext;cursor:number;messageIds:StoryId[];notificationId?:StoryId;nextUIAt?:number;
 lines:Array<{from:'나'|'상대';text:string;translation:string}>;
 choice?:{prompt:string;options:Array<[string,string,string]>};flag?:string;completedAt?:number;
}
interface MessageMainline {version:1;id:StoryId;title:string;status:'running'|'completed';startedAt:number;choices:Record<StoryId,string>;queue:PendingStoryNode[]}
interface WorldState {mainline?:MessageMainline|null;privateWV?:Record<string,{peer:string;name:string;messages:Message[]}>;socialWorld?:{version:1;step:number;nextAt:number;flags:Record<string,boolean>;eggs:Record<string,boolean>;visits:Record<string,string[]>}}
