/* Real loopback HTTP with mock provider/dummy credentials only. */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createPhoneServer} from '../server/ai-server.mjs';
const require=createRequire(import.meta.url),{fixture}=require('./authoring-fixture.cjs');
const results=[],token='language-test-pair';let output={reply:'',actions:[]},lastBody;
const app=createPhoneServer({token,env:{OPENAI_API_KEY:'dummy-not-a-real-key',OPENAI_MODEL:'mock'},rateLimit:100,fetchImpl:async(url,opts)=>{const b=JSON.parse(opts.body);lastBody=b;return {ok:true,json:async()=>({output:[{type:'function_call',name:b.tool_choice.name,arguments:JSON.stringify(output)}]})};}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const url='http://127.0.0.1:'+app.server.address().port;
const message=(text,translation='')=>({type:'send_message',target:'npc',speaker:'npc',platform:'KakaoTalk',accountIndex:0,text,translation});
async function request(mode='bilingual',script=false){const body=script?{sourceScript:'自己的正文',playerBrief:'',writingPrompt:'',preset:'daily',kakaoLanguage:mode}:{instruction:'回应当前消息',mode:'direct',context:{kakaoPreferences:{mode}}};return fetch(url+'/api/ai/'+(script?'script':'plan'),{method:'POST',headers:{'Content-Type':'application/json','X-Phone-AI-Token':token},body:JSON.stringify(body)});}
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',error:e.stack});console.error('FAIL',name,e.stack);}}
try{
 await test('bilingual response enforces Korean original and real Chinese translation',async()=>{output={reply:'',actions:[message('밥 먹었어?','吃饭了吗？')]};assert.equal((await request()).status,200);assert(lastBody.instructions.includes('中韩双语'));output.actions=[message('吃饭了吗？')];assert.equal((await request()).status,502);});
 await test('Chinese mode rejects Korean and accepts Chinese without adding fake translations',async()=>{output={reply:'',actions:[message('밥 먹었어?','吃饭了吗？')]};assert.equal((await request('zh')).status,502);output.actions=[message('吃饭了吗？')];assert.equal((await request('zh')).status,200);assert(lastBody.instructions.includes('仅中文'));});
 await test('new generated character names must use Chinese while account handles stay original',async()=>{output={reply:'',actions:[{type:'upsert_character',ref:'npc',name:'Yuna',handle:'yuna.original',slot:'nonIndustryFriends',profession:'',bio:'',persona:''}]};assert.equal((await request('zh')).status,502);output.actions[0].name='郑允娜';assert.equal((await request('zh')).status,200);});
 await test('script package mode applies to KKT lines and translated choices',async()=>{output=fixture();assert.equal((await request('zh',true)).status,200);assert.equal((await request('bilingual',true)).status,502);for(const n of output.nodes.filter(n=>n.platform==='KakaoTalk')){for(const l of n.lines)if(l.speaker!=='player'){l.translation=l.text;l.text='지금 어디야?';}n.choice.options=n.choice.options.map(o=>[o[0],o[1],'응, 알겠어',o[2]]);}assert.equal((await request('bilingual',true)).status,200);});
 await test('unknown language and non-Chinese generated script cast are refused',async()=>{assert.equal((await request('unknown')).status,400);output=fixture();output.cast[0].name='유나';assert.equal((await request('zh',true)).status,502);});
}finally{await new Promise(resolve=>app.server.close(resolve));}
writeFileSync(new URL('LANGUAGE_SERVER_TEST_RESULTS.json',import.meta.url),JSON.stringify({scope:'Mock provider and local HTTP only; no live model or real key',passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results},null,2)+'\n');if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
