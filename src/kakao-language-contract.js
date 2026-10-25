/* Shared language checks apply to newly generated content, never rewrite archives. */
(function(root){
 const korean=/[가-힣ㄱ-ㅎㅏ-ㅣ]/u,han=/\p{Script=Han}/u;
 function mode(v){return ['bilingual','zh'].includes(v)?v:'bilingual';}
 function name(value){if(!/^[\p{Script=Han}·\s]{1,40}$/u.test(value)||!han.test(value))throw Error('新建联系人请使用中文姓名，原名可保留在简介中');}
 function message(text,translation,setting){if(setting==='zh'){if(korean.test(text))throw Error('当前选择仅中文，请使用中文回复');return;}if(korean.test(text)){if(!han.test(translation||'')||korean.test(translation||''))throw Error('中韩双语消息需要对应的中文译文');}else if(han.test(text)||(/[A-Za-z]/.test(text)&&text.length>8))throw Error('当前选择中韩双语，角色原文需要韩文并提供中文译文');}
 function plan(value,setting){for(const a of value.actions){if(a.type==='upsert_character')name(a.name);if(a.type==='send_message'&&a.platform==='KakaoTalk'&&a.speaker!=='player')message(a.text,a.translation,mode(setting));}return value;}
 function story(value,setting){for(const c of value.cast)name(c.name);for(const n of value.nodes.filter(n=>n.platform==='KakaoTalk')){for(const l of n.lines)if(l.speaker!=='player')message(l.text,l.translation,mode(setting));for(const o of n.choice.options)message(o[2],o[3]||'',mode(setting));}return value;}
 const api={mode,name,message,plan,story};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhoneKakaoLanguage=api;
})(globalThis);
