export const DEFAULT_PUNCH = "straight";
export const PUNCH_ORDER = Object.freeze(["jab", "straight", "hook", "uppercut"]);

// Balanceamento e perfis visuais centralizados. Direto preserva o soco anterior.
function punch(label, damage, cooldownActions, difficulty, timing, path) {
    return Object.freeze({ label, damage, cooldownActions, difficulty, timing: Object.freeze(timing), path: Object.freeze(path) });
}

export const PUNCH_TYPES = Object.freeze({
    jab: punch("JAB", 5, 0, "easy",
        // O avanço é rápido; a recuperação permite concluir a esquiva existente.
        { preparation: 0.04, advance: 0.07, retract: 0.10, recovery: 0.19 },
        { inward: 6, rise: 12, arc: 0, dip: 0 }),
    straight: punch("DIRETO", 10, 2, "normal",
        { preparation: 0.06, advance: 0.10, retract: 0.14, recovery: 0.12 },
        { inward: 10, rise: 18, arc: 0, dip: 0 }),
    hook: punch("GANCHO", 15, 3, "hard",
        { preparation: 0.08, advance: 0.12, retract: 0.16, recovery: 0.14 },
        { inward: 12, rise: 10, arc: 10, dip: 0 }),
    uppercut: punch("UPPERCUT", 25, 5, "very_hard",
        { preparation: 0.10, advance: 0.14, retract: 0.18, recovery: 0.16 },
        { inward: 8, rise: 21, arc: 0, dip: 10 })
});

export function createPunchState() {
    return { selected: DEFAULT_PUNCH, cooldowns: { jab: 0, straight: 0, hook: 0, uppercut: 0 } };
}
