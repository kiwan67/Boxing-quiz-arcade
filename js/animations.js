// Contrato visual independente de Canvas, imagens e regras de combate.
// Cada personagem possui seus próprios clipes e velocidade de reprodução.
export function createAnimationClips() {
    return {
        idle: createClip(true),
        punch_left: createClip(false),
        punch_right: createClip(false),
        counter_left: createClip(false),
        counter_right: createClip(false),
        dodge_left: createClip(false),
        dodge_right: createClip(false),
        block_left: createClip(false),
        block_right: createClip(false),
        hit: createClip(false),
        stunned: createClip(true),
        victory: createClip(false),
        defeat: createClip(false)
    };
}

function createClip(loop) {
    return {
        speed: 1,
        loop,
        // Reservados ao futuro renderizador: PNG e recortes {x, y, width, height}.
        spriteSheet: null,
        frames: null,
        framesPerSecond: 12
    };
}

const COMBAT_TO_ANIMATION = Object.freeze({
    idle: "idle",
    action_cooldown: "idle",
    attack_qte: "idle",
    qte_failed: "idle",
    counter_wait: "idle",
    defense_direction_qte: "idle",
    defense_question_qte: "idle",
    punching_left: "punch_left",
    punching_right: "punch_right",
    recovering: "idle"
});

export function animationForCombatState(state) {
    return COMBAT_TO_ANIMATION[state] || "idle";
}

export function animationSpeed(pose, state = pose.animationState) {
    const speed = pose.animationSpeed * pose.animations[state].speed;
    return Number.isFinite(speed) && speed >= 0 ? speed : 1;
}

export function updateAnimation(pose, state, deltaTime, actionTime = null) {
    if (pose.animationState !== state) {
        pose.animationState = state;
        pose.animationTime = 0;
    }
    const speed = animationSpeed(pose);
    // Ações usam o tempo autoritativo do combate, inclusive em quadros lentos.
    // O relógio visual nunca libera ataques ou modifica a duração da recuperação.
    pose.animationTime = actionTime === null
        ? pose.animationTime + deltaTime * speed
        : actionTime * speed;
}
