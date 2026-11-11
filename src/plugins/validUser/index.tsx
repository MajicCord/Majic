/*
 * Majic — ValidUser plugin
 */

import { createStrings } from "@i18n";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { Queue, sleep } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { Endpoints, FluxDispatcher, React, RestAPI, Stores, useState } from "@webpack/common";
import type { ComponentType, ReactNode } from "react";

const s = createStrings({
    en: {
        activeDeveloper: "Active Developer",
        bugHunter: "Discord Bug Hunter",
        certifiedModerator: "Moderator Programs Alumni",
        staff: "Discord Staff",
        hypesquad: "HypeSquad Events",
        bravery: "HypeSquad Bravery",
        brilliance: "HypeSquad Brilliance",
        balance: "HypeSquad Balance",
        partner: "Partnered Server Owner",
        premium: "Subscriber",
        earlySupporter: "Early Supporter",
        verifiedDeveloper: "Early Verified Bot Developer"
    },
    fr: {
        activeDeveloper: "Développeur actif",
        bugHunter: "Chasseur de bugs Discord",
        certifiedModerator: "Ancien du programme modérateurs",
        staff: "Équipe Discord",
        hypesquad: "Événements HypeSquad",
        bravery: "HypeSquad Bravery",
        brilliance: "HypeSquad Brilliance",
        balance: "HypeSquad Balance",
        partner: "Propriétaire de serveur partenaire",
        premium: "Abonné",
        earlySupporter: "Soutien de la première heure",
        verifiedDeveloper: "Développeur de bot vérifié précoce"
    }
});

interface FakeBadge {
    id: string;
    description: string;
    icon: string;
    link?: string;
}

const Constants = mapMangledModuleLazy('ME:"/users/@me"', {
    UserFlags: filters.byProps("STAFF", "SPAMMER")
});

const badge = (id: string, key: Parameters<typeof s>[0], icon: string, link?: string): FakeBadge => ({
    id,
    get description() { return s(key); },
    icon,
    link
});

const badges: Record<string, FakeBadge> = {
    active_developer: badge("active_developer", "activeDeveloper", "6bdc42827a38498929a4920da12695d9", "https://support-dev.discord.com/hc/en-us/articles/10113997751447"),
    bug_hunter_level_1: badge("bug_hunter_level_1", "bugHunter", "2717692c7dca7289b35297368a940dd0", "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs"),
    bug_hunter_level_2: badge("bug_hunter_level_2", "bugHunter", "848f79194d4be5ff5f81505cbd0ce1e6", "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs"),
    certified_moderator: badge("certified_moderator", "certifiedModerator", "fee1624003e2fee35cb398e125dc479b", "https://discord.com/safety"),
    discord_employee: badge("staff", "staff", "5e74e9b61934fc1f67c65515d1f7e60d", "https://discord.com/company"),
    get staff() { return this.discord_employee; },
    hypesquad: badge("hypesquad", "hypesquad", "bf01d1073931f921909045f3a39fd264", "https://discord.com/hypesquad"),
    hypesquad_online_house_1: badge("hypesquad_house_1", "bravery", "8a88d63823d8a71cd5e390baa45efa02", "https://discord.com/settings/hypesquad-online"),
    hypesquad_online_house_2: badge("hypesquad_house_2", "brilliance", "011940fd013da3f7fb926e4a1cd2e618", "https://discord.com/settings/hypesquad-online"),
    hypesquad_online_house_3: badge("hypesquad_house_3", "balance", "3aa41de486fa12454c3761e8e223442e", "https://discord.com/settings/hypesquad-online"),
    partner: badge("partner", "partner", "3f9748e53446a137a052f3454e2de41e", "https://discord.com/partners"),
    premium: badge("premium", "premium", "2ba85e8026a8614b640c2837bcdfe21b", "https://discord.com/settings/premium"),
    premium_early_supporter: badge("early_supporter", "earlySupporter", "7060786766c9c840eb3019e725d2b358", "https://discord.com/settings/premium"),
    verified_developer: badge("verified_developer", "verifiedDeveloper", "6df5892e0f35b051f8b61eace34f4967")
};

const fetching = new Set<string>();
const queue = new Queue(5);

interface MentionProps {
    data: {
        userId?: string;
        channelId?: string;
        content: any;
    };
    parse: (content: any, props: MentionProps["props"]) => ReactNode;
    props: {
        key: string;
        formatInline: boolean;
        noStyleAndInteraction: boolean;
    };
    RoleMention: ComponentType<any>;
    UserMention: ComponentType<any>;
}

async function getUser(id: string) {
    let userObj = Stores.UserStore.getUser(id);
    if (userObj) return userObj;

    const user: any = await RestAPI.get({ url: Endpoints.USER(id) }).then((response: { body: any }) => {
        FluxDispatcher.dispatch({ type: "USER_UPDATE", user: response.body });
        return response.body;
    });

    await FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_FAILURE", userId: id });

    userObj = Stores.UserStore.getUser(id);
    const fakeBadges: FakeBadge[] = Object.entries(Constants.UserFlags as Record<string, number>)
        .filter(([, flag]) => !isNaN(flag) && userObj.hasFlag(flag))
        .map(([key]) => badges[key.toLowerCase()])
        .filter(entry => entry != null);
    if (user.premium_type || !user.bot && (user.banner || user.avatar?.startsWith?.("a_"))) fakeBadges.push(badges.premium);

    const profile = Stores.UserProfileStore.getUserProfile(id);
    if (profile) {
        profile.accentColor = user.accent_color;
        profile.badges = fakeBadges;
        profile.banner = user.banner;
        profile.premiumType = user.premium_type;
    }

    return userObj;
}

function MentionWrapper({ data, UserMention, RoleMention, parse, props }: MentionProps) {
    const [userId, setUserId] = useState(data.userId);

    if (userId) {
        return (
            <UserMention
                className="mention"
                userId={userId}
                channelId={data.channelId}
                inlinePreview={props.noStyleAndInteraction}
                key={props.key}
            />
        );
    }

    const children = parse(data.content, props) as any;

    return (
        <RoleMention {...data} inlinePreview={props.formatInline}>
            <span
                onMouseEnter={() => {
                    const mention = children?.[0]?.props?.children;
                    if (typeof mention !== "string") return;

                    const id = mention.match(/<@!?(\d+)>/)?.[1];
                    if (!id) return;

                    if (fetching.has(id)) return;
                    if (Stores.UserStore.getUser(id)) return setUserId(id);

                    const fetch = () => {
                        fetching.add(id);

                        queue.unshift(() =>
                            getUser(id)
                                .then(() => {
                                    setUserId(id);
                                    fetching.delete(id);
                                })
                                .catch(err => {
                                    if (err?.status === 429) {
                                        queue.unshift(() => sleep(err?.body?.retry_after ?? 1000).then(fetch));
                                        fetching.delete(id);
                                    }
                                })
                                .finally(() => sleep(300))
                        );
                    };

                    fetch();
                }}
            >
                {children}
            </span>
        </RoleMention>
    );
}

export default definePlugin({
    name: "ValidUser",
    description: "Fixes mentions of unknown users showing up as \"@unknown-user\" (hover a mention to fix it)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Corrige les mentions d'utilisateurs inconnus affichées « @utilisateur-inconnu » (survole une mention pour la corriger)"
        }
    },

    patches: [
        {
            find: 'className:"mention"',
            replacement: {
                match: /react(?=\(\i,\i,\i\).{0,100}return null==.{0,70}\?\(0,\i\.jsx\)\((\i\.\i),.+?jsx\)\((\i\.\i),\{className:"mention")/,
                replace: "react:(...args)=>$self.renderMention($1,$2,...args),originalReact"
            }
        },
        {
            find: "unknownUserMentionPlaceholder:",
            replacement: {
                match: /unknownUserMentionPlaceholder:/,
                replace: "$&false&&"
            }
        }
    ],

    renderMention(RoleMention: ComponentType<any>, UserMention: ComponentType<any>, data: MentionProps["data"], parse: MentionProps["parse"], props: MentionProps["props"]) {
        return (
            <ErrorBoundary name="ValidUser" key={"mention" + data.userId}>
                <MentionWrapper
                    RoleMention={RoleMention}
                    UserMention={UserMention}
                    data={data}
                    parse={parse}
                    props={props}
                />
            </ErrorBoundary>
        );
    }
});
