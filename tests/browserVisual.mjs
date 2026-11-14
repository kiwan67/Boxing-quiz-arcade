// Real Chrome Canvas smoke test; no third-party dependencies.
// Run: node tests/browserVisual.mjs
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, extname } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const artifacts = resolve(root, 'tests/artifacts');
await mkdir(artifacts, { recursive: true });
const server = createServer(async (req, res) => {
    try {
        const path = resolve(root, '.' + new URL(req.url, 'http://local').pathname);
        if (!path.startsWith(root)) throw Error('path');
        const data = await readFile(path.endsWith('boxing-quiz') ? resolve(path, 'index.html') : path);
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
            target = await (await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT', signal: AbortSignal.timeout(1000) })).json(); break;
        }
        catch { await new Promise(r => setTimeout(r, 100)); }
    }
    assert.ok(target, 'Browser remote debugging started: ' + browserError);
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await once(socket, 'open');
    let id = 0;
    const pending = new Map();
    const errors = [];
    socket.addEventListener('message', ({ data }) => {
        const message = JSON.parse(data);
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
        if (message.id) {
            const callback = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) callback.reject(Error(JSON.stringify(message.error)));
            else callback.resolve(message.result);
        }
    });
    function call(method, params = {}) {
        return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
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
    const loadedSprites = await evaluate('Object.fromEntries(["referee-neutral", "referee-walk-transparent", "bot-relaxed", "player-neutral"].map(name => [name, Boolean(ceremony.ceremonySprite(name))]))');
    assert.ok(Object.values(loadedSprites).every(Boolean), JSON.stringify(loadedSprites));
    const localPortugueseVoices = await evaluate('globalThis.speechSynthesis?.getVoices().filter(voice => voice.localService && /^pt/i.test(voice.lang)).length || 0');
    async function screenshot(name) {
        const data = await evaluate('document.getElementById("game-canvas").toDataURL("image/png").split(",")[1]');
        await writeFile(resolve(artifacts, name + '.png'), Buffer.from(data, 'base64'));
    }
    for(const clip of ['referee_idle','referee_facepalm','referee_shocked','referee_clap','referee_concerned','referee_approval','referee_reaction_light','referee_reaction_medium','referee_reaction_strong']) {
        await evaluate(`restart(); lobby.updateLobby(); refFaces.resetRefereeExpressions(s.matchId); refFaces.previewRefereeExpression('${clip}');`);
        const frames = await evaluate(`refGestures.REFEREE_CLIPS['${clip}'].frames.length`);
        for(let frame=0;frame<frames;frame++) {
            await evaluate(`refFaces.refereeExpression.elapsed=refGestures.REFEREE_CLIPS['${clip}'].durations.slice(0,${frame}).reduce((a,b)=>a+b,0)+.001; renderer.render();`);
            await screenshot('gesture-'+clip+'-'+frame);
        }
    }
    for(const stage of [0,1,2,3]) {
        await evaluate(`restart(); lobby.updateLobby(); wearView.resetWear(s.matchId); wearView.previewVisualDamage('player',${stage}); wearView.previewVisualDamage('bot',${stage}); renderer.render();`);
        await screenshot('wear-stage-'+stage);
    }
    for(const role of ['player','bot']) for(const punch of ['jab','straight','hook','uppercut']) {
        await evaluate(`restart(); lobby.updateLobby(); wearView.resetWear(s.matchId); wearView.previewVisualDamage('${role}',3);
            Object.assign(charView.characters.${role==='player'?'player':'opponent'}, {animationState:'${role==='player'?'punch_left':'counter_left'}',punchType:'${punch}',leftPunchExtension:1,rightPunchExtension:1,counterExtension:1,counterSide:'left'}); renderer.render();`);
        await screenshot('wear-attack-'+role+'-'+punch);
    }
    await evaluate('restart(); intro.beginMatchIntro();');
    for (const time of [0, 3, 6, 7.6, 9, 11.4, 13.3]) {
        const observed = await evaluate(`(() => {
            const delta = ${time} - intro.matchIntro.time;
            intro.updateMatchIntro(delta); life.updateArenaLife(s, Math.max(0.01, delta));
            const ctx = document.getElementById('game-canvas').getContext('2d');
            const original = ctx.drawImage;
            let refereeDraws = 0;
            ctx.drawImage = function(image, ...args) {
                if (image.src?.includes('/referee-reactions/') || image === ceremony.ceremonySprite('referee-signal') || image === ceremony.ceremonySprite('referee-neutral') || image === ceremony.ceremonySprite('referee-walk-transparent')) refereeDraws++;
                return original.call(this, image, ...args);
            };
            try { renderer.render(); } finally { ctx.drawImage = original; }
            return { refereeDraws, subtitle: intro.introFrame(s).subtitle };
        })()`);
        if (time >= 5) assert.ok(observed.refereeDraws > 0, 'referee is drawn during its scene');

        await screenshot('intro-' + time);
        assert.equal(await evaluate('s.gameTime'), 0);
    }
    assert.equal(await evaluate('intro.finishMatchIntro(); s.phase'), 'idle');
    await evaluate('intro.beginMatchIntro(); document.getElementById("skip-intro").click();');
    assert.equal(await evaluate('s.phase'), 'idle');
    await evaluate('intro.beginMatchIntro(); document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));');
    assert.equal(await evaluate('s.phase'), 'idle');
    for (const [target, winner] of [['enemy', 'player'], ['player', 'bot']]) {
        await evaluate(`restart(); lobby.updateLobby(); damage('${target}', 100, 'browser');`);
        for(const time of [0,.5,.95,1.35,1.7,2.3,2.9,3.3]) {
            await evaluate(`ko.updateKnockout(s, ${time}-ko.knockout.elapsed); renderer.render();`);
            await screenshot('ko-'+winner+'-'+time);
        }
        await evaluate('ko.updateKnockout(s,ko.KO_DURATION);');
        for (const [delta, pose] of [[1.8, 'low'], [0.65, 'mid'], [0.75, 'high'], [2, 'menu']]) {
            const frame = await evaluate(`ceremony.updateCeremony(s, ${delta}); renderer.render(); ceremony.ceremonyFrame(s)`);
            assert.equal(frame.winner, winner);
            await screenshot(`${winner}-${pose}`);
        }
        assert.equal(await evaluate('restart(); s.phase'), 'idle');
        assert.equal(await evaluate(`damage('${target}', 100, 'lobby'); ko.updateKnockout(s,ko.KO_DURATION); lobby.returnToLobby(); s.phase`), 'lobby');
    }
    await evaluate(`restart(); lobby.updateLobby(); arena.updateArenaEffects(s, 0); renderer.render();`);
    await screenshot('arena-rest');
    await evaluate(`s.lastAttackResult = { punchType: 'uppercut', outcome: 'hit', kind: 'counter_rush', arm: 'left', impactResolved: true, damageApplied: 5 }; s.counterChain.count = 3; arena.updateArenaEffects(s, 0); renderer.render();`);
    await screenshot('arena-impact');
    const performance = await evaluate(`(() => {
        const samples = [];
        for (let i = 0; i < 600; i++) { const start = performance.now(); arena.updateArenaEffects(s, 1/60); life.updateArenaLife(s, 1/60); renderer.render(); samples.push(performance.now() - start); }
        samples.sort((a,b) => a-b);
        return { canvas: [640,360], frames: samples.length, meanMs: samples.reduce((a,b)=>a+b,0)/samples.length, p95Ms: samples[570], maxMs: samples.at(-1) };
    })()`);
    assert.deepEqual(errors, []);
    const report = { loadedSprites, localPortugueseVoices, introScenes: 7, skipButtonAndEnter: true,
        winners: ['player', 'bot'], poses: ['low', 'mid', 'high', 'menu'], restartAndLobby: true, runtimeErrors: errors, performance };
    console.log(JSON.stringify(report, null, 2));
    await writeFile(resolve(artifacts, 'browser-results.json'), JSON.stringify(report, null, 2));
} finally {
    socket?.close();
    browser.kill();
    server.close();
}











