from pathlib import Path
import json, threading, time, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
import os, shutil
HARNESS=Path(os.environ.get("HP_TEST_HARNESS", str(ROOT/".test-build/harness.js")))
BINARY=os.environ.get("CHROMIUM_BIN") or shutil.which("chromium")
def launch(p):
 """Prefer an explicit binary, then Playwright's Chromium, then an installed branded Chrome."""
 if BINARY: return p.chromium.launch(executable_path=BINARY,headless=True,args=['--no-sandbox'])
 try: return p.chromium.launch(headless=True,args=['--no-sandbox'])
 except Exception: return p.chromium.launch(channel='chrome',headless=True,args=['--no-sandbox'])
results=[]
def test(name,fn):
 t=time.time()
 try: fn(); results.append({'name':name,'pass':True,'seconds':round(time.time()-t,3)}); print('PASS',name,flush=True)
 except Exception as e: results.append({'name':name,'pass':False,'error':str(e)[:1500]}); print('FAIL',name,str(e)[:600],flush=True)
def eq(a,b):
 assert a==b, f'{a!r} != {b!r}'
with sync_playwright() as p:
 browser=launch(p)
 page=browser.new_page();page.set_default_timeout(15000);page.set_content('<html lang="zh"><body></body></html>');page.add_script_tag(path=str(HARNESS))
 def setup(html,settings=None):
  page.evaluate('''([html,opts])=>{window.c?.destroy();window.st?.destroy();document.body.innerHTML=html;window.c=new __hpTest.PageController();c.apply(__hpTest.settings.mergeSettings(opts));window.st=new __hpTest.SelectionTool(c);}''',[html,settings or {}])
 def drained(): page.wait_for_function('c.stats.batches>0 && c.getState().stats.pending===0')
 def evaluate(code): return page.evaluate(code)
 def settings_validation():
  eq(evaluate('''()=>{const s=__hpTest.settings.mergeSettings({batchSize:NaN,cacheSize:Infinity,fontScale:-5,opacity:42,color:"red;}body{display:none}",domainRules:JSON.parse('{"__proto__":"always","Example.COM.":"never"}')});return [s.batchSize,s.cacheSize,s.fontScale,s.opacity,s.color,Object.keys(s.domainRules),__hpTest.settings.canonicalHost('example.com:443')]}'''),[80,1500,.35,1,'#5b6472',['example.com'],''])
 test('Settings sanitize numbers, CSS, hostnames, and prototype keys',settings_validation)
 def cache_checks():
  eq(evaluate("()=>{let x=new __hpTest.LruCache(2);x.set('',1);x.set('b',2);x.get('');x.set('c',3);return [x.get('b'),x.get(''),x.size]}"),[None,1,2])
 test('Bounded LRU evicts correctly including an empty key',cache_checks)
 def large():
  setup('<nav>'+'<a href="#">中文</a>'*100+'</nav><main>'+'<p>学习中文</p>'*2200+'</main>');drained()
  eq(page.locator('[data-hp-root]').count(),2300)
  assert evaluate('c.stats.visitedNodes')<15000
  eq(evaluate('c.stats.errors'),0)
 test('2,300 text nodes finish across resumable batches',large)
 def dynamic():
  setup('<main id="m"><p>中文</p></main>');drained();evaluate("m.insertAdjacentHTML('beforeend','<p id=late>重庆银行</p>')")
  page.wait_for_selector('#late [data-hp-root]');eq(evaluate('c.stats.errors'),0)
 test('Dynamically added Chinese text is annotated',dynamic)
 def exclusions():
  setup('''<p id="ok">中文</p><code><span id="code">中文</span></code><pre><b id="pre">中文</b></pre><div contenteditable="plaintext-only"><p id="edit">中文</p></div><svg><text>中文</text></svg><div hidden>中文</div><div style="display:none">中文</div><p lang="ja">日本語</p><p lang="ko">漢字</p><div class="excluded"><p>中文</p></div><ruby>中<rt>zhōng</rt></ruby>''',{'excludedSelectors':['.excluded']});drained();eq(page.locator('[data-hp-root]').count(),1)
 test('Nested code, editors, SVG, hidden content, foreign language, and exclusions are skipped',exclusions)
 def reveal():
  setup('<p id="hidden" style="display:none">中文</p><details id="detail"><summary>中文</summary><p id="detailbody">中文</p></details>');drained();eq(page.locator('#hidden [data-hp-root]').count(),0)
  evaluate("document.getElementById('hidden').style.display='block';document.getElementById('detail').open=true")
  page.wait_for_selector('#hidden [data-hp-root]');page.wait_for_selector('#detailbody [data-hp-root]')
 test('CSS-revealed text and opened details are processed',reveal)
 def shadow():
  setup('<div id="host"></div>',{'enabled':False});evaluate("host.attachShadow({mode:'open'}).innerHTML='<p>中文</p><div id=inner></div>';host.shadowRoot.querySelector('#inner').attachShadow({mode:'open'}).innerHTML='<p>学习中文</p>'");evaluate('c.apply({...c.settings,enabled:true})');drained()
  eq(evaluate("host.shadowRoot.querySelectorAll('[data-hp-root]').length"),1)
  evaluate("host.shadowRoot.querySelector('p').insertAdjacentHTML('afterend','<p id=added>重庆</p>')")
  page.wait_for_function("host.shadowRoot.querySelector('#added [data-hp-root]')")
  eq(evaluate("host.shadowRoot.querySelector('#inner').shadowRoot.querySelectorAll('[data-hp-root]').length"),1)
  evaluate('c.apply({...c.settings,enabled:false})')
  eq(evaluate("[host.shadowRoot.querySelectorAll('[data-hp-root]').length,host.shadowRoot.querySelector('#inner').shadowRoot.querySelectorAll('[data-hp-root]').length,host.shadowRoot.querySelectorAll('[data-hp-style]').length]"),[0,0,0])
 test('Nested open Shadow DOM is styled, observed, and fully restored',shadow)
 def toggles():
  setup('<p id="stable">学习中文</p>');drained()
  evaluate('''()=>{for(let i=0;i<15;i++){c.apply({...c.settings,enabled:false});c.apply({...c.settings,enabled:true});}}''');drained()
  eq(page.locator('[data-hp-root]').count(),1);eq(page.locator('[data-hp-root] [data-hp-root]').count(),0)
  evaluate("c.apply({...c.settings,enabled:false})");page.wait_for_timeout(300);eq(page.locator('[data-hp-root]').count(),0)
 test('Rapid toggles cancel stale work and never double annotate',toggles)
 def preservation():
  setup('<a id="link" href="#target"><span>学习中文</span></a>',{'enabled':False});evaluate("window.original=link;window.text=link.firstChild.firstChild;window.clicks=0;link.addEventListener('click',()=>clicks++);c.apply({...c.settings,enabled:true})");drained();evaluate("c.apply({...c.settings,enabled:false});link.click()")
  eq(evaluate('[link===original,link.firstChild.firstChild===text,link.textContent,clicks,link.getAttribute("href")]'),[True,True,'学习中文',1,'#target'])
 test('Disabling preserves links, click handlers, and original Text identity',preservation)
 def live_edits():
  setup('<p id="edited">中文</p>');drained();evaluate("edited.querySelector('ruby').firstChild.data='你好'");page.wait_for_timeout(350);evaluate("c.apply({...c.settings,enabled:false})");assert '你好' in evaluate('edited.textContent');assert 'zhōng' not in evaluate('edited.textContent')
 test('Page edits are preserved rather than replaced by stale originals',live_edits)
 def nohan():
  setup('<p id="plain">English only</p>');drained();eq(page.locator('[data-hp-root]').count(),0)
 test('Non-Chinese text is left unchanged',nohan)
 def huge():
  setup('<p id="long">'+'学习中文'*1400+'𠀀中文</p>');drained();assert page.locator('#long [data-hp-root]').count()>10
  evaluate('c.apply({...c.settings,enabled:false})');eq(evaluate('document.getElementById("long").textContent'),'学习中文'*1400+'𠀀中文')
 test('Long text is chunked without losing characters or surrogate pairs',huge)
 def selection_link():
  setup('<div id="select"><a id="a" href="#">学习</a><strong id="b">中文</strong></div>',{'enabled':False})
  evaluate("window.aRef=a;window.bRef=b;window.clickCount=0;a.addEventListener('click',()=>clickCount++);const r=document.createRange();r.selectNodeContents(document.getElementById('select'));getSelection().removeAllRanges();getSelection().addRange(r)")
  evaluate("st.act('annotate-selection')");eq(evaluate('[a===aRef,b===bRef]'),[True,True]);eq(page.locator('#select [data-hp-root]').count(),2)
  evaluate('c.stop();a.click()');eq(evaluate('[document.getElementById("select").textContent,clickCount]'),['学习中文',1])
 test('Selection annotations preserve anchors and nested formatting',selection_link)
 def selected_copy():
  setup('<p id="copied">API 中文 2026</p>');drained();eq(evaluate('()=>{const r=document.createRange();r.selectNodeContents(copied);return __hpTest.annotations.baseText(r.cloneContents());}'),'API 中文 2026')
 test('Copy source strips only pronunciation text and preserves mixed content',selected_copy)
 def removal():
  setup('<p id="rm">中文</p>');drained();evaluate("const r=document.createRange();r.selectNodeContents(rm);getSelection().removeAllRanges();getSelection().addRange(r)");evaluate("st.act('remove-selection')");page.wait_for_timeout(300);eq(page.locator('#rm [data-hp-root]').count(),0);eq(evaluate('rm.textContent'),'中文')
 test('Selected annotation removal does not immediately reannotate',removal)
 def failure():
  setup('<p>中文</p><p>学习中文</p>',{'enabled':False});evaluate("window.realCreate=document.createElement.bind(document);document.createElement=function(name,...args){if(name==='ruby')throw new Error('Injected failure');return realCreate(name,...args)};c.apply({...c.settings,enabled:true})");drained();eq(evaluate('c.stats.errors'),2);b=evaluate('c.stats.batches');page.wait_for_timeout(300);eq(evaluate('c.stats.batches'),b)
  evaluate("document.createElement=realCreate;c.rescan()");drained();eq(page.locator('[data-hp-root]').count(),2)
 test('Node failures terminate safely and explicit rescan recovers',failure)
 def modes():
  setup('<a id="mode" href="#">中文</a>',{'annotationMode':'hover'});drained();eq(evaluate("getComputedStyle(mode.querySelector('rt')).opacity"),'0')
  page.locator('#mode').hover();eq(evaluate("getComputedStyle(mode.querySelector('rt')).opacity"),'0.9')
  evaluate("c.apply({...c.settings,annotationMode:'after'})");drained();eq(page.locator('rt').count(),0);eq(page.locator('.hp-after').count(),1)
  evaluate("c.apply({...c.settings,annotationMode:'hidden'})");eq(page.locator('[data-hp-root]').count(),0)
 test('Hover, after-text, and hidden modes apply and restore consistently',modes)

 def crossnode():
  setup('<p><span id="silver">银</span><b id="bank">行</b></p>');drained()
  eq(evaluate("bank.querySelector('rt').textContent"),'háng')
 test('Inline phrase context survives words split across spans',crossnode)
 def partial_remove():
  setup('<p id="partial">学习中文</p>');drained()
  evaluate("const r=document.createRange();r.selectNodeContents(partial.querySelector('ruby').firstChild);getSelection().removeAllRanges();getSelection().addRange(r)")
  evaluate("st.act('remove-selection')")
  eq(page.locator('#partial [data-hp-rt]').count(),1)
  eq(evaluate("__hpTest.annotations.baseText(partial)"),'学习中文')
 test('Partial removal keeps annotations on unselected words',partial_remove)
 def spoof():
  setup('<span id="lookalike" data-hp-root="2">中文</span><p>中文</p>');drained();evaluate('c.stop()')
  eq(page.locator('#lookalike').count(),1)
 test('Page-created lookalike attributes are not unwrapped',spoof)
 def transform():
  setup('<p id="upper" style="text-transform:uppercase">api 中文</p>');drained()
  eq(evaluate("getComputedStyle(upper.querySelector('[data-hp-root]')).textTransform"),'uppercase')
 test('Original text transform styling is preserved for mixed text',transform)
 def blank_frame():
  class Handler(BaseHTTPRequestHandler):
   def do_GET(self):
    body=b'<!doctype html><html lang="zh"><body><iframe id="f"></iframe></body></html>'
    self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
   def log_message(self,*a):pass
  server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
  tab=browser.new_page()
  try:
   tab.goto('http://127.0.0.1:%d/'%server.server_address[1])
   tab.wait_for_function('document.getElementById("f")?.contentDocument?.readyState==="complete"')
   frame=[f for f in tab.frames if f.url=='about:blank'][0]
   frame.add_script_tag(path=str(HARNESS))
   # The frame inherits the parent origin, so website rules must resolve to the parent host.
   eq(frame.evaluate('()=>__hpTest.frameHost()'),'127.0.0.1')
   frame.evaluate("""()=>{document.body.innerHTML='<p>\u5b66\u4e60\u4e2d\u6587</p>';window.c=new __hpTest.PageController();c.apply(__hpTest.settings.mergeSettings({domainRules:{'127.0.0.1':'never'}}))}""")
   eq(frame.evaluate('()=>c.enabled'),False)
   eq(frame.evaluate('()=>document.querySelectorAll("[data-hp-root]").length'),0)
   frame.evaluate("""()=>c.apply(__hpTest.settings.mergeSettings({enabled:false,domainRules:{'127.0.0.1':'always'}}))""")
   eq(frame.evaluate('()=>c.enabled'),True)
   frame.wait_for_function('document.querySelectorAll("[data-hp-root]").length>0')
  finally:
   tab.close();server.shutdown();server.server_close()
 test('Website rules apply to about:blank frames that inherit the parent origin',blank_frame)
 browser.close()
(ROOT/'browser-test-results.json').write_text(json.dumps({'conversion_backend':os.environ.get('HP_TEST_BACKEND', 'Production pinyin-pro adapter from the test harness'),'results':results},indent=2),encoding='utf-8')
print('TOTAL',len(results),'PASS',sum(r['pass'] for r in results),'FAIL',sum(not r['pass'] for r in results),flush=True)
sys.exit(0 if all(r['pass'] for r in results) else 1)
