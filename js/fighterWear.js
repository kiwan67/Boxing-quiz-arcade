// Presentation only. Never writes health, combat poses, clocks or cooldowns.
export const wear = { matchId: null, player: null, bot: null };
export const WEAR_STATES = Object.freeze(["NORMAL", "CANSADO", "EXAUSTO"]);
const fresh = () => ({ state: "NORMAL", level: 0, blend: 0, time: 0, effort: 0, reaction: 0, receivedDamage: 0, bruises: 0, seen: null });
export function resetWear(matchId) { wear.matchId = matchId; wear.player = fresh(); wear.bot = fresh(); }
export function updateWear(state, dt) {
    if (wear.matchId !== state.matchId) resetWear(state.matchId);
    if (['lobby','match_intro','paused','victory','defeat'].includes(state.phase)) return;
    for (const role of ['player','bot']) {
        const w = wear[role], health = role === 'player' ? state.playerHealth : state.enemyHealth;
        const event = role === 'bot' ? state.lastAttackResult : state.defense?.lastResult;
        w.time += dt; w.reaction = Math.max(0, w.reaction - dt);
        if (event && event !== w.seen && (event.impactResolved || event.impactRegistered)) {
            w.seen = event;
            if (event.damageApplied > 0) { w.receivedDamage += event.damageApplied; w.bruises = w.receivedDamage >= 75 ? 3 : w.receivedDamage >= 45 ? 2 : w.receivedDamage >= 12 ? 1 : 0; w.effort = Math.min(4, w.effort + .25); if (event.damageApplied >= 10) w.reaction = .45; }
        }
        // Monotonic within a match prevents flicker at thresholds; time has a small cap.
        const strain = 100 - health + Math.min(3, w.time / 120) + w.effort;
        if (strain >= 65) w.level = 2;
        else if (strain >= 30) w.level = Math.max(1, w.level);
        w.state = WEAR_STATES[w.level];
        w.blend += (w.level - w.blend) * Math.min(1, dt * 4);
    }
}
export function wearIdleOffset(role, pose) {
    const w = wear[role];
    if (!w || pose.animationState !== 'idle') return 0;
    return Math.round((1 + Math.sin(w.time * (2 + w.blend))) * w.blend);
}
export function drawWear(ctx, role, x, top, width, height) {
    const w = wear[role]; if (!w || w.blend < .03 && w.reaction <= 0) return;
    ctx.save(); ctx.globalAlpha *= Math.min(1, w.blend + w.reaction * 2);
    const pixel = (color, dx, dy, a, b) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x + dx * width), Math.round(top + dy * height), a, b); };
    // Harmless cloth scuffs and sweat highlights stay on the torso/head silhouette.
    pixel('#b78c76', -.12, .36, 4, 1); pixel('#795f64', .1, .39, 3, 1);
    if (w.blend > 1) { pixel('#b5a6ad', -.08, .57, 5, 1); pixel('#795f64', .08, .29, 4, 2); }
    const count = w.blend > 1.2 ? 5 : 2;
    for (let i=0; i<count; i++) {
        const phase = (w.time * (.45 + w.blend * .2) + i * .23) % 1;
        if (phase > .7) continue;
        const side = i % 2 ? 1 : -1;
        pixel('#bcefff', side * (.13 + (i%3)*.025), .15 + phase*.26, 2, 3);
        pixel('#f1ffff', side * (.13 + (i%3)*.025), .15 + phase*.26, 1, 1);
    }
    ctx.restore();
}
export function drawWearPortrait(ctx, role, x) {
    const w = wear[role]; if (!w || w.blend < .03 && !visualDamageLevel(role)) return;
    ctx.save(); ctx.globalAlpha = Math.min(1,Math.max(w.blend,visualDamageLevel(role) ? .8 : 0));
    ctx.fillStyle='#96543f'; ctx.fillRect(x+16,29,5,1); ctx.fillRect(x+24,29,4,1);
    ctx.fillStyle='#bcefff'; ctx.fillRect(x+13,26,2,4); ctx.fillRect(x+30,30,2,3);
    if(visualDamageLevel(role)) { ctx.fillStyle='#80577f'; ctx.fillRect(x+15,30,3+visualDamageLevel(role),2); if(visualDamageLevel(role)>1) ctx.fillRect(x+26,32,3,2); }
    ctx.fillStyle='#172030'; ctx.fillRect(x+19,34,6,2);
    if(w.blend>1) { ctx.fillRect(x+20,35,4,2); ctx.fillStyle='#a57872'; ctx.fillRect(x+15,32,4,1); }
    ctx.restore();
}


// Cache complete variants once per source/level. Only skin-colored source pixels
// receive pigment, so gloves, hair, transparent margins and clothing stay intact.
const bruiseCache = new WeakMap();
export function bruisedSprite(image, role, front = role === 'bot') {
    const level = visualDamageLevel(role);
    if (!level || typeof document === 'undefined') return image;
    const key = `${role}:${level}:${front}`;
    let variants = bruiseCache.get(image);
    if (!variants) { variants = new Map(); bruiseCache.set(image, variants); }
    if (variants.has(key)) return variants.get(key);
    try {
        const canvas = document.createElement('canvas'); canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
        const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.drawImage(image,0,0);
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height), d=pixels.data;
                const paired = /grip-/.test(image.src || image.url || '');
        const portraitSource = /neutral|relaxed|defeated/.test(image.src || image.url || '');
        // Source-pixel anatomy, not screen coordinates. The paired ceremony art
        // reserves the left side for the referee: pigment belongs to the winner.
        const fallen = /ko-[3-6]/.test(image.url || '');
        const resultPose=/_result_/.test(image.src || image.url || '');
        const groundPose=/ko-ground/.test(image.url || '');
        const spots = resultPose ? [[.44,.235,.055,.025],[.58,.26,.045,.025],[.24,.39,.05,.04]]
            : groundPose ? [[.27,.32,.065,.055],[.72,.38,.06,.05],[.4,.45,.07,.055]]
            : fallen ? (role==='player' ? [[.72,.35,.08,.08],[.8,.48,.07,.07]] : [[.18,.4,.06,.08],[.4,.36,.07,.09],[.7,.5,.06,.07]]) : paired ? [[.69,.205,.035,.018],[.75,.23,.025,.018],[.83,.35,.035,.026]]
            : front ? (portraitSource ? [[.44,.135,.055,.022],[.57,.15,.045,.02],[.27,.29,.05,.03]]
                : [[.47,.19,.055,.022],[.58,.205,.045,.02],[.19,.255,.055,.032],[.82,.34,.045,.03]])
            : [[.32,.235,.065,.03],[.72,.26,.055,.03],[.19,.32,.05,.026]];
        for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
            const i=(y*canvas.width+x)*4, r=d[i],g=d[i+1],b=d[i+2];
            if(d[i+3]<200 || r<90 || r<g*1.12 || g<b*1.05) continue;
            for(let j=0;j<(level===1?1:spots.length);j++) {
                const [cx,cy,rx,ry]=spots[j]; const nx=(x/canvas.width-cx)/rx,ny=(y/canvas.height-cy)/ry;
                                // Stepped asymmetric patches, retaining the original pixel shading.
                const px=Math.abs(nx), py=Math.abs(ny);
                if(px>1 || py>1 || px>.65 && py>.55 || (Math.floor(x/3)+Math.floor(y/3))%7===0) continue;
                const a=level===1?.48:level===2?.62:.74; d[i]=Math.round(r*(1-a)+110*a); d[i+1]=Math.round(g*(1-a)+75*a); d[i+2]=Math.round(b*(1-a)+128*a); break;
            }
        }
        ctx.putImageData(pixels,0,0); canvas.naturalWidth=canvas.width; canvas.naturalHeight=canvas.height; variants.set(key,canvas); return canvas;
    } catch { return image; }
}



export function visualDamageLevel(role) { return wear[role]?.preview ?? wear[role]?.bruises ?? 0; }
export function previewVisualDamage(role, stage) {
    if (!wear[role]) return false;
    if(stage===null) { delete wear[role].preview; return true; }
    if(!Number.isInteger(stage)||stage<0||stage>3) return false;
    wear[role].preview=stage; return true;
}



