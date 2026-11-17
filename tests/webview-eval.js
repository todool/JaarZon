// Read/evaluate a debug WebView through an explicitly forwarded local CDP port.
// Node built-ins only. Used solely by emulator tests, never bundled in the app.
(async () => {
    const port = Number(process.argv[2]);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port');
    const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = pages.find(p => p.url === 'https://appassets.androidplatform.net/index.html');
    if (!page) throw new Error('Local JaarZon WebView is not ready');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebView evaluation timed out')), 5000);
        ws.onopen = () => ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:process.argv[3],returnByValue:true}}));
        ws.onerror = reject;
        ws.onmessage = event => {
            const message = JSON.parse(event.data);
            if (message.id !== 1) return;
            clearTimeout(timeout);
            if (message.error || message.result.exceptionDetails) reject(new Error(JSON.stringify(message)));
            else resolve(message.result.result.value ?? null);
        };
    });
    ws.close();
    console.log(JSON.stringify(result));
})().catch(error => { console.error(error.message); process.exit(1); });
