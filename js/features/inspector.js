import { $, escapeHTML, clamp, } from "../utils/helpers.js";

export function setupInspector(ctx) {
    const { state, elements } = ctx;
    function renderInspector() {
        const container = elements.inspector;
        const clip = ctx.findClip(state.project.selected);
        if (!clip) {
            container.innerHTML = `
                <div class="empty-inspector">
                    <span>◈</span>
                    <b>Nothing selected yet</b>
                    <p>Select a clip on the timeline to fine-tune its look and feel.</p>
                </div> `;
            return;
        }

        const type = ctx.getClipType(clip.id);
        const media = clip.media ? ctx.getMedia(clip.media) : null;
        const group = (title, body) => ` <section class="inspector-group"> <h3>${title}</h3> ${body} </section> `;

        const field = ( label, key, value, inputType = "number", extra = "" ) => `
            <div class="field-row">
                <label for="prop-${key}">${label}</label>
                <input id="prop-${key}" data-prop="${key}" type="${inputType}" value="${escapeHTML(value)}" ${extra} >
            </div>
        `;

        const range = (label, key, value, min, max) => `
            <div class="range-row">
                <div>
                    <label for="prop-${key}">${label}</label>
                    <input id="prop-${key}" data-prop="${key}" type="range" min="${min}" max="${max}" value="${value}" >
                </div>
                <output>${value}%</output>
            </div>
        `;

        let html = `
            <div class="inspector-group">
                <h3> ${type.toUpperCase()} CLIP <span class="pill">${type}</span> </h3>
                <div class="media-details">
                    <b>${escapeHTML(media?.name || clip.text || "Text overlay")}</b>
                    <small>Selected timeline item</small>
                </div>
            </div> `;

        if (type === "video") {
            html +=
                group( "CLIP TIMING", field("Source in (sec)", "in", clip.in.toFixed(2)) + field("Source out (sec)", "out", clip.out.toFixed(2)) + field("Timeline start (sec)", "start", clip.start.toFixed(2)) ) +
                group( "VISUAL ADJUSTMENTS", range("Brightness", "brightness", clip.brightness, 0, 200) + range("Contrast", "contrast", clip.contrast, 0, 200) + range("Grayscale", "gray", clip.gray, 0, 100) ) +
                group( "SOURCE AUDIO", range("Clip volume", "volume", clip.volume, 0, 100) + `<label class="toggle-row"> Mute original audio <input type="checkbox" data-prop="muted" ${clip.muted ? "checked" : ""} > </label>` );

        } else if (type === "audio") {
            html +=
                group( "CLIP TIMING", field("Source in (sec)", "in", clip.in.toFixed(2)) + field("Source out (sec)", "out", clip.out.toFixed(2)) + field("Timeline start (sec)", "start", clip.start.toFixed(2)) ) +
                group( "AUDIO MIX", range("Volume", "volume", clip.volume, 0, 100) + `<label class="toggle-row"> Mute audio <input type="checkbox" data-prop="muted" ${clip.muted ? "checked" : ""} > </label>` );

        } else {
            html += group( "YOUR MESSAGE",  `
                        <div class="field">
                            <label for="prop-text">Text content</label>
                            <textarea id="prop-text" data-prop="text" maxlength="500" >${escapeHTML(clip.text)}</textarea>
                        </div> ` ) +

                group( "TYPOGRAPHY", field("Font size (px)", "size", clip.size) + field("Font family", "font", clip.font, "text") + field("Text color", "color", clip.color, "color") +
                    `<label class="toggle-row"> Bold text <input type="checkbox" data-prop="bold" ${clip.bold ? "checked" : ""} > </label>` +
                    `<label class="toggle-row"> Text shadow <input type="checkbox" data-prop="shadow" ${clip.shadow ? "checked" : ""} > </label>`
                ) +

                group(
                    "POSITION & TIMING",
                    field("Horizontal (%)", "x", Math.round(clip.x * 100)) +
                    field("Vertical (%)", "y", Math.round(clip.y * 100)) +
                    field("Start (sec)", "start", clip.start.toFixed(2)) +
                    field("Duration (sec)", "duration", clip.duration.toFixed(2)) +

                    `<div class="field-row">
                        <label for="prop-align">Alignment</label>
                        <select id="prop-align" data-prop="align">
                            <option value="left" ${clip.align === "left" ? "selected" : ""}>Left</option>
                            <option value="center" ${clip.align === "center" ? "selected" : ""}>Center</option>
                            <option value="right" ${clip.align === "right" ? "selected" : ""}>Right</option>
                        </select>
                    </div>`
                );
        }


        html += ` <div class="inspector-actions">
                    <button class="button secondary small" data-action="reset"> Reset </button>
                    <button class="button secondary small" data-action="delete"> Delete </button>
                </div> `;
        container.innerHTML = html;
    }


    function setupEvents() {
        elements.inspector.addEventListener("change", (event) => {
            const input = event.target.closest("[data-prop]");
            if (!input)
                return;

            const key = input.dataset.prop;
            let value = input.type === "checkbox" ? input.checked : input.value;
            if ( input.type === "number" || input.type === "range" ) {
                value = Number(value);
            }

            if (key === "x" || key === "y") {
                value = clamp(value, 0, 100) / 100;
            }

            if ( ["brightness", "contrast", "gray", "volume", "size"].includes(key) ) {
                value = Math.max(0, value);
            }
            ctx.updateClip( state.project.selected, { [key]: value }, `Update ${key}` );
        });


        elements.inspector.addEventListener("input", (event) => {
            const input = event.target.closest( 'input[type="range"][data-prop]' );
            if (input) {
                const output = input.closest(".range-row") ?.querySelector("output");
                if (output) {
                    output.textContent = `${input.value}%`;
                }
            }
        });

        elements.inspector.addEventListener("click", (event) => {
            if (event.target.closest('[data-action="delete"]')) {
                ctx.deleteSelected();
            }

            if (event.target.closest('[data-action="reset"]')) {
                $("#resetProps").click();
            }
        });
    }

    ctx.renderInspector = renderInspector;
    setupEvents();
}