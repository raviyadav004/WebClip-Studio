import {
    clone,
    uid,
} from "../utils/helpers.js";


export function projectDuration(project) {
    return Math.max(
        0,
        ...project.clips.map(
            (clip) =>
                clip.start +
                (clip.out - clip.in) / (clip.rate || 1)
        ),
        ...project.texts.map(
            (clip) => clip.start + clip.duration
        ),
        ...project.audios.map(
            (clip) => clip.start + clip.out - clip.in
        )
    );
}


export function findClip(project, id) {
    return (
        project.clips.find((item) => item.id === id) ||
        project.texts.find((item) => item.id === id) ||
        project.audios.find((item) => item.id === id) ||
        null
    );
}


export function getClipType(project, id) {
    if (project.clips.some((item) => item.id === id)) {
        return "video";
    }

    if (project.texts.some((item) => item.id === id)) {
        return "text";
    }

    if (project.audios.some((item) => item.id === id)) {
        return "audio";
    }

    return null;
}


export function makeVideoClip(media, start = 0) {
    return {
        id: uid("clip"),
        media: media.id,
        start,
        in: 0,
        out: media.duration,
        rate: 1,
        brightness: 100,
        contrast: 100,
        gray: 0,
        volume: 100,
        muted: false,
    };
}


export function makeAudioClip(media, start = 0) {
    return {
        id: uid("audio"),
        media: media.id,
        start,
        in: 0,
        out: media.duration,
        volume: 80,
        muted: false,
    };
}


export function makeTextClip(start = 0) {
    return {
        id: uid("text"),
        text: "Your story starts here",
        start,
        duration: 5,
        size: 54,
        font: "Arial",
        color: "#ffffff",
        bold: true,
        shadow: true,
        x: 0.5,
        y: 0.82,
        align: "center",
    };
}


export function serializeProject(project) {
    return {
        ...clone(project),
        selected: null,
        currentTime: 0,
        media: [
            ...project.clips,
            ...project.audios,
        ].map((clip) => clip.media),
    };
}


export function validateProject(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        Array.isArray(value.clips) &&
        Array.isArray(value.texts) &&
        Array.isArray(value.audios) &&
        typeof value.name === "string"
    );
}