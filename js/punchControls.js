import { gameState } from "./gameState.js";
import { PUNCH_TYPES } from "./punchTypes.js";
import { selectPunch, isPunchReady, onPunchCooldownChange } from "./punches.js";
import { isMatchOver } from "./match.js";

let boundContainer;
let entries = [];
const blockContextMenu = event => event.preventDefault();
// Uma assinatura por módulo, sem novos listeners ao reiniciar a luta.
onPunchCooldownChange(updatePunchControls);

export function initializePunchControls(container = document.getElementById("punch-controls")) {
    if (!container || typeof container.querySelectorAll !== "function") return;
    if (boundContainer === container) { updatePunchControls(); return; }
    if (boundContainer) boundContainer.removeEventListener("contextmenu", blockContextMenu);
    for (const entry of entries) entry.button.removeEventListener("click", entry.onClick);
    boundContainer = container;
    entries = [];
    for (const button of container.querySelectorAll("[data-punch]")) {
        const type = button.dataset.punch;
        if (!Object.hasOwn(PUNCH_TYPES, type)) continue;
        const entry = {
            button, type,
            name: button.querySelector("[data-name]"),
            damage: button.querySelector("[data-damage]"),
            status: button.querySelector("[data-status]"),
            progress: button.querySelector("[data-progress]")
        };
        entry.onClick = event => {
            event.preventDefault();
            event.stopPropagation();
            if (event.button !== undefined && event.button !== 0) return;
            selectPunch(type);
            updatePunchControls();
        };
        button.addEventListener("click", entry.onClick);
        entries.push(entry);
    }
    container.addEventListener("contextmenu", blockContextMenu);
    updatePunchControls();
}

function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
}

export function updatePunchControls() {
    const disabled = isMatchOver() || gameState.phase === "paused" || gameState.phase === "match_intro";
    for (const entry of entries) {
        const { button, type } = entry;
        const config = PUNCH_TYPES[type];
        const remaining = gameState.punches.cooldowns[type];
        // A mesma consulta usada pelo ataque, sem disponibilidade armazenada no botão.
        const cooling = !isPunchReady(type);
        const selected = gameState.punches.selected === type;
        const turns = `${remaining} ${remaining === 1 ? "TURNO" : "TURNOS"}`;
        setText(entry.name, config.label);
        setText(entry.damage, `${config.damage} HP`);
        setText(entry.status, cooling ? turns : "PRONTO");
        button.disabled = disabled;
        button.classList.toggle("is-selected", selected);
        button.classList.toggle("is-cooling", cooling);
        const pressed = String(selected);
        if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
        const label = `${config.label}, ${config.damage} HP, ${cooling ? `recarga: ${turns.toLowerCase()} ${remaining === 1 ? "restante" : "restantes"}` : "disponível"}`;
        if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
        if (entry.progress) {
            const progress = config.cooldownActions === 0 ? "100%"
                : `${Math.round(100 * Math.max(0, Math.min(1, 1 - remaining / config.cooldownActions)))}%`;
            if (entry.progress.style.width !== progress) entry.progress.style.width = progress;
        }
    }
}
