import { $, $$, escapeHTML, formatTime, uid, } from "../utils/helpers.js";
import { makeVideoClip, makeAudioClip, } from "../core/project.js";

export function setupMedia(ctx) {
    const { state, elements: el } = ctx;
    const getMedia = (id) => state.media.find((item) => item.id === id) || null;
    async function importFiles(files, requestedType = "all") {

        for (const file of [...files]) {
            const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : null;
            if ( !type || (requestedType !== "all" && type !== requestedType) ) {
                ctx.toast( `Skipped ${file.name}: unsupported ${requestedType} file.`, "error" );
                continue;
            }

            if ( state.media.some( (item) => item.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified ) ) {
                ctx.toast(`${file.name} is already in your media library.`);
                continue;
            }

            const item = {
                id: uid("media"),
                file,
                name: file.name,
                type,
                url: URL.createObjectURL(file),
                duration: 0,
                width: 0,
                height: 0,
                thumb: null,
                ready: false,
            };

            state.media.push(item);
            await new Promise((resolve) => {
                const probe = document.createElement(type);
                probe.preload = "metadata";
                probe.muted = true;
                probe.src = item.url;

                const finish = () => {
                    item.duration = Number.isFinite(probe.duration) ? probe.duration : 0;
                    if (type === "video") {
                        item.width = probe.videoWidth || 0;
                        item.height = probe.videoHeight || 0;

                        try {
                            if (item.width && item.height) {
                                const thumb = document.createElement("canvas");
                                thumb.width = 120;
                                thumb.height = 68;
                                thumb.getContext("2d").drawImage(probe, 0, 0, 120, 68);
                                item.thumb = thumb.toDataURL( "image/jpeg", 0.65 );
                            }
                        } catch {
                            /* Thumbnail is optional. */
                        }
                    }

                    item.ready = item.duration > 0;
                    probe.removeAttribute("src");
                    probe.load();
                    resolve();
                };

                probe.addEventListener( "loadedmetadata", finish, { once: true } );
                probe.addEventListener( "error", () => {
                        item.ready = false;
                        resolve();
                    },
                    { once: true }
                );

                setTimeout(() => {
                    if (!item.ready)
                        resolve();
                }, 12_000);
            });

            if (!item.ready) {
                ctx.toast( `Could not read metadata for ${file.name}. Check its codec.`, "error" );
            } else {
                ctx.toast( `${file.name} imported successfully.`, "success" );
            }
            ctx.reconnectMedia?.(item);
        }
        ctx.renderAll();
    }


    function renderMedia() {
        const items = state.media.filter( (item) => state.filter === "all" || item.type === state.filter );
        $("#mediaCount").textContent = state.media.length;
        $$(".media-tabs button").forEach((button) => button.classList.toggle( "active", button.dataset.filter === state.filter ) );
        if (!items.length) {
            el.mediaList.innerHTML = `
                <div class="empty-media">
                    <span>↥</span>
                    <b> ${state.media.length ? "No files in this view" : "Your story starts here"} </b>
                    <p> ${state.media.length ? "Try another media filter." : "Import a video or audio file to begin creating."} </p>
                    <button class="button secondary small" data-action="import" > Import media </button>
                </div> `;
            return;
        }

        el.mediaList.innerHTML = items.map( (item) => `
                    <article class="media-item" tabindex="0" data-id="${item.id}" >
                        <div class="media-thumb ${item.type === "audio" ? "audio" : ""}">
                            ${ item.thumb ? `<img src="${item.thumb}" alt="">` : item.type === "audio" ? "♫" : "▶" }
                        </div>

                        <div class="media-details">
                            <b title="${escapeHTML(item.name)}"> ${escapeHTML(item.name)} </b>
                            <small> ${formatTime(item.duration).split(".")[0]} · ${item.type === "video" ? "Video" : "Audio"} ${item.ready ? "" : " · unavailable"} </small>
                        </div>

                        <button class="remove-media" data-action="remove" aria-label="Remove ${escapeHTML(item.name)}" > × </button>
                    </article> `
            ).join("");
    }

    function addToTimeline(item) {
        if (!item?.ready) {
            ctx.toast( "This media file is not ready to edit.", "error" );
            return;
        }

        const before = structuredClone(state.project);
        if (item.type === "video") {
            state.project.clips.push( makeVideoClip(item, ctx.duration()) );
        } else {
            state.project.audios.push( makeAudioClip(item, ctx.state.currentTime) );
        }

        state.project.selected = item.type === "video" ? state.project.clips.at(-1).id : state.project.audios.at(-1).id;
        ctx.commit( item.type === "video" ? "Add video clip" : "Add audio clip", before );
        ctx.toast( `${item.type === "video" ? "Video" : "Audio"} added to timeline.`, "success" );
    }

    function disposeMedia(id) {
        state.videoPool.get(id)?.pause();
        state.videoPool.delete(id);
        state.audioPool.get(id)?.pause();
        state.audioPool.delete(id);
    }

    function setupEvents() {
        el.videoInput.addEventListener("change", async (event) => {
            await importFiles(event.target.files, "video");
            event.target.value = "";
        });

        el.audioInput.addEventListener("change", async (event) => {
            await importFiles(event.target.files, "audio");
            event.target.value = "";
        });

        $("#import").addEventListener("click", () => el.videoInput.click() );
        $("#emptyImport").addEventListener("click", () => el.videoInput.click() );
        $("#previewImport").addEventListener("click", () => el.videoInput.click() );

        $("#addVideo").addEventListener("click", () => openPicker("video") );
        $("#addAudio").addEventListener("click", () => openPicker("audio") );

        $$(".media-tabs button").forEach((button) => button.addEventListener("click", () => {
                state.filter = button.dataset.filter;
                renderMedia();
            })
        );

        el.mediaList.addEventListener("click", async (event) => {
            if (event.target.closest('[data-action="import"]')) {
                el.videoInput.click();
                return;
            }

            const card = event.target.closest(".media-item");
            if (!card)
                return;

            const item = getMedia(card.dataset.id);
            if (!item)
                return;

            if (event.target.closest('[data-action="remove"]')) {
                const linked = state.project.clips.some( (clip) => clip.media === item.id ) || state.project.audios.some( (clip) => clip.media === item.id );

                const remove = () => {
                    const before = structuredClone(state.project);
                    state.project.clips = state.project.clips.filter( (clip) => clip.media !== item.id );
                    state.project.audios = state.project.audios.filter( (clip) => clip.media !== item.id );
                    if (!ctx.findClip(state.project.selected)) {
                        state.project.selected = null;
                    }

                    ctx.commit("Remove media", before);
                    disposeMedia(item.id);
                    URL.revokeObjectURL(item.url);
                    state.media = state.media.filter( (entry) => entry.id !== item.id );
                    ctx.renderAll();
                };

                if (linked) {
                    if ( await ctx.confirm( "Remove this media?", "Timeline clips using this source will also be removed.", "Remove media" ) ) {
                        remove();
                    }
                } else {
                    remove();
                }
                return;
            }


            if (item.type === "video") {
                const clip = state.project.clips.find( (entry) => entry.media === item.id );
                if (clip) {
                    ctx.select(clip.id);
                    ctx.seek(clip.start);
                } else {
                    ctx.toast( "Video selected. Double-click it or choose Add video to timeline." );
                }
            } else {
                ctx.toast( "Audio selected. Double-click it or choose Add audio to timeline." );
            }
        });

        el.mediaList.addEventListener("dblclick", (event) => {
            const item = getMedia( event.target.closest(".media-item")?.dataset.id );
            if (item) {
                addToTimeline(item);
            }
        });

        el.mediaList.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                const item = getMedia( event.target.closest(".media-item")?.dataset.id );
                if (item) {
                    event.preventDefault();
                    addToTimeline(item);
                }
            }
        });

        $("#clearMedia").addEventListener("click", async () => {
            if ( !state.media.length || !(await ctx.confirm( "Clear media library?", "This removes all imported assets and their timeline clips.", "Clear library" )) ) {
                return;
            }

            state.media.forEach((item) => {
                disposeMedia(item.id);
                URL.revokeObjectURL(item.url);
            });

            state.media = [];
            state.project = ctx.createProject();
            state.history = [];
            state.redoStack = [];
            state.currentTime = 0;
            ctx.renderAll();
            ctx.toast("Media library cleared.");
        });
    }

    function openPicker(type) {
        const available = state.media.filter( (item) => item.type === type && item.ready );
        if (!available.length) {
            (type === "video" ? el.videoInput : el.audioInput).click();
            return;
        }

        if (available.length === 1) {
            addToTimeline(available[0]);
            return;
        }

        const choice = prompt( `Choose ${type} by number:\n${available.map((item, index) => `${index + 1}. ${item.name}`).join("\n")}\n\nEnter a number:` );
        if (choice === null)
            return;

        const selected = available[Number(choice) - 1];
        if (!selected) {
            ctx.toast( "That selection is invalid.", "error" );
        } else {
            addToTimeline(selected);
        }
    }

    ctx.getMedia = getMedia;
    ctx.importFiles = importFiles;
    ctx.renderMedia = renderMedia;
    ctx.addToTimeline = addToTimeline;
    ctx.disposeMedia = disposeMedia;
    setupEvents();
}