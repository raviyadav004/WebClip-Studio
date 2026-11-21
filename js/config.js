export const APP_CONFIG = Object.freeze({
    themeKey: "webclip-theme",
    historyLimit: 80,
    defaultWidth: 1280,
    defaultHeight: 720,
    defaultFps: 30,
});

export function getRecordingMimeType() {
    if (!window.MediaRecorder)
        return "";

    return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}