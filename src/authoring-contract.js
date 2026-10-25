/* Shared, bounded story-package schema. Both server and phone validate it. */
(function(root){
 const base=typeof module!=='undefined'&&module.exports?require('./ai-contract.js'):root.PhoneAIContract;
 const str=(maxLength=4000)=>({type:'string',maxLength}),arr=(items,maxItems,minItems=0)=>({type:'array',items,maxItems,minItems}),obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
 const ref=str(100),platform={type:'string',enum:['KakaoTalk','Instagram','X','Threads','TikTok','Weverse']};
 const character=obj(Object.fromEntries(Object.entries(base.actions[0].properties).filter(([k])=>k!=='type'))),group=obj({ref,name:str(40),members:arr(ref,30,2),description:str(300)});
 const effect=obj({at:{type:'string',enum:['start','finish']},action:{anyOf:[base.actions[2],base.actions[3]]}});
 const node=obj({id:ref,title:str(120),platform,accountIndex:{type:'integer',minimum:0,maximum:99},target:ref,dependsOn:arr(ref,60),when:arr(obj({nodeId:ref,value:str(100)}),12),lines:arr(obj({speaker:ref,text:str(),translation:str()}),40,1),choice:obj({prompt:str(300),options:arr(arr(str(),3,3),6)}),effects:arr(effect,12)});
 const schema=obj({version:{type:'integer',minimum:1,maximum:1},title:str(120),analysis:str(8000),assumptions:arr(str(1000),30),cast:arr(character,24,1),groups:arr(group,8),nodes:arr(node,60,1)});
 function check(v,s,path='剧本包'){
  if(s.anyOf){const shape=s.anyOf.find(x=>x.properties.type.enum.includes(v?.type));if(!shape)throw Error(path+'操作类型无效');return check(v,shape,path);}
  if(s.type==='object'){if(!v||typeof v!=='object'||Array.isArray(v))throw Error(path+'需要对象');for(const k of s.required)if(!Object.hasOwn(v,k))throw Error(path+'缺少 '+k);for(const k of Object.keys(v)){if(!Object.hasOwn(s.properties,k))throw Error(path+'未知字段 '+k);check(v[k],s.properties[k],path+'.'+k);}}
  else if(s.type==='array'){if(!Array.isArray(v)||v.length<s.minItems||v.length>s.maxItems)throw Error(path+'数量超限');v.forEach((x,i)=>check(x,s.items,path+'['+i+']'));}
  else if(s.type==='string'){if(typeof v!=='string'||v.length>s.maxLength)throw Error(path+'文字超限或类型无效');}
  else if(s.type==='integer'&&(!Number.isSafeInteger(v)||v<s.minimum||v>s.maximum))throw Error(path+'数值无效');
  if(s.enum&&!s.enum.includes(v))throw Error(path+'取值无效');
 }
 const reserved=new Set([...Object.getOwnPropertyNames(Object.prototype),'prototype','player']);
 function identifier(v){if(!v.trim()||v!==v.trim()||reserved.has(v))throw Error('标识为空或使用了保留名称：'+v);}
 function validate(pack){
  base.safe(pack);check(pack,schema);if(JSON.stringify(pack).length>180000)throw Error('剧本包过大，请分章节');if(!pack.title.trim())throw Error('请填写剧本标题');
  const refs=new Set(),handles=new Set(),names=new Set(),cast=new Map(),groups=new Map(),nodes=new Map();
  for(const c of pack.cast){identifier(c.ref);if(refs.has(c.ref)||handles.has(c.handle)||names.has(c.name))throw Error('人物标识、姓名或账号重复');base.validatePlan({reply:'',actions:[{type:'upsert_character',...c}]});refs.add(c.ref);handles.add(c.handle);names.add(c.name);cast.set(c.ref,c);}
  for(const g of pack.groups){identifier(g.ref);if(refs.has(g.ref)||!g.name.trim()||g.members.some(x=>!cast.has(x))||new Set(g.members).size!==g.members.length)throw Error('群聊名称、标识或成员无效');refs.add(g.ref);groups.set(g.ref,g);}
  for(const n of pack.nodes){identifier(n.id);if(nodes.has(n.id))throw Error('节点 ID 重复');if(!n.title.trim())throw Error('节点标题不能为空');nodes.set(n.id,n);}
  const visited=new Set(),visiting=new Set(),ancestors=new Map();
  function visit(id){if(visited.has(id))return ancestors.get(id);if(visiting.has(id))throw Error('剧情依赖形成循环');const n=nodes.get(id);if(!n)throw Error('前置节点不存在：'+id);visiting.add(id);const set=new Set();for(const dep of n.dependsOn){if(dep===id)throw Error('节点不能依赖自己');set.add(dep);for(const x of visit(dep))set.add(x);}visiting.delete(id);visited.add(id);ancestors.set(id,set);return set;}
  for(const n of pack.nodes){visit(n.id);const members=groups.get(n.target)?.members||[n.target];if(!cast.has(n.target)&&!groups.has(n.target)||groups.has(n.target)&&n.platform!=='KakaoTalk')throw Error('会话目标或群聊平台无效');if(n.lines[0].speaker==='player')throw Error('节点需要由角色消息开场');if(['KakaoTalk','Weverse'].includes(n.platform)&&n.accountIndex!==0)throw Error('此平台账号索引应为0');
   for(const l of n.lines){if(l.speaker!=='player'&&!members.includes(l.speaker)||!l.text.trim())throw Error('消息为空或发言人不属于会话');if(l.speaker!=='player'&&/[가-힣ぁ-ヿ]/.test(l.text)&&!l.translation.trim())throw Error('外语角色消息需要中文翻译');}
   if(n.choice.options.length===1||n.choice.options.length&&!n.choice.prompt.trim()||new Set(n.choice.options.map(x=>x[0])).size!==n.choice.options.length||n.choice.options.some(x=>x.some(v=>!v.trim())))throw Error('选择需要提示与至少两个不同选项');
   for(const w of n.when){if(!ancestors.get(n.id).has(w.nodeId)||!nodes.get(w.nodeId).choice.options.some(o=>o[0]===w.value))throw Error('分支条件必须引用前置选择节点的有效选项');}
   for(const e of n.effects){base.validatePlan({reply:'',actions:[e.action]});if(e.action.type==='publish_post'&&e.action.author!=='player'&&!cast.has(e.action.author))throw Error('发帖人物不存在');if(e.action.type==='upsert_event'&&e.action.ref)throw Error('剧本日程使用空 ref 新建');}
  }
  return pack;
 }
 const api={schema,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhoneAuthoringContract=api;
})(globalThis);
