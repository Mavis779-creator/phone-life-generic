/* Shared data-only contract. Model output is never evaluated as JavaScript. */
(function(root){
 const str=(maxLength=4000)=>({type:'string',maxLength}),ref=str(100),platform={type:'string',enum:['KakaoTalk','Instagram','X','Threads','TikTok','Weverse']},accountIndex={type:'integer',minimum:0,maximum:99};
 const slots=['boyfriend','exPartners','flirtTargets','secretAdmirers','maleIdolsWhoInitiateContact','groupMembers','industryFriends','nonIndustryFriends','familyMembers','manager','staff','brandContacts','pdDirectorsProducers'];
 const shape=(type,fields)=>({type:'object',properties:{type:{type:'string',enum:[type]},...fields},required:['type',...Object.keys(fields)],additionalProperties:false});
 const actions=[
  shape('upsert_character',{ref,name:str(40),handle:str(60),slot:{type:'string',enum:slots},profession:str(160),bio:str(1000),persona:str(2000)}),
  shape('send_message',{target:ref,speaker:ref,platform,accountIndex,text:str(),translation:str()}),
  shape('publish_post',{author:ref,platform:{type:'string',enum:['Instagram','X','Threads','TikTok','Weverse']},accountIndex,text:str(),description:str(2000)}),
  shape('upsert_event',{ref,title:str(120),date:str(10),time:str(5),location:str(240),notes:str(2000)}),
  shape('update_relationship',{character:ref,trust:{type:'integer',minimum:0,maximum:100},closeness:{type:'integer',minimum:0,maximum:100},note:str(1000)}),
  shape('create_group',{ref,name:str(40),members:{type:'array',items:ref,minItems:2,maxItems:30},description:str(300)})
 ];
 const schema=shape(undefined,{});delete schema.properties.type;schema.required=['reply','actions'];schema.properties={reply:str(),actions:{type:'array',items:{anyOf:actions},maxItems:20}};
 function safe(v,depth=0){if(depth>30)throw Error('数据层级过深');if(v&&typeof v==='object')for(const key of Object.keys(v)){if(['__proto__','constructor','prototype'].includes(key))throw Error('数据含保留字段');safe(v[key],depth+1);}}
 function check(value,s,path='结果'){
  if(s.anyOf){const found=s.anyOf.find(x=>value?.type===x.properties.type.enum[0]);if(!found)throw Error(path+'：未知操作');return check(value,found,path);}
  if(s.type==='object'){if(!value||Array.isArray(value)||typeof value!=='object')throw Error(path+'需要对象');for(const k of s.required)if(!Object.hasOwn(value,k))throw Error(path+'缺少 '+k);for(const k of Object.keys(value)){if(!s.properties[k])throw Error(path+'含未知字段 '+k);check(value[k],s.properties[k],path+'.'+k);}}
  else if(s.type==='array'){if(!Array.isArray(value)||value.length>(s.maxItems??1000)||value.length<(s.minItems??0))throw Error(path+'数量无效');value.forEach((x,i)=>check(x,s.items,path+'['+i+']'));}
  else if(s.type==='string'){if(typeof value!=='string'||value.length>s.maxLength)throw Error(path+'文字过长或类型无效');}
  else if(s.type==='integer'&&(!Number.isSafeInteger(value)||value<s.minimum||value>s.maximum))throw Error(path+'数值无效');
  if(s.enum&&!s.enum.includes(value))throw Error(path+'取值无效');
 }
 function validatePlan(plan){safe(plan);check(plan,schema);const reserved=new Set([...Object.getOwnPropertyNames(Object.prototype),'prototype']);for(const a of plan.actions){for(const v of [...['ref','handle','target','speaker','author','character'].map(k=>a[k]),...(a.members||[])])if(typeof v==='string'&&reserved.has(v))throw Error('人物或会话标识使用了保留名称');if(['send_message','publish_post'].includes(a.type)&&!a.text.trim())throw Error('消息/动态不能为空');if(a.type==='send_message'&&a.speaker!=='player'&&/[가-힣ぁ-ヿ]/.test(a.text)&&!a.translation.trim())throw Error('韩文和日文角色消息需要中文翻译');if(a.type==='upsert_event'){if(!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||new Date(a.date+'T00:00:00Z').toISOString().slice(0,10)!==a.date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time)||!a.title.trim())throw Error('日程日期、时间或标题无效');}if(a.type==='upsert_character'&&(!a.name.trim()||!a.ref.trim()||!a.handle.trim()||/[\s<>"']/.test(a.handle)))throw Error('人物姓名、标识或用户名无效');if(a.type==='create_group'&&(!a.ref||!a.name.trim()||new Set(a.members).size<2))throw Error('群名与成员无效');}return plan;}
 const api={schema,actions,slots,validatePlan,safe};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhoneAIContract=api;
})(globalThis);
