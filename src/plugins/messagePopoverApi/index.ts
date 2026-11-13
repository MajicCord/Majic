/*
 * Majic — MessagePopoverAPI core plugin
 */

import { _renderPopoverButtons } from "@api/messagePopover";
import { definePlugin } from "@utils/types";
import { Stores } from "@webpack/common";
import type { ComponentType } from "react";

export default definePlugin({
    name: "MessagePopoverAPI",
    description: "Lets plugins add buttons to the bar shown when hovering a message",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter des boutons à la barre qui apparaît au survol d'un message"
        }
    },
    required: true,

    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}),children",
            replacement: {
                match: /(?<=\]\}\)),(.{0,40}togglePopout:.+?\}\))\]\}\):null,(?<=\((\i\.\i|\i),\{label:.+?:null,(\i)\?\(0,\i\.jsxs?\)\(\i\.Fragment.+?message:(\i).+?)/,
                replace: (_: string, reactButton: string, buttonComponent: string, showReactButton: string, message: string) =>
                    `]}):null,$self.renderButtons(${buttonComponent},${message}),${showReactButton}?${reactButton}:null,`
            }
        }
    ],

    renderButtons(ButtonComponent: ComponentType<any>, message: any) {
        const channel = message ? Stores.ChannelStore.getChannel(message.channel_id) : null;
        return _renderPopoverButtons({ message, channel }, ButtonComponent);
    }
});
