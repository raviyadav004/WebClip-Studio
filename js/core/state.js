import {
    APP_CONFIG,
} from "../config.js";

import {
    uid,
} from "../utils/helpers.js";


export function createProject(name = "Untitled project") {
    return {
        id: uid("project"),
        name,
        width: APP_CONFIG.defaultWidth,
        height: APP_CONFIG.defaultHeight,
        fps: APP_CONFIG.defaultFps,

        clips: [],
        texts: [],
        audios: [],

        selected: null,
        currentTime: 0,

        updatedAt: new Date().toISOString(),
    };
}


export function createState() {
    return {
        project: createProject(),
        media: [],
        history: [],
        redoStack: [],

        filter: "all",
        zoom: 100,
        dirty: false,
        playing: false,

        currentTime: 0,
        raf: 0,
        lastTick: 0,
        activeClip: null,

        drag: null,
        confirmResolve: null,
        exportController: null,

        lastExportURL: null,

        videoPool: new Map(),
        audioPool: new Map(),

        audioContext: null,
        audioDestination: null,
        audioNodes: new Map(),

        pendingMediaRefs: [],
        currentExport: null,
    };
}


export function getElements() {
    const ids = [
        "welcome",
        "editor",
        "canvas",
        "videoInput",
        "audioInput",
        "mediaList",
        "inspector",
        "timelineCanvas",
        "timelineScroll",
        "ruler",
        "videoTrack",
        "textTrack",
        "audioTrack",
        "playhead",
        "exportDialog",
        "renderDialog",
        "successDialog",
        "confirmDialog",
        "saveDialog",
        "toasts",
    ];

    return Object.fromEntries(
        ids.map((id) => [
            id,
            document.getElementById(id),
        ])
    );
}