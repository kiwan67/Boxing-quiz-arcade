import { FIGHTER_PALETTES } from "./fighterPalette.js";

const INK = "#172030";

function block(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawLegs(ctx, palette) {
    block(ctx, INK, 25, 59, 12, 22);
    block(ctx, INK, 43, 59, 12, 22);
    block(ctx, palette.skinShadow, 27, 60, 8, 11);
    block(ctx, palette.skin, 45, 60, 8, 11);
    block(ctx, palette.skinLight, 46, 64, 3, 7);
    block(ctx, "#e1e1d2", 27, 71, 8, 7);
    block(ctx, "#e1e1d2", 45, 71, 8, 7);
    block(ctx, INK, 22, 78, 15, 5);
    block(ctx, INK, 43, 78, 15, 5);
    block(ctx, "#455671", 24, 79, 11, 2);
    block(ctx, "#455671", 45, 79, 11, 2);
}

function drawBoxerBody(ctx, pose, palette) {
    const { skin: SKIN, skinLight: SKIN_LIGHT, skinShadow: SKIN_SHADOW } = palette;
    const y = pose.shoulderOffset;
    ctx.save();
    ctx.translate(pose.torsoX, pose.recoilY);
    block(ctx, INK, 22, 22 + y, 36, 15);
    block(ctx, INK, 25, 35 + y, 30, 15);
    block(ctx, SKIN_SHADOW, 24, 24 + y, 32, 11);
    block(ctx, SKIN, 27, 26 + y, 26, 22);
    block(ctx, SKIN_LIGHT, 27, 24 + y, 11, 8);
    block(ctx, SKIN_LIGHT, 42, 24 + y, 11, 8);
    block(ctx, SKIN, 23, 26 + y, 5, 7);
    block(ctx, SKIN, 52, 26 + y, 5, 7);
    block(ctx, SKIN_SHADOW, 29, 42 + y, 22, 5);
    if (pose.facingDirection === "back") {
        block(ctx, SKIN_SHADOW, 39 + Math.round(pose.torsoTurn * 2), 28 + y, 2, 17);
        block(ctx, SKIN_SHADOW, 28, 34 + y, 5, 5);
        block(ctx, SKIN_SHADOW, 47, 34 + y, 5, 5);
    } else {
        block(ctx, SKIN_SHADOW, 29, 34 + y, 9, 2);
        block(ctx, SKIN_SHADOW, 42, 34 + y, 9, 2);
        block(ctx, SKIN_SHADOW, 39 + Math.round(pose.torsoTurn), 39 + y, 2, 6);
    }
    ctx.restore();
    block(ctx, INK, 24, 47, 32, 18);
    block(ctx, palette.shorts, 26, 49, 28, 14);
    block(ctx, palette.shortsShadow, 26, 59, 28, 4);
    block(ctx, palette.wrap, 26, 48, 28, 4);
    block(ctx, palette.trim, 37, 49, 6, 2);
    block(ctx, palette.trim, 27, 53, 3, 9);
    block(ctx, palette.trim, 50, 53, 3, 9);
    block(ctx, INK, 38, 58, 4, 7);
}

function drawBoxerHead(ctx, pose, palette) {
    const y = pose.shoulderOffset;
    const { skin: SKIN, skinLight: SKIN_LIGHT, skinShadow: SKIN_SHADOW } = palette;
    block(ctx, INK, 34, 17 + y, 12, 9);
    block(ctx, SKIN_SHADOW, 36, 18 + y, 8, 7);
    block(ctx, INK, 29, 3 + y, 22, 17);
    block(ctx, INK, 32, 1 + y, 16, 22);
    block(ctx, SKIN, 31, 7 + y, 18, 11);
    block(ctx, SKIN, 34, 17 + y, 12, 4);
    block(ctx, palette.hair, 31, 3 + y, 18, 6);
    if (pose.facingDirection === "front") {
        block(ctx, palette.hairLight, 33, 2 + y, 10, 2);
        block(ctx, palette.hair, 43, 6 + y, 6, 4);
        block(ctx, SKIN_SHADOW, 30, 12 + y, 3, 5);
        block(ctx, SKIN_SHADOW, 47, 12 + y, 3, 5);
        block(ctx, SKIN_LIGHT, 34, 9 + y, 11, 6);
        block(ctx, INK, 33, 10 + y, 5, 2);
        block(ctx, INK, 42, 10 + y, 5, 2);
        const squint = ["hit", "stunned", "defeat"].includes(pose.animationState);
        block(ctx, squint ? INK : palette.wrap, 35, 12 + y, 2, 1);
        block(ctx, squint ? INK : palette.wrap, 43, 12 + y, 2, 1);
        block(ctx, SKIN_SHADOW, 39, 13 + y, 2, 3);
        block(ctx, INK, 36, 18 + y, 8, squint ? 2 : 1);
        if (pose.animationState === "victory") block(ctx, palette.wrap, 37, 17 + y, 6, 1);
    } else {
        block(ctx, palette.hairLight, 33, 2 + y, 13, 3);
        block(ctx, palette.hairLight, 34, 6 + y, 8, 2);
        block(ctx, palette.hair, 32, 8 + y, 16, 6);
        block(ctx, palette.hair, 35, 14 + y, 10, 2);
        block(ctx, SKIN_SHADOW, 35, 18 + y, 10, 2);
    }
}

function drawBoxerGlove(ctx, x, y, palette) {
    block(ctx, INK, x + 2, y, 12, 18);
    block(ctx, INK, x, y + 3, 17, 11);
    block(ctx, palette.shade, x + 2, y + 3, 13, 11);
    block(ctx, palette.glove, x + 3, y + 2, 10, 11);
    block(ctx, palette.shine, x + 4, y + 3, 7, 3);
    block(ctx, palette.shine, x + 4, y + 6, 3, 2);
    block(ctx, palette.wrap, x + 4, y + 14, 8, 2);
    block(ctx, palette.shade, x + 9, y + 14, 2, 2);
}

function drawArmSegment(ctx, x1, y1, x2, y2, width, color) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let step = 0; step <= steps; step += 1) {
        const x = Math.round(x1 + (x2 - x1) * step / steps);
        const y = Math.round(y1 + (y2 - y1) * step / steps);
        block(ctx, color, x - width / 2, y - width / 2, width, width);
    }
}

function drawBoxerArm(ctx, side, offset, palette, joints) {
    const { skin: SKIN, skinLight: SKIN_LIGHT, skinShadow: SKIN_SHADOW } = palette;
    // Braços independentes: cada lado recebe seu deslocamento de guarda.
    const x = side === "left" ? 15 : 53;
    if (joints) {
        // Mesmas espessuras e comprimentos na guarda e em todas as fases do soco.
        drawArmSegment(ctx, joints.shoulderX, joints.shoulderY, joints.elbowX, joints.elbowY, 12, INK);
        drawArmSegment(ctx, joints.elbowX, joints.elbowY, joints.wristX, joints.wristY, 10, INK);
        drawArmSegment(ctx, joints.shoulderX, joints.shoulderY, joints.elbowX, joints.elbowY, 8, SKIN_SHADOW);
        drawArmSegment(ctx, joints.elbowX, joints.elbowY, joints.wristX, joints.wristY, 6, SKIN);
        drawBoxerGlove(ctx, joints.gloveX, joints.gloveY, palette);
        return;
    }
    block(ctx, INK, x, 25 + offset, 12, 16);
    block(ctx, SKIN_SHADOW, x + 2, 27 + offset, 8, 12);
    block(ctx, INK, x - 3, 18 + offset, 10, 17);
    block(ctx, SKIN, x - 1, 20 + offset, 6, 13);
    block(ctx, SKIN_LIGHT, x, 21 + offset, 2, 8);
    drawBoxerGlove(ctx, x - 6, 10 + offset, palette);
}

function composeBoxer(sprite, pose) {
    const ctx = sprite.ctx;
    const palette = FIGHTER_PALETTES[pose.facingDirection];
    ctx.clearRect(0, 0, sprite.canvas.width, sprite.canvas.height);
    ctx.save();
    ctx.translate(0, sprite.topPadding);
    drawLegs(ctx, palette);
    drawBoxerBody(ctx, pose, palette);
    ctx.save();
    // Na esquiva, cabeça e guarda acompanham o tronco; pés e calção ficam fixos.
    ctx.translate(pose.facingDirection === "front" ? pose.torsoX : 0, pose.recoilY);
    ctx.save();
    ctx.translate(pose.headRecoilX + pose.autoDodgeX, 0);
    drawBoxerHead(ctx, pose, palette);
    ctx.restore();
    const leftJoints = pose.facingDirection === "back" ? pose.leftArmPose
        : pose.counterSide === "right" ? pose.counterArmPose : null;
    const rightJoints = pose.facingDirection === "back" ? pose.rightArmPose
        : pose.counterSide === "left" ? pose.counterArmPose : null;
    drawBoxerArm(ctx, "left", pose.leftArmOffset, palette, leftJoints);
    drawBoxerArm(ctx, "right", pose.rightArmOffset, palette, rightJoints);
    ctx.restore();
    ctx.restore();
}

export function drawBoxer(ctx, sprite, pose, layout) {
    composeBoxer(sprite, pose);
    ctx.save();
    // Alpha aplicado ao sprite inteiro evita sobreposições escuras entre membros.
    ctx.globalAlpha = layout.alpha;
    ctx.drawImage(sprite.canvas, layout.x - 40 * layout.scale,
        layout.y + pose.breathOffset - sprite.topPadding * layout.scale,
        sprite.canvas.width * layout.scale, sprite.canvas.height * layout.scale);
    ctx.restore();
}

