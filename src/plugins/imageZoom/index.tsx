/*
 * Majic — ImageZoom plugin
 */

import { Menu } from "@api/contextMenu";
import { createStrings } from "@i18n";
import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";
import { createRoot, React } from "@webpack/common";

import { Magnifier } from "./components/Magnifier";
import { ELEMENT_ID } from "./constants";
import { settings } from "./settings";
import { debounce } from "./utils/waitFor";

const s = createStrings({
    en: { square: "Square Lens", nearest: "Nearest Neighbour", zoom: "Zoom", size: "Lens Size", speed: "Zoom Speed" },
    fr: { square: "Loupe carrée", nearest: "Pixels nets", zoom: "Zoom", size: "Taille de la loupe", speed: "Vitesse du zoom" }
});

const logger = new Logger("ImageZoom", "#ff79c6");

function imageContextMenuPatch(children: any[], props: any) {
    if (!props || "href" in props) return;
    if (props.target?.classList?.contains("emoji")) return;

    const { square, nearestNeighbour } = settings.store;

    children.push(
        <Menu.MenuGroup id="image-zoom" key="majic-image-zoom">
            <Menu.MenuCheckboxItem
                id="majic-square"
                label={s("square")}
                checked={square}
                action={() => {
                    settings.store.square = !square;
                }}
            />
            <Menu.MenuCheckboxItem
                id="majic-nearest-neighbour"
                label={s("nearest")}
                checked={nearestNeighbour}
                action={() => {
                    settings.store.nearestNeighbour = !nearestNeighbour;
                }}
            />
            <Menu.MenuControlItem
                id="majic-zoom"
                label={s("zoom")}
                control={(controlProps: any, ref: any) => (
                    <Menu.MenuSliderControl
                        ref={ref}
                        {...controlProps}
                        minValue={1}
                        maxValue={50}
                        value={settings.store.zoom}
                        onChange={debounce((value: number) => settings.store.zoom = value, 100)}
                        renderValue={(value: number) => `${value.toFixed(3)}x`}
                    />
                )}
            />
            <Menu.MenuControlItem
                id="majic-size"
                label={s("size")}
                control={(controlProps: any, ref: any) => (
                    <Menu.MenuSliderControl
                        ref={ref}
                        {...controlProps}
                        minValue={50}
                        maxValue={1000}
                        value={settings.store.size}
                        onChange={debounce((value: number) => settings.store.size = value, 100)}
                    />
                )}
            />
            <Menu.MenuControlItem
                id="majic-zoom-speed"
                label={s("speed")}
                control={(controlProps: any, ref: any) => (
                    <Menu.MenuSliderControl
                        ref={ref}
                        {...controlProps}
                        minValue={0.1}
                        maxValue={5}
                        value={settings.store.zoomSpeed}
                        onChange={debounce((value: number) => settings.store.zoomSpeed = value, 100)}
                        renderValue={(value: number) => `${value.toFixed(3)}x`}
                    />
                )}
            />
        </Menu.MenuGroup>
    );
}

export default definePlugin({
    name: "ImageZoom",
    description: "Lets you zoom into images and GIFs. Scroll to zoom, Shift + scroll to change the lens size",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet de zoomer dans les images et GIF. Molette pour zoomer, Maj + molette pour changer la taille de la loupe",
            options: {
                saveZoomValues: "Enregistrer le zoom et la taille de la loupe",
                invertScroll: "Inverser le défilement",
                nearestNeighbour: "Garder les pixels nets en agrandissant les images",
                square: "Loupe carrée",
                zoom: "Zoom de la loupe",
                size: "Rayon / taille de la loupe",
                zoomSpeed: "Vitesse de changement du zoom / de la taille"
            }
        }
    },
    settings,

    css: [
        ".majic-imgzoom-lens { position: absolute; inset: 0; z-index: 9999; border: 2px solid grey; border-radius: 50%; overflow: hidden; cursor: none; box-shadow: inset 0 0 10px 2px grey; filter: drop-shadow(0 0 2px grey); pointer-events: none; margin: -2px; }",
        ".majic-imgzoom-square { border-radius: 0; }",
        ".majic-imgzoom-nearest-neighbor > .majic-imgzoom-image { image-rendering: pixelated; }"
    ].join(" "),

    patches: [
        {
            find: "disableArrowKeySeek:!0",
            replacement: [
                {
                    match: /useFullWidth:!0,shouldLink:/,
                    replace: `id:"${ELEMENT_ID}",$&`
                },
                {
                    match: /(?<=null!=(\i)\?.{0,20})\i(?:\.\i)?,{children:\1/,
                    replace: "'div',{onClick:e=>e.stopPropagation(),children:$1"
                }
            ]
        },
        {
            find: '="FOCUS_SENSITIVE",',
            replacement: {
                match: /(?<=\[\i\.\i]:)\i&&!\i&&"PINNED"!==\i/,
                replace: "false"
            }
        },
        {
            find: ".handleImageLoad)",
            replacement: [
                {
                    match: /placeholderVersion:\i,(?=.{0,50}children:)/,
                    replace: "...$self.makeProps(this),$&"
                },
                {
                    match: /componentDidMount\(\){/,
                    replace: "$&$self.renderMagnifier(this);"
                },
                {
                    match: /componentWillUnmount\(\){/,
                    replace: "$&$self.unMountMagnifier();"
                },
                {
                    match: /componentDidUpdate\(\i\){/,
                    replace: "$&$self.updateMagnifier(this);"
                }
            ]
        }
    ],

    contextMenus: {
        "image-context": imageContextMenuPatch
    },

    currentMagnifierElement: null as React.ReactElement | null,
    element: null as HTMLDivElement | null,
    root: null as { render(node: unknown): void; unmount(): void } | null,

    makeProps(instance: any) {
        return {
            onMouseOver: () => this.onMouseOver(instance),
            onMouseOut: () => this.onMouseOut(instance),
            onMouseDown: (e: React.MouseEvent) => this.onMouseDown(e, instance),
            onMouseUp: () => this.onMouseUp(instance),
            id: instance.props.id
        };
    },

    renderMagnifier(instance: any) {
        try {
            if (instance.props.id !== ELEMENT_ID || this.currentMagnifierElement) return;
            this.currentMagnifierElement = <Magnifier size={settings.store.size} zoom={settings.store.zoom} instance={instance} />;
            this.root = createRoot(this.element!);
            this.root.render(this.currentMagnifierElement);
        } catch (err) {
            logger.error("Failed to render magnifier", err);
        }
    },

    updateMagnifier(instance: any) {
        this.unMountMagnifier();
        this.renderMagnifier(instance);
    },

    unMountMagnifier() {
        this.root?.unmount();
        this.currentMagnifierElement = null;
        this.root = null;
    },

    onMouseOver(instance: any) {
        instance.setState((state: any) => ({ ...state, mouseOver: true }));
    },

    onMouseOut(instance: any) {
        instance.setState((state: any) => ({ ...state, mouseOver: false }));
    },

    onMouseDown(e: React.MouseEvent, instance: any) {
        if (e.button === 0) instance.setState((state: any) => ({ ...state, mouseDown: true }));
    },

    onMouseUp(instance: any) {
        instance.setState((state: any) => ({ ...state, mouseDown: false }));
    },

    start() {
        this.element = document.createElement("div");
        this.element.classList.add("MagnifierContainer");
        document.body.appendChild(this.element);
    },

    stop() {
        this.root?.unmount();
        this.element?.remove();
    }
});
