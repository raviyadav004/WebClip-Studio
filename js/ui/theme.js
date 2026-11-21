import { $$ } from "../utils/helpers.js";
import { APP_CONFIG } from "../config.js";

export function setupTheme() {
    function applyTheme(theme) {
        const safeTheme = theme === "dark" ? "dark" : "light";
        const isDark = safeTheme === "dark";
        document.body.dataset.theme = safeTheme;

        try {
            localStorage.setItem(APP_CONFIG.themeKey, safeTheme);
        } catch {
            // The active theme still works for this session when storage is unavailable.
        }

        $$(".theme-toggle").forEach((button) => {
            button.setAttribute("aria-pressed", String(isDark));
            button.setAttribute( "aria-label", isDark ? "Dark theme active. Switch to light theme" : "Light theme active. Switch to dark theme" );
            button.title = isDark ? "Switch to light theme" : "Switch to dark theme";
        });

        document.querySelector('meta[name="theme-color"]')?.setAttribute( "content", isDark ? "#201b2b" : "#f7f5fc" );
    }

    function initializeTheme() {
        let savedTheme = null;
        try {
            savedTheme = localStorage.getItem(APP_CONFIG.themeKey);
        } catch {
            // Fall back to the operating-system preference.
        }

        const preferredTheme = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
        const initialTheme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : preferredTheme;
        applyTheme(initialTheme);
    }

    $$(".theme-toggle").forEach((button) => {
        button.addEventListener("click", () => {
            const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
            applyTheme(nextTheme);
        });
    });

    initializeTheme();
    return { applyTheme };
}