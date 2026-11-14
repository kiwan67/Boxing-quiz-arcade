import { refereeExpression } from './refereeExpressions.js';
// Shared final mark: introduction and combat use exactly the same placement.
export const REFEREE_BACKGROUND = 'REFEREE_BACKGROUND';
export const REFEREE_MARK = Object.freeze({ x: 95, floor: 268, height: 152 });
export function refereeBackgroundFrame(life) {
    const age = life.reaction.age;
    const reaction = age >= 0 && age < 0.75 ? Math.sin(age / 0.75 * Math.PI) * Math.min(1, life.reaction.strength) : 0;
    return { ...REFEREE_MARK, state: REFEREE_BACKGROUND, walking: false, time: life.time, reaction: Math.max(reaction,refereeExpression.intensity*Math.min(1,refereeExpression.remaining*2)) };
}

