import { APP_CONFIG } from "../config.js";
import { createProject, createState, getElements, } from "./state.js";
import { projectDuration, findClip, getClipType, } from "./project.js";
import { clone, formatTime, $, } from "../utils/helpers.js";
import { setupMedia } from "../features/media.js";
import { setupTimeline } from "../features/timeline.js";
import { setupPreview } from "../features/preview.js";
import { setupInspector } from "../features/inspector.js";
import { setupExport } from "../features/export.js";
import { setupTheme } from "../ui/theme.js";
import { setupInterface } from "../ui/interface.js";

export function bootApplication() {
    const state = createState(),
        elements = getElements();
    const ctx = { state, elements, createProject, formatTime };
    ctx.duration = () => projectDuration(state.project);
    ctx.findClip = (id) => findClip(state.project, id);
    ctx.getClipType = (id) => getClipType(state.project, id);

    ctx.toast = (message, type = "info") => {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        const text = document.createElement("p");
        text.textContent = message;
        toast.append(text);
        elements.toasts.append(toast);

        setTimeout(() => {
            toast.classList.add("leaving");
            setTimeout(() => toast.remove(), 240);
        }, 3400);
    };

    ctx.status = () => {
        const status = state.dirty ? "Unsaved changes" : "No unsaved edits";
        const saveStatus = $("#saveStatus");
        if (saveStatus)
            saveStatus.textContent = status;

        const projectName = $("#projectName");
        if (projectName && document.activeElement !== projectName)
            projectName.value = state.project.name;

        const drawerName = $("#drawerProjectName");
        const drawerStatus = $("#drawerProjectStatus");
        if (drawerName)
            drawerName.textContent = state.project.name;

        if (drawerStatus)
            drawerStatus.textContent = status;

        const undoButtons = [ $("#menuUndo"), ...Array.from(document.querySelectorAll('[data-editor-command="undo"]')), ].filter(Boolean);
        const redoButtons = [ $("#menuRedo"), ...Array.from(document.querySelectorAll('[data-editor-command="redo"]')), ].filter(Boolean);
        undoButtons.forEach((button) => {
            button.disabled = !state.history.length;
        });
        redoButtons.forEach((button) => {
            button.disabled = !state.redoStack.length;
        });
    };

    ctx.commit = (label, before, { record = true } = {}) => {
        state.project.updatedAt = new Date().toISOString();
        state.dirty = record || state.dirty;
        if (record) {
            state.history.push({
                label,
                before: clone(before),
                after: clone(state.project),
            });
            if (state.history.length > APP_CONFIG.historyLimit)
                state.history.shift();
            state.redoStack = [];
        }
        ctx.renderAll();
    };

    ctx.undo = () => {
        const item = state.history.pop();
        if (!item)
            return;

        state.redoStack.push(item);
        state.project = clone(item.before);
        state.currentTime = state.project.currentTime || 0;
        state.dirty = true;
        ctx.renderAll();
        ctx.seek(state.currentTime);
        ctx.toast(`Undid: ${item.label}`);
    };

    ctx.redo = () => {
        const item = state.redoStack.pop();
        if (!item)
            return;

        state.history.push(item);
        state.project = clone(item.after);
        state.currentTime = state.project.currentTime || 0;
        state.dirty = true;
        ctx.renderAll();
        ctx.seek(state.currentTime);
        ctx.toast(`Redid: ${item.label}`);
    };

    ctx.confirm = (title, message, label = "Continue") =>
        new Promise((resolve) => {
            state.confirmResolve = resolve;
            $("#confirmTitle").textContent = title;
            $("#confirmMessage").textContent = message;
            $("#confirmYes").textContent = label;
            elements.confirmDialog.showModal();
        });

        ctx.resolveConfirm = (value) => {
        elements.confirmDialog.close();
        state.confirmResolve?.(value);
        state.confirmResolve = null;
    };

    ctx.renderAll = () => {
        ctx.renderMedia();
        ctx.renderTimeline();
        ctx.renderInspector();
        ctx.updateTimes();
        ctx.updatePreviewState();
        ctx.status();
    };

    setupTheme();
    setupPreview(ctx);
    setupTimeline(ctx);
    setupMedia(ctx);
    setupInspector(ctx);
    setupExport(ctx);
    setupInterface(ctx);
    ctx.renderAll();
    ctx.draw(0);

    window.WebClipStudio = Object.freeze({
        get project() {
            return clone(state.project);
        },

        get mediaCount() {
            return state.media.length;
        },

        get duration() {
            return ctx.duration();
        },
        version: "2.1.0",
    });

    console.info("[WebClip Studio] Application initialized.");
    return ctx;
}