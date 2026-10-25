"""Build and package this edition, excluding saves, caches and development output."""
from pathlib import Path
import argparse,hashlib,json,subprocess,sys,zipfile
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',default='dist/PHONE_LIFE_GENERIC_v1.1.0.zip');args=p.parse_args()
target=(R/args.output).resolve()
if not target.is_relative_to(R):raise SystemExit('输出 ZIP 必须位于当前通用版目录内')
subprocess.run([sys.executable,str(R/'scripts/build.py')],check=True)
excluded={'.git','.codex','.agents','__pycache__','build-checks','dist','releases','backups','saves'}
def included(f):
    rel=f.relative_to(R)
    return f.is_file() and not any(x in excluded for x in rel.parts) and f.suffix.lower() not in {'.zip','.pyc','.log'} and f.name!='RELEASE_MANIFEST.json' and (not f.name.startswith('.env') or f.name=='.env.example')
files=sorted(f for f in R.rglob('*') if included(f))
manifest={'version':'1.1.0','edition':'blank','browserSaveIncluded':False,'verification':'SHA256 of each distributed file, excluding this manifest itself','files':{f.relative_to(R).as_posix():hashlib.sha256(f.read_bytes()).hexdigest() for f in files}}
mf=R/'RELEASE_MANIFEST.json';mf.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
target.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
    for f in files+[mf]:archive.write(f,'PHONE_LIFE_GENERIC/'+f.relative_to(R).as_posix())
with zipfile.ZipFile(target) as archive:
    bad=archive.testzip()
    if bad:raise SystemExit('ZIP 校验失败：'+bad)
print('Packaged:',target,'files='+str(len(files)+1),'bytes='+str(target.stat().st_size))
