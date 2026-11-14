import { restartFight, finishPlayerCooldown, expectIdleAfterCooldown } from "./helpers/fight.mjs";
beforeEach(restartFight);
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { ARM_LENGTHS, solveArmPose } from "../js/armPose.js";
import { gameState } from "../js/gameState.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestAttack } from './helpers/fight.mjs';
import { characters, updateCharacters } from "../js/characters.js";

function requestPunch(arm) {
    if (!requestAttack(arm)) return false;
    return submitAttackAnswer(gameState.qte.question.correctAnswer, gameState.qte.question.id);
}

test("segmentos mantêm comprimento; luva acompanha punho sem deformação", () => {
    for (const side of ["left", "right"]) {
        const joints = {};
        for (let step = 0; step <= 100; step++) {
            for (const preparation of [0, 0.5, 1]) {
                solveArmPose(side, step / 100, preparation, 1, -1, 2, joints);
                assert.ok(Math.abs(Math.hypot(joints.elbowX - joints.shoulderX,
                    joints.elbowY - joints.shoulderY) - ARM_LENGTHS.upper) < 1e-9);
                assert.ok(Math.abs(Math.hypot(joints.wristX - joints.elbowX,
                    joints.wristY - joints.elbowY) - ARM_LENGTHS.forearm) < 1e-9);
                assert.ok(Math.abs(joints.gloveX + 8 - joints.wristX) <= 0.5);
                assert.ok(Math.abs(joints.gloveY + 16 - joints.wristY) <= 0.5);
                assert.ok(Math.hypot(joints.wristX - joints.shoulderX,
                    joints.wristY - joints.shoulderY) < ARM_LENGTHS.upper + ARM_LENGTHS.forearm);
            }
        }
    }
});

test("preparação, avanço, torção discreta, guarda e recuperação de 0,42 s", () => {
    for (const arm of ["left", "right"]) {
        requestPunch(arm);
        updateCombat(0.03); updateCharacters(0.03);
        assert.equal(gameState.playerCombat.extension, 0);
        assert.ok(gameState.playerCombat.preparation > 0);
        updateCombat(0.03); updateCharacters(0.03);
        assert.equal(gameState.playerCombat.extension, 0);
        updateCombat(0.1); updateCharacters(0.1);
        assert.equal(gameState.playerCombat.extension, 1);
        assert.equal(characters.player.torsoX, arm === "left" ? 2 : -2);
        assert.equal(characters.player[arm === "left" ? "rightPunchExtension" : "leftPunchExtension"], 0);
        assert.equal(requestPunch(arm), false);
        updateCombat(0.14); updateCharacters(0.14);
        assert.equal(gameState.playerCombat.state, "recovering");
        assert.equal(characters.player.torsoX, 0);
        assert.equal(requestPunch(arm), false);
        updateCombat(0.12); updateCharacters(0.12);
        expectIdleAfterCooldown();
        assert.equal(characters.player.leftPunchExtension, 0);
        assert.equal(characters.player.rightPunchExtension, 0);
    }
});
