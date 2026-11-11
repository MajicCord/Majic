/*
 * Majic — SuperReactionTweaks plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";
import { Stores } from "@webpack/common";

const settings = definePluginSettings({
    superReactByDefault: {
        type: OptionType.BOOLEAN,
        description: "The reaction picker defaults to Super Reactions",
        default: true
    },
    unlimitedSuperReactionPlaying: {
        type: OptionType.BOOLEAN,
        description: "Remove the limit on Super Reactions playing at once",
        default: false
    },
    superReactionPlayingLimit: {
        type: OptionType.SLIDER,
        description: "Max Super Reactions to play at once (0 to disable playing Super Reactions)",
        default: 20,
        markers: [0, 5, 10, 20, 40, 60, 80, 100],
        stickToMarkers: true,
        disabled() { return Boolean(this.store.unlimitedSuperReactionPlaying); }
    }
});

export default definePlugin({
    name: "SuperReactionTweaks",
    description: "Customizes the limit of Super Reactions playing at once, and super reacts by default",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Règle la limite de Super Réactions jouées en même temps, et utilise les Super Réactions par défaut",
            options: {
                superReactByDefault: "Le sélecteur de réactions utilise les Super Réactions par défaut",
                unlimitedSuperReactionPlaying: "Supprimer la limite de Super Réactions jouées en même temps",
                superReactionPlayingLimit: "Nombre max de Super Réactions jouées en même temps (0 pour ne plus les jouer)"
            }
        }
    },
    settings,

    patches: [
        {
            find: ",BURST_REACTION_EFFECT_PLAY",
            replacement: {
                match: /(BURST_REACTION_EFFECT_PLAY:(?:\i=>|function\(\i\)){.+?if\()(\(?(?:function)?\(\i,\i\)(?:=>)?{.+?\(\i,\i\))>=5+?(?=\))/,
                replace: (_: string, rest: string, playingCount: string) => `${rest}!$self.shouldPlayBurstReaction(${playingCount})`
            }
        },
        {
            find: ".EMOJI_PICKER_CONSTANTS_EMOJI_CONTAINER_PADDING_HORIZONTAL)",
            replacement: {
                match: /(openPopoutType:void 0(?=.+?isBurstReaction:(\i).+?\.intention===(\i\.\i\.REACTION)).+?\[\2,\i\]=\i\.useState\()!1\)(?<=pickerIntention:(\i).+?)/,
                replace: (_: string, rest: string, _isBurstReactionVariable: string, REACTION_INTENTION: string, pickerIntention: string) =>
                    `${rest}$self.shouldSuperReactByDefault&&${pickerIntention}===${REACTION_INTENTION})`
            }
        }
    ],

    shouldPlayBurstReaction(playingCount: number) {
        if (settings.store.unlimitedSuperReactionPlaying) return true;
        return settings.store.superReactionPlayingLimit > playingCount;
    },

    get shouldSuperReactByDefault() {
        return settings.store.superReactByDefault && Stores.UserStore.getCurrentUser().premiumType != null;
    }
});
