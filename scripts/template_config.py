"""Configuration loading/validation. Python standard library only."""
from pathlib import Path
import copy,json,re

ROOT=Path(__file__).resolve().parents[1]
SLOTS={'boyfriend','exPartners','flirtTargets','secretAdmirers','maleIdolsWhoInitiateContact','groupMembers','industryFriends','nonIndustryFriends','familyMembers','manager','staff','brandContacts','pdDirectorsProducers'}
APPS={'calendar','photos','kakao','instagram','mail','notes','safari','applemusic','phone','company','notifications','settings','x','threads','tiktok','weverse','youtube','camera','maps','gmail','files','voicememos','reminders','shop','delivery'}

def require(condition,message):
    if not condition:raise ValueError(message)

def safe_tree(value):
    if isinstance(value,dict):
        require(not {'__proto__','constructor','prototype'}&value.keys(),'配置中不能使用保留对象键')
        for v in value.values():safe_tree(v)
    elif isinstance(value,list):
        for v in value:safe_tree(v)

def read_json(path):
    try:data=json.loads(path.read_text(encoding='utf-8-sig'))
    except (OSError,json.JSONDecodeError) as exc:raise ValueError(f'读取 JSON 失败：{path.name}：{exc}') from exc
    safe_tree(data);return data

def inside(path):
    target=(ROOT/path).resolve()
    require(target.is_relative_to(ROOT),'文件路径必须位于模板目录内')
    return target

def merge(base,override):
    result=copy.deepcopy(base)
    for key,value in override.items():
        result[key]=merge(result[key],value) if isinstance(value,dict) and isinstance(result.get(key),dict) else copy.deepcopy(value)
    return result

def validate(config):
    require(isinstance(config.get('app'),dict),'app 必须是对象')
    require(bool(config['app'].get('title')),'请设置 app.title')
    require(all(isinstance(config['app'].get(k),str) for k in ['title','hero','defaultPin']),'app 的 title、hero、defaultPin 需要字符串')
    require(isinstance(config.get('accountHandle'),str) and re.fullmatch(r'[a-zA-Z0-9_.-]{1,50}',config['accountHandle']) is not None,'accountHandle 仅使用字母、数字、下划线、点和短横线')
    require(isinstance(config['app'].get('defaultPin'),str) and re.fullmatch(r'\d{4}',config['app']['defaultPin']),'defaultPin 必须是四位数字字符串，例如 "0709"')
    p=config.get('player',{})
    require(bool(p.get('realName')) and bool(p.get('stageName')),'player 需要 realName 和 stageName')
    require(type(p.get('age')) is int and 1<=p['age']<=120,'年龄需要在 1—120 之间')
    require(type(p.get('debutYears')) is int and 0<=p['debutYears']<=p['age'],'debutYears 无效')
    require(p.get('groupType') in ['group','solo','group+solo'],'groupType 无效')
    require(p.get('popularityTier') in ['trainee','rookie','rising','top','superstar'],'popularityTier 无效')
    require(all(isinstance(p.get(k),list) for k in ['languages','roleInGroup']),'languages 和 roleInGroup 需要数组')
    people=config.get('contacts',[])
    require(isinstance(people,list) and 0<=len(people)<=100,'初始联系人需要数组，最多 100 位')
    keys=set();handles=set();boyfriends=0
    for c in people:
        require(isinstance(c,dict),'联系人需要对象')
        require(re.fullmatch(r'[a-zA-Z0-9_-]{1,50}',c.get('key','')) is not None,'联系人 key 只使用英文字母、数字、短横线和下划线')
        require(c['key'] not in keys,'联系人 key 不能重复：'+c['key']);keys.add(c['key'])
        require(bool(c.get('name')) and not re.search(r'[\s<>"\x27]',c.get('handle','')) and bool(c.get('handle')),'联系人名称和账号无效')
        require(c['handle'] not in handles,'联系人 handle 不能重复');handles.add(c['handle'])
        require(c.get('slot') in SLOTS,'联系人 slot 无效：'+c['key'])
        boyfriends+=c['slot']=='boyfriend'
    require(boyfriends<=1,'boyfriend 槽位最多一人')
    pages=config.get('desktopPages')
    require(isinstance(pages,list) and len(pages)==2,'desktopPages 需要两页应用列表')
    app_ids=[]
    for page in pages:
        require(isinstance(page,list) and 1<=len(page)<=16,'每页需要 1—16 个应用')
        for app in page:
            require(isinstance(app,list) and len(app)==3 and app[0] in APPS,'应用需要 [应用ID, 显示名, 样式类] 三项')
            require(isinstance(app[1],str) and bool(app[1]),'应用显示名不能为空');app_ids.append(app[0])
    require(len(app_ids)==len(set(app_ids)),'桌面应用不能重复（固定 Dock 不计）')
    require({'kakao','settings','notifications'}<=set(app_ids),'请保留 KakaoTalk、设置和通知中心入口')
    balance=config.get('wallet',{}).get('initialBalance')
    require(type(balance) is int and 0<=balance<=9007199254740991,'初始余额需要非负整数')
    for kind,path in config.get('assets',{}).items():
        require(kind in ['avatar','wallpaper'],'assets 仅支持 avatar 和 wallpaper')
        require(isinstance(path,str),'图片路径需要字符串')
        if path:
            target=inside(path);require(target.is_file() and target.suffix.lower() in ['.png','.jpg','.jpeg','.webp','.gif'],'头像/壁纸需要目录内的图片文件')
    for event in config.get('calendar',[]):
        require(all(isinstance(event.get(k),str) for k in ['title','date','time','location']),'日历项需要 title、date、time、location 字符串')
    scenario=config.get('scenario')
    if scenario:validate_scenario(scenario,keys,set(app_ids))

def validate_scenario(scenario,contacts,apps):
    require(isinstance(scenario,dict) and bool(scenario.get('id')) and bool(scenario.get('title')),'剧情需要 id 和 title')
    nodes=scenario.get('nodes');require(isinstance(nodes,list) and 0<=len(nodes)<=200,'剧情需要 0—200 个节点')
    ids=[n.get('id') for n in nodes]
    require(all(isinstance(n,str) and re.fullmatch(r'[a-zA-Z0-9_-]+',n) for n in ids) and len(ids)==len(set(ids)),'剧情节点 ID 无效或重复')
    graph={}
    for i,n in enumerate(nodes):
        require(n.get('contact') in contacts,'剧情引用了不存在的联系人：'+str(n.get('contact')))
        app=n.get('app','kakao');require(app in ['kakao','instagram','x','weverse'],'主线应用需要 kakao/instagram/x/weverse')
        require(app in apps,'主线依赖的应用未显示在桌面：'+app)
        deps=n.get('dependsOn',[] if i==0 else [ids[i-1]])
        require(isinstance(deps,list) and all(d in ids and d!=n['id'] for d in deps),'剧情依赖无效：'+n['id']);graph[n['id']]=deps
        lines=n.get('lines');require(isinstance(lines,list) and bool(lines) and lines[0].get('role')=='npc','节点首条必须是 NPC 消息：'+n['id'])
        for line in lines:
            require(line.get('role') in ['npc','player'] and isinstance(line.get('text'),str) and bool(line['text'].strip()),'对话的 role/text 无效：'+n['id'])
            if line['role']=='npc' and re.search(r'[가-힣ぁ-ヿ]',line['text']):require(bool(line.get('translation')),'外语 NPC 消息需要中文 translation：'+n['id'])
        if n.get('choice'):
            opts=n['choice'].get('options');require(isinstance(opts,list) and 2<=len(opts)<=5,'关键选择需要 2—5 个选项')
            require(all(isinstance(o,list) and len(o)==3 and all(isinstance(v,str) and bool(v) for v in o) for o in opts),'选项需要 [选项ID, 玩家回复, NPC回应]')
            require(len({o[0] for o in opts})==len(opts),'选项 ID 不能重复')
        for variant in n.get('variants',[]):
            require(variant.get('nodeId') in ids and type(variant.get('lineIndex')) is int and 0<=variant['lineIndex']<len(lines) and bool(variant.get('text')),'variants 的前序节点、lineIndex 或 text 无效')
    visited=set();visiting=set()
    def visit(key):
        require(key not in visiting,'剧情依赖出现循环：'+key)
        if key in visited:return
        visiting.add(key)
        for dep in graph[key]:visit(dep)
        visiting.remove(key);visited.add(key)
    for key in graph:visit(key)

def load_config(preset_override=None):
    main=read_json(ROOT/'config/phone.config.json')
    require(main.get('schemaVersion')==1,'不支持的 schemaVersion')
    preset=preset_override or main.get('preset');require(preset == 'blank','preset 需要 blank')
    namespace=main.get('storageNamespace','')
    require(isinstance(namespace,str) and re.fullmatch(r'[a-z0-9][a-z0-9-]{2,63}',namespace) is not None,'storageNamespace 需要 3—64 位小写字母、数字和短横线')
    require(not namespace.startswith('idol-phone-life'),'通用版不能使用原版的存储命名空间')
    require(isinstance(main.get('overrides',{}),dict),'overrides 必须是对象')
    config=merge(read_json(ROOT/f'config/presets/{preset}.json'),main.get('overrides',{}))
    config.update({'preset':preset,'namespace':namespace,'schemaVersion':1})
    path=config.get('scenarioFile');config['scenario']=read_json(inside(path)) if path else None
    config['music']=read_json(ROOT/'config/music.library.json')
    require(isinstance(config['music'].get('tracks'),list),'曲库 tracks 需要数组（可为空）')
    for track in config['music']['tracks']:require(bool(track.get('title')) and bool(track.get('artist')) and type(track.get('duration')) in [int,float] and track['duration']>0,'歌曲需要 title、artist、正数 duration（秒）')
    validate(config);return config

if __name__=='__main__':
    try:
        config=load_config();print('配置有效：',config['preset'],config['app']['title'])
    except ValueError as error:raise SystemExit(str(error))
