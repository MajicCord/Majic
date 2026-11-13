/*
 * Majic — GreetStickerPicker plugin
 */

import { Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { ContextMenuApi, FluxDispatcher, MessageActions, React } from "@webpack/common";

const s = createStrings({
    en: {
        greet: "Greet (you can only greet 3 times)",
        normal: "Normal Message (you can greet spam)",
        modeGreet: "Greet",
        modeMessage: "Message",
        menuLabel: "Greet Sticker Picker",
        greetMode: "Greet Mode",
        greetStickers: "Greet Stickers",
        multiGreet: "Unholy Multi-Greet",
        sendGreets: "Send Greets"
    },
    fr: {
        greet: "Salutation (tu ne peux saluer que 3 fois)",
        normal: "Message normal (tu peux saluer à volonté)",
        modeGreet: "Salutation",
        modeMessage: "Message",
        menuLabel: "Choix du sticker de salutation",
        greetMode: "Mode de salutation",
        greetStickers: "Stickers de salutation",
        multiGreet: "Multi-salutation interdite",
        sendGreets: "Envoyer les salutations"
    }
});

const GreetMode = {
    Greet: "Greet",
    NormalMessage: "Message"
} as const;

type GreetModeValue = typeof GreetMode[keyof typeof GreetMode];

const MenuRoot = findComponentByCodeLazy('path:["empty"]');

const settings = definePluginSettings({
    greetMode: {
        type: OptionType.SELECT,
        description: "Choose the greet mode",
        options: [
            { get label() { return s("greet"); }, value: GreetMode.Greet, default: true },
            { get label() { return s("normal"); }, value: GreetMode.NormalMessage }
        ]
    }
});

interface PrivateSettings {
    greetMode: GreetModeValue;
    multiGreetChoices?: string[];
    unholyMultiGreetEnabled?: boolean;
}

let WELCOME_STICKERS: any[] = [];

function greet(channel: any, message: any, stickers: string[]) {
    const options = MessageActions.getSendMessageOptionsForReply({
        channel,
        message,
        shouldMention: true,
        showMentionToggle: true
    });

    if (settings.store.greetMode === GreetMode.NormalMessage || stickers.length > 1) {
        options.stickerIds = stickers;
        MessageActions._sendMessage(channel.id, { content: "", tts: false, invalidEmojis: [], validNonShortcutEmojis: [] }, options);
    } else {
        MessageActions.sendGreetMessage(channel.id, stickers[0], options);
    }
}

function GreetMenu({ channel, message }: { channel: any; message: any }) {
    const store = settings.use(["greetMode", "multiGreetChoices" as "greetMode"]) as unknown as PrivateSettings;
    const { greetMode, multiGreetChoices = [] } = store;

    return (
        <MenuRoot
            navId="greet-sticker-picker"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label={s("menuLabel")}
        >
            <Menu.MenuGroup label={s("greetMode")}>
                {Object.values(GreetMode).map(mode => (
                    <Menu.MenuRadioItem
                        key={mode}
                        group="greet-mode"
                        id={"greet-mode-" + mode}
                        label={mode === GreetMode.Greet ? s("modeGreet") : s("modeMessage")}
                        checked={mode === greetMode}
                        action={() => store.greetMode = mode}
                    />
                ))}
            </Menu.MenuGroup>

            <Menu.MenuSeparator />

            <Menu.MenuGroup label={s("greetStickers")}>
                {WELCOME_STICKERS.map(sticker => (
                    <Menu.MenuItem
                        key={sticker.id}
                        id={"greet-" + sticker.id}
                        label={sticker.description.split(" ")[0]}
                        action={() => greet(channel, message, [sticker.id])}
                    />
                ))}
            </Menu.MenuGroup>

            {!store.unholyMultiGreetEnabled ? null : (
                <>
                    <Menu.MenuSeparator />

                    <Menu.MenuItem label={s("multiGreet")} id="unholy-multi-greet">
                        {WELCOME_STICKERS.map(sticker => {
                            const checked = multiGreetChoices.some(id => id === sticker.id);

                            return (
                                <Menu.MenuCheckboxItem
                                    key={sticker.id}
                                    id={"multi-greet-" + sticker.id}
                                    label={sticker.description.split(" ")[0]}
                                    checked={checked}
                                    disabled={!checked && multiGreetChoices.length >= 3}
                                    action={() => {
                                        store.multiGreetChoices = checked
                                            ? multiGreetChoices.filter(id => id !== sticker.id)
                                            : [...multiGreetChoices, sticker.id];
                                    }}
                                />
                            );
                        })}

                        <Menu.MenuSeparator />
                        <Menu.MenuItem
                            id="multi-greet-submit"
                            label={s("sendGreets")}
                            action={() => greet(channel, message, multiGreetChoices)}
                            disabled={multiGreetChoices.length === 0}
                        />
                    </Menu.MenuItem>
                </>
            )}
        </MenuRoot>
    );
}

export default definePlugin({
    name: "GreetStickerPicker",
    description: "Lets you pick any greet sticker instead of only the random one by right-clicking the \"Wave to say hi!\" button",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet de choisir n'importe quel sticker de salutation au lieu du sticker aléatoire, avec un clic droit sur le bouton « Faire coucou »",
            options: {
                greetMode: "Choisis le mode de salutation"
            }
        }
    },
    settings,

    patches: [
        {
            find: "#{intl::WELCOME_CTA_LABEL}",
            replacement: {
                match: /className:\i\.\i,(?=.{0,40}?"sticker")(?<={channel:\i,message:\i}=(\i).+?)/,
                replace: "$&onContextMenu:(majicEvent)=>$self.pickSticker(majicEvent, $1),"
            }
        },
        {
            find: '"Wumpus waves hello"',
            replacement: {
                match: /(?<==)(?=\[{id:"749054660769218631",format_type:\d,description:"Wumpus waves hello")/,
                replace: "$self.WELCOME_STICKERS="
            }
        }
    ],

    set WELCOME_STICKERS(value: any[]) {
        WELCOME_STICKERS = value;
    },

    pickSticker(event: React.UIEvent, props: { channel: any; message: any }) {
        if (!props.message.deleted) {
            ContextMenuApi.openContextMenu(event, () => <GreetMenu {...props} />);
        }
    }
});
