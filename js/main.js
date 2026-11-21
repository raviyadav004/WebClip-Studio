import { bootApplication } from "./core/app.js";

function start() {
    try {
        bootApplication();
    } catch (error) {
        console.error("[WebClip Studio] Initialization failed:", error);
        const toastHost = document.getElementById("toasts");
        if (toastHost) {
            const message = document.createElement("p");
            message.className = "toast error";
            message.textContent = "WebClip Studio could not start. Refresh the page or check the browser console.";
            toastHost.append(message);
        }
    }
}

if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
else start();