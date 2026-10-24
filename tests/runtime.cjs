/* Isolated VM/state tests. Mock DOM/media/clock only; no browser, devices, network or user storage. */
const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(process.env.PHONE_TEMPLATE_HTML||path.join(root,'project/index.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const results=[];
function environment(saved={}){
 let time=1900000000000,nextTimer=1;const timers=new Map(),nodes=new Map(),streams=[],requests=[],media=[],storage={...saved};
 class FakeNode{
  constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.id=id;this.hidden=false;this.dataset={};this.children=[];this.style={left:'',top:'',right:'',setProperty(){},removeProperty(){}};this.attrs={};this.listeners={};this.textContent='';this.scrollTop=0;this.scrollLeft=0;this.scrollHeight=100;this.clientHeight=100;this.clientWidth=390;this.offsetWidth=96;this.offsetHeight=135;this.value='';this.paused=true;this.currentTime=0;this.duration=120;this.muted=false;this.srcObject=null;this.classList={add(){},remove(){},toggle(){},contains:()=>false};if(id)nodes.set(id,this);}
  set innerHTML(v){this._html=v;this.children=[];for(const match of v.matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"[^>]*>/g)){const n=new FakeNode(match[1],match[2]);n.hidden=/\bhidden\b/.test(match[0]);const src=/src="([^"]+)"/.exec(match[0]);if(src)n.src=src[1];this.children.push(n);}this.childNodes=[];this.firstElementChild=null;}
  get innerHTML(){return this._html||'';}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}getAttribute(k){return this.attrs[k];}
  append(n){this.children.push(n);if(n.id)nodes.set(n.id,n);}appendChild(n){this.append(n);}remove(){if(this.id)nodes.delete(this.id);}replaceChildren(...n){this.children=n;}
  querySelector(s){if(s.startsWith('#'))return nodes.get(s.slice(1))||null;if(s==='.toast-app')return new FakeNode();return null;}querySelectorAll(s){if(s==='video')return this.children.filter(n=>n.tagName==='VIDEO');return [];}
  addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);}getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}focus(){document.activeElement=this;}contains(n){return this.children.includes(n);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}setPointerCapture(){}
 }
 const document={activeElement:null,hidden:false,body:new FakeNode('body'),createElement:t=>new FakeNode(t),getElementById:id=>nodes.get(id),querySelector:s=>s.startsWith('#')?nodes.get(s.slice(1))||null:s==='.toast-app'?new FakeNode():null,querySelectorAll:()=>[],addEventListener(){}};
 for(const id of ['device','appView','appContent','lockLayer','passcodeScreen','igLayer','statusbar','statusTime','lockStatusTime','lockTime','lockDate','homeIndicator','lockNotifications','toast','toastTitle','toastBody','storageWarning'])new FakeNode('div',id);
 const setTimer=(fn,ms,interval)=>{const id=nextTimer++;timers.set(id,{fn,at:time+ms,ms:interval?ms:0});return id;};
 const makeStream=(opts)=>{const tracks=[];if(opts.audio)tracks.push({kind:'audio',enabled:true,stopped:false,stop(){this.stopped=true;}});if(opts.video)tracks.push({kind:'video',enabled:true,stopped:false,stop(){this.stopped=true;}});const s={getTracks:()=>tracks,getAudioTracks:()=>tracks.filter(t=>t.kind==='audio'),getVideoTracks:()=>tracks.filter(t=>t.kind==='video')};streams.push(s);return s;};
 class FakeDate extends Date{constructor(...a){super(...(a.length?a:[time]));}static now(){return time;}}
 const context={document,Date:FakeDate,console,Map,Set,Promise,URL:{createObjectURL:()=>'',revokeObjectURL(){}},navigator:{mediaDevices:{getUserMedia:async opts=>{requests.push(opts);return makeStream(opts);}}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},setTimeout:(f,ms)=>setTimer(f,ms,false),setInterval:(f,ms)=>setTimer(f,ms,true),clearTimeout:id=>timers.delete(id),clearInterval:id=>timers.delete(id),confirm:()=>true,Audio:class extends FakeNode{constructor(src){super('audio');this.src=src;media.push(this);}},location:{reload(){}},window:null};context.window=context;context.addEventListener=()=>{};vm.createContext(context);
 vm.runInContext(scripts[0],context);vm.runInContext(scripts[1].replace(/boot\(\)\.catch\([\s\S]*$/,''),context);
 const run=code=>vm.runInContext(code,context);
 run('initializeWorld();initializeCalls();initializeCreators();');
 function advance(ms){const target=time+ms;for(let count=0;count<100000;count++){let next=null;for(const [id,t] of timers)if(t.at<=target&&(!next||t.at<next[1].at))next=[id,t];if(!next)break;const[id,t]=next;time=t.at;if(t.ms)t.at+=t.ms;else timers.delete(id);t.fn();}time=target;}
 return {run,advance,nodes,context,streams,requests,media,storage,makeStream,timers};
}
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',error:e.stack});console.log('FAIL',name,e.stack);}}
module.exports={environment};
