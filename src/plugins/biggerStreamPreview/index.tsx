/*
 * Majic — BiggerStreamPreview plugin
 */

import { Menu } from "@api/contextMenu";
import { createStrings } from "@i18n";
import { openImageModal } from "@utils/discord";
import { definePlugin } from "@utils/types";
import { DiscordIcon, React, Stores } from "@webpack/common";

const s = createStrings({
    en: { view: "View Stream Preview" },
    fr: { view: "Voir l'aperçu du stream" }
});

const ScreenshareIcon = (props: { width?: number }) => <DiscordIcon name="ScreenStreamIcon" size={props.width ?? 18} />;

async function handleViewPreview({ guildId, channelId, ownerId }: { guildId?: string; channelId: string; ownerId: string }) {
    const previewUrl = await Stores.ApplicationStreamPreviewStore.getPreviewURL(guildId, channelId, ownerId);
    if (!previewUrl) return;

    openImageModal({ url: previewUrl, height: 720, width: 1280 });
}

function addViewStreamContext(children: any[], userId: string) {
    const stream = Stores.ApplicationStreamingStore.getAnyStreamForUser(userId);
    if (!stream) return;

    children.push(
        <Menu.MenuSeparator key="majic-stream-preview-separator" />,
        <Menu.MenuItem
            key="view-stream-preview"
            id="view-stream-preview"
            label={s("view")}
            icon={ScreenshareIcon}
            leadingAccessory={{ type: "icon", icon: ScreenshareIcon }}
            action={() => handleViewPreview(stream)}
        />
    );
}

export default definePlugin({
    name: "BiggerStreamPreview",
    description: "Lets you open stream previews in full size",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["DynamicImageModalAPI"],
    translations: {
        fr: {
            description: "Permet d'ouvrir l'aperçu des streams en grand"
        }
    },

    contextMenus: {
        "user-context"(children, { user }: { user?: { id: string } } = {}) {
            if (user) addViewStreamContext(children, user.id);
        },
        "stream-context"(children, { stream }: { stream?: { ownerId: string } } = {}) {
            if (stream) addViewStreamContext(children, stream.ownerId);
        }
    }
});
