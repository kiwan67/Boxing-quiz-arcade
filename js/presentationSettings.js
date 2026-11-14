const defaults = { masterVolume: 1, musicVolume: .5, muted: false, flashes: "normal", impactFlash: "normal", reducedShake: false, shake: "normal", effectsVolume: 0.7, ambienceVolume: 0.35, voiceVolume: 0.9 };
export const presentationSettings = { ...defaults };
const listeners = new Set();
export function onPresentationSetting(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function setPresentationSetting(key, value, persist = true) {
    if (!Object.hasOwn(defaults, key)) return false;
    if (key === "flashes" || key === "impactFlash" || key === "shake") { if (!["normal", "reduced", "off"].includes(value)) return false; }
    else if (key === "reducedShake" || key === "muted") value = Boolean(value);
    else { value = Number(value); if (!Number.isFinite(value)) return false; value = Math.max(0, Math.min(1, value)); }
    presentationSettings[key] = value;
    if (persist) {
        try { if (typeof window !== "undefined") window.localStorage?.setItem("boxing-arena-settings", JSON.stringify(presentationSettings)); } catch {}
        for (const listener of listeners) listener(key, value);
    }
    return true;
}
try {
    const saved = JSON.parse(typeof window !== "undefined" ? window.localStorage?.getItem("boxing-arena-settings") || "null" : "null");
    if (saved) for (const key of Object.keys(defaults)) setPresentationSetting(key, saved[key], false);
} catch { /* Storage is optional. */ }
let settingsRoot;
export function initializePresentationSettings(doc = document) {
    const root = doc.getElementById("arena-settings");
    if (!root?.querySelectorAll || settingsRoot === root) return;
    settingsRoot = root;
    for (const control of root.querySelectorAll("[data-arena-setting]")) {
        const key = control.dataset.arenaSetting;
        if (control.type === "checkbox") control.checked = presentationSettings[key];
        else control.value = String(presentationSettings[key]);
        control.addEventListener("input", () => setPresentationSetting(key, control.type === "checkbox" ? control.checked : control.value));
    }
}



