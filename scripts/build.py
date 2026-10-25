"""Assemble the offline single HTML from the preserved baseline and local modules."""
from pathlib import Path
import re
import base64
import json
import argparse,hashlib,mimetypes,html
from template_config import load_config,inside,ROOT
parser=argparse.ArgumentParser(description="Build an offline PHONE LIFE template")
parser.add_argument("--preset",choices=["blank"])
parser.add_argument("--validate",action="store_true")
parser.add_argument("--output-dir",default=".")
args=parser.parse_args()
try: template=load_config(args.preset)
except ValueError as error: raise SystemExit("配置错误："+str(error))
output=(ROOT/args.output_dir).resolve()
if not output.is_relative_to(ROOT): raise SystemExit("输出目录必须在本项目内，避免覆盖其他工程")
if args.validate:
 print("Configuration OK:",template["preset"],template["app"]["title"]);raise SystemExit(0)
root=Path(__file__).resolve().parents[1]
base=(root/'project/CURRENT_BASELINE_v0_6.html').read_text(encoding='utf-8')
modules='\n\n'.join((root/'src'/f).read_text(encoding='utf-8') for f in ['system.js','social.js','life.js','calls.js','creator.js','weverse.js','youtube.js','social-ui.js','kakao-reference.js','threads-reference.js','video-x-reference.js','reference-events.js','productivity.js','lock-screen.js','shop.js','delivery.js','social-detail-polish.js','events.js','call-polish.js','music-reference.js','story-data.js','story-engine.js','story-ui.js','onboarding.js','message-world.js','message-mainline.js','kakao-plus.js','template-runtime.js','ai-contract.js','kakao-language-contract.js','writing-prompts.js','authoring-contract.js','ai.js','authoring.js','landing.js','kakao-language.js','ui-polish.js'])
names=set(re.findall(r'^(?:async )?function (\w+)\(',modules,re.M))
lines=base.splitlines()
removed=set(range(212,245))|set(range(270,285))|set(range(403,427))|{429,431,432,433}
multiline={'appIcon':(285,290),'renderHome':(291,306),'iconSvg':(245,269)}
for i,line in enumerate(lines,1):
    m=re.match(r'(?:async )?function (\w+)\(',line)
    if m and m[1] in names:
        if m[1] in multiline:
            a,b=multiline[m[1]];removed.update(range(a,b+1))
        else:removed.add(i)
base='\n'.join(line for i,line in enumerate(lines,1) if i not in removed)
namespace=template['namespace']+'-'+template['preset']
base=base.replace("const STORAGE_KEY = 'idol-phone-life-v04-state';","const STORAGE_KEY = '"+namespace+"-state';")
base=base.replace("indexedDB.open('idol-phone-life-assets',1)","indexedDB.open('"+namespace+"-assets',1)")
base=base.replace('爱豆手机生活模拟器 · v0.6',html.escape(template['app']['title'])+' · 通用模板 v1.3.0')
# Preserve native brand colors. Document/table styling does not recolor the product.
base=base.replace('maximum-scale=1, ','').replace(' · v0.6',' · v1.6')
base=base.replace('</style>', '\n'+(root/'src/ai.css').read_text(encoding='utf-8')+'\n'+(root/'src/authoring.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</style>', '\n'+(root/'src/interface.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</style>', '\n'+(root/'src/social-ui.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</style>', '\n'+(root/'src/reference.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</style>', '\n'+(root/'src/productivity.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</style>', '\n'+(root/'src/lock-screen.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</style>', '\n'+(root/'src/call-polish.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</style>', '\n'+(root/'src/shop.css').read_text(encoding='utf-8')+'\n'+(root/'src/delivery.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</style>', '\n'+(root/'src/surface-polish.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</style>', '\n'+(root/'src/music-reference.css').read_text(encoding='utf-8')+'\n</style>',1)
base=base.replace('</div>\n<script>', '<div id="storageWarning" hidden>存档未能写入，请导出备份并检查浏览器存储空间。</div><input id="phoneAudioUpload" type="file" accept="audio/*" hidden><input id="saveUpload" type="file" accept="application/json,.json" hidden></div>\n<script>',1)
# Add scenario content to the existing top-of-file CONFIG without removing old content.
config=(root/'src/scenario.js').read_text(encoding='utf-8')
weverse_icon=base64.b64encode((root/'src/assets/weverse-app-store-512.jpg').read_bytes()).decode('ascii')
config+="\n// Official Weverse App Store artwork, embedded for offline use.\nCONFIG.weverseAppIcon='data:image/jpeg;base64,"+weverse_icon+"';\n"
# Identity-checked Apple artwork. Embed full icons; no network requests at runtime.
icon_dir=root/'src/assets/app-store'
icon_manifest=json.loads((icon_dir/'manifest.json').read_text(encoding='utf-8'))
app_icons={}
for key,info in icon_manifest['icons'].items():
    if info.get('unavailable'):
        continue
    content=(icon_dir/info['file']).read_bytes()
    import hashlib
    if hashlib.sha256(content).hexdigest()!=info['sha256']:
        raise ValueError('App Store artwork changed: '+key)
    mime='image/png' if info['file'].endswith('.png') else 'image/jpeg'
    app_icons[key]='data:'+mime+';base64,'+base64.b64encode(content).decode('ascii')
config+='\nCONFIG.appStoreIcons='+json.dumps(app_icons,separators=(',',':'))+';\n'
shop_dir=root/'src/assets/shop'
catalog=json.loads((shop_dir/'catalog.json').read_text(encoding='utf-8'))
if any(not p['variants'] or any(type(v['price']) is not int or v['price']<=0 for v in p['variants']) or not p['source'].startswith('https://') for p in catalog):
    raise ValueError('Catalog must contain positive integer KRW prices and recorded sources')
config+='\nCONFIG.shopCatalog='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n'
shop_images={}
for key,info in json.loads((shop_dir/'manifest.json').read_text(encoding='utf-8')).items():
    if info.get('unavailable'):continue
    content=(shop_dir/info['file']).read_bytes()
    if hashlib.sha256(content).hexdigest()!=info['sha256']:raise ValueError('Shop artwork changed: '+key)
    shop_images[key]='data:'+info['mime']+';base64,'+base64.b64encode(content).decode('ascii')
config+='\nCONFIG.shopImages='+json.dumps(shop_images,separators=(',',':'))+';\n'
# Settings is a built-in system app, sourced from Apple's iPhone User Guide.
system_dir=root/'src/assets/apple-system'
system_manifest=json.loads((system_dir/'manifest.json').read_text(encoding='utf-8'))
for key,info in system_manifest.items():
    content=(system_dir/info['file']).read_bytes()
    if hashlib.sha256(content).hexdigest()!=info['sha256']:
        raise ValueError('Apple system artwork changed: '+key)
    config+='\nCONFIG.appStoreIcons['+json.dumps(key)+']="data:image/png;base64,'+base64.b64encode(content).decode('ascii')+'";\n'
base=base.replace('<input id="phoneAudioUpload"','<input id="creatorUpload" type="file" hidden><input id="phoneAudioUpload"',1)
base=base.replace('<input id="creatorUpload"','<input id="referenceAudioUpload" type="file" accept="audio/*" hidden><input id="creatorUpload"',1)
base=base.replace('<input id="creatorUpload"','<input id="productivityUpload" type="file" multiple hidden><input id="creatorUpload"',1)
base=base.replace('</style>', '\n'+(root/'src/story.css').read_text(encoding='utf-8')+'\n'+(root/'src/landing.css').read_text(encoding='utf-8')+'\n'+(root/'src/usability.css').read_text(encoding='utf-8')+'\n</style>',1)
# Lock screen uses the existing wallpaper, PIN and notification records.
base=base.replace('<span class="island"></span>', '<button class="island dynamic-island" data-action="island-toggle" aria-label="灵动岛" aria-expanded="false"></button>')
torch_old='<svg viewBox="0 0 24 24"><path d="M8 2h8l-1 6-2 2v8l-2 4-2-4v-8L7 8z"/><path d="M8 6h8" fill="none" stroke="#fff" stroke-width="1.5"/></svg>'
torch_new='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10v3H7zM7.5 6h9l-2 4v10a2.5 2.5 0 0 1-5 0V10z" fill="currentColor"/><rect x="11" y="12" width="2" height="5" rx="1" fill="#4a4f58"/></svg>'
base=base.replace(torch_old,torch_new)
base=base.replace('<div class="lock-focus">◉ 专注模式</div>', '<button class="lock-focus" id="lockFocus" data-action="lock-focus" aria-pressed="false">◯ 专注模式</button><div id="lockWidgets"></div>')
base=base.replace('<div class="lock-notifications" id="lockNotifications"></div>', '<div class="lk-lower"><div id="lockMusic" hidden></div><div class="lock-notifications" id="lockNotifications"></div></div>')
base=base.replace('<div id="storageWarning"', '<section id="dynamicIslandPanel" hidden role="dialog" aria-label="灵动岛控制"></section><div id="storageWarning"',1)

for kind,path in template.get('assets',{}).items():
    if path:
        asset=inside(path);mime=mimetypes.guess_type(asset.name)[0] or 'image/png'
        template['assets'][kind]='data:'+mime+';base64,'+base64.b64encode(asset.read_bytes()).decode('ascii')
config+='\nCONFIG.template='+json.dumps(template,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')+';\n'
config+=(root/'src/template-config.js').read_text(encoding='utf-8')
base=base.replace('</script>', '\n'+config+'\n</script>',1)
pos=base.rfind('</script>')
base=base[:pos]+'\n'+modules+'\nboot().catch(e=>{console.error(e);document.getElementById("storageWarning").hidden=false;document.getElementById("storageWarning").textContent="启动失败："+e.message;});\n'+base[pos:]
base=base.replace('挂断后返回桌面','挂断后打开 Instagram 主页')
# Write only within this edition, including when testing another preset.
output.mkdir(parents=True,exist_ok=True);(output/'project').mkdir(exist_ok=True)
(output/'project/index.html').write_text(base,encoding='utf-8')
(output/'index.html').write_text(base,encoding='utf-8')
info={'version':'1.3.0','preset':template['preset'],'namespace':namespace,'sha256':hashlib.sha256((output/'index.html').read_bytes()).hexdigest(),'configuration':'config/phone.config.json','runtimeExternalDependencies':False,'assemblyBaselineSha256':hashlib.sha256((root/'project/CURRENT_BASELINE_v0_6.html').read_bytes()).hexdigest()}
(output/'BUILD_INFO.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Built:',str(output/'index.html'),'preset='+template['preset'],str(len(base))+' characters')
