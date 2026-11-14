import { visibleSpriteBounds } from './visibleSpriteBounds.js';
import { REFEREE_BACKGROUND } from './refereeBackground.js';
import { ceremonySprite } from './ceremony.js';
import { introFrame } from "./matchIntro.js";
import { drawArenaScene, drawFighterShadow } from "./scenery.js";
import { arenaLife, drawCameraFlashes, drawArenaLighting } from "./arenaLife.js";
import { fighterSprite, FIGHTER_SPRITE_BOUNDS } from "./fighterSprites.js";
import { drawReferee } from "./refereeView.js";
import { drawPixelText } from "./hud.js";

const lerp = (a, b, t) => a + (b - a) * t;
function text(ctx, value, y, size = 2, color = "#fff1a0") {
    drawPixelText(ctx, value, 322, y + 2, size, "#080f20", "center");
    drawPixelText(ctx, value, 320, y, size, color, "center");
}
function drawIntroFighter(ctx, role, frame) {
    const guard = frame.guardAmount >= 0.5 && frame.returnAmount < 0.9;
    const relaxed = ceremonySprite(role === "player" ? "player-neutral" : "bot-relaxed");
    const image = frame.guardAmount < 0.5 ? (relaxed || fighterSprite(role)) : (fighterSprite(role, guard ? "block" : "idle") || fighterSprite(role));
    if (!image) return;
    const returning = frame.returnAmount;
    const bounds = FIGHTER_SPRITE_BOUNDS[role];
    const normalScale = Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
    const normalHeight = Math.round(image.naturalHeight * normalScale);
    const normalWidth = Math.round(image.naturalWidth * normalScale);
    const visible = visibleSpriteBounds(image);
    const presentationHeight = 220 * image.naturalHeight / visible.height;
    const height = Math.round(lerp(presentationHeight, normalHeight, returning));
    const width = Math.round(lerp(image.naturalWidth * presentationHeight / image.naturalHeight, normalWidth, returning));
    const prep = frame.scene === "fighters" || frame.scene === "referee-exit";
    const step = prep ? Math.round(Math.sin(frame.time * 3) * 2) : 0;
    const breath = Math.round(Math.sin(frame.time * 3.2) * (1 - returning));
    const center = Math.round(lerp(role === "player" ? 201 + step : 439 - step, 320, returning));
    const floor = Math.round(lerp(326, bounds.top + bounds.height, returning));
    drawFighterShadow(ctx, center, Math.min(358, floor), Math.round(width * 0.33));
    // Use complete detailed frames: slicing a boxing sprite would cut gloves or legs.
    // The guard frame changes the arms; steps and breathing only affect this view.
    const left = Math.round(center - width / 2), top = floor - height + breath + (image.naturalHeight - visible.y - visible.height) * height / image.naturalHeight * (1 - returning);
    ctx.save();
    ctx.globalAlpha = lerp(1, role === "player" ? 0.65 : 1, returning);
    ctx.drawImage(image, left, top, width, height);
    ctx.restore();
}
export function drawMatchIntro(ctx, state, scenery) {
    const frame = introFrame(state);
    if (!frame) return;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(320, 210); ctx.scale(frame.zoom, frame.zoom); ctx.translate(-320, -210);
    drawArenaScene(ctx,scenery,arenaLife.time,0.7);
    drawCameraFlashes(ctx); drawArenaLighting(ctx, 0.75 * (1 - frame.returnAmount));
    if (frame.scene !== "arena") {
        drawIntroFighter(ctx, "bot", frame);
    }
    const departure = Math.max(0, Math.min(1, (frame.time - 11) / 1.4));
    if (frame.refereeVisible) drawReferee(ctx, { x: frame.refereeX,
        floor: Math.round(lerp(326, 268, departure)), height: Math.round(lerp(210, 152, departure)),
        state: frame.time >= 12.4 ? REFEREE_BACKGROUND : '', direction: frame.time > 10.8 ? -1 : 1, time: frame.time, walking: (frame.time > 5 && frame.time < 6.5) || (frame.time > 11 && frame.time < 12.4),
        arms: frame.arms, speaking: frame.speaking, look: Math.sin(frame.time * 2.5) });
    if (frame.scene !== 'arena') drawIntroFighter(ctx, 'player', frame);
    ctx.restore();
    ctx.save();
    const bars = Math.round(lerp(14, 0, frame.returnAmount));
    ctx.fillStyle = "#080d19"; ctx.fillRect(0, 0, 640, bars); ctx.fillRect(0, 360 - bars, 640, bars);
    if (frame.scene === "arena") {
        text(ctx, "BOXING QUIZ ARCADE", 187, 3);
        text(ctx, "NOITE DE CAMPEONATO", 220, 2, "#c8edff");
    } else if (frame.scene === "fighters") {
        text(ctx, "PLAYER", 65, 2, "#8df2d0");
        text(ctx, "VS", 87, 3);
        text(ctx, "RIVAL", 119, 2, "#ffd27e");
    } else if (frame.subtitle) {
        ctx.fillStyle = "#101c30"; ctx.fillRect(64, 312, 512, 31);
        ctx.fillStyle = "#e5c77c"; ctx.fillRect(64, 312, 512, 2);
        text(ctx, frame.subtitle.toUpperCase(), 322, 2);
    } else if (frame.scene === "fight") {
        const fight = frame.time >= 13;
        const age = frame.time - (fight ? 13 : 12.4);
        const scale = fight && age < 0.16 ? 5 : 4;
        text(ctx, fight ? "FIGHT!" : "ROUND 1", 139 - Math.round(Math.max(0, 0.18 - age) * 20), scale);
    }
    ctx.restore();
}







