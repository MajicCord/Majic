/*
 * Majic — FriendInvites plugin
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/commands";
import { createStrings } from "@i18n";
import { definePlugin } from "@utils/types";
import { findByPropsLazy } from "@webpack";

const s = createStrings({
    en: {
        create: "Generates a friend invite link",
        view: "View a list of all generated friend invites",
        revoke: "Revokes all generated friend invites",
        expires: "Expires",
        maxUses: "Max uses",
        timesUsed: "Times used",
        none: "You have no active friend invites!",
        revoked: "All friend invites have been revoked."
    },
    fr: {
        create: "Génère un lien d'invitation d'ami",
        view: "Affiche la liste de toutes les invitations d'ami générées",
        revoke: "Révoque toutes les invitations d'ami générées",
        expires: "Expire",
        maxUses: "Utilisations max",
        timesUsed: "Utilisations",
        none: "Tu n'as aucune invitation d'ami active !",
        revoked: "Toutes les invitations d'ami ont été révoquées."
    }
});

const FriendInvites = findByPropsLazy("createFriendInvite");

const toUnix = (date: string) => Math.round(new Date(date).getTime() / 1000);

export default definePlugin({
    name: "FriendInvites",
    description: "Create and manage friend invite links with slash commands (/create friend invite, /view friend invites, /revoke friend invites)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Crée et gère des liens d'invitation d'ami avec des commandes (/create friend invite, /view friend invites, /revoke friend invites)"
        }
    },

    commands: [
        {
            name: "create friend invite",
            get description() { return s("create"); },
            inputType: ApplicationCommandInputType.BUILT_IN,
            async execute(_, ctx) {
                const invite = await FriendInvites.createFriendInvite();

                sendBotMessage(ctx.channel.id, {
                    content: `discord.gg/${invite.code} · ${s("expires")}: <t:${toUnix(invite.expires_at)}:R> · ${s("maxUses")}: \`${invite.max_uses}\``
                });
            }
        },
        {
            name: "view friend invites",
            get description() { return s("view"); },
            inputType: ApplicationCommandInputType.BUILT_IN,
            async execute(_, ctx) {
                const invites: any[] = await FriendInvites.getAllFriendInvites();
                const friendInviteList = invites.map(i =>
                    `_discord.gg/${i.code}_ · ${s("expires")}: <t:${toUnix(i.expires_at)}:R> · ${s("timesUsed")}: \`${i.uses}/${i.max_uses}\``
                );

                sendBotMessage(ctx.channel.id, {
                    content: friendInviteList.join("\n") || s("none")
                });
            }
        },
        {
            name: "revoke friend invites",
            get description() { return s("revoke"); },
            inputType: ApplicationCommandInputType.BUILT_IN,
            async execute(_, ctx) {
                await FriendInvites.revokeFriendInvites();
                sendBotMessage(ctx.channel.id, { content: s("revoked") });
            }
        }
    ]
});
