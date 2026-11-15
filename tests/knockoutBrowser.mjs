import {checkMenuCarousel} from './menuCarouselBrowserChecks.mjs';
// Real Chrome Canvas smoke test; no third-party dependencies.
// Run: node tests/browserVisual.mjs
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, extname } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import {checkArenaLayers} from './arenaLayerBrowserChecks.mjs';
import {checkTutorial} from './tutorialBrowserChecks.mjs';
import {checkNetworkQuestions} from './questionsBrowserChecks.mjs';
import {checkMenu} from './menuBrowserChecks.mjs';

const root = resolve(import.meta.dirname, '..');
const artifacts = resolve(root, 'tests/artifacts');
await mkdir(artifacts, { recursive: true });
let menuFixture=null;
const server = createServer(async (req, res) => {
    try {
        const path = resolve(root, '.' + new URL(req.url, 'http://local').pathname);
        if (!path.startsWith(root)) throw Error('path');
        if(['missing','custom'].includes(menuFixture)&&/menu_background_\d+\.png$/.test(path)){res.writeHead(404).end();return;}
        if(path.endsWith('menu_background.png')&&menuFixture==='missing'){res.writeHead(404).end();return;}
        if(menuFixture==='carousel'&&path.includes('menu_background')){
            const fixture=path.endsWith('menu_background_01.png')?'referee-neutral.png':path.endsWith('menu_background_02.png')?'player-neutral.png':null;
            if(!fixture){res.writeHead(404).end();return;}
            res.setHeader('Content-Type','image/png');res.end(await readFile(resolve(root,'assets/sprites/ceremony',fixture)));return;
        }
        const data = await readFile(path.endsWith('menu_background.png')&&menuFixture==='custom'?resolve(root,'assets/sprites/ceremony/referee-neutral.png'):path.endsWith('boxing-quiz') ? resolve(path, 'index.html') : path);
        res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[extname(path)] || 'text/html');
        res.end(data);
    } catch { res.writeHead(404).end(); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = spawn(process.env.BOXING_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--password-store=basic', '--disable-features=AppBoundEncryption',
    '--remote-debugging-port=0', `--user-data-dir=${resolve(artifacts, 'arena-browser-' + process.pid)}`, 'about:blank'
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let browserError = '';
browser.stderr.on('data', chunk => { browserError = (browserError + chunk).slice(-3000); });
browser.on('error', error => { browserError += error.message; });
let socket;
try {
    let target;
    for (let i = 0; i < 300; i++) {
        try {
            const port = (await readFile(resolve(artifacts, 'arena-browser-' + process.pid, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
            const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(5000)})).json();
            target=targets.find(item=>item.type==='page');if(target)break;
        }
        catch { await new Promise(r => setTimeout(r, 100)); }
    }
    assert.ok(target, 'Browser remote debugging started: ' + browserError);
    console.log('Chrome conectado; verificando menu.');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await once(socket, 'open');
    let id = 0;
    const pending = new Map();
    const errors = [];
    socket.addEventListener('message', ({ data }) => {
        const message = JSON.parse(data);
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
        if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')
            errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '));
        if (message.id) {
            const callback = pending.get(message.id);
            pending.delete(message.id);
            if(!callback)return;
            if (message.error) callback.reject(Error(JSON.stringify(message.error)));
            else callback.resolve(message.result);
        }
    });
    function call(method, params = {}) {
        return new Promise((resolve, reject) => {
            const requestId=++id;
            const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Browser command timed out: '+method));},30000);
            pending.set(requestId,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
            socket.send(JSON.stringify({id:requestId,method,params}));
        });
    }
    async function evaluate(expression) {
        const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
    }
    await call('Runtime.enable');
    await call('Page.enable');
    await call('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 1, mobile: false });
    await call('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame = () => 0;' });
    await call('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/index.html` });
    for (let i = 0; i < 100; i++) {
        if (await evaluate('location.pathname === "/index.html" && document.readyState === "complete"')) break;
        await new Promise(r => setTimeout(r, 50));
    }
    await call('Emulation.setDeviceMetricsOverride',{width:640,height:456,deviceScaleFactor:1,mobile:false});
    let menuNavigation=0;
    const reload=async()=>{
        const search='?menu-preview='+ ++menuNavigation;
        await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/index.html${search}`});
        for(let n=0;n<200;n++){
            if(await evaluate(`(async()=>{if(location.search!==${JSON.stringify(search)}||document.readyState!=="complete"||!document.getElementById("main-menu"))return false;await import('/js/main.js');return document.getElementById("main-menu").hidden===false;})()`)){
                await call('Page.bringToFront');return;
            }
            await new Promise(r=>setTimeout(r,50));
        }
        throw Error('Menu initialization timed out');
    };
    const menuChecks=await checkMenu(evaluate,async name=>{
        const clip=await evaluate('(()=>{const r=document.getElementById("main-menu").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()');
        const shot=await call('Page.captureScreenshot',{format:'png',clip});
        await writeFile(resolve(artifacts,name+'.png'),Buffer.from(shot.data,'base64'));
    },reload,async mode=>{menuFixture=mode;});
    await writeFile(resolve(artifacts,'menu-browser-results.json'),JSON.stringify(menuChecks,null,2));
    console.log('Menu, seleção, opções e fluxo de entrada aprovados.');
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await call('Emulation.setTouchEmulationEnabled',{enabled:true});
    await evaluate(`document.querySelector('[data-menu-credits-button]').click()`);
    const creditsMobile=await evaluate(`(async()=>{
        const panel=document.querySelector('[data-menu-credits]'),sprite=panel.querySelector('img');await sprite.decode();
        const bounds=panel.getBoundingClientRect();
        for(const child of panel.children){const r=child.getBoundingClientRect();if(r.left<bounds.left||r.right>bounds.right+1||r.top<bounds.top||r.bottom>bounds.bottom+1)throw Error('Mobile credits clipped');}
        const r=panel.querySelector('[data-credits-back]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    const creditsShot=await call('Page.captureScreenshot',{format:'png'});
    await writeFile(resolve(artifacts,'credits-mobile.png'),Buffer.from(creditsShot.data,'base64'));
    await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[creditsMobile]});
    await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await evaluate(`document.querySelector('[data-menu-credits]').hidden`),true,'Mobile back returns to menu');
    await call('Emulation.setTouchEmulationEnabled',{enabled:false});
    await call('Emulation.setDeviceMetricsOverride',{width:640,height:456,deviceScaleFactor:1,mobile:false});
    if(!process.argv.includes('--credits-only')){
    const carouselChecks=await checkMenuCarousel(evaluate,reload,async mode=>{menuFixture=mode;});
    await writeFile(resolve(artifacts,'menu-carousel-browser-results.json'),JSON.stringify(carouselChecks,null,2));
    console.log('Carousel browser checks passed.');
    }
    await call('Emulation.setDeviceMetricsOverride',{width:1000,height:760,deviceScaleFactor:1,mobile:false});
    if(!process.argv.includes('--menu-only')){
    await evaluate(`(async () => {
        window.s = (await import('/js/gameState.js')).gameState;
        window.restart = (await import('/js/restart.js')).restartFight;
        window.lobby = await import('/js/lobby.js');
        window.ceremony = await import('/js/ceremony.js');
        window.arena = await import('/js/arenaEffects.js');
        window.renderer = await import('/js/render.js');
                const rawDamage = (await import('/js/match.js')).applyImpactDamage;
        window.damage = (target,amount,id) => {
            if(target==='enemy')s.lastAttackResult={outcome:'hit',impactResolved:true,punchType:'uppercut',arm:'left',damageApplied:amount};
            else {s.counterAttack.type='uppercut';s.defense.lastResult={impactRegistered:true,damageApplied:amount};}
            const applied=rawDamage(target,amount,id);wearView.updateWear(s,0);arena.updateArenaEffects(s,0);return applied;
        }; window.ko = await import('/js/knockout.js'); window.koView = await import('/js/knockoutView.js'); await koView.preloadKnockoutSprites();
        window.intro = await import('/js/matchIntro.js');
        window.life = await import('/js/arenaLife.js'); window.wearView = await import('/js/fighterWear.js'); window.charView = await import('/js/characters.js'); window.refFaces = await import('/js/refereeExpressions.js'); window.refGestures = await import('/js/refereeGestures.js'); await refGestures.preloadRefereeReactions();
        await ceremony.preloadCeremonySprites();
        await (await import('/js/fighterSprites.js')).preloadFighterSprites();
    })()`);
    await evaluate("(async()=>{window.mainGame=await import('/js/main.js');window.debugApi=await import('/js/debug.js');window.panelApi=await import('/js/debugPanel.js');window.matchView=await import('/js/matchView.js');window.koAssets=await import('/js/knockoutSprites.js');})()");
    const networkChecks=await checkNetworkQuestions(evaluate,async(name,data)=>writeFile(resolve(artifacts,name+'.png'),Buffer.from(data,'base64')));
    await writeFile(resolve(artifacts,'network-browser-results.json'),JSON.stringify(networkChecks,null,2));
    const tutorialChecks=await checkTutorial(evaluate,async(name,data)=>writeFile(resolve(artifacts,name+'.png'),Buffer.from(data,'base64')));
    await writeFile(resolve(artifacts,'tutorial-browser-results.json'),JSON.stringify(tutorialChecks,null,2));
    const arenaLayers=await checkArenaLayers(evaluate,async(name,data)=>writeFile(resolve(artifacts,name+'.png'),Buffer.from(data,'base64')));
    await writeFile(resolve(artifacts,'arena-layers-browser-results.json'),JSON.stringify(arenaLayers,null,2));
    const audit=await evaluate('koAssets.knockoutSpriteAudit()');
    assert.equal(audit.length,2);assert.ok(audit.every(s=>s.frames===11));
    const bruiseChecks=await evaluate(`(()=>{
        const checks=[];
        wearView.updateWear(s,0);
        for(const role of ['player','bot'])for(const pose of ['defeated_front','sad','frustrated','exhausted','sad_idle','sad_idle_breath']){
            const prefix=role==='player'?'player':'opponent';
            const image=ceremony.ceremonySprite(prefix+'_result_'+pose);
            if(!image)throw Error('Missing front expression '+role+' '+pose);
            const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
            const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
            const before=ctx.getImageData(0,0,canvas.width,canvas.height).data;
            for(const level of [1,2,3]){
                wearView.previewVisualDamage(role,level);
                const variant=wearView.bruisedSprite(image,role,true);
                ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(variant,0,0);
                const after=ctx.getImageData(0,0,canvas.width,canvas.height).data;let changed=0;
                for(let i=0;i<before.length;i+=4){
                    if(before[i+3]!==after[i+3])throw Error('Bruise changed silhouette');
                    if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2])changed++;
                }
                if(!changed)throw Error('Missing bruise pigment '+role+' '+pose+' '+level);
                checks.push({role,pose,level,changedPixels:changed});
            }
            wearView.previewVisualDamage(role,null);
        }
        return checks;
    })()`);
    assert.equal(bruiseChecks.length,36);
    // Check actual renderer placement, including mirrored final blows and
    // different trim widths. Camera movement is deliberately outside this call.
    const anchors=await evaluate(`(()=>{
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
        const ctx=canvas.getContext('2d'),placements=[],translate=ctx.translate.bind(ctx);
        ctx.translate=(x,y)=>{placements.push({x,y});translate(x,y);};
        for(const role of ['player','bot'])for(const direction of [-1,1])for(let frame=0;frame<11;frame++){
            if(!koAssets.drawKnockoutPose(ctx,role,frame,{x:320,floor:340,standingHeight:220,direction}))
                throw Error('Missing KO frame '+role+' '+frame);
        }
        return placements;
    })()`);
    assert.equal(anchors.length,44);
    assert.ok(anchors.every(({x,y})=>x===320&&y===340),'Stable body anchor in every frame');
    const scenarios=[];
    for(const fps of [30,60])for(const target of ['enemy','player'])for(const punch of ['jab','straight','hook','uppercut','special']){
        const outcome=await evaluate(`(()=>{
            debugApi.setDebugEnabled(true);panelApi.updateDebugPanel();
            document.querySelector('[data-debug-ko-target]').value='${target}';
            document.querySelector('[data-debug-ko-punch]').value='${punch}';
            document.querySelector('[data-debug-ko]').click();
            if(s.phase!=='knockout_cinematic')throw Error('KO did not start');
            const result=s.matchResult,clock=s.gameTime,shots=[],scenes=new Set(),bruises=[wearView.wear.player.bruises,wearView.wear.bot.bruises];
            let n=0,next=0,groundFrames=0;const checkpoints=[0,.5,.95,1.35,1.7,2.1,2.55,2.9,3.25,3.5,4.1,4.6];
            while(s.phase==='knockout_cinematic'&&n<${fps}*8){
                const frame=ko.knockoutFrame();scenes.add(frame.scene);
                if(ceremony.ceremonyFrame(s)!==null)throw Error('Early result ceremony');
                if(frame.scene==='ground'){
                    groundFrames++;
                    if(![9,10].includes(frame.frame)||frame.zoom!==1||Math.abs(frame.panY)>1e-8)throw Error('Ground hold must be prone with stable camera');
                }
                if('${punch}'==='uppercut'&&${fps}===60&&next<checkpoints.length&&ko.knockout.elapsed>=checkpoints[next]){
                    renderer.render();shots.push({name:'complete-${target}-'+checkpoints[next],data:document.getElementById('game-canvas').toDataURL('image/png').split(',')[1]});next++;
                }
                mainGame.update(1/${fps});n++;
                if(s.qte.question||s.gameTime!==clock||s.matchResult!==result)throw Error('Combat advanced during KO');
            }
            if(n>=${fps}*8)throw Error('KO stuck');
            if(scenes.size!==6||Math.abs(groundFrames/${fps}-1)>1/${fps}+1e-8)throw Error('Missing fall or dramatic hold');
            if(s.phase!==('${target}'==='player'?'defeat':'victory'))throw Error('Wrong winner');
            ceremony.updateCeremony(s,5.1);renderer.render();
            if(ceremony.ceremonyFrame(s).phase!=='menu')throw Error('Result menu missing');
            const defeated=ceremony.defeatResultPose(s,5.1);
            if(defeated.perspective!=='front'||!defeated.asset.includes('_sad_idle')||!ceremony.ceremonySprite(defeated.asset))throw Error('Missing front sad result');
            if(JSON.stringify(bruises)!==JSON.stringify([wearView.wear.player.bruises,wearView.wear.bot.bruises]))throw Error('Bruises reset at result');
            if('${punch}'==='uppercut'&&${fps}===60)shots.push({name:'complete-ceremony-${target}',data:document.getElementById('game-canvas').toDataURL('image/png').split(',')[1]});
            const goLobby='${punch}'!=='jab';
            const button=goLobby?matchView.LOBBY_BUTTON:matchView.RESTART_BUTTON;
            const canvas=document.getElementById('game-canvas'),rect=canvas.getBoundingClientRect();
            canvas.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:rect.left+(button.x+10)*rect.width/640,clientY:rect.top+(button.y+10)*rect.height/360,bubbles:true}));
            if(goLobby&&s.phase!=='lobby')throw Error('Lobby button failed');
            if(!goLobby&&s.phase!=='match_intro'&&s.phase!=='idle')throw Error('Restart failed');
            return {fps:${fps},target:'${target}',punch:'${punch}',elapsed:n/${fps},groundHold:groundFrames/${fps},winner:result.winner,shots};
        })()`);
        for(const shot of outcome.shots)await writeFile(resolve(artifacts,shot.name+'.png'),Buffer.from(shot.data,'base64'));
        delete outcome.shots;scenarios.push(outcome);
    }
    const previews=[];
    for(const target of ['player','enemy'])for(const stage of ['knees','collapse','ground','transition','ceremony']){
        const preview=await evaluate(`(()=>{
            document.querySelector('[data-debug-ko-target]').value='${target}';
            document.querySelector('[data-debug-ko-stage]').value='${stage}';
            document.querySelector('[data-debug-ko]').click();
            const expected={knees:'fall',collapse:'collapse',ground:'ground',transition:'transition'};
            if('${stage}'!=='ceremony'&&ko.knockoutFrame().scene!==expected['${stage}'])throw Error('Wrong F3 stage');
            const shots=[];
            if('${stage}'==='ceremony'){
                if(ceremony.ceremonyFrame(s).time!==0)throw Error('Ceremony preview skipped judge animation');
                ceremony.updateCeremony(s,3.6);
            }
            if('${stage}'==='ceremony')for(const expression of ['sad','frustrated','exhausted']){
                const select=document.querySelector('[data-debug-ko-expression]');select.value=expression;select.dispatchEvent(new Event('change'));
                const pose=ceremony.defeatResultPose(s,ceremony.ceremonyFrame(s).time);
                if(pose.pose!==expression||pose.perspective!=='front')throw Error('Wrong expression');
                renderer.render();shots.push({name:'expression-${target}-'+expression,data:document.getElementById('game-canvas').toDataURL('image/png').split(',')[1]});
            }
            return {target:'${target}',stage:'${stage}',shots};
        })()`);
        for(const shot of preview.shots)await writeFile(resolve(artifacts,shot.name+'.png'),Buffer.from(shot.data,'base64'));
        delete preview.shots;previews.push(preview);
    }
    assert.deepEqual(errors,[]);
    const report={scenarios,previews,atlas:audit,bruiseChecks,anchorChecks:anchors.length,runtimeErrors:errors};
    await writeFile(resolve(artifacts,'complete-ko-browser-results.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({scenarios:scenarios.length,previews:previews.length,bruiseChecks:bruiseChecks.length,anchorChecks:anchors.length,fps:[30,60],runtimeErrors:errors},null,2));
    }else{
        assert.deepEqual(errors,[]);
        console.log(JSON.stringify({menu:menuChecks,runtimeErrors:errors},null,2));
    }
} finally {
    // Reloading the menu can leave keep-alive/media connections on Windows.
    // Close the whole browser before releasing the test server and child pipes.
    if(socket?.readyState===1){
        socket.send(JSON.stringify({id:0,method:'Browser.close'}));
        await new Promise(resolve=>setTimeout(resolve,150));
    }
    socket?.close();browser.kill();browser.stderr.destroy();browser.unref();
    server.closeAllConnections();server.close();
}
