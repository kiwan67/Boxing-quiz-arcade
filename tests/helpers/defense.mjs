import { gameState } from "../../js/gameState.js";
import { selectDefenseSide, submitDefenseAnswer } from "./defenseApi.mjs";

// Regressões de animação resolvem os novos QTEs sem alterar o relógio do golpe.
export function resolveDefenseForTest() {
    if (gameState.playerCombat.state === "defense_direction_qte") selectDefenseSide(gameState.defense.expectedSide);
    if (gameState.playerCombat.state === "defense_question_qte") {
        const question = gameState.qte.question;
        submitDefenseAnswer(question.correctAnswer, question.id);
    }
}
