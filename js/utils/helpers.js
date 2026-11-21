export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
export const uid = (prefix = "item") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const clone = (value) => structuredClone(value);

export const formatTime = (value) => {
    const tenths = Math.round( Math.max(0, Number(value) || 0) * 10 );

    return `${String(Math.floor(tenths / 600)).padStart(2, "0")}:${((tenths % 600) / 10).toFixed(1).padStart(4, "0")}`;
};

export const safeName = (value, fallback = "webclip-export") =>
    String(value || "")
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80) || fallback;

export const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[char]));

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

export const waitFor = (eventTarget, eventName, timeout = 700) =>
    Promise.race([
        new Promise((resolve) => eventTarget.addEventListener(eventName, resolve, { once: true }) ),
        new Promise((resolve) => setTimeout(resolve, timeout) ),
    ]);