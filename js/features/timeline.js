import { $, clamp, escapeHTML, formatTime } from "../utils/helpers.js";
import { makeTextClip } from "../core/project.js";

export function setupTimeline(ctx) {
    const { state, elements: el } = ctx;
    function renderTimeline() {
        const total = Math.max(10, ctx.duration());
        const width = Math.max(580, el.timelineScroll.clientWidth - 82, 800) * state.zoom / 100;
        const contentWidth = Math.max( width, el.timelineScroll.clientWidth - 82 );

        el.timelineCanvas.style.width = `${Math.max(width + 82, el.timelineScroll.clientWidth)}px`;
        [el.videoTrack, el.textTrack, el.audioTrack].forEach((track) => {
            track.style.width = `${contentWidth}px`;
        });

        const ticks = Math.max( 5, Math.min(20, Math.ceil(total / 5)) );
        el.ruler.innerHTML = Array.from(
            { length: ticks + 1 },
            (_, index) =>
                `<span>${formatTime(total * index / ticks).split(".")[0]}</span>`
        ).join("");

        const build = (track, clips, type, empty) => {
            track.innerHTML = "";
            if (!clips.length) {
                track.innerHTML = `<span class="track-empty">${empty}</span>`;
                return;
            }

            const scale = contentWidth / total;
            clips.forEach((clip) => {
                const media = clip.media ? ctx.getMedia(clip.media) : null;
                const span = type === "text" ? clip.duration : Math.max(0.05, clip.out - clip.in) / (clip.rate || 1);
                const node = document.createElement("div");

                node.className = `clip ${type}${state.project.selected === clip.id ? " selected" : ""}`;
                node.dataset.id = clip.id;
                node.dataset.type = type;

                node.style.left = `${clip.start * scale}px`;
                node.style.width = `${Math.max(24, span * scale)}px`;
                const title = type === "text" ? clip.text || "Text overlay" : media?.name || "Missing media";
                node.title = `${title} · ${formatTime(span)}`;

                node.innerHTML = `
                    <span class="clip-grip left" data-grip="left"></span>
                    <span>${type === "video" ? "▶" : type === "text" ? "T" : "♫"}</span>
                    <span>${escapeHTML(title)}</span>
                    <span class="clip-grip right" data-grip="right"></span>
                `;
                track.append(node);
            });
        };

        build( el.videoTrack, state.project.clips, "video", "Import a video, then add it to your timeline." );
        build( el.textTrack, state.project.texts, "text", "Your titles and captions will appear here." );
        build( el.audioTrack, state.project.audios, "audio", "Add background audio from your library." );

        $("#clipCount").textContent = `${state.project.clips.length + state.project.texts.length + state.project.audios.length} clips`;
        $("#split").disabled = !state.project.clips.some( (clip) => clip.id === state.project.selected );
        $("#delete").disabled = !state.project.selected;
        $("#duplicate").disabled = !state.project.selected;
        updatePlayhead();
    }

    function updatePlayhead() {
        const total = Math.max(10, ctx.duration());
        const width = Math.max(580, el.timelineScroll.clientWidth - 82, 800) * state.zoom / 100;
        el.playhead.style.left = `${82 + clamp(state.currentTime / total, 0, 1) * Math.max(width, el.timelineScroll.clientWidth - 82)}px`;
    }

    function select(id) {
        state.project.selected = id;
        ctx.renderAll();
    }

    function addText() {
        const before = structuredClone(state.project);
        const clip = makeTextClip(state.currentTime);
        state.project.texts.push(clip);
        state.project.selected = clip.id;
        ctx.commit("Add text overlay", before);
        ctx.toast("Text overlay added.", "success");
    }

    function updateClip(id, patch, label = "Edit clip") {
        const before = structuredClone(state.project);
        const clip = ctx.findClip(id);
        if (!clip) {
            return;
        }

        Object.assign(clip, patch);
        if ("in" in patch || "out" in patch) {
            const media = ctx.getMedia(clip.media);
            clip.in = clamp( clip.in, 0, Math.max(0, media?.duration || clip.out) );
            clip.out = clamp( clip.out, clip.in + 0.05, media?.duration || Math.max(clip.in + 0.05, clip.out) );
        }

        if ("start" in patch) {
            clip.start = Math.max(0, Number(clip.start) || 0);
        }

        if ("duration" in patch) {
            clip.duration = clamp(clip.duration, 0.1, 3600);
        }
        ctx.commit(label, before);
    }

    function deleteSelected() {
        const clip = ctx.findClip(state.project.selected);
        if (!clip) {
            return;
        }

        const before = structuredClone(state.project);
        state.project.clips = state.project.clips.filter( (item) => item.id !== clip.id );
        state.project.texts = state.project.texts.filter( (item) => item.id !== clip.id );
        state.project.audios = state.project.audios.filter( (item) => item.id !== clip.id );
        state.project.selected = null;
        ctx.commit("Delete clip", before);
        ctx.toast("Clip removed.");
    }

    function duplicateSelected() {
        const clip = ctx.findClip(state.project.selected);
        if (!clip) {
            ctx.toast( "Select a timeline clip to duplicate.", "error" );
            return;
        }

        const before = structuredClone(state.project);
        const type = ctx.getClipType(clip.id);
        const copy = structuredClone(clip);
        copy.id = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

        const span = type === "text" ? copy.duration : Math.max( 0.1, (copy.out - copy.in) / (copy.rate || 1) );
        copy.start = clip.start + span + 0.15;
        const collection = type === "video" ? state.project.clips : type === "audio" ? state.project.audios : state.project.texts;
        collection.push(copy);
        state.project.selected = copy.id;

        ctx.commit("Duplicate timeline clip", before);
        ctx.toast( "Clip duplicated to the end of the selected clip.", "success" );
    }

    function fitTimeline() {
        const available = Math.max( 320, el.timelineScroll.clientWidth - 96 );
        const baseWidth = Math.max(800, available);
        setZoom( clamp( Math.floor((available / baseWidth) * 100), 25, 200 ) );

        el.timelineScroll.scrollTo({
            left: 0,
            behavior: "smooth"
        });
    }

    function splitSelected() {
        const clip = state.project.clips.find( (item) => item.id === state.project.selected );
        if (!clip) {
            return;
        }

        const localTime = clip.in + (state.currentTime - clip.start) * (clip.rate || 1);
        if ( localTime <= clip.in + 0.05 || localTime >= clip.out - 0.05 ) {
            ctx.toast( "Move the playhead inside the selected clip to split it.", "error" );
            return;
        }

        const before = structuredClone(state.project);
        const second = {
            ...clip,
            id: `clip-${Date.now().toString(36)}`,
            start: state.currentTime,
            in: localTime
        };

        clip.out = localTime;
        state.project.clips.push(second);
        state.project.selected = second.id;
        ctx.commit("Split video clip", before);
        ctx.toast("Clip split at the playhead.", "success");
    }

    function resetSelected() {
        const clip = ctx.findClip(state.project.selected);
        if (!clip) {
            return;
        }

        if (ctx.getClipType(clip.id) === "video") {
            updateClip( clip.id, {
                    brightness: 100,
                    contrast: 100,
                    gray: 0,
                    volume: 100,
                    muted: false
                },
                "Reset clip adjustments"
            );
        } else if (ctx.getClipType(clip.id) === "audio") {
            updateClip( clip.id, {
                    volume: 80,
                    muted: false
                },
                "Reset audio adjustments"
            );
        } else {
            updateClip( clip.id, {
                    size: 54,
                    color: "#ffffff",
                    bold: true,
                    shadow: true,
                    x: 0.5,
                    y: 0.82,
                    align: "center"
                },
                "Reset text style"
            );
        }
    }

    function setZoom(value) {
        state.zoom = clamp(value, 40, 250);
        $("#zoom").value = state.zoom;
        renderTimeline();
    }

    function beginClipDrag(event, node) {
        const clip = ctx.findClip(node.dataset.id);
        if (!clip) {
            return;
        }

        event.preventDefault();
        select(clip.id);
        const grip = event.target.closest(".clip-grip")?.dataset.grip || "move";
        const before = structuredClone(state.project);
        const type = ctx.getClipType(clip.id);
        const total = Math.max(10, ctx.duration());
        const trackWidth = Math.max(580, el.timelineScroll.clientWidth - 82, 800) * state.zoom / 100;

        const scale = Math.max(1, trackWidth) / total;
        const initialX = event.clientX;
        const original = {
            start: clip.start,
            in: clip.in,
            out: clip.out,
            duration: clip.duration
        };

        const pointerId = event.pointerId;
        const onMove = (moveEvent) => {
            if (moveEvent.pointerId !== pointerId) {
                return;
            }

            const delta = (moveEvent.clientX - initialX) / scale;
            if (grip === "move") {
                clip.start = Math.max( 0, original.start + delta );
                node.style.left = `${clip.start * scale}px`;
            } else if (grip === "left" && type !== "text") {
                const available = original.in + delta;
                const nextIn = clamp( available, 0, original.out - 0.05 );

                clip.in = nextIn;
                clip.start = Math.max( 0, original.start + (nextIn - original.in) / (clip.rate || 1) );
                node.style.left = `${clip.start * scale}px`;
                node.style.width = `${Math.max(24, ((clip.out - clip.in) / (clip.rate || 1)) * scale)}px`;
            } else if (grip === "right") {
                if (type === "text") {
                    clip.duration = Math.max( 0.1, original.duration + delta );
                } else {
                    clip.out = Math.max( clip.in + 0.05, original.out + delta * (clip.rate || 1) );
                }

                const span = type === "text" ? clip.duration : (clip.out - clip.in) / (clip.rate || 1);
                node.style.width = `${Math.max(24, span * scale)}px`;
            }
        };

        const cleanup = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onCancel);
        };

        const onUp = (upEvent) => {
            if (upEvent.pointerId !== pointerId) {
                return;
            }

            cleanup();
            if (type !== "text") {
                const media = ctx.getMedia(clip.media);
                if (media) {
                    clip.out = clamp( clip.out, clip.in + 0.05, media.duration || clip.out );
                }
            }
            ctx.commit( grip === "move" ? "Move timeline clip" : "Trim timeline clip", before );
        };

        const onCancel = (cancelEvent) => {
            if (cancelEvent.pointerId !== pointerId) {
                return;
            }
            cleanup();
            Object.assign(clip, original);
            renderTimeline();
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onCancel);
    }

    function setupEvents() {
        $("#addText").addEventListener("click", addText);
        $("#split").addEventListener("click", splitSelected);
        $("#delete").addEventListener("click", deleteSelected);
        $("#duplicate").addEventListener("click", duplicateSelected);
        $("#zoomFit").addEventListener("click", fitTimeline);
        $("#resetProps").addEventListener("click", resetSelected);

        $("#zoomIn").addEventListener("click", () => setZoom(state.zoom + 15) );
        $("#zoomOut").addEventListener("click", () => setZoom(state.zoom - 15) );
        $("#zoom").addEventListener("input", (event) => setZoom(Number(event.target.value)) );
        [ el.videoTrack, el.textTrack, el.audioTrack, el.ruler ].forEach((track) => {
            track.addEventListener("pointerdown", (event) => {
                const clipNode = event.target.closest(".clip");
                if (clipNode) {
                    beginClipDrag(event, clipNode);
                    return;
                }

                const rect = track.getBoundingClientRect();
                ctx.seek( clamp( (event.clientX - rect.left) / Math.max(1, rect.width), 0, 1 ) * Math.max(10, ctx.duration()) );
            });
        });
    }

    ctx.renderTimeline = renderTimeline;
    ctx.updatePlayhead = updatePlayhead;
    ctx.select = select;
    ctx.updateClip = updateClip;
    ctx.deleteSelected = deleteSelected;
    ctx.splitSelected = splitSelected;
    ctx.duplicateSelected = duplicateSelected;
    setupEvents();
}