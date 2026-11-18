// Emulator-only privacy-link checks. Node built-ins; no app/network dependency.
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const serial = process.argv[2];
if (!/^emulator-\d+$/.test(serial || '')) throw new Error('Use a local emulator only');
const adbPath = path.join(process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA,'Android','Sdk'),'platform-tools','adb.exe');
const adb = (...args) => execFileSync(adbPath,['-s',serial,...args],{encoding:'utf8'}).trim();
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let client, disabled = [];
async function connect() {
    if (client) client.ws.close();
    const pid=adb('shell','pidof','nl.jaarzon');
    adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);
    for (let attempt=0;attempt<30;attempt++) {
        try {
            const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
            const page=pages.find(p=>p.url==='https://appassets.androidplatform.net/index.html');
            if (!page) throw Error('Loading');
            const ws=new WebSocket(page.webSocketDebuggerUrl);
            await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
            let id=0;const pending=new Map();
            ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
            const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout'));},5000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});
            client={ws,send}; return;
        } catch { await sleep(300); }
    }
    throw Error('No JaarZon WebView');
}
async function evaluate(expression) {
    const r=await client.send('Runtime.evaluate',{expression,returnByValue:true});
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
}
async function waitFor(fn) {
    for(let i=0;i<30;i++){try{if(await fn())return;}catch{} await sleep(200);}
    throw Error('Expected state not reached');
}
async function start(language) {
    adb('shell','am','force-stop','nl.jaarzon');
    adb('shell','cmd','locale','set-app-locales','nl.jaarzon','--locales',language);
    adb('shell','am','start','-W','-n','nl.jaarzon/.MainActivity');
    await connect();
    await waitFor(()=>evaluate('document.documentElement.lang === '+JSON.stringify(language)+' && !!document.querySelector(".privacy-link")?.textContent'));
}
function activities(){return adb('shell','dumpsys','activity','activities');}
function isAppForeground(){return /topResumedActivity=[^\n]*nl\.jaarzon/.test(activities());}
(async()=>{
    adb('install','-r','app/build/outputs/apk/debug/app-debug.apk');
    adb('shell','pm','grant','nl.jaarzon','android.permission.ACCESS_COARSE_LOCATION');
    adb('shell','cmd','location','set-location-enabled','false');
    adb('shell','svc','wifi','disable');adb('shell','svc','data','disable');
    for(const [lang,label] of [['nl','Privacyverklaring'],['en','Privacy Policy']]) {
        await start(lang);
        assert.equal(await evaluate('document.querySelector(".privacy-link").textContent'),label);
        const ax=await client.send('Accessibility.getFullAXTree');
        assert.ok(ax.nodes.some(n=>n.role?.value==='link' && n.name?.value===label),'accessible link role/name');
        await evaluate('document.querySelector(".privacy-link").scrollIntoView();document.querySelector(".privacy-link").focus()');
        assert.equal(await evaluate('document.activeElement.matches(".privacy-link")'),true);
        await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
        await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
        const url='https://todool.github.io/JaarZon/privacy/'+lang+'.html';
        await waitFor(()=>{const a=activities();return a.includes('act=android.intent.action.VIEW')&&a.includes(url)&&!isAppForeground();});
        console.log('PASS: '+label+' has accessible link semantics; Enter launches ACTION_VIEW '+url);
        adb('shell','am','start','-W','-n','nl.jaarzon/.MainActivity');
        await connect();await waitFor(()=>evaluate('document.readyState === "complete" && !!document.querySelector(".privacy-link")'));
        assert.equal(await evaluate('location.href'),'https://appassets.androidplatform.net/index.html');
        await evaluate('location.href="https://example.com/unwanted-navigation"');
        await sleep(300);
        assert.equal(await evaluate('location.href'),'https://appassets.androidplatform.net/index.html');
        assert.ok(isAppForeground());
        const available=adb('shell','cmd','package','query-activities','--brief','-a','android.intent.action.VIEW','-c','android.intent.category.BROWSABLE','-d',url);
        const browsers=[...new Set(available.split(/\r?\n/).map(l=>l.trim()).filter(l=>/^[\w.]+\//.test(l)).map(l=>l.split('/')[0]))];
        assert.ok(browsers.length,'test browser present');
        try {
            for(const browser of browsers){adb('shell','pm','disable-user','--user','0',browser);disabled.push(browser);}
            assert.match(adb('shell','cmd','package','resolve-activity','--brief','-a','android.intent.action.VIEW','-c','android.intent.category.BROWSABLE','-d',url),/No activity found/);
            const pid=adb('shell','pidof','nl.jaarzon');
            await evaluate('document.querySelector(".privacy-link").click()');await sleep(300);
            assert.equal(adb('shell','pidof','nl.jaarzon'),pid);assert.ok(isAppForeground());
            assert.equal(await evaluate('location.href'),'https://appassets.androidplatform.net/index.html');
            console.log('PASS: '+lang+' missing browser is handled without crash; foreign navigation remains blocked');
        } finally { for(const browser of disabled)adb('shell','pm','enable',browser);disabled=[]; }
    }
    assert.equal(adb('shell','settings','get','global','wifi_on'),'0');
    assert.equal(adb('shell','settings','get','global','mobile_data'),'0');
    assert.ok(await evaluate('document.querySelector(".daylength-curve") && document.querySelector("[data-daylength-golden-morning]").textContent && document.querySelector("[data-daylength-bar]").children.length'));
    console.log('PASS: both languages, graph, Golden Hour and bar work with wifi/mobile data disabled');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
    for(const browser of disabled){try{adb('shell','pm','enable',browser);}catch{}}
    if(client)client.ws.close();try{adb('forward','--remove','tcp:9222');}catch{}
});
