import json,re,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
import os,shutil
BUILD=Path(os.environ.get("HP_EXTENSION_DIR",str(ROOT/"dist")))
BINARY=os.environ.get("CHROMIUM_BIN") or shutil.which("chromium")
def launch(p):
 """Prefer an explicit binary, then Playwright's Chromium, then an installed branded Chrome."""
 if BINARY: return p.chromium.launch(executable_path=BINARY,headless=True,args=['--no-sandbox'])
 try: return p.chromium.launch(headless=True,args=['--no-sandbox'])
 except Exception: return p.chromium.launch(channel='chrome',headless=True,args=['--no-sandbox'])
results=[]
MOCK=r'''(()=>{const listeners=[],changes=[],local={},sync={};globalThis.mock={local,sync,sent:[],fail:false};const storage=(v,area)=>({get:async key=>{await new Promise(r=>setTimeout(r,5));return key in v?{[key]:structuredClone(v[key])}:{}},set:async data=>{if(mock.fail){mock.fail=false;throw Error('test failure')}await new Promise(r=>setTimeout(r,5));const c={};for(const[k,val]of Object.entries(data)){c[k]={oldValue:v[k],newValue:structuredClone(val)};v[k]=structuredClone(val)}for(const fn of changes)fn(c,area)}});globalThis.chrome={runtime:{id:'test-extension',getManifest:()=>({version:'9.9.9'}),onMessage:{addListener:fn=>listeners.push(fn)},onInstalled:{addListener:()=>{}},openOptionsPage:async()=>{},sendMessage:m=>new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>reject(Error('No reply')),2000);for(const fn of listeners)fn(m,{id:'test-extension'},v=>{done=true;clearTimeout(timer);resolve(v)})})},storage:{local:storage(local,'local'),sync:storage(sync,'sync'),onChanged:{addListener:fn=>changes.push(fn),removeListener:fn=>{const i=changes.indexOf(fn);if(i>=0)changes.splice(i,1)}}},contextMenus:{removeAll:fn=>fn(),create:()=>{},onClicked:{addListener:()=>{}}},commands:{onCommand:{addListener:()=>{}}},tabs:{query:async()=>[{id:17,url:'https://example.com/article'}],sendMessage:async(...a)=>{mock.sent.push(a);return {ok:true,enabled:true,stats:{processedNodes:42,processedSegments:87,pending:0,errors:0}}}}};})();'''
def test(n,f):
 try:f();results.append({'name':n,'pass':True});print('PASS',n,flush=True)
 except Exception as e:results.append({'name':n,'pass':False,'error':str(e)[:1000]});print('FAIL',n,str(e)[:350],flush=True)
def eq(a,b):assert a==b,f'{a!r} != {b!r}'
with sync_playwright() as p:
 browser=launch(p)
 def load(name):
  page=browser.new_page(viewport={'width':900,'height':800});page.set_default_timeout(7000)
  html=(BUILD/f'{name}.html').read_text(encoding='utf-8');html=re.sub(r'<script[^>]*>.*?</script>','',html);html=re.sub(r'<link[^>]*>','',html)
  page.set_content(html);page.add_style_tag(path=str(BUILD/f'{name}.css'));page.add_script_tag(content=MOCK);page.add_script_tag(path=str(BUILD/'background.js'));page.add_script_tag(path=str(BUILD/f'{name}.js'));page.wait_for_selector('#controls:not([disabled])');return page
 popup=load('popup')
 def popupready():eq(popup.locator('#site').inner_text(),'example.com');eq(popup.locator('#enabled').is_checked(),True);popup.locator('#enabled').focus();eq(popup.evaluate('document.activeElement.id'),'enabled')
 test('Popup loads settings, current hostname, and keyboard-accessible toggle',popupready)
 def domain():
  popup.locator('#domainRule').select_option('never');popup.wait_for_function("mock.local['hp-settings-v2'].domainRules['example.com']==='never'");eq(popup.locator('#enabled').is_checked(),False)
 test('Popup per-site selection persists and updates the toggle',domain)
 def tones():
  popup.locator('#toneStyle').select_option('numbers');popup.wait_for_function("mock.local['hp-settings-v2'].toneStyle==='numbers'");eq(popup.evaluate("mock.local['hp-settings-v2'].domainRules['example.com']"),'never')
 test('Tone changes preserve website rules',tones)
 def rescan():popup.locator('#rescan').click();popup.wait_for_function("mock.sent.some(a=>a[1].type==='hp-reprocess'&&a[2].frameId===0)")
 test('Rescan action targets the top frame',rescan)
 def segments():popup.wait_for_function("document.getElementById('status').textContent.includes('87 segments processed')")
 test('Popup status reports converted segments rather than node count',segments)
 def resetappearance():
  popup.evaluate("()=>{document.querySelector('details').open=true;const f=document.getElementById('fontScale');f.value='0.9';f.dispatchEvent(new Event('change'))}")
  popup.wait_for_function("mock.local['hp-settings-v2'].fontScale===0.9")
  popup.locator('#defaults').click();popup.wait_for_function("mock.local['hp-settings-v2'].fontScale===0.5")
  eq(popup.evaluate("mock.local['hp-settings-v2'].toneStyle"),'numbers')
  eq(popup.evaluate("mock.local['hp-settings-v2'].annotationMode"),'above')
 test('Reset appearance keeps placement, unit, and tone preferences',resetappearance)
 def failed():
  popup.evaluate('mock.fail=true');popup.locator('#granularity').select_option('character');popup.wait_for_selector('#status.error')
  popup.locator('#granularity').select_option('word');popup.wait_for_function("!document.getElementById('status').classList.contains('error')")
 test('Popup shows storage failures and recovers on the next change',failed)
 popup.screenshot(path=str(ROOT/'popup-ui-tested.png'));popup.close()
 options=load('options')
 def optionsversion():eq(options.locator('#version').inner_text(),'9.9.9')
 test('Options footer reports the manifest version',optionsversion)
 def optionssave():
  options.locator('#fontScale').fill('0.65');options.locator('#save').click();options.wait_for_function("document.getElementById('message').textContent==='Preferences saved'");eq(options.evaluate("mock.local['hp-settings-v2'].fontScale"),.65)
 test('Advanced appearance preferences save through the worker protocol',optionssave)
 def invalidselector():
  options.locator('#excludedSelectors').fill('[');options.locator('#save').click();options.wait_for_function("document.getElementById('message').textContent.includes('Invalid CSS selector')")
  eq(options.evaluate("mock.local['hp-settings-v2'].excludedSelectors"),[])
 test('Invalid selectors do not corrupt saved preferences',invalidselector)
 def addrule():
  options.locator('#newHost').fill('News.Example.com.');options.locator('#newRule').select_option('never');options.locator('#addRule').click();options.wait_for_function("mock.local['hp-settings-v2'].domainRules['news.example.com']==='never'");eq(options.locator('#rules .rule').count(),1)
 test('Website rule editor canonicalizes hostnames and saves immediately',addrule)
 def badimport():
  options.locator('#import').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"format":"other"}'})
  options.wait_for_function("document.getElementById('message').textContent.includes('Not a supported')")
 test('Unsupported settings imports are rejected',badimport)
 options.screenshot(path=str(ROOT/'options-ui-tested.png'),full_page=True);options.close();browser.close()
(ROOT/'ui-test-results.json').write_text(json.dumps({'api_backend':'Mocked Chrome API, actual compiled worker and UI code','results':results},indent=2),encoding='utf-8')
print('TOTAL',len(results),'PASS',sum(x['pass']for x in results),flush=True)
sys.exit(0 if all(x['pass'] for x in results)else 1)
