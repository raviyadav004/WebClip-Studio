import { $, clamp, safeName, formatTime, } from "../utils/helpers.js";
import { getRecordingMimeType, } from "../config.js";

export function setupExport(ctx) {
    const { state, elements } = ctx;
    async function prepareAudioGraph() {
        if (!state.audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                throw new Error( "Web Audio is unavailable in this browser, so audio mixing cannot be prepared." );
            }
            state.audioContext = new AudioContextClass();
            state.audioDestination = state.audioContext.createMediaStreamDestination();
        }

        const connect = (key, mediaElement) => {
            try {
                const source = state.audioContext.createMediaElementSource(mediaElement);
                const gain = state.audioContext.createGain();
                source.connect(gain);
                gain.connect(state.audioContext.destination);
                gain.connect(state.audioDestination);
                state.audioNodes.set(key, { source, gain });
            } catch (error) {
                console.warn( "[WebClip Studio] Could not route an audio source:", error );
            }
        };

        state.project.clips.forEach((clip) => {
            const video = ctx.getVideo(clip.media);
            if (video && !state.audioNodes.has(`v:${clip.media}`)) {
                connect(`v:${clip.media}`, video);
            }
        });

        state.project.audios.forEach((clip) => {
            const audio = ctx.getAudio(clip.media);
            if (audio && !state.audioNodes.has(`a:${clip.media}`)) {
                connect(`a:${clip.media}`, audio);
            }
        });
        await state.audioContext.resume();
    }


    function openExport() {
        if (!state.project.clips.length) {
            ctx.toast( "Add at least one video clip before exporting.", "error" );
            return;
        }

        if (!getRecordingMimeType() || !elements.canvas.captureStream) {
            ctx.toast( "This browser does not support canvas video export. Try a recent Chromium-based browser.", "error" );
            return;
        }

        $("#preflight").classList.add("hidden");
        $("#exportName").value = safeName( state.project.name, "webclip-final" );
        elements.exportDialog.showModal();
    }


    async function renderExport() {
        if (state.exportController)
            return;

        if (!getRecordingMimeType()) {
            $("#preflight").textContent = "No supported WebM recording format is available in this browser.";
            $("#preflight").classList.remove("hidden");
            return;
        }

        const controller = new AbortController();
        state.exportController = controller;
        const signal = controller.signal;
        const resolution = $("#exportSize").value;
        const width = resolution === "1080" ? 1920 : resolution === "720" ? 1280 : state.project.width || 1280;
        const height = resolution === "1080" ? 1080 : resolution === "720" ? 720 : state.project.height || 720;
        const fps = Number($("#exportFps").value) || 30;

        const filename = `${safeName( $("#exportName").value, "webclip-final" )}.webm`;
        const original = {
            width: elements.canvas.width,
            height: elements.canvas.height,
            time: state.currentTime,
            wasPlaying: state.playing,
        };

        let stream = null;
        let recorder = null;
        let cancelled = false;
        elements.exportDialog.close();

        $("#renderError").classList.add("hidden");
        $("#retryRender").classList.add("hidden");
        $("#cancelRender").classList.remove("hidden");
        $("#cancelRender").disabled = false;
        $("#cancelRender").textContent = "Cancel export";

        $("#renderInfo").classList.remove("hidden");
        $("#renderTitle").textContent = "Rendering your video";
        $("#renderDescription").textContent = "Compositing your timeline and audio into a downloadable video.";
        $("#progressBar").style.width = "0%";
        $("#progressLabel").textContent = "Preparing renderer…";

        $("#progressPercent").textContent = "0%";
        elements.renderDialog.showModal();
        ctx.pause();

        try {
            await prepareAudioGraph();
            const mimeType = getRecordingMimeType();
            elements.canvas.width = width;
            elements.canvas.height = height;
            stream = elements.canvas.captureStream(fps);
            state.audioDestination?.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

            const chunks = [];
            recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: Math.min( 12_000_000, Math.max( 2_500_000, width * height * fps * 0.08 ) ),
            });

            let recordingError = null;
            recorder.addEventListener("dataavailable", (event) => {
                if (event.data?.size) {
                    chunks.push(event.data);
                }
            });

            recorder.addEventListener("error", (event) => {
                recordingError = event.error || new Error("MediaRecorder failed.");
            });

            const stopped = new Promise((resolve, reject) => {
                recorder.addEventListener( "stop", () => recordingError ? reject(recordingError) : resolve(), { once: true } );
                recorder.addEventListener( "error", (event) => reject( event.error || new Error("Recording failed.") ), { once: true } );
            });

            signal.addEventListener( "abort", () => {
                    cancelled = true;
                    try {
                        if (recorder.state !== "inactive") {
                            recorder.stop();
                        }
                    } catch {
                        /* Recorder may already be stopped. */
                    }
                },
                { once: true }
            );
            recorder.start(250);

            const total = Math.max(0.05, ctx.duration());
            const frameDuration = 1000 / fps;
            const startedAt = performance.now();
            let frame = 0;
            let activeMediaId = null;
            state.currentTime = 0;
            state.project.currentTime = 0;
            ctx.draw(0);

            while ( state.currentTime < total - 0.001 && !cancelled && !signal.aborted ) {
                state.currentTime = Math.min(total, frame / fps);
                state.project.currentTime = state.currentTime;

                const videoClip = state.project.clips.find( (clip) => state.currentTime >= clip.start && state.currentTime < clip.start + (clip.out - clip.in) / (clip.rate || 1) );
                if (videoClip) {
                    const video = ctx.getVideo(videoClip.media);

                    if (!video) {
                        throw new Error( "A source video is missing from the media library." );
                    }

                    if (activeMediaId !== videoClip.media) {
                        if (activeMediaId) {
                            state.videoPool.get(activeMediaId) ?.pause();
                        }
                        activeMediaId = videoClip.media;
                    }

                    const target = videoClip.in + (state.currentTime - videoClip.start) * (videoClip.rate || 1);
                    if ( Math.abs(video.currentTime - target) > 0.08 || video.readyState < 2 ) {
                        try {
                            video.currentTime = clamp( target, 0, Math.max(0, (video.duration || target) - 0.02) );
                        } catch {
                            /* The browser may defer the seek. */
                        }

                        await Promise.race([
                            new Promise((resolve) => {
                                video.addEventListener( "seeked", resolve, { once: true } );
                                video.addEventListener( "loadeddata", resolve, { once: true } );
                            }),
                            new Promise((resolve) => setTimeout(resolve, 300) ), ]);
                    }

                    const node = state.audioNodes.get( `v:${videoClip.media}`
                    );

                    if (node) {
                        node.gain.gain.value = videoClip.muted ? 0 : clamp(videoClip.volume, 0, 100) / 100;
                    }

                    video.muted = false;
                    video.volume = 1;
                    if (video.paused) {
                        await video.play().catch(() => {});
                    }
                } else {
                    if (activeMediaId) {
                        state.videoPool.get(activeMediaId) ?.pause();
                    }
                    activeMediaId = null;
                }


                for (const audioClip of state.project.audios) {
                    const audio = ctx.getAudio(audioClip.media);
                    const active = state.currentTime >= audioClip.start && state.currentTime < audioClip.start + audioClip.out - audioClip.in;
                    const node = state.audioNodes.get( `a:${audioClip.media}` );
                    if (audio && active) {
                        const target = audioClip.in + state.currentTime - audioClip.start;
                        if (Math.abs(audio.currentTime - target) > 0.2) {
                            try {
                                audio.currentTime = target;
                            } catch {
                                /* Wait for the next frame. */
                            }
                        }

                        if (node) {
                            node.gain.gain.value = audioClip.muted ? 0 : clamp(audioClip.volume, 0, 100) / 100;
                        }
                        audio.muted = false;
                        audio.volume = 1;

                        if (audio.paused) {
                            await audio.play().catch(() => {});
                        }
                    } else if (audio) {
                        audio.pause();
                    }
                }

                ctx.draw(state.currentTime);
                stream.getVideoTracks().forEach((track) => {
                    try {
                        track.requestFrame?.();
                    } catch {
                        /* requestFrame is optional. */
                    }
                });

                frame += 1;
                const percent = Math.min( 99, Math.round(state.currentTime / total * 100) );
                $("#progressBar").style.width = `${percent}%`;
                $("#progressPercent").textContent = `${percent}%`;
                $("#progressLabel").textContent = `Rendering ${formatTime(state.currentTime)} of ${formatTime(total)}`;

                const wait = frame * frameDuration - (performance.now() - startedAt);
                if (wait > 0) {
                    await new Promise((resolve) => setTimeout( resolve, Math.min(wait, frameDuration) ) );
                }
            }

            if (cancelled || signal.aborted) {
                if (recorder.state !== "inactive") {
                    recorder.stop();
                }
                await stopped.catch(() => {});
                throw new DOMException( "Export cancelled", "AbortError" );
            }

            state.currentTime = total;
            state.project.currentTime = total;
            ctx.draw(total);
            await new Promise((resolve) => setTimeout(resolve, 180) );
            if (recorder.state !== "inactive") {
                recorder.stop();
            }
            await stopped;

            const blob = new Blob(chunks, { type: mimeType, });
            if (!blob.size) {
                throw new Error( "The browser created an empty recording. Try again." );
            }

            if (state.lastExportURL) {
                URL.revokeObjectURL(state.lastExportURL);
            }

            state.lastExportURL = URL.createObjectURL(blob);
            $("#successName").textContent = filename;
            $("#successDetails").textContent = `WebM video · ${(blob.size / 1_048_576).toFixed(1)} MB · ${formatTime(total)}`;
            $("#downloadLink").href = state.lastExportURL;
            $("#downloadLink").download = filename;

            $("#progressBar").style.width = "100%";
            $("#progressPercent").textContent = "100%";
            elements.renderDialog.close();
            elements.successDialog.showModal();

            ctx.toast( "Your video export is ready.", "success" );
        } catch (error) {
            if ( error.name === "AbortError" || signal.aborted ) {
                elements.renderDialog.close();
                ctx.toast( "Export cancelled. Your project is unchanged." );
            } else {
                $("#renderTitle").textContent = "Export couldn't finish";
                $("#renderDescription").textContent = "Your project is safe. Review the message below and try again.";

                $("#renderError").textContent = error.message || "Unexpected rendering error.";
                $("#renderError").classList.remove("hidden");
                $("#renderInfo").classList.add("hidden");

                $("#progressLabel").textContent = "Export stopped";
                $("#progressPercent").textContent = "—";
                $("#cancelRender").textContent = "Close";
                $("#retryRender").classList.remove("hidden");
            }

        } finally {
            state.exportController = null;
            stream?.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch {
                    /* Stream cleanup is best-effort. */
                }
            });

            elements.canvas.width = original.width;
            elements.canvas.height = original.height;
            state.currentTime = original.time;
            state.project.currentTime = original.time;
            state.videoPool.forEach((video) => video.pause());
            state.audioPool.forEach((audio) => audio.pause());

            ctx.draw(state.currentTime);
            ctx.updateTimes();
            ctx.updatePlayhead();
            ctx.renderAll();
            if (original.wasPlaying) {
                ctx.play();
            }
        }
    }

    function cancelExport() {
        if (state.exportController) {
            state.exportController.abort();
            $("#cancelRender").disabled = true;
            $("#cancelRender").textContent = "Cancelling…";
        } else {
            elements.renderDialog.close();
        }
    }


    function setupEvents() {
        $("#export").addEventListener("click", openExport);
        $("#render").addEventListener("click", renderExport);
        $("#cancelExport").addEventListener("click", () => elements.exportDialog.close() );

        $("#cancelRender").addEventListener("click", cancelExport);
        $("#retryRender").addEventListener("click", () => {
            elements.renderDialog.close();
            openExport();
        });

        $("#continueEditing").addEventListener("click", () => elements.successDialog.close() );
        $("#newProject").addEventListener("click", async () => {
            elements.successDialog.close();
            if ( await ctx.confirm( "Start a new project?", "Your current project will be cleared.", "Start new project" ) ) {
                ctx.resetProject();
            }
        });
    }

    ctx.openExport = openExport;
    ctx.renderExport = renderExport;
    ctx.cancelExport = cancelExport;
    setupEvents();
}