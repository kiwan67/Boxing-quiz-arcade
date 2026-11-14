import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import { restartFight, finishPlayerCooldown, expectIdleAfterCooldown } from "./helpers/fight.mjs";
beforeEach(restartFight);
import assert from "node:assert/strict";
import { test, mock, beforeEach } from "node:test";
mock.method(Math, "random", () => 0.99);
import { characters, updateCharacters } from "../js/characters.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestAttack } from './helpers/fight.mjs';
import { gameState } from "../js/gameState.js";
import { applyImpactDamage } from "../js/match.js";

function requestPunch(arm) {
    if (!requestAttack(arm)) return false;
    return submitAttackAnswer(gameState.qte.question.correctAnswer, gameState.qte.question.id);
}

test("contrato visual separado preserva combate e permite velocidades por personagem e clipe", () => {
    const { player, opponent } = characters;
    assert.deepEqual(Object.keys(player.animations), [
        "idle", "punch_left", "punch_right", "counter_left", "counter_right", "dodge_left", "dodge_right", "block_left", "block_right", "hit",
        "stunned", "victory", "defeat"
    ]);
    assert.notEqual(player.animations, opponent.animations);
    assert.notEqual(player.animations.idle, opponent.animations.idle);
    for (const clip of Object.values(player.animations)) {
        assert.equal(clip.spriteSheet, null);
        assert.equal(clip.frames, null);
    }
    updateCharacters(0.1);
    assert.equal(player.idleTime, 0.1);
    player.animationSpeed = 2;
    player.animations.idle.speed = 0.5;
    updateCharacters(0.1);
    assert.equal(player.idleTime, 0.2);
    assert.equal(opponent.idleTime, 0.2);
    player.animations.punch_left.speed = 1.5;
    requestPunch("left");
    updateCombat(0.16);
    updateCharacters(0.16);
    assert.equal(player.animationState, "punch_left");
    assert.equal(player.animationTime, 0.48);
    assert.equal(player.leftPunchExtension, 1);
    assert.equal(player.rightPunchExtension, 0);
    assert.equal(gameState.playerCombat.state, "punching_left");
    updateCombat(0.14);
    updateCharacters(0.14);
    assert.equal(player.animationState, "idle");
    assert.equal(gameState.playerCombat.state, "recovering");
    assert.equal(requestPunch("right"), false);
    updateCombat(0.12);
    expectIdleAfterCooldown();
    requestPunch("right");
    updateCombat(0.11);
    updateCharacters(0.11);
    assert.equal(player.animationState, "punch_right");
    assert.equal(player.leftPunchExtension, 0);
    assert.ok(player.rightPunchExtension > 0);
    assert.equal(opponent.animationState, "idle");
    assert.equal(opponent.animationSpeed, 1);
    updateCombat(1);
    updateCharacters(0);
    assert.equal(player.animationState, "idle");
});

test("vitória e derrota elevam ou baixam a guarda usando o resultado real", () => {
    for (const [target, playerState, opponentState] of [
        ["enemy", "victory", "defeat"],
        ["player", "defeat", "victory"]
    ]) {
        restartFight();
        applyImpactDamage(target, 100, "result-pose");
        updateKnockout(gameState,KO_DURATION);
        const before = JSON.stringify(gameState);
        updateCharacters(0);
        updateCharacters(0.45);
        assert.equal(characters.player.animationState, playerState);
        assert.equal(characters.opponent.animationState, opponentState);
        const winner = playerState === "victory" ? characters.player : characters.opponent;
        const loser = playerState === "defeat" ? characters.player : characters.opponent;
        assert.ok(winner.leftArmOffset < -6 && winner.rightArmOffset < -6);
        assert.ok(loser.shoulderOffset >= 4);
        assert.equal(JSON.stringify(gameState), before);
    }
});

