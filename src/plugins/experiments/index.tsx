/*
 * Majic — Experiments plugin
 */

import { createStrings } from "@i18n";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { IS_MAC } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";

const s = createStrings({
    en: {
        holdOn: "Hold on!!",
        warning1: "Experiments are unreleased Discord features. They might not work, or even break your client or get your account disabled.",
        warning2: "Only use experiments if you know what you're doing. Majic is not responsible for any damage caused by enabling experiments. If you don't know what an experiment does, ignore it.",
        warning3: "You cannot use server-side features like checking the \"Send to Client\" box.",
        tip: "Tip: You can open Discord's DevTools with"
    },
    fr: {
        holdOn: "Attention !!",
        warning1: "Les expériences sont des fonctionnalités de Discord pas encore sorties. Elles peuvent ne pas marcher, voire casser ton client ou faire désactiver ton compte.",
        warning2: "N'utilise les expériences que si tu sais ce que tu fais. Majic n'est pas responsable des dégâts causés par leur activation. Si tu ne sais pas ce que fait une expérience, ignore-la.",
        warning3: "Tu ne peux pas utiliser les fonctionnalités côté serveur, comme cocher la case « Send to Client ».",
        tip: "Astuce : tu peux ouvrir les DevTools de Discord avec"
    }
});

const KbdStyles = findByPropsLazy("key", "combo");

const modKey = IS_MAC ? "cmd" : "ctrl";
const altKey = IS_MAC ? "opt" : "alt";

function WarningCard() {
    return (
        <div id="majic-experiments-warning-card" className="majic-experiments-warning">
            <h3 className="majic-experiments-warning-title">{s("holdOn")}</h3>
            <p>{s("warning1")}</p>
            <p>{s("warning2")}</p>
            <p><b>{s("warning3")}</b></p>
        </div>
    );
}

function About() {
    return (
        <p className="majic-experiments-tip">
            {s("tip")}{" "}
            <span className={KbdStyles.combo} style={{ display: "inline-flex" }}>
                <kbd className={KbdStyles.key}>{modKey}</kbd>{" "}
                <kbd className={KbdStyles.key}>{altKey}</kbd>{" "}
                <kbd className={KbdStyles.key}>O</kbd>{" "}
            </span>
        </p>
    );
}

export default definePlugin({
    name: "Experiments",
    description: "Enables access to experiments and other dev-only features in Discord",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Donne accès aux expériences et aux autres fonctionnalités réservées aux développeurs de Discord"
        }
    },

    css: [
        ".majic-experiments-warning { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; padding: 12px 16px; border-radius: 8px; color: var(--text-default); background: var(--info-danger-background, rgba(218,55,60,.1)); border: 1px solid var(--status-danger, #da373c); }",
        ".majic-experiments-warning p { margin: 0; }",
        ".majic-experiments-warning-title { margin: 0; color: var(--text-strong); font-size: 16px; font-weight: 600; }",
        ".majic-experiments-tip { margin: 0; color: var(--text-default); font-size: 14px; }"
    ].join(" "),

    patches: [
        {
            find: "Object.defineProperties(this,{isDeveloper",
            replacement: {
                match: /(?<={isDeveloper:\{[^}]+?,get:\(\)=>)\i/,
                replace: "true"
            }
        },
        {
            find: 'type:"user",revision',
            replacement: {
                match: /!(\i)(?=&&"CONNECTION_OPEN")/,
                replace: "!($1=true)"
            }
        },
        {
            find: 'placeholder:"Search experiments"',
            replacement: [
                {
                    match: /(?<=children:\[)(?=null!=.{0,150}"Installation ID:)/,
                    replace: "$self.WarningCard(),"
                },
                {
                    match: /(?<=,marginBottom:16)(?=\},children:\[)/,
                    replace: ',flexDirection:"row",alignItems:"center"'
                }
            ]
        },
        {
            find: "Clear Treatment ",
            replacement: [
                {
                    match: /\i\?\.isStaff\(\)/,
                    replace: "true"
                },
                {
                    match: /\.isStaffPersonal\(\).+?if\(null==(\i)\|\|null==\i(?=\)return null;)/,
                    replace: "$&||({})[$1]!=null"
                }
            ]
        },
        {
            find: "}getServerAssignment(",
            replacement: {
                match: /}getServerAssignment\((\i),\i,\i\){/,
                replace: "$&if($1==null)return;"
            }
        },
        {
            find: '"Open Playground',
            replacement: {
                match: "isStaff()||",
                replace: "$& true||"
            }
        },
        {
            find: '"^dev://experiment/',
            replacement: {
                match: /(?<=dev:\/\/experiment.{0,20}?)\[0-9\]\+/,
                replace: "[0-9-]+"
            }
        }
    ],

    settingsAboutComponent: About,

    WarningCard: withErrorBoundary("Experiments", WarningCard)
});
