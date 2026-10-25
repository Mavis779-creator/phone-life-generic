"""Read-only CSS/route inventory. This is not computed-style or browser visual QA."""
from pathlib import Path
import argparse,json,re
ROOT=Path(__file__).resolve().parents[1]
DECORATIVE=re.compile(r'svg|app-icon|(?:^|[ .#_-])(?:art|logo|badge|wordmark|ticks|monogram)(?:[ .#:_-]|$)')
def inventory():
    files=[]
    for file in sorted((ROOT/'src').glob('*.css')):
        findings=[]
        for selector,body in re.findall(r'([^{}]+)\{([^{}]*)\}',file.read_text(encoding='utf-8')):
            for size in re.findall(r'font-size:\s*(\d+(?:\.\d+)?)px',body):
                size=float(size)
                if 0<size<12:
                    findings.append({'selector':selector.strip()[-220:],'px':size,'decorativeException':bool(DECORATIVE.search(selector))})
        files.append({'file':file.name,'smallTextDeclarations':findings})
    config=json.loads((ROOT/'config/presets/blank.json').read_text(encoding='utf-8'))
    return {'scope':'Source declarations only; no computed cascade, browser geometry or screenshot validation','apps':[{'id':a[0],'name':a[1]} for page in config['desktopPages'] for a in page],'files':files,'smallTextTotal':sum(len(f['smallTextDeclarations']) for f in files),'nonDecorativeSmallTextTotal':sum(not x['decorativeException'] for f in files for x in f['smallTextDeclarations'])}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output');args=p.parse_args();result=inventory();text=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    if args.output:
        dest=(ROOT/args.output).resolve()
        if not dest.is_relative_to(ROOT):raise SystemExit('Audit output must stay inside the project')
        dest.write_text(text,encoding='utf-8')
        print(json.dumps({'apps':len(result['apps']),'smallTextTotal':result['smallTextTotal'],'nonDecorativeSmallTextTotal':result['nonDecorativeSmallTextTotal']}))
    else:print(text)
