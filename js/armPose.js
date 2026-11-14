// Geometria visual, sem dependência de combate, Canvas ou escalonamento.
import { PUNCH_TYPES, DEFAULT_PUNCH } from "./punchTypes.js";

export const ARM_LENGTHS = Object.freeze({ upper: 12, forearm: 14 });

// Adversário de frente: lado anatômico esquerdo = lado direito da imagem.
export function solveCounterArmPose(anatomicalSide, extension, preparation, offset, shoulderOffset, out, type = "straight") {
    const screenLeft = anatomicalSide === "right";
    const direction = screenLeft ? 1 : -1;
    const x = screenLeft ? 15 : 53;
    const reach = Math.max(0, Math.min(1, extension));
    out.shoulderX = x + 6;
    out.shoulderY = 29 + offset + shoulderOffset + reach - preparation;
    // O punho avança para baixo na imagem, em direção à câmera, sem crescer.
    const inward = type === "hook" ? 13 : 6;
    const advance = type === "jab" ? 11 : type === "uppercut" ? 19 - 12 * reach : 15;
    let dx = x + 2 + direction * inward * reach - out.shoulderX;
    let dy = 26 + offset + advance * reach - 2 * preparation - out.shoulderY;
    const rawDistance = Math.hypot(dx, dy);
    const distance = Math.max(Math.abs(ARM_LENGTHS.upper - ARM_LENGTHS.forearm) + 0.01,
        Math.min(ARM_LENGTHS.upper + ARM_LENGTHS.forearm - 0.01, rawDistance));
    dx *= distance / rawDistance;
    dy *= distance / rawDistance;
    out.wristX = out.shoulderX + dx;
    out.wristY = out.shoulderY + dy;
    const along = (ARM_LENGTHS.upper ** 2 - ARM_LENGTHS.forearm ** 2 + distance ** 2) / (2 * distance);
    const perpendicular = Math.sqrt(Math.max(0, ARM_LENGTHS.upper ** 2 - along ** 2));
    out.elbowX = out.shoulderX + along * dx / distance + direction * dy * perpendicular / distance;
    out.elbowY = out.shoulderY + along * dy / distance - direction * dx * perpendicular / distance;
    out.gloveX = Math.round(out.wristX - 8);
    out.gloveY = Math.round(out.wristY - 16);
    return out;
}

// Reutiliza o objeto de saída. A cinemática inversa conserva ambos os segmentos.
export function solveArmPose(side, extension, preparation, offset, shoulderOffset, torsoX, out, punchType = DEFAULT_PUNCH) {
    const direction = side === "left" ? 1 : -1;
    const reach = Math.max(0, Math.min(1, extension));
    const path = PUNCH_TYPES[punchType].path;
    out.shoulderX = (side === "left" ? 21 : 59) + torsoX;
    out.shoulderY = 29 + offset + shoulderOffset - 2 * reach + preparation;
    // Movimento curto para dentro e para o fundo; o punho não procura o rival.
    const arc = Math.sin(Math.PI * reach);
    const targetX = out.shoulderX + direction * (-4 + path.inward * reach - path.arc * arc - preparation);
    const targetY = out.shoulderY - 3 - path.rise * reach + path.dip * arc + 2 * preparation;
    let dx = targetX - out.shoulderX;
    let dy = targetY - out.shoulderY;
    const rawDistance = Math.hypot(dx, dy);
    const distance = Math.max(Math.abs(ARM_LENGTHS.upper - ARM_LENGTHS.forearm) + 0.01,
        Math.min(ARM_LENGTHS.upper + ARM_LENGTHS.forearm - 0.01, rawDistance));
    dx *= distance / rawDistance;
    dy *= distance / rawDistance;
    out.wristX = out.shoulderX + dx;
    out.wristY = out.shoulderY + dy;
    const along = (ARM_LENGTHS.upper ** 2 - ARM_LENGTHS.forearm ** 2 + distance ** 2) / (2 * distance);
    const perpendicular = Math.sqrt(Math.max(0, ARM_LENGTHS.upper ** 2 - along ** 2));
    // Cotovelo sempre para fora da silhueta, sem inverter a articulação.
    out.elbowX = out.shoulderX + along * dx / distance + direction * dy * perpendicular / distance;
    out.elbowY = out.shoulderY + along * dy / distance - direction * dx * perpendicular / distance;
    out.gloveX = Math.round(out.wristX - 8);
    out.gloveY = Math.round(out.wristY - 16);
    return out;
}
