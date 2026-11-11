/*
 * Majic — ImageZoom settings
 */

import { definePluginSettings } from "@api/settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    saveZoomValues: {
        type: OptionType.BOOLEAN,
        description: "Save zoom and lens size values",
        default: true
    },
    invertScroll: {
        type: OptionType.BOOLEAN,
        description: "Invert scroll",
        default: true
    },
    nearestNeighbour: {
        type: OptionType.BOOLEAN,
        description: "Use nearest neighbour interpolation when scaling images",
        default: false
    },
    square: {
        type: OptionType.BOOLEAN,
        description: "Make the lens square",
        default: false
    },
    zoom: {
        type: OptionType.SLIDER,
        description: "Zoom of the lens",
        markers: [1, 5, 10, 20, 30, 40, 50],
        default: 2,
        stickToMarkers: false
    },
    size: {
        type: OptionType.SLIDER,
        description: "Radius / size of the lens",
        markers: [50, 100, 250, 500, 750, 1000],
        default: 100,
        stickToMarkers: false
    },
    zoomSpeed: {
        type: OptionType.SLIDER,
        description: "How fast the zoom / lens size changes",
        markers: [0.1, 0.5, 1, 2, 3, 4, 5],
        default: 0.5,
        stickToMarkers: false
    }
});
