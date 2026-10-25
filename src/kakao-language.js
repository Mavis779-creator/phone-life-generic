/* Language is a view preference. Saved messages and manually named friends stay intact. */
function kakaoLanguage(){return PhoneKakaoLanguage.mode(state.kakaoPreferences?.mode);}
function kakaoLanguageLabel(){return kakaoLanguage()==='zh'?'仅中文':'中韩双语';}
function kakaoTextView(text,translation=''){text=String(text||'');const ko=/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(text),zh=String(translation||'').trim();if(!ko)return {primary:text,secondary:'',missing:false};if(kakaoLanguage()==='zh')return {primary:zh||'这条消息暂无中文译文',secondary:'',missing:!zh,original:text};return {primary:text,secondary:zh,missing:!zh,original:text};}
function kakaoMessageHtml(text,translation='',cls='translation'){const v=kakaoTextView(text,translation);return `<span class="original">${esc(v.primary)}</span>${v.secondary?`<span class="${esc(cls)}">${esc(v.secondary)}</span>`:''}${v.missing?`<details class="kk-language-missing"><summary>${kakaoLanguage()==='zh'?'查看原文':'暂无中文译文'}</summary><span>${esc(v.original)}</span></details>`:''}`;}
let kakaoRenderingText=false;
const kakaoBaseBilingual=bilingual;
bilingual=function(text,translation='',cls='translation'){return kakaoRenderingText?kakaoMessageHtml(text,translation,cls):kakaoBaseBilingual(text,translation,cls);};
const kakaoLanguageConversation=renderKKConversation;
renderKKConversation=function(){kakaoRenderingText=true;try{return kakaoLanguageConversation().replace(/<button[^>]*data-action="ai-open"[^>]*>[\s\S]*?<\/button>/,'');}finally{kakaoRenderingText=false;}};
function kakaoQuoteText(text,c){const m=c.messages.find(m=>m.text===text);return esc(kakaoTextView(text,m?.translation||'').primary);}
renderKakaoSettings=function(){return page('KakaoTalk 设置',`<div class="ui-group"><label class="settings-cell"><input type="checkbox" id="muteKakao" ${state.muteKakao?'checked':''}> 静音通知</label>${button('kakao-language',`<span>聊天语言</span><strong>${kakaoLanguageLabel()} ›</strong>`,'','ui-setting-row')}${button('kakao-profile','我的资料','','ui-setting-row')}${button('accounts','社交账号管理','','ui-setting-row')}</div><p class="ui-setting-note">语言选择应用于聊天显示和后续回复。旧消息保留原文；没有译文的内容可以展开查看。</p>`);};
function showKakaoLanguage(){sheet('聊天语言',`<div class="kk-language-picker">${['bilingual','zh'].map(mode=>button('kakao-language-select',`<span><strong>${mode==='bilingual'?'中韩双语':'仅中文'}</strong><small>${mode==='bilingual'?'韩文原文，下方显示中文译文':'聊天以中文显示'}</small></span><span aria-hidden="true">${mode===kakaoLanguage()?'✓':''}</span>`,`data-mode="${mode}" aria-pressed="${mode===kakaoLanguage()}"`)).join('')}</div>`);}
ACTIONS['kakao-language']=showKakaoLanguage;
ACTIONS['kakao-language-select']=b=>{state.kakaoPreferences={...(state.kakaoPreferences||{}),mode:PhoneKakaoLanguage.mode(b.dataset.mode)};saveState();closeSheet();invalidate();renderLockNotifications();if(currentApp==='ai-settings'){const summary=$('#kkLanguageSummary');if(summary)summary.textContent='KakaoTalk：'+kakaoLanguageLabel()+'；新联系人使用中文姓名。';}else renderApp(currentApp);};
const kakaoBaseBuildContext=aiBuildContext;
aiBuildContext=function(selected=null,mode='direct'){return {...kakaoBaseBuildContext(selected,mode),kakaoPreferences:{mode:kakaoLanguage(),contactNames:'中文姓名'}};};
const kakaoLanguageAISettings=aiSettingsHtml;
aiSettingsHtml=function(){return kakaoLanguageAISettings().replace('<fieldset>',`<p class="ui-setting-note" id="kkLanguageSummary">KakaoTalk：${kakaoLanguageLabel()}；新联系人使用中文姓名。</p>${button('kakao-language','设置聊天语言','type="button"')}<fieldset>`);};
CREATOR_ROUTES['ai-settings']=aiSettingsHtml;
const kakaoBaseChatMenu=renderChatMenu;
renderChatMenu=function(){return kakaoBaseChatMenu().replace('</section>',button('kakao-language','聊天语言 · '+kakaoLanguageLabel(),'','ui-setting-row')+'</section>');};
const kakaoBaseNoticeCopy=lockNotificationCopy;
lockNotificationCopy=function(n,count=1){if(n.app!=='KakaoTalk'||!lockPreferences().previews)return kakaoBaseNoticeCopy(n,count);const v=kakaoTextView(n.body,n.translation);return `<span class="lk-notice-copy"><span class="lk-notice-head"><strong>${esc(n.title)}</strong><time>${lockRelativeTime(n.time)}</time></span><span class="lk-notice-body">${esc(v.primary)}</span>${v.secondary?`<span class="lk-notice-translation">${esc(v.secondary)}</span>`:''}${count>1?`<small class="lk-stack-label">KakaoTalk · ${count} 条通知</small>`:''}</span>`;};
