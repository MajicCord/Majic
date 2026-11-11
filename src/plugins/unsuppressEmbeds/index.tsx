/*
 * Majic — UnsuppressEmbeds plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { createStrings } from "@i18n";
import { definePlugin } from "@utils/types";
import { DiscordIcon, Endpoints, Permissions, React, RestAPI, Stores } from "@webpack/common";

const s = createStrings({
    en: { unsuppress: "Unsuppress Embeds", suppress: "Suppress Embeds" },
    fr: { unsuppress: "Réafficher les intégrations", suppress: "Masquer les intégrations" }
});

const EMBED_SUPPRESSED = 1 << 2;

const ImageVisible = (props: { width?: number }) => <DiscordIcon name="EyeIcon" size={props.width ?? 18} />;
const ImageInvisible = (props: { width?: number }) => <DiscordIcon name="EyeSlashIcon" size={props.width ?? 18} />;

export default definePlugin({
    name: "UnsuppressEmbeds",
    description: "Lets you unsuppress embeds in messages",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet de réafficher les intégrations masquées dans les messages"
        }
    },

    contextMenus: {
        message(children, { channel, message }: { channel?: any; message?: any } = {}) {
            if (!channel || !message) return;
            const { author, messageSnapshots, embeds, flags, id: messageId } = message;

            const isEmbedSuppressed = (flags & EMBED_SUPPRESSED) !== 0;
            const hasEmbedsInSnapshots = (messageSnapshots ?? []).some((snapshot: any) => snapshot.message.embeds.length);

            if (!isEmbedSuppressed && !embeds.length && !hasEmbedsInSnapshots) return;

            const hasEmbedPerms = channel.isPrivate() || !!(Stores.PermissionStore.getChannelPermissions({ id: channel.id }) & Permissions.EMBED_LINKS);
            if (author.id === Stores.UserStore.getCurrentUser().id && !hasEmbedPerms) return;

            const menuGroup = findGroupChildrenByChildId("delete", children);
            const deleteIndex = menuGroup?.findIndex(item => item?.props?.id === "delete");
            if (deleteIndex == null || !menuGroup) return;

            const Icon = isEmbedSuppressed ? ImageVisible : ImageInvisible;
            menuGroup.splice(deleteIndex - 1, 0, (
                <Menu.MenuItem
                    id="unsuppress-embeds"
                    key="unsuppress-embeds"
                    label={isEmbedSuppressed ? s("unsuppress") : s("suppress")}
                    color={isEmbedSuppressed ? undefined : "danger"}
                    icon={Icon}
                    leadingAccessory={{ type: "icon", icon: Icon }}
                    action={() =>
                        RestAPI.patch({
                            url: Endpoints.MESSAGE(channel.id, messageId),
                            body: { flags: isEmbedSuppressed ? flags & ~EMBED_SUPPRESSED : flags | EMBED_SUPPRESSED }
                        })
                    }
                />
            ));
        }
    }
});
