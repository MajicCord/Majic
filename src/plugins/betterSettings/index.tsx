/*
 * Majic — BetterSettings plugin
 */

import { Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/styles";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/logger";
import { classes } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { filters, find, findCssClassesLazy } from "@webpack";
import { ComponentDispatch, React, useEffect, useRef } from "@webpack/common";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";

const logger = new Logger("BetterSettings", "#ffb86c");

const Classes = findCssClassesLazy("animating", "baseLayer", "bg", "layer", "layers");

let FocusLockComponent: any;
const getFocusLock = () => FocusLockComponent ??= find(filters.componentByCode(".containerRef,{disableReturn:"), { isIndirect: true });

const FULL_HEIGHT_STYLE = "#user-settings-cog, [aria-activedescendant^=\"user-settings-cog\"] { --reference-position-layer-max-height: initial !important; }";

const settings = definePluginSettings({
    disableFade: {
        type: OptionType.BOOLEAN,
        description: "Disable the crossfade animation",
        default: true,
        restartNeeded: true
    },
    organizeMenu: {
        type: OptionType.BOOLEAN,
        description: "Organizes the settings cog context menu into categories",
        default: true,
        restartNeeded: true
    },
    eagerLoad: {
        type: OptionType.BOOLEAN,
        description: "Removes the loading delay when opening the menu for the first time",
        default: true,
        restartNeeded: true
    }
});

interface LayerProps extends HTMLAttributes<HTMLDivElement> {
    mode: "SHOWN" | "HIDDEN";
    baseLayer?: boolean;
}

function Layer({ mode, baseLayer = false, ...props }: LayerProps) {
    const hidden = mode === "HIDDEN";
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => () => {
        ComponentDispatch.dispatch("LAYER_POP_START");
        ComponentDispatch.dispatch("LAYER_POP_COMPLETE");
    }, []);

    const node = (
        <div
            ref={containerRef}
            aria-hidden={hidden}
            className={classes(Classes.layer, baseLayer && Classes.baseLayer, hidden && "stop-animations")}
            style={{ opacity: hidden ? 0 : undefined }}
            {...props}
        />
    );

    const FocusLock = getFocusLock();
    return baseLayer ? node : <FocusLock containerRef={containerRef}>{node}</FocusLock>;
}

export default definePlugin({
    name: "BetterSettings",
    description: "Enhances the experience of opening the settings menu",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Améliore l'ouverture du menu des paramètres",
            options: {
                disableFade: "Désactiver l'animation de fondu",
                organizeMenu: "Organiser le menu clic droit de la roue des paramètres en catégories",
                eagerLoad: "Supprimer le délai de chargement à la première ouverture du menu"
            }
        }
    },
    settings,

    start() {
        if (settings.store.organizeMenu) enableStyle("better-settings-full-height", FULL_HEIGHT_STYLE);
    },

    stop() {
        disableStyle("better-settings-full-height");
    },

    patches: [
        {
            find: "this.renderArtisanalHack()",
            replacement: [
                {
                    match: /class (\i)( extends \i\.PureComponent.+?jsx\)\(\1,\{mode:)/,
                    replace: "var $1=$self.Layer;class MajicPatchedOldFadeLayer$2",
                    predicate: () => settings.store.disableFade
                },
                {
                    match: /createPromise:\(\)=>([^:}]*?),webpackId:"?\d+"?,name:(?!="CollectiblesShop")"[^"]+"/g,
                    replace: "$&,_:$1",
                    predicate: () => settings.store.eagerLoad
                }
            ]
        },
        {
            find: 'minimal:"contentColumnMinimal"',
            predicate: () => settings.store.disableFade,
            replacement: [
                {
                    match: /(?=\(0,\i\.\i\)\((\i),\{from:\{position:"absolute")/,
                    replace: "(_cb=>_cb(void 0,$1))||"
                },
                {
                    match: /\i\.animated\.div/,
                    replace: '"div"'
                }
            ]
        },
        {
            find: '"data-mana-component":"layer-modal"',
            predicate: () => settings.store.disableFade,
            replacement: [
                {
                    match: /(\i)\.animated\.div(?=,\{"data-mana-component":"layer-modal")/,
                    replace: '"div"'
                },
                {
                    match: /(?<="data-mana-component":"layer-modal"[^}]*?)style:\i,/,
                    replace: "style:{},"
                }
            ]
        },
        {
            find: '||"replace"===',
            predicate: () => settings.store.disableFade,
            replacement: [
                {
                    match: /(?:(?<=\?0:\i\.\i))|(?:300(?=\*!\i))/g,
                    replace: "0"
                },
                {
                    match: /(?<=setTimeout\(\(\)=>\i\(\),)\i\.\i|300(?=\))/,
                    replace: "0"
                }
            ]
        },
        {
            find: "handleOpenSettingsContextMenu=",
            predicate: () => settings.store.eagerLoad,
            replacement: {
                match: /(?=handleOpenSettingsContextMenu=.{0,100}?null!=\i&&.{0,100}?(await [^};]*?\)\)))/,
                replace: "_majicBetterSettingsEagerLoad=(async ()=>$1)();"
            }
        },
        {
            find: "#{intl::USER_SETTINGS_ACTIONS_MENU_LABEL}",
            predicate: () => settings.store.organizeMenu,
            replacement: {
                match: /children:\[(\i),(?<=\1=(?:function|.{0,30}\.openUserSettings).+?)/,
                replace: "children:[$self.transformSettingsEntries($1),"
            }
        }
    ],

    Layer(props: LayerProps) {
        try {
            [getFocusLock(), ComponentDispatch, Classes.layer].forEach(e => {
                if (e == null) throw new Error("missing");
            });
        } catch {
            logger.error("Failed to find some components");
            return props.children;
        }

        return <Layer {...props} />;
    },

    transformSettingsEntries(list: ReactElement<any>[]): ReactNode[] {
        const items: ReactNode[] = [];

        for (const item of list) {
            const { key, props } = item;
            if (!props) continue;

            if (key === "user_section" || (key?.endsWith("_section") && props.label)) {
                const label = key === "user_section" ? getIntlMessage("USER_SETTINGS") : props.label;

                items.push(
                    <Menu.MenuItem key={key} label={label} id={label}>
                        {this.transformSettingsEntries(props.children)}
                    </Menu.MenuItem>
                );
            } else {
                items.push(item);
            }
        }

        return items;
    }
});
