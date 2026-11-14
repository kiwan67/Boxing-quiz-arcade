import { refereeGestureFrame } from './refereeExpressions.js';
import { drawRefereeReaction } from './refereeGestures.js';
import { ceremonySprite } from "./ceremony.js";
import { drawFighterShadow } from "./scenery.js";

export function drawReferee(ctx, { x, floor = 300, height = 184, time = 0, walking = false,
    state = '', reaction = 0, direction = 1, arms = 0, speaking = false, look = 0 }) {
    const walk = ceremonySprite("referee-walk-transparent");
    const moving = walking && walk?.naturalWidth > 0;
    const signal = !moving && state !== "REFEREE_BACKGROUND" && arms > 0.5;
    const image = moving ? walk : (signal ? ceremonySprite("referee-signal") : null) || ceremonySprite("referee-neutral");
    if (!image) return false;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (moving) {
        const sw = image.naturalWidth / 4, sh = image.naturalHeight;
        const width = Math.round(sw * height / sh), frame = Math.floor(time * 8) % 4;
        drawFighterShadow(ctx, x, floor, Math.round(width * 0.28));
        ctx.translate(Math.round(x), Math.round(floor - height * 0.966));
        if (direction < 0) ctx.scale(-1, 1);
        ctx.drawImage(image, frame * sw, 0, sw, sh, -Math.round(width / 2), 0, width, height);
    } else {
        const w = image.naturalWidth, h = image.naturalHeight;
        const width = Math.round(w * height / h);
        const left = Math.round(x - width / 2), top = Math.round(floor - height);
        drawFighterShadow(ctx, x, floor, Math.round(width * 0.4));
        if (state === 'REFEREE_BACKGROUND') {
            // One complete sprite owns head, arms, hands, torso and feet.
            if (!drawRefereeReaction(ctx,refereeGestureFrame(),x,floor,height)) ctx.drawImage(image,left,top,width,height);
            ctx.restore(); return true;
        }
        // Complete pose: no limb crops, rotation, or residual neutral arms.
        ctx.drawImage(image, left, top, width, height);
    }
    ctx.restore(); return true;
}




