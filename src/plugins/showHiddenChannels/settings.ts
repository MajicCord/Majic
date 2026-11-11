/*
 * Majic — ShowHiddenChannels settings
 */

import { definePluginSettings } from "@api/settings";
import { createStrings, getLocale } from "@i18n";
import { OptionType } from "@utils/types";
import { moment } from "@webpack/common";

export const s = createStrings({
    en: {
        lockIconMode: "Plain style with a lock icon instead",
        mutedMode: "Muted style with a hidden eye icon on the right",
        hiddenChannel: "Hidden Channel",
        headingHidden: "This is a hidden {type} channel",
        headingLocked: "This is a locked {type} channel",
        typeText: "text",
        typeAnnouncement: "announcement",
        typeForum: "forum",
        typeVoice: "voice",
        typeStage: "stage",
        cannotSeeMessages: "You can not see the messages of this channel.",
        cannotSeePosts: "You can not see the posts of this channel.",
        guidelines: " However you may see its guidelines:",
        lastMessage: "Last message created: ",
        lastPost: "Last post created: ",
        lastPin: "Last message pin: ",
        slowmode: "Slowmode: {duration}",
        threadSlowmode: "Default thread slowmode: {duration}",
        bitrate: "Bitrate: {bitrate} bits",
        region: "Region: {region}",
        automatic: "Automatic",
        videoQuality: "Video quality mode: {mode}",
        archiveThreads: "Default inactivity duration before archiving threads: {duration}",
        archivePosts: "Default inactivity duration before archiving posts: {duration}",
        defaultLayout: "Default layout: {layout}",
        defaultSort: "Default sort order: {order}",
        defaultEmoji: "Default reaction emoji:",
        requireTag: "Posts on this forum require a tag to be set.",
        availableTags: "Available tags:",
        permissionDetails: "Permission Details",
        allowedUsers: "Allowed users and roles:",
        hideAllowed: "Hide Allowed Users and Roles",
        viewAllowed: "View Allowed Users and Roles",
        latestActivity: "Latest activity",
        creationDate: "Creation date",
        notSet: "Not set",
        listView: "List view",
        galleryView: "Gallery view",
        and: " and "
    },
    fr: {
        lockIconMode: "Style normal avec une icône de cadenas",
        mutedMode: "Style en sourdine avec une icône d'œil barré à droite",
        hiddenChannel: "Salon caché",
        headingHidden: "Ceci est un salon {type} caché",
        headingLocked: "Ceci est un salon {type} verrouillé",
        typeText: "textuel",
        typeAnnouncement: "d'annonces",
        typeForum: "forum",
        typeVoice: "vocal",
        typeStage: "de conférence",
        cannotSeeMessages: "Tu ne peux pas voir les messages de ce salon.",
        cannotSeePosts: "Tu ne peux pas voir les publications de ce salon.",
        guidelines: " Tu peux cependant voir ses règles :",
        lastMessage: "Dernier message : ",
        lastPost: "Dernière publication : ",
        lastPin: "Dernier message épinglé : ",
        slowmode: "Mode lent : {duration}",
        threadSlowmode: "Mode lent par défaut des fils : {duration}",
        bitrate: "Débit : {bitrate} bits",
        region: "Région : {region}",
        automatic: "Automatique",
        videoQuality: "Qualité vidéo : {mode}",
        archiveThreads: "Durée d'inactivité avant archivage des fils : {duration}",
        archivePosts: "Durée d'inactivité avant archivage des publications : {duration}",
        defaultLayout: "Disposition par défaut : {layout}",
        defaultSort: "Tri par défaut : {order}",
        defaultEmoji: "Réaction par défaut :",
        requireTag: "Les publications de ce forum doivent avoir un tag.",
        availableTags: "Tags disponibles :",
        permissionDetails: "Détails des permissions",
        allowedUsers: "Utilisateurs et rôles autorisés :",
        hideAllowed: "Masquer les utilisateurs et rôles autorisés",
        viewAllowed: "Voir les utilisateurs et rôles autorisés",
        latestActivity: "Activité récente",
        creationDate: "Date de création",
        notSet: "Non défini",
        listView: "Liste",
        galleryView: "Galerie",
        and: " et "
    }
});

const UNIT_NAMES = {
    en: {
        years: ["year", "years"],
        months: ["month", "months"],
        weeks: ["week", "weeks"],
        days: ["day", "days"],
        hours: ["hour", "hours"],
        minutes: ["minute", "minutes"],
        seconds: ["second", "seconds"]
    },
    fr: {
        years: ["an", "ans"],
        months: ["mois", "mois"],
        weeks: ["semaine", "semaines"],
        days: ["jour", "jours"],
        hours: ["heure", "heures"],
        minutes: ["minute", "minutes"],
        seconds: ["seconde", "secondes"]
    }
} as const;

const units = ["years", "months", "weeks", "days", "hours", "minutes", "seconds"] as const;
type Unit = typeof units[number];

function unitName(unit: Unit, isOne: boolean) {
    const locale = getLocale() === "fr" ? "fr" : "en";
    return UNIT_NAMES[locale][unit][isOne ? 0 : 1];
}

export function formatDurationVerbose(time: number, unit: Unit) {
    const dur = moment.duration(time, unit);

    let unitsAmounts = units.map(u => ({ amount: dur[u]() as number, unit: u }));

    let amountsToBeRemoved = 0;

    outer:
    for (let i = 0; i < unitsAmounts.length; i++) {
        if (unitsAmounts[i].amount === 0 || !(i + 1 < unitsAmounts.length)) continue;
        for (let v = i + 1; v < unitsAmounts.length; v++) {
            if (unitsAmounts[v].amount !== 0) continue outer;
        }
        amountsToBeRemoved = unitsAmounts.length - (i + 1);
    }
    unitsAmounts = amountsToBeRemoved === 0 ? unitsAmounts : unitsAmounts.slice(0, -amountsToBeRemoved);

    const daysAmountIndex = unitsAmounts.findIndex(({ unit: u }) => u === "days");
    if (daysAmountIndex !== -1) {
        const daysAmount = unitsAmounts[daysAmountIndex];
        const daysMod = daysAmount.amount % 7;
        if (daysMod === 0) unitsAmounts.splice(daysAmountIndex, 1);
        else daysAmount.amount = daysMod;
    }

    let res = "";
    while (unitsAmounts.length) {
        const { amount, unit: u } = unitsAmounts.shift()!;

        if (res.length) res += unitsAmounts.length ? ", " : s("and");
        if (amount > 0 || res.length) res += `${amount} ${unitName(u, amount === 1)}`;
    }

    return res.length ? res : `0 ${unitName(unit, false)}`;
}

export const ShowMode = {
    LockIcon: 0,
    HiddenIconWithMutedStyle: 1
} as const;

export const cl = (name: string) => `majic-shc-${name}`;

export const settings = definePluginSettings({
    hideUnreads: {
        type: OptionType.BOOLEAN,
        description: "Hide unreads",
        default: true,
        restartNeeded: true
    },
    showMode: {
        type: OptionType.SELECT,
        description: "How hidden channels are displayed",
        options: [
            { get label() { return s("lockIconMode"); }, value: ShowMode.LockIcon, default: true },
            { get label() { return s("mutedMode"); }, value: ShowMode.HiddenIconWithMutedStyle }
        ],
        restartNeeded: true
    },
    defaultAllowedUsersAndRolesDropdownState: {
        type: OptionType.BOOLEAN,
        description: "Open the allowed users and roles list on hidden channels by default",
        default: true
    }
});
