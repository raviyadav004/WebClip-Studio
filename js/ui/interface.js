import { $, $$, downloadBlob, safeName } from "../utils/helpers.js";
import { serializeProject, validateProject } from "../core/project.js";

export function setupInterface(ctx) {
    const { state, elements } = ctx;
    let activeMobileSheet = null;
    const syncPanelAccessibility = () => {
        const mobile = window.matchMedia("(max-width: 760px)").matches;

        elements.editor.querySelectorAll(".media-panel, .inspector-panel").forEach((panel) => {
                const openSheet = panel === activeMobileSheet && panel.classList.contains("mobile-sheet-open");
                if (mobile && !openSheet) {
                    panel.setAttribute("aria-hidden", "true");
                    panel.inert = true;
                } else {
                    panel.removeAttribute("aria-hidden");
                    panel.inert = false;
                }
            });
    };

    function show(screen, { syncUrl = true } = {}) {
        const nextScreen = screen === "editor" ? "editor" : "welcome";
        elements.welcome.classList.toggle( "hidden", nextScreen !== "welcome" );
        elements.editor.classList.toggle( "hidden", nextScreen !== "editor" );
        if (nextScreen === "editor") {
            syncPanelAccessibility();
        }

        if (nextScreen !== "editor") {
            elements.editor.classList.remove("focus-mode");
            const activeSheet = activeMobileSheet || elements.editor.querySelector(".mobile-sheet-open");
            if (activeSheet) {
                activeSheet.classList.remove("mobile-sheet-open");
                activeSheet.removeAttribute("role");
                activeSheet.removeAttribute("aria-modal");
                activeSheet.removeAttribute("aria-hidden");
                activeSheet.inert = false;
            }

            activeMobileSheet = null;
            const sheetBackdrop = $("#mobileSheetBackdrop");
            if (sheetBackdrop) {
                sheetBackdrop.hidden = true;
            }

            document.body.classList.remove("mobile-sheet-visible");
            const drawer = $("#editorDrawer");
            if (drawer?.classList.contains("open")) {
                drawer.classList.remove("open");
                drawer.setAttribute("aria-hidden", "true");
                drawer.inert = true;

                $("#editorDrawerBackdrop").hidden = true;
                $("#editorMenuToggle").setAttribute( "aria-expanded", "false" );
                document.body.classList.remove("editor-drawer-open");
            }
        }

        if (syncUrl) {
            const nextUrl = new URL(window.location.href);
            if (nextScreen === "editor") {
                nextUrl.hash = "editor";
            } else if (nextUrl.hash === "#editor") {
                nextUrl.hash = "";
            }
            window.history.replaceState( { ...window.history.state, webclipScreen: nextScreen }, "", nextUrl );
        }

        window.scrollTo(0, 0);
        if (nextScreen === "editor") {
            ctx.renderAll();
            ctx.draw(state.currentTime);
        }
    }

    function saveProjectFile() {
        const payload = {
            app: "WebClip Studio",
            version: 2,
            savedAt: new Date().toISOString(),
            project: serializeProject(state.project),
            media: state.media.map((item) => ({
                id: item.id,
                name: item.name,
                type: item.type,
                size: item.file.size,
                lastModified: item.file.lastModified
            }))
        };

        const blob = new Blob( [JSON.stringify(payload, null, 2)], { type: "application/json" } );
        downloadBlob( blob, `${safeName($("#saveName").value, "webclip-project")}.webclip.json` );
        state.dirty = false;
        ctx.status();
        elements.saveDialog.close();
        ctx.toast( "Project file saved. Re-import the source media when reopening it.", "success" );
    }

    async function openProjectFile(file) {
        try {
            const data = JSON.parse(await file.text());
            const project = data.project || data;
            if (!validateProject(project)) {
                throw new Error( "This file is not a valid WebClip project." );
            }

            ctx.pause();
            state.project = {
                ...ctx.createProject(project.name || "Imported project"),
                ...project,
                selected: null,
                currentTime: 0
            };

            state.currentTime = 0;
            state.history = [];
            state.redoStack = [];
            state.dirty = false;
            state.pendingMediaRefs = (data.media || []).map( (item) => ({ ...item }) );
            ctx.renderAll();
            show("editor");

            if (state.pendingMediaRefs.length) {
                ctx.toast( "Project opened. Re-import source media to reconnect the timeline.", "success" );
            } else {
                ctx.toast( "Project opened successfully.", "success" );
            }
        } catch (error) {
            ctx.toast( error.message || "Could not open this project file.", "error" );
        }
    }

    function reconnectMedia(item) {
        const index = state.pendingMediaRefs.findIndex( (ref) =>
                ref.name === item.name &&
                ref.type === item.type &&
                (!ref.size || ref.size === item.file.size)
        );

        if (index < 0) {
            return;
        }

        const ref = state.pendingMediaRefs.splice(index, 1)[0];
        state.project.clips.forEach((clip) => {
            if (clip.media === ref.id) {
                clip.media = item.id;
            }
        });

        state.project.audios.forEach((clip) => {
            if (clip.media === ref.id) {
                clip.media = item.id;
            }
        });

        ctx.renderAll();
        ctx.toast( `Reconnected source media: ${item.name}`, "success" );
    }

    function resetProject() {
        state.media.forEach((item) => {
            ctx.disposeMedia(item.id);
            URL.revokeObjectURL(item.url);
        });

        state.media = [];
        state.project = ctx.createProject();
        state.history = [];
        state.redoStack = [];

        state.currentTime = 0;
        state.dirty = false;
        ctx.renderAll();
        show("editor");
    }

    function setupEvents() {
        $("#footerYear").textContent = String(new Date().getFullYear());
        $("#editorFooterYear").textContent = String(new Date().getFullYear());
        const start = () => {
            show("editor");

            if (!state.media.length) {
                setTimeout( () => elements.videoInput.click(), 120 );
            }
        };

        [ "#start", "#startTop", "#startBottom", "#footerStart" ].forEach((selector) => {
            $(selector)?.addEventListener("click", start);
        });

        $$(".footer-editor-link").forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();

                if (link.closest(".editor-footer-skin")) {
                    const action = link.textContent.trim().toLowerCase();

                    if (action.includes("import")) {
                        elements.videoInput.click();
                    } else if (action.includes("edit and export")) {
                        document.querySelector(".timeline-panel")?.scrollIntoView({
                                behavior: "smooth",
                                block: "center"
                            });
                    } else {
                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });
                    }
                    return;
                }
                start();
            });
        });

        $("#home").addEventListener("click", (event) => {
            event.preventDefault();
            closeMobileSheet();
            show("welcome");
        });

        $("#editorFooterHome")?.addEventListener("click", (event) => {
            event.preventDefault();
            closeMobileSheet();
            show("welcome");
        });

        const landingNav = $(".landing-nav");
        const mobileMenu = $("#mobileMenu");
        const closeLandingNav = () => {
            landingNav.classList.remove("open");
            mobileMenu.setAttribute( "aria-expanded", "false" );
        };

        mobileMenu.addEventListener("click", (event) => {
            event.stopPropagation();
            const isOpen = landingNav.classList.toggle("open");
            mobileMenu.setAttribute( "aria-expanded", String(isOpen) );
        });

        landingNav.addEventListener("click", (event) => {
            if (event.target.closest("a")) {
                closeLandingNav();
            }
        });

        document.addEventListener("click", (event) => {
            if (!landingNav.classList.contains("open")) {
                return;
            }

            if ( !landingNav.contains(event.target) && !mobileMenu.contains(event.target) ) {
                closeLandingNav();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeLandingNav();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 760) {
                closeLandingNav();
            }
        });

        $("#saveProject").addEventListener("click", () => {
            $("#saveName").value = safeName( state.project.name, "webclip-project" );
            elements.saveDialog.showModal();
        });

        $("#cancelSave").addEventListener( "click", () => elements.saveDialog.close() );
        $("#downloadProject").addEventListener( "click", saveProjectFile );
        $("#openProject").addEventListener("click", () => {
            $("#projectInput").click();
        });

        $("#projectInput").addEventListener( "change", async (event) => {
                if (event.target.files[0]) {
                    await openProjectFile(event.target.files[0]);
                }
                event.target.value = "";
            }
        );

        $("#projectName").addEventListener("change", (event) => {
            state.project.name = event.target.value.trim().slice(0, 80) || "Untitled project";
            state.dirty = true;
            ctx.status();
        });

        const drawer = $("#editorDrawer");
        const drawerBackdrop = $("#editorDrawerBackdrop");
        const drawerToggle = $("#editorMenuToggle");
        const drawerClose = $(".editor-drawer-close");

        const closeEditorDrawer = ({ restoreFocus = false } = {}) => {
            drawer.classList.remove("open");
            drawer.setAttribute("aria-hidden", "true");
            drawer.inert = true;
            drawerBackdrop.hidden = true;
            drawerToggle.setAttribute( "aria-expanded", "false" );
            document.body.classList.remove("editor-drawer-open");
            if (restoreFocus) {
                drawerToggle.focus();
            }
        };

        const openEditorDrawer = () => {
            closeMobileSheet();
            drawerBackdrop.hidden = false;
            drawer.inert = false;
            drawer.setAttribute("aria-hidden", "false");
            requestAnimationFrame(() => {
                drawer.classList.add("open");
            });

            drawerToggle.setAttribute( "aria-expanded", "true" );
            document.body.classList.add("editor-drawer-open");
            drawerClose.focus();
        };

        drawerToggle.addEventListener("click", () => {
            if (drawer.classList.contains("open")) {
                closeEditorDrawer();
            } else {
                openEditorDrawer();
            }
        });

        $(".drawer-brand").addEventListener("click", (event) => {
            event.preventDefault();
            closeMobileSheet();
            closeEditorDrawer();
            show("welcome");
        });

        document.querySelectorAll(".panel-collapse-toggle").forEach((button) => {
                button.addEventListener("click", () => {
                    const panel = button.closest(".panel");
                    const collapsed = panel.classList.toggle("is-collapsed");
                    button.setAttribute( "aria-expanded", String(!collapsed) );
                    button.setAttribute( "aria-label", `${collapsed ? "Expand" : "Collapse"} ${panel.classList.contains("media-panel") ? "media library" : "inspector"}` );
                });
            });

        const mobileSheetBackdrop = document.createElement("div");
        mobileSheetBackdrop.id = "mobileSheetBackdrop";
        mobileSheetBackdrop.className = "mobile-sheet-backdrop";
        mobileSheetBackdrop.hidden = true;

        elements.editor.append(mobileSheetBackdrop);
        const isMobileEditor = () => window.matchMedia("(max-width: 760px)").matches;
        const closeMobileSheet = ({ restoreFocus = false } = {}) => {
            if (!activeMobileSheet) {
                return;
            }

            const panel = activeMobileSheet;
            panel.classList.remove("mobile-sheet-open");
            panel.removeAttribute("role");
            panel.removeAttribute("aria-modal");
            panel.removeAttribute("aria-label");
            if (isMobileEditor()) {
                panel.setAttribute("aria-hidden", "true");
                panel.inert = true;
            } else {
                panel.removeAttribute("aria-hidden");
                panel.inert = false;
            }

            mobileSheetBackdrop.hidden = true;
            activeMobileSheet = null;
            document.body.classList.remove("mobile-sheet-visible");
            if (restoreFocus) {
                drawerToggle.focus();
            }
        };

        const openMobileSheet = (kind) => {
            if ( !isMobileEditor() || elements.editor.classList.contains("focus-mode") ) {
                return;
            }

            closeMobileSheet();
            const panel = document.querySelector( kind === "media" ? ".media-panel" : ".inspector-panel" );
            if (!panel) {
                return;
            }

            panel.classList.remove("is-collapsed");
            panel.classList.add("mobile-sheet-open");
            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-modal", "true");
            panel.setAttribute( "aria-label", kind === "media" ? "Media library" : "Clip inspector" );

            panel.setAttribute("aria-hidden", "false");
            panel.inert = false;
            mobileSheetBackdrop.hidden = false;
            activeMobileSheet = panel;
            document.body.classList.add("mobile-sheet-visible");
            panel.querySelector(".mobile-sheet-close")?.focus();
        };

        const applyCompactPanelState = () => {
            const compact = isMobileEditor();
            if (!compact) {
                document.querySelectorAll(".media-panel, .inspector-panel").forEach((panel) => {
                        panel.classList.remove( "mobile-sheet-open", "is-collapsed" );
                        panel.removeAttribute("aria-modal");
                        panel.removeAttribute("role");
                        delete panel.dataset.mobileInitialized;
                    });

                if (activeMobileSheet) {
                    closeMobileSheet();
                }
            }
            syncPanelAccessibility();
        };

        const syncResponsiveEditor = () => {
            applyCompactPanelState();
            if ( !isMobileEditor() && drawer.classList.contains("open") ) {
                closeEditorDrawer();
            }
        };

        syncResponsiveEditor();
        const editorBreakpoint = window.matchMedia( "(max-width: 760px)" );
        if (typeof editorBreakpoint.addEventListener === "function") {
            editorBreakpoint.addEventListener( "change", syncResponsiveEditor );
        } else {
            window.addEventListener( "resize", syncResponsiveEditor, { passive: true } );
        }

        document.querySelectorAll(".mobile-sheet-close").forEach((button) => {
                button.addEventListener("click", () => { closeMobileSheet({ restoreFocus: true }); });
            });

        mobileSheetBackdrop.addEventListener("click", () => {
            closeMobileSheet({ restoreFocus: true });
        });

        const mediaBadge = $("#mediaCountBadge");
        const mediaCountObserver = new MutationObserver(() => {
            if (mediaBadge) {
                mediaBadge.textContent = `${$("#mediaCount").textContent.trim()} items`;
            }
        });

        mediaCountObserver.observe($("#mediaCount"), {
            childList: true,
            characterData: true,
            subtree: true
        });

        if (mediaBadge) {
            mediaBadge.textContent = `${$("#mediaCount").textContent.trim()} items`;
        }

        drawerClose.addEventListener("click", () => {
            closeEditorDrawer({ restoreFocus: true });
        });

        drawerBackdrop.addEventListener("click", () => {
            closeEditorDrawer({ restoreFocus: true });
        });

        const runEditorCommand = async (command) => {
            switch (command) {
                case "new-project":
                    if (
                        (state.dirty || state.media.length) &&
                        !await ctx.confirm(
                            "Start a new project?",
                            "Current edits and imported media will be cleared.",
                            "Start new project"
                        )
                    ) {
                        return;
                    }

                    resetProject();
                    break;

                case "import-media":
                    elements.videoInput.click();
                    break;

                case "import-audio":
                    elements.audioInput.click();
                    break;

                case "add-text":
                    $("#addText").click();
                    break;

                case "open-project":
                    $("#openProject").click();
                    break;

                case "save-project":
                    $("#saveProject").click();
                    break;

                case "export-project":
                    $("#export").click();
                    break;

                case "undo":
                    ctx.undo();
                    break;

                case "redo":
                    ctx.redo();
                    break;

                case "duplicate":
                    ctx.duplicateSelected?.();
                    break;

                case "split":
                    ctx.splitSelected?.();
                    break;

                case "delete":
                    ctx.deleteSelected?.();
                    break;

                case "fit-timeline":
                    $("#zoomFit").click();
                    break;

                case "toggle-media":
                    if (isMobileEditor()) {
                        openMobileSheet("media");
                    } else {
                        document.querySelector(".media-panel")?.classList.toggle("is-collapsed");
                    }
                    break;

                case "toggle-inspector":
                    if (isMobileEditor()) {
                        openMobileSheet("inspector");
                    } else {
                        document.querySelector(".inspector-panel")?.classList.toggle("is-collapsed");
                    }
                    break;

                case "toggle-focus":
                    closeMobileSheet();
                    elements.editor.classList.toggle("focus-mode");
                    ctx.toast( elements.editor.classList.contains("focus-mode") ? "Editing focus enabled." : "Editing focus closed." );
                    break;

                case "go-home":
                    closeMobileSheet();
                    show("welcome");
                    break;

                default:
                    return;
            }
        };

        document.querySelectorAll("[data-editor-command]").forEach((button) => {
                button.addEventListener("click", async () => {
                    await runEditorCommand(button.dataset.editorCommand);

                    document.querySelectorAll(".editor-menu[open]").forEach((menu) => {
                            menu.removeAttribute("open");
                        });

                    if (drawer.classList.contains("open")) {
                        closeEditorDrawer();
                    }
                });
            });

        document.querySelectorAll(".editor-menu > summary").forEach((summary) => {
                summary.addEventListener("click", () => {
                    const current = summary.parentElement;

                    document.querySelectorAll(".editor-menu[open]").forEach((menu) => {
                            if (menu !== current) {
                                menu.removeAttribute("open");
                            }
                        });
                });
            });

        document.addEventListener("click", (event) => {
            if (!event.target.closest(".editor-menu")) {
                document.querySelectorAll(".editor-menu[open]").forEach((menu) => {
                        menu.removeAttribute("open");
                    });
            }
        });

        $("#confirmNo").addEventListener( "click", () => ctx.resolveConfirm(false) );
        $("#confirmYes").addEventListener( "click", () => ctx.resolveConfirm(true) );
        document.addEventListener("keydown", (event) => {
            if (event.key === "Tab") {
                const activeDialog = activeMobileSheet || (drawer.classList.contains("open") ? drawer : null);
                if (activeDialog) {
                    const focusable = [
                        ...activeDialog.querySelectorAll(
                            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                        )
                    ].filter( (node) => !node.hidden && node.getAttribute("aria-hidden") !== "true" );
                    if (focusable.length) {
                        const first = focusable[0];
                        const last = focusable[focusable.length - 1];
                        if ( event.shiftKey && ( document.activeElement === first || !activeDialog.contains(document.activeElement) ) ) {
                            event.preventDefault();
                            last.focus();
                        } else if ( !event.shiftKey && ( document.activeElement === last || !activeDialog.contains(document.activeElement) ) ) {
                            event.preventDefault();
                            first.focus();
                        }
                    }
                }
            }

            const activeTag = document.activeElement?.tagName;
            const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) || document.activeElement?.isContentEditable;
            const inEditor = !elements.editor.classList.contains("hidden");
            if (event.key === "Escape") {
                document.querySelectorAll(".editor-menu[open]").forEach((menu) => {
                        menu.removeAttribute("open");
                    });

                if (drawer.classList.contains("open")) {
                    closeEditorDrawer({ restoreFocus: true });
                }

                if (activeMobileSheet) {
                    closeMobileSheet({ restoreFocus: true });
                }

                if (elements.editor.classList.contains("focus-mode")) {
                    elements.editor.classList.remove("focus-mode");
                }

                if (state.playing) {
                    ctx.pause();
                }
                return;
            }

            if ( event.code === "Space" && !isTyping && activeTag !== "BUTTON" && inEditor ) {
                event.preventDefault();
                state.playing ? ctx.pause() : ctx.play();
                return;
            }

            if ( (event.key === "Delete" || event.key === "Backspace") && !isTyping && inEditor && state.project.selected ) {
                event.preventDefault();
                ctx.deleteSelected?.();
                return;
            }

            const modifier = event.ctrlKey || event.metaKey;
            if (!modifier || isTyping || !inEditor) {
                return;
            }

            const key = event.key.toLowerCase();
            if (key === "z") {
                event.preventDefault();
                event.shiftKey ? ctx.redo() : ctx.undo();
            } else if (key === "y") {
                event.preventDefault();
                ctx.redo();
            } else if (key === "d") {
                event.preventDefault();
                ctx.duplicateSelected?.();
            } else if (key === "s") {
                event.preventDefault();
                $("#saveProject").click();
            } else if (key === "o") {
                event.preventDefault();
                $("#openProject").click();
            }
        });

        const initialScreen = window.location.hash === "#editor" ? "editor" : "welcome";
        show(initialScreen);
        window.addEventListener("hashchange", () => {
            const target = window.location.hash === "#editor" ? "editor" : "welcome";
            if (target !== "editor") {
                closeMobileSheet();
            }
            show(target, { syncUrl: false });
        });

        window.addEventListener("popstate", () => {
            const target = window.location.hash === "#editor" ? "editor" : "welcome";
            if (target !== "editor") {
                closeMobileSheet();
            }
            show(target, { syncUrl: false });
        });
    }

    ctx.show = show;
    ctx.resetProject = resetProject;
    ctx.reconnectMedia = reconnectMedia;
    setupEvents();
}