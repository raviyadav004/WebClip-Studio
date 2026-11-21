import { $, clamp, waitFor } from "../utils/helpers.js";

export function setupPreview(ctx) {
    const { state, elements: el } = ctx;
    const canvasContext = el.canvas.getContext("2d", { alpha: false });
    const activeVideo = (time) => state.project.clips.find( (clip) => time >= clip.start && time < clip.start + (clip.out - clip.in) / (clip.rate || 1) ) || null;
    const activeTexts = (time) => state.project.texts.filter( (clip) => time >= clip.start && time < clip.start + clip.duration );

    function getVideo(id) {
        if (state.videoPool.has(id)) {
            return state.videoPool.get(id);
        }

        const media = ctx.getMedia(id);
        if (!media) {
            return null;
        }

        const video = document.createElement("video");
        video.src = media.url;
        video.preload = "auto";
        video.playsInline = true;
        video.volume = Number($("#volume").value || 80) / 100;
        state.videoPool.set(id, video);
        return video;
    }

    function getAudio(id) {
        if (state.audioPool.has(id)) {
            return state.audioPool.get(id);
        }

        const media = ctx.getMedia(id);
        if (!media) {
            return null;
        }

        const audio = document.createElement("audio");
        audio.src = media.url;
        audio.preload = "auto";
        state.audioPool.set(id, audio);
        return audio;
    }

    function draw(time = state.currentTime) {
        const width = el.canvas.width;
        const height = el.canvas.height;
        canvasContext.save();
        canvasContext.filter = "none";
        canvasContext.fillStyle = "#17151f";
        canvasContext.fillRect(0, 0, width, height);

        const clip = activeVideo(time);
        if (clip) {
            const video = getVideo(clip.media);
            if (video && video.readyState >= 2 && video.videoWidth) {
                canvasContext.filter = ` brightness(${clamp(clip.brightness, 0, 200)}%) contrast(${clamp(clip.contrast, 0, 200)}%) grayscale(${clamp(clip.gray, 0, 100)}%) `.replace(/\s+/g, " ").trim();
                const scale = Math.min( width / video.videoWidth, height / video.videoHeight );
                const drawWidth = video.videoWidth * scale;
                const drawHeight = video.videoHeight * scale;

                canvasContext.drawImage( video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight );
                canvasContext.filter = "none";
            } else {
                drawMessage( "Loading video frame…", "Please wait while the source becomes ready." );
            }
        } else {
            drawMessage(
                state.project.clips.length ? "No video at this position" : "Your canvas is waiting.",
                state.project.clips.length ? "Move the playhead over a video clip." : "Add a video to the timeline to begin."
            );
        }

        activeTexts(time).forEach((text) => {
            canvasContext.save();
            canvasContext.font = `${ text.bold ? "700 " : "" }${clamp(text.size, 8, 240)}px ${text.font || "Arial"}`;
            canvasContext.textAlign = text.align || "center";
            canvasContext.textBaseline = "middle";
            canvasContext.fillStyle = text.color || "#fff";

            if (text.shadow) {
                canvasContext.shadowColor = "rgba(0,0,0,.65)";
                canvasContext.shadowBlur = text.size * 0.12;
                canvasContext.shadowOffsetY = text.size * 0.04;
            }

            const lines = String(text.text || "").split("\n");
            const lineHeight = text.size * 1.18;
            const startY = text.y * height - ((lines.length - 1) * lineHeight) / 2;
            lines.forEach((line, index) => {
                canvasContext.fillText( line, text.x * width, startY + index * lineHeight, width * 0.88 );
            });
            canvasContext.restore();
        });
        canvasContext.restore();
    }

    function drawMessage(title, subtitle) {
        canvasContext.fillStyle = "#252238";
        canvasContext.fillRect( 0, 0, el.canvas.width, el.canvas.height );
        canvasContext.fillStyle = "#e9e5ff";
        canvasContext.textAlign = "center";
        canvasContext.font = "700 27px system-ui";

        canvasContext.fillText( title, el.canvas.width / 2, el.canvas.height / 2 - 12 );
        canvasContext.fillStyle = "#b7b1ce";
        canvasContext.font = "16px system-ui";
        canvasContext.fillText( subtitle, el.canvas.width / 2, el.canvas.height / 2 + 25 );
    }

    function pause() {
        state.playing = false;
        if (state.raf) {
            cancelAnimationFrame(state.raf);
        }

        state.raf = 0;
        state.videoPool.forEach((video) => video.pause());
        state.audioPool.forEach((audio) => audio.pause());
        setPlayButton(false);
    }

    function syncAudio(time) {
        state.project.audios.forEach((clip) => {
            const audio = getAudio(clip.media);
            if (!audio) {
                return;
            }

            const active = time >= clip.start && time < clip.start + clip.out - clip.in;
            if (active && state.playing) {
                const target = clip.in + time - clip.start;
                const audioNode = state.audioNodes.get( `a:${clip.media}` );

                if (audioNode) {
                    audioNode.gain.gain.value = 1;
                }

                if (Math.abs(audio.currentTime - target) > 0.35) {
                    try {
                        audio.currentTime = target;
                    } catch {
                        /* Browser may reject a seek before metadata. */
                    }
                }

                audio.volume = clamp(clip.volume, 0, 100) / 100;
                audio.muted = Boolean(clip.muted);
                if (audio.paused) {
                    audio.play().catch(() => {});
                }
            } else {
                audio.pause();
            }
        });
    }

    function play() {
        if (state.playing) {
            return;
        }

        if (!state.project.clips.length) {
            ctx.toast( "Add a video clip to the timeline before playing." );
            return;
        }

        if (state.currentTime >= ctx.duration() - 0.03) {
            ctx.seek(0);
        }

        state.playing = true;
        state.lastTick = performance.now();
        setPlayButton(true);
        const tick = (now) => {
            if (!state.playing) {
                return;
            }

            const delta = Math.min( 0.1, Math.max(0, (now - state.lastTick) / 1000) );
            state.lastTick = now;
            state.currentTime = Math.min( ctx.duration(), state.currentTime + delta );
            state.project.currentTime = state.currentTime;

            const clip = activeVideo(state.currentTime);
            if (clip) {
                const video = getVideo(clip.media);
                const target = clip.in + (state.currentTime - clip.start) * (clip.rate || 1);

                if (state.activeClip !== clip.id) {
                    state.activeClip = clip.id;
                    try {
                        video.currentTime = target;
                    } catch {
                        /* Wait for metadata. */
                    }
                }

                if (video) {
                    const audioNode = state.audioNodes.get( `v:${clip.media}` );
                    if (audioNode) {
                        audioNode.gain.gain.value = 1;
                    }

                    video.volume = (clamp(clip.volume, 0, 100) / 100) * (Number($("#volume").value || 100) / 100);
                    video.muted = Boolean(clip.muted);
                    if (video.paused) {
                        video.play().catch(() => {});
                    }
                }
            } else {
                state.activeClip = null;
                state.videoPool.forEach((video) => video.pause());
            }

            syncAudio(state.currentTime);
            draw(state.currentTime);
            ctx.updateTimes();
            ctx.updatePlayhead();
            if (state.currentTime >= ctx.duration() - 0.005) {
                pause();

                state.currentTime = ctx.duration();
                state.project.currentTime = state.currentTime;
                draw(state.currentTime);
                ctx.updateTimes();
                return;
            }
            state.raf = requestAnimationFrame(tick);
        };
        state.raf = requestAnimationFrame(tick);
    }

    function setPlayButton(playing) {
        $("#play").textContent = playing ? "Ⅱ" : "▶";
        $("#play").setAttribute( "aria-label", playing ? "Pause" : "Play" );
    }

    async function seek(time) {
        pause();
        state.currentTime = clamp(time, 0, ctx.duration());
        state.project.currentTime = state.currentTime;

        const clip = activeVideo(state.currentTime);
        if (clip) {
            const video = getVideo(clip.media);
            if (video) {
                const target = clip.in + (state.currentTime - clip.start) * (clip.rate || 1);

                try {
                    if (Math.abs(video.currentTime - target) > 0.04) {
                        video.currentTime = target;
                        await waitFor(video, "seeked", 500);
                    }
                } catch {
                    /* Preview will refresh on the next frame. */
                }
            }
        }

        draw(state.currentTime);
        ctx.updateTimes();
        ctx.updatePlayhead();
    }

    function updateTimes() {
        $("#currentTime").textContent = ctx.formatTime( state.currentTime );
        $("#duration").textContent = ctx.formatTime( ctx.duration() );
        $("#timelineDuration").textContent = `Duration ${ctx.formatTime(ctx.duration())}`;
    }

    function updatePreviewState() {
        const hasVideo = state.project.clips.length > 0;
        $("#previewEmpty").classList.toggle( "hidden", hasVideo );
        $("#previewHint").textContent = hasVideo ? "Preview reflects the current timeline position" : "Import a video to get started";

        const media = hasVideo ? ctx.getMedia(state.project.clips[0].media) : null;
        if (media?.width) {
            $("#dimensions").textContent = `${media.width} × ${media.height} source`;
            $("#resolution").textContent = `${media.width} × ${media.height}`;
            if ( state.project.width !== media.width || state.project.height !== media.height ) {
                state.project.width = media.width;
                state.project.height = media.height;
                el.canvas.width = media.width;
                el.canvas.height = media.height;
            }
        } else {
            $("#dimensions").textContent = "1280 × 720";
            $("#resolution").textContent = "Canvas · 16:9";
        }
    }

    function setupEvents() {
        $("#play").addEventListener("click", () => state.playing ? pause() : play() );
        $("#toStart").addEventListener("click", () => seek(0));
        $("#toEnd").addEventListener("click", () => seek(ctx.duration()) );

        $("#back").addEventListener("click", () => seek( state.currentTime - 1 / (state.project.fps || 30) ) );
        $("#forward").addEventListener("click", () => seek( state.currentTime + 1 / (state.project.fps || 30) ) );

        $("#volume").addEventListener("input", (event) => {
            const volume = Number(event.target.value) / 100;
            state.videoPool.forEach((video) => {
                video.volume = volume;
            });
        });
    }

    ctx.draw = draw;
    ctx.play = play;
    ctx.pause = pause;
    ctx.seek = seek;
    ctx.getVideo = getVideo;
    ctx.getAudio = getAudio;
    ctx.syncAudio = syncAudio;
    ctx.updateTimes = updateTimes;
    ctx.updatePreviewState = updatePreviewState;
    setupEvents();
}