// Sprites originais em uma grade de 80 x 84, ampliados em escalas inteiras.
import { gameState } from "./gameState.js";
import { solveArmPose, solveCounterArmPose } from "./armPose.js";
import { createAnimationClips, animationForCombatState, animationSpeed, updateAnimation } from "./animations.js";
import { HIT_REACTION_TIME } from "./match.js";
import { DEFAULT_PUNCH, PUNCH_TYPES } from "./punchTypes.js";
import { AUTO_DODGE_DISTANCE } from "./autoDodge.js";
import { counterRushCinematicFrame } from "./counterRushCutscene.js";
import { drawStun } from "./stunView.js";
import { usesCautiousGuard } from "./difficulty.js";
import { drawBoxer } from "./fighterView.js";
import { drawFighterSprite, FIGHTER_SPRITE_BOUNDS } from "./fighterSprites.js";

export const CHARACTER_LAYOUT = Object.freeze({
    opponent: Object.freeze({ x: 320, y: 110, scale: 2, alpha: 1 }),
    player: Object.freeze({ x: 320, y: 222, scale: 3, alpha: 0.65 })
});

function createPose(facingDirection) {
    return {
        idleTime: 0,
        animationState: "idle",
        punchType: DEFAULT_PUNCH,
        animationTime: 0,
        animationSpeed: 1,
        animations: createAnimationClips(),
        facingDirection,
        leftArmOffset: 0,
        rightArmOffset: 0,
        shoulderOffset: 0,
        breathOffset: 0,
        leftPunchExtension: 0,
        rightPunchExtension: 0,
        torsoTurn: 0,
        torsoX: 0,
        leftArmPose: solveArmPose("left", 0, 0, 0, 0, 0, {}),
        rightArmPose: solveArmPose("right", 0, 0, 0, 0, 0, {}),
        counterSide: null,
        defenseGuardSide: null,
        defenseGuardAmount: 0,
        counterArmPose: {},
        recoilY: 0,
        headRecoilX: 0,
        autoDodgeX: 0,
        cinematicGuardAmount: 0
    };
}

export const characters = {
    opponent: createPose("front"),
    player: createPose("back")
};

export function resetCharacters() {
    Object.assign(characters.player, createPose("back"));
    Object.assign(characters.opponent, createPose("front"));
}

const RESULT_LAYOUT = {
    opponent: { x: 53, y: 150, scale: 1, alpha: 1 },
    player: { x: 587, y: 185, scale: 1, alpha: 1 }
};

let opponentSprite;
let playerSprite;

function createSprite(topPadding = 0) {
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 84 + topPadding;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas dos personagens indisponível.");
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx, topPadding };
}

export function initializeCharacters() {
    if (opponentSprite) return;
    opponentSprite = createSprite();
    // Espaço transparente acima da cabeça para a luva estendida, sem recortes.
    playerSprite = createSprite(24);
}

export function updateCharacters(deltaTime) {
    const combat = gameState.playerCombat;
    const player = characters.player;
    const defending = combat.state === "defense_direction_qte" || combat.state === "defense_question_qte"
        || combat.state === "counter_wait";
    const side = defending ? gameState.defense.selectedSide : null;
    const holdingGuard = side && !gameState.counterAttack.impactResolved;
    if (side) player.defenseGuardSide = side;
    player.defenseGuardAmount = holdingGuard ? Math.min(1, player.defenseGuardAmount + deltaTime / 0.1)
        : Math.max(0, player.defenseGuardAmount - deltaTime / 0.1);
    if (!defending) player.defenseGuardAmount = 0;
    if (player.defenseGuardAmount === 0) player.defenseGuardSide = null;
    const playerHit = gameState.reactions.player.remaining > 0;
    const enemyHit = gameState.reactions.enemy.remaining > 0;
    const autoDodge = gameState.autoDodge;
    const rush = combat.state === "counter_rush_resolution";
    const rushTiming = rush ? PUNCH_TYPES[combat.punchType].timing : null;
    const rushPunching = rush && combat.elapsed < rushTiming.preparation + rushTiming.advance + rushTiming.retract;
    const result = gameState.phase === "victory" || gameState.phase === "defeat" ? gameState.phase : null;
    const playerAnimation = result ?? (gameState.stun.remaining > 0 && gameState.stun.target === "player" ? "stunned"
        : autoDodge.direction ? `dodge_${autoDodge.direction}` : playerHit ? "hit" : player.defenseGuardSide ? `block_${player.defenseGuardSide}`
        : rushPunching ? `punch_${combat.arm}` : animationForCombatState(combat.state));
    const opponent = gameState.opponentCombat;
    const countering = opponent.state.startsWith("counter_");
    const blocking = opponent.state.startsWith("block_");
    const opponentAnimation = result ? (result === "victory" ? "defeat" : "victory")
        : gameState.stun.remaining > 0 && gameState.stun.target === "enemy" ? "stunned"
        : enemyHit ? "hit" : countering ? `counter_${gameState.counterAttack.side}`
        : blocking ? `block_${opponent.blockArm}` : opponent.state === "idle" ? "idle"
        : opponent.direction === "left" ? "dodge_left" : "dodge_right";
    updateAnimation(characters.opponent, opponentAnimation, deltaTime,
        countering || blocking || opponentAnimation.startsWith("dodge_") ? opponent.elapsed : null);
    characters.opponent.torsoX = Math.round(opponent.offset * 8) || 0;
    updateAnimation(characters.player, playerAnimation, deltaTime,
        playerAnimation.startsWith("punch_") ? combat.elapsed : null);
    updatePose(characters.opponent, deltaTime, 0);
    updatePose(characters.player, deltaTime, 0.9);
    const cinematic = counterRushCinematicFrame(gameState);
    player.cinematicGuardAmount = cinematic?.preparation || 0;
    player.leftArmOffset -= Math.round(3 * player.cinematicGuardAmount);
    player.rightArmOffset -= Math.round(3 * player.cinematicGuardAmount);
    player.recoilY = Math.round(2 * gameState.reactions.player.remaining / HIT_REACTION_TIME);
    player.headRecoilX = playerHit ? -1 : 0;
    // Mantém a cabeça dentro da grade original, inclusive no topo da respiração.
    characters.opponent.recoilY = -Math.min(Math.round(2 * gameState.reactions.enemy.remaining / HIT_REACTION_TIME),
        Math.max(0, 1 + characters.opponent.shoulderOffset)) || 0;
    characters.opponent.headRecoilX = enemyHit ? 1 : 0;
    const rival = characters.opponent;
    if (opponent.state === "idle" && gameState.stun.remaining === 0 && usesCautiousGuard()) {
        rival.leftArmOffset -= 2;
        rival.rightArmOffset -= 2;
    }
    if (blocking) {
        // Lado anatômico direito aparece à esquerda da tela.
        const armOffset = opponent.blockArm === "right" ? "leftArmOffset" : "rightArmOffset";
        rival[armOffset] -= Math.round(5 * opponent.blockAmount);
        rival.recoilY = -Math.min(Math.round(opponent.blockAmount), Math.max(0, 1 + rival.shoulderOffset)) || 0;
        rival.headRecoilX = 0;
    }
    rival.counterSide = countering ? gameState.counterAttack.side : null;
    rival.punchType = countering ? gameState.counterAttack.type : DEFAULT_PUNCH;
    rival.counterExtension = countering ? opponent.extension : 0;
    rival.torsoTurn = countering
        ? (rival.counterSide === "right" ? 1 : -1) * (opponent.extension - opponent.preparation * 0.3) : 0;
    if (countering) {
        rival.torsoX = Math.round(rival.torsoTurn * 2) || 0;
        solveCounterArmPose(rival.counterSide, opponent.extension, opponent.preparation,
            rival.counterSide === "right" ? rival.leftArmOffset : rival.rightArmOffset,
            rival.shoulderOffset, rival.counterArmPose, gameState.counterAttack.type);
    }
    characters.player.leftPunchExtension = combat.arm === "left" ? combat.extension : 0;
    characters.player.rightPunchExtension = combat.arm === "right" ? combat.extension : 0;
    const direction = combat.arm === "left" ? 1 : -1;
    player.punchType = combat.arm ? combat.punchType : DEFAULT_PUNCH;
    player.torsoTurn = combat.arm ? direction * (combat.extension - combat.preparation * 0.2) : 0;
    player.torsoX = Math.round(player.torsoTurn * (rush ? 3 : 2)) || 0;
    player.autoDodgeX = autoDodge.direction ? Math.round((autoDodge.direction === "left" ? -1 : 1) * AUTO_DODGE_DISTANCE * autoDodge.amount) : 0;
    player.torsoX += player.autoDodgeX;
    if (autoDodge.direction) { player.defenseGuardAmount = 0; player.defenseGuardSide = null; }
    if (gameState.stun.remaining > 0) {
        const pose = gameState.stun.target === "player" ? player : rival;
        const sway = Math.round(Math.sin(gameState.stun.elapsed * 5) * 2);
        pose.torsoX += sway;
        pose.headRecoilX = sway;
        pose.leftArmOffset += 4;
        pose.rightArmOffset += 4;
        pose.defenseGuardAmount = 0;
        pose.defenseGuardSide = null;
    }
    if (result) {
        applyResultPose(player);
        applyResultPose(rival);
    }
    solveArmPose("left", player.leftPunchExtension, combat.arm === "left" ? combat.preparation : 0,
        player.leftArmOffset, player.shoulderOffset, player.torsoX, player.leftArmPose, player.punchType);
    solveArmPose("right", player.rightPunchExtension, combat.arm === "right" ? combat.preparation : 0,
        player.rightArmOffset, player.shoulderOffset, player.torsoX, player.rightArmPose, player.punchType);
    if (player.defenseGuardSide) {
        const left = player.defenseGuardSide === "left";
        solveArmPose(player.defenseGuardSide, 0, 0,
            (left ? player.leftArmOffset : player.rightArmOffset) - Math.round(3 * player.defenseGuardAmount),
            player.shoulderOffset, player.torsoX + (left ? -1 : 1) * Math.round(player.defenseGuardAmount),
            left ? player.leftArmPose : player.rightArmPose);
    }
}

function applyResultPose(pose) {
    const progress = Math.min(1, pose.animationTime / 0.45);
    const ease = progress * progress * (3 - 2 * progress);
    const celebrating = pose.animationState === "victory";
    const armShift = Math.round((celebrating ? -9 : 7) * ease);
    pose.leftArmOffset += armShift;
    pose.rightArmOffset += armShift;
    pose.shoulderOffset += Math.round((celebrating ? -1 : 5) * ease);
    pose.recoilY = 0;
    pose.headRecoilX = celebrating ? 0 : Math.round(2 * ease);
    pose.torsoX = 0;
    pose.defenseGuardSide = null;
}

function updatePose(pose, deltaTime, phase) {
    pose.idleTime += deltaTime * animationSpeed(pose, "idle");
    const cycle = pose.idleTime * Math.PI * 0.85 + phase;
    pose.breathOffset = Math.round(Math.sin(cycle) * 1.5);
    pose.shoulderOffset = Math.round(Math.sin(cycle) * 0.75);
    pose.leftArmOffset = Math.round(Math.sin(cycle + 0.35));
    pose.rightArmOffset = Math.round(Math.sin(cycle - 0.35));
}

function drawFighter(ctx, character, role, stunTarget, fallback) {
    const pose = characters[character];
    const result = pose.animationState === "victory" || pose.animationState === "defeat";
    const layout = result ? RESULT_LAYOUT[character] : CHARACTER_LAYOUT[character];
    const drawn = drawFighterSprite(ctx, role, pose, layout);
    if (!drawn) drawBoxer(ctx, fallback, pose, layout);
    if (gameState.stun.target === stunTarget) {
        const stunLayout = drawn && !result ? { ...layout, y: FIGHTER_SPRITE_BOUNDS[role].top } : layout;
        drawStun(ctx, pose, stunLayout, gameState.stun);
    }
}

export function drawOpponent(ctx) {
    drawFighter(ctx, "opponent", "bot", "enemy", opponentSprite);
}

export function drawPlayer(ctx) {
    drawFighter(ctx, "player", "player", "player", playerSprite);
}
