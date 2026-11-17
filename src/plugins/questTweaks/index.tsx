/*
 * Majic — QuestTweaks plugin
 */

import { playAudio } from "@api/audioPlayer";
import { addServerListElement, removeServerListElement } from "@api/serverList";
import { settings as majicSettings } from "@api/settings";
import { ErrorBoundary, withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin } from "@utils/types";
import { findComponentByCodeLazy, onceReady } from "@webpack";
import { React, Stores } from "@webpack/common";
import type { JSX } from "react";

import { disguiseHomeButton, QuestButton, showQuestButton } from "./components/questButton";
import { QuestTileContextMenu } from "./components/questTileContextMenu";
import { QuestTweaksSettingsPage } from "./components/settingsPage";
import { bumpAccountSessionGeneration, createQuestEnrollmentGuard } from "./guard";
import { getCurrentUserId, getQuestTweaksSettings } from "./settings/access";
import { disposeQuestAutomation, initializeQuestAutomation, processAutomaticQuests } from "./settings/automation";
import { QUEST_TWEAKS_SORT } from "./settings/def";
import { resetQuestsToResume, startAutoFetchingQuests, stopAutoFetchingQuests } from "./settings/fetching";
import { validateIgnoredQuests } from "./settings/ignoredQuests";
import { showPendingQuestTweaksNotice } from "./settings/notices";
import { rerenderQuests, useQuestRerender } from "./settings/rerender";
import { disposeRestartTracking, initializeRestartTracking, promptToRestartIfDirty, setRestartDirty } from "./settings/restartTracking";
import { PLUGIN_NAME, settings } from "./settings/store";
import { enabledOnStartup } from "./startup";
import { getSettingsModalOpen, initialQuestDataFetched, setInitialQuestDataFetched, setSettingsModalOpen } from "./state";
import type { Quest, QuestUserStatus } from "./types";
import { canAutoCompleteQuest, getActiveAutoCompletes, getQuestAutoCompleteProgress, getQuestButtonProps, getQuestPanelSubtitleText, getQuestProcessingBatches, hasEnabledAutoCompleteQuestTypes, processQuestForAutoComplete, resumeInterruptedAutoCompletes, setHeartbeatStackTracePatchSucceeded, setVideoProgressStackTracePatchSucceeded, stopAllAutoCompletes, stopAutoCompletesForRunningGames, stopQuestAutoComplete } from "./utils/completion";
import { canOpenDevToolsWindow, fetchAndDispatchQuests, openDevToolsWindow, snakeToCamel } from "./utils/fetching";
import { normalizeQuestName } from "./utils/filtering";
import { notifyQuestCompletion, QL } from "./utils/logging";
import { getQuestEmbedProgress, getQuestPanelOverride, getQuestPanelPercentComplete, shouldForceQuestPanelVisible } from "./utils/questState";
import { getLastFilterChoices, getLastSortChoice, getQuestTileClasses, getQuestTileStyle, setLastFilterChoices, setLastSortChoice, shouldPreloadQuestAssets, sortQuests } from "./utils/questTiles";
import { QUEST_PAGE } from "./utils/ui";

import styles from "file://styles.css";

let isPluginStarted = false;
let activeAccountUserId: string | null = null;
let didAttemptAutoCompleteResume = false;
const notifiedCompletedQuests = new Set<string>();

function setOnQuestsPage(force?: boolean): void {
    getQuestTweaksSettings().isOnQuestsPage = force ?? (window.location.pathname === QUEST_PAGE);
}

function startPerAccountTasks(source: string): void {
    const userId = getCurrentUserId();

    if (!isPluginStarted || getQuestTweaksSettings().disableQuestsEverything || !userId || activeAccountUserId === userId) {
        return;
    }

    if (activeAccountUserId) {
        bumpAccountSessionGeneration();
        stopPerAccountTasks("ACCOUNT_CHANGE");
    }

    setInitialQuestDataFetched(false);
    didAttemptAutoCompleteResume = false;
    const startedAt = Date.now();

    setOnQuestsPage();
    initializeQuestAutomation();
    startAutoFetchingQuests();
    fetchAndDispatchQuests();
    activeAccountUserId = userId;

    QL.info(`START_TASKS-${source.toUpperCase()}`, { startedAt });
}

function stopPerAccountTasks(source: string, preserveResume: boolean = true): void {
    const stoppedAt = Date.now();

    setOnQuestsPage();
    disposeQuestAutomation();
    stopAutoFetchingQuests();
    notifiedCompletedQuests.clear();
    stopAllAutoCompletes({ manual: false, preserveResume, terminalHeartbeat: true, userId: activeAccountUserId });
    activeAccountUserId = null;

    QL.info(`STOP_TASKS-${source.toUpperCase()}`, { stoppedAt });
}

function resumeAutoCompletesIfReady(): void {
    if (didAttemptAutoCompleteResume || !initialQuestDataFetched) {
        return;
    }

    didAttemptAutoCompleteResume = true;
    resumeInterruptedAutoCompletes();
}

const Button = findComponentByCodeLazy("BUTTON_LOADING_STARTED_LABEL)),");

function enrolledIncompleteButton(args: { quest: Quest; size: string }): JSX.Element | null {
    const props = getQuestButtonProps({ quest: args.quest });

    if (!props) {
        return null;
    }

    return (
        <ErrorBoundary name="QuestTweaks button">
            <Button
                size={args.size}
                variant="secondary"
                disabled={false}
                fullWidth={true}
                {...props}
            />
        </ErrorBoundary>
    );
}

function wrapOrbsBalance(balance: string): JSX.Element {
    return (<span style={{ fontSize: "90%" }}>{balance}</span>);
}

export default definePlugin({
    name: "QuestTweaks",
    description: "Enhance specific Quest features, disable annoyances, or completely remove Quests.",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Améliore certaines fonctionnalités des Quêtes, désactive les éléments gênants ou supprime complètement les Quêtes."
        }
    },
    dependencies: ["AudioPlayerAPI", "ServerListAPI"],
    startAt: "Init",
    css: styles,
    settings,
    settingsAboutComponent: QuestTweaksSettingsPage,

    canOpenDevToolsWindow,
    canAutoCompleteQuest,
    createQuestEnrollmentGuard,
    disguiseHomeButton,
    enrolledIncompleteButton,
    getActiveAutoCompletes,
    getQuestProcessingBatches,
    getLastFilterChoices,
    getLastSortChoice,
    getQuestAutoCompleteProgress,
    getQuestEmbedProgress,
    getQuestButtonProps,
    getQuestPanelOverride,
    getQuestPanelPercentComplete,
    getQuestPanelSubtitleText,
    getQuestTileClasses,
    getQuestTileStyle,
    getSettingsModalOpen,
    hasEnabledAutoCompleteQuestTypes,
    normalizeQuestName,
    openDevToolsWindow,
    processQuestForAutoComplete,
    rerenderQuests,
    setHeartbeatStackTracePatchSucceeded,
    setLastFilterChoices,
    setLastSortChoice,
    setVideoProgressStackTracePatchSucceeded,
    shouldForceQuestPanelVisible,
    shouldPreloadQuestAssets,
    sortQuests,
    stopQuestAutoComplete,
    useQuestRerender,
    wrapOrbsBalance,

    patches: [
        {
            find: ",NodeFilter.SHOW_ELEMENT,{acceptNode:function(",
            replacement: {
                match: /\.focus\(\)/g,
                replace: ".focus({preventScroll:$self.getSettingsModalOpen()?!0:undefined})"
            }
        },
        {
            find: "GLOBAL_DISCOVERY),",
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything && showQuestButton(getQuestTweaksSettings().questButtonDisplay, 1, true),
            replacement: {
                match: /(pathname:(\i)}.{0,400}?return )/,
                replace: "$1$self.disguiseHomeButton($2)?false:"
            }
        },
        {
            find: '("ActivityStatus"),',
            predicate: () => getQuestTweaksSettings().disableQuestsEverything || getQuestTweaksSettings().disableMembersListPromo,
            replacement: {
                match: /,hasQuest:(?=\i=!1)/,
                replace: ",questTweaksInvalid1:"
            }
        },
        {
            find: "`application-stream-",
            predicate: () => getQuestTweaksSettings().disableQuestsEverything || getQuestTweaksSettings().disableFriendsListPromo,
            replacement: [
                {
                    match: /(?<=let{party:\i,onChannelContextMenu:\i,)quest:(\i)/,
                    replace: "questTweaksInvalid2:$1=null"
                }
            ]
        },
        {
            find: "GLOBAL_DISCOVERY_SIDEBAR},",
            predicate: () => getQuestTweaksSettings().disableQuestsEverything || getQuestTweaksSettings().disableRelocationNotices,
            replacement: [
                {
                    match: /\i\.\i(?=\.filter\(\i=>\(\i!==\i\.GlobalDiscoveryTab\.QUESTS)/,
                    replace: '$&.filter(tab=>tab!=="quests")'
                }
            ]
        },
        {
            find: '.QUEST_HOME)},"quests")',
            predicate: () => getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(?<="family-center"\)(?:&&undefined)?:null,)/,
                    replace: "null&&"
                }
            ]
        },
        {
            find: "QUEST_HOME)},[]),",
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything && getQuestTweaksSettings().disableSponsoredBanner,
            replacement: {
                match: /(?<=,{questHomeHero:(\i),isLoading:(\i),confirmedEmpty:(\i)}=.{0,300}?ORBS_BALANCE_MENU}\)},\[\]\);)/,
                replace: "$1=null;$2=false;$3=true;"
            }
        },
        {
            find: ".MODAL]:26",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything && getQuestTweaksSettings().disableOrbsAndQuestsBadges,
            replacement: [
                {
                    match: /(,{badges:\i)(?=,overflowCount:\i,displayProfile:\i)/,
                    replace: '$1.filter(badge=>!["quest_completed","orb_profile_badge"].includes(badge.id))'
                }
            ]
        },
        {
            find: "collapsed-with-rewards\":\"collapsed-without-rewards",
            predicate: () => getQuestTweaksSettings().disableAccountPanelPromo || !getQuestTweaksSettings().disableAccountPanelQuestProgress,
            replacement: {
                match: /(?<=function\(\)\{)(let (\i)=\(0,\i\.\i\)\(\),\i=\(0,\i\.\i\)\(.{0,55}?\);)(?=switch\(\2\.type\)\{case (\i\.\i\.QUEST):)/,
                replace: "void $self.useQuestRerender();$1$2=$self.getQuestPanelOverride($2,$3);if(null==$2)return null;"
            }
        },
        {
            find: 'type:"QUESTS_FETCH_CURRENT_QUESTS_BEGIN"',
            group: true,
            predicate: () => getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(?<=if\(\i.\i.isFetchingCurrentQuests)/,
                    replace: "||true"
                },
                {
                    match: /(?=let [^;]+\.recordQuestRequestAttempt\()/,
                    replace: "return;"
                }
            ]
        },
        {
            find: ",{progressTextAnimation:",
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: {
                match: /(let{percentComplete:[^}]+}=)(\i)/,
                replace: "const questTweaksProgress=$self.getQuestPanelPercentComplete({...$2,quest:$2.children?.props?.quest});$1Object.assign({},$2,questTweaksProgress??{})"
            }
        },
        {
            find: '"progress-title"',
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: {
                match: /(?<={quest:(\i).{0,250}?return.{0,150}?,percentComplete:\i.{0,280}?"progress-title",children.{0,115}?children:)(\i.{0,50}"progress-subtitle",isTextTransition:!0,children.{0,115}?children:)/,
                replace: "$self.normalizeQuestName($1)??$2$self.getQuestPanelSubtitleText($1)??"
            }
        },
        {
            find: '("BalanceCounter")',
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(`\${(\i).toFixed\(0\)}`.length)/,
                    replace: "$1+($2>=1e6?0.8:$2>=1e3?0.4:0)"
                },
                {
                    match: /(?<=children:\i.to\(\i=>`\${\i).toFixed\(0\)/,
                    replace: ".toLocaleString(undefined,{maximumFractionDigits:0})"
                }
            ]
        },
        {
            find: 'location:"BalanceWidgetMenu"',
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(?<=children:)(\i\?\?0)/,
                    replace: "$self.wrapOrbsBalance(($1).toLocaleString(undefined,{maximumFractionDigits:0}))"
                }
            ]
        },
        {
            find: 'type:"QUESTS_ENROLL_BEGIN",',
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /\i\.\i\.dispatch\(\{type:"QUESTS_ENROLL_BEGIN",questId:\i\}\);/,
                    replace: "const questTweaksEnrollmentIsCurrent=$self.createQuestEnrollmentGuard();$&"
                },
                {
                    match: /(?=return \i\.\i\.dispatch\(\{type:"QUESTS_ENROLL_SUCCESS",)/,
                    replace: 'if(!questTweaksEnrollmentIsCurrent())return{type:"cancelled"};'
                },
                {
                    match: /catch\{(return \i\.\i\.dispatch\(\{type:"QUESTS_ENROLL_FAILURE",questId:\i\}\),\{type:"unknown_error")/,
                    replace: 'catch(error){if(!questTweaksEnrollmentIsCurrent())return{type:"cancelled"};$1,error'
                }
            ]
        },
        {
            find: "NetworkActionNames.QUEST_VIDEO_PROGRESS,",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything && hasEnabledAutoCompleteQuestTypes(),
            replacement: [
                {
                    match: /(async function \i\(\i,\i\)\{await \i\.\i\.post\(\{url:\i\.\i\.QUESTS_VIDEO_PROGRESS.{0,250}?stack_trace:)Error\(\)\.stack\?\?""/,
                    replace: '$self.setVideoProgressStackTracePatchSucceeded();$1""'
                },
                {
                    match: /(async function \i\(\i\)\{let\{questId:\i,streamKey:\i.{0,450}?stack_trace:)Error\(\)\.stack\?\?""/,
                    replace: '$self.setHeartbeatStackTracePatchSucceeded();$1""'
                }
            ]
        },
        {
            find: "trackQuestVideoFocusChange:",
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything && getQuestTweaksSettings().preventVideoQuestsPausing,
            replacement: {
                match: /(?<=pauseOnLostVisibility:)!\i/,
                replace: "false"
            }
        },
        {
            find: "QUEST_HOME)},[]),",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(\{ref:\i,\.\.\.\i\}=\i,\i=\i\.useRef\(null\),)(?=\[\i,\i\]=)/,
                    replace: "$1questRerenderTrigger=$self.useQuestRerender(),"
                },
                {
                    match: /(\i.\i.SUGGESTED)/,
                    replace: "$self.getLastSortChoice()??$1"
                },
                {
                    match: /(get\(\i\)\)\?\?)(\i,\[)(\i)(\]\),\i=\i.useCallback\((\i)=>{)(.{0,60}?useCallback\((\i)=>{)/,
                    replace: "$1$self.getLastFilterChoices()??$2$3,questRerenderTrigger$4$self.setLastSortChoice($5);$6$self.setLastFilterChoices($7);$self.rerenderQuests();"
                },
                {
                    match: /(?<=ALL,\i.useMemo\(\(\)=>\()({sortMethod:(\i),filters:(\i))/,
                    replace: "$self.setLastSortChoice($2),$self.setLastFilterChoices($3),$1"
                }
            ]
        },
        {
            find: "config.taskConfigV2.tasks).length)return",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything && hasEnabledAutoCompleteQuestTypes(),
            replacement: [
                {
                    match: /(?<=,text:\i,icon:\i,iconPosition:\i,fullWidth:!0)(?=,"aria-disabled":\i\|\|void 0)/,
                    replace: ",...($self.getQuestButtonProps(arguments[0])??{})"
                },
                {
                    match: /(case \i\.\i\.(?:ENROLLED|INCOMPLETE):return)(?=\(0,\i\.jsx\)\(\i,\{quest:(\i),taskType:\i(?:\.type)?,size:(\i),)/g,
                    replace: "$1 $self.enrolledIncompleteButton({quest:$2,size:$3})||"
                }
            ]
        },
        {
            find: "collapsed-with-rewards\":\"collapsed-without-rewards",
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything && hasEnabledAutoCompleteQuestTypes(),
            replacement: {
                match: /(?<=SELECT&&!\i&&!\i,(\i)=null;)(return )(\i\?\i=\(0,\i.\i\)\(\i,{quest:(\i))/,
                replace: "const questTweaksButton=$self.enrolledIncompleteButton({quest:$4,size:\"sm\"});$2questTweaksButton?$1=questTweaksButton:$3"
            }
        },
        {
            find: "handleGameSheetOpened:",
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything && !getQuestTweaksSettings().disableAccountPanelQuestProgress,
            replacement: {
                match: /(?<=isLoading:\i}=\(0,\i\.\i\)\(\),\i=\i\.useContext\(\i\.\i\),\i=\i\|\|\i&&)(\i)/,
                replace: "($1||$self.shouldForceQuestPanelVisible(arguments[0].quest))"
            }
        },
        {
            find: "questNameHeadingId",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(\i===\i\.\i\.ENROLLED&&)(?=\(0,\i\.\i\)\((\i)\))/,
                    replace: "$1!$self.canAutoCompleteQuest($2)&&"
                },
                {
                    match: /(\(\i===\i\.\i\.ENROLLED\|\|\i===\i\.\i\.INCOMPLETE\)&&)(?=\(0,\i\.\i\)\((\i)\))/,
                    replace: "$1!$self.canAutoCompleteQuest($2)&&"
                },
                {
                    match: /(\(\i===\i\.\i\.COMPLETED\|\|\i===\i\.\i\.CLAIMED\)&&)(?=\(0,\i\.\i\)\((\i)\))/,
                    replace: "$1!$2.config.ctaConfig&&"
                },
                {
                    match: /(?<=wrap:!1,children:\[)(\i)(?=&&\(0,\i\.jsx\)\(\i,\{quest:(\i))/,
                    replace: "($2.config.ctaConfig||$1)"
                }
            ]
        },
        {
            find: ".GameProfileSources.QuestEmbed,",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(?<=function \i\(\i\){)(?=let\{quest:\i,location:\i,questContentPosition:\i,sourceQuestContent:)/,
                    replace: "void $self.useQuestRerender();"
                },
                {
                    match: /(?<=\{completedRatio:\i,completedRatioDisplay:\i\}=)(\(0,\i\.\i\)\((\i)\))/,
                    replace: "Object.assign({},$1,$self.getQuestEmbedProgress($2)??{})"
                },
                {
                    match: /(?<=className:)(\i\(\)\(\i.\i,\i.\i\)(?=,onMouseEnter:\i))/,
                    replace: "$self.getQuestTileClasses($1,arguments[0].quest),style:$self.getQuestTileStyle(arguments[0].quest)"
                }
            ]
        },
        {
            find: "questNameHeadingId",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(?=return\(0,\i\.\i\)\(\i\.\i\.Provider,\{value:)/,
                    replace: "void $self.useQuestRerender();"
                },
                {
                    match: /(?<=className:)(\i\(\)\(\i\.\i,\i,.{1,40}?\))(?=,onMouseEnter)/,
                    replace: "$self.getQuestTileClasses($1,arguments[0].quest),style:$self.getQuestTileStyle(arguments[0].quest)"
                },
                {
                    match: /(?<=showPlaceholder:)(!\i)(?=,width)/g,
                    replace: "$self.shouldPreloadQuestAssets()?!1:$1"
                },
                {
                    match: /(?<=onLoadComplete:\i,lazyLoad:)!0/g,
                    replace: "$self.shouldPreloadQuestAssets()?!1:!0"
                },
                {
                    match: /(?<=isVisibleInViewport:)(\i)(?=,sourceQuestContent:\i\}\))/g,
                    replace: "$self.shouldPreloadQuestAssets()?true:$1"
                }
            ]
        },
        {
            find: "EXPIRING_SOON=\"expiring_soon\"",
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: {
                match: /(?<=\(\((\i)=\{\}\))(?=\.SUGGESTED="suggested",)/,
                replace: `.QUEST_TWEAKS="${QUEST_TWEAKS_SORT}",$1`
            }
        },
        {
            find: "has no rewards configured`",
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: {
                match: /(?=case (\i\.\i)\.SUGGESTED)/,
                replace: "case $1.QUEST_TWEAKS:return\"QuestTweaks\";"
            }
        },
        {
            find: "CLAIMED=\"claimed\",",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /,(\i)=new Map\((\i)\.map/,
                    replace: `;const questRerenderTrigger=$self.useQuestRerender();const questTweaksSorted=$self.sortQuests($2,arguments[1]?.sortMethod!=="${QUEST_TWEAKS_SORT}");const questTweaksListChanged=questTweaksSorted!==$2;$2=questTweaksSorted;let $1=new Map($2.map`
                },
                {
                    match: /(?<=if\()(?=\i\.current\.length>0&&\i\.current===)/,
                    replace: "!questTweaksListChanged&&"
                },
                {
                    match: /(?<=if\()(?=\i\.current\.length>0&&\i\.current\.length===)/,
                    replace: "!questTweaksListChanged&&"
                },
                {
                    match: /(?<=\{sortMethod:(\i).{0,800}?return )((\i).sort)/,
                    replace: `$1==="${QUEST_TWEAKS_SORT}"?$3:$2`
                },
                {
                    match: /(?=]\)\),\i=\(\i=\i.useMemo\(\(\)=>\i.filter)/,
                    replace: ",questRerenderTrigger,questTweaksSorted"
                }
            ]
        },
        {
            find: ".ALL)}):(",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(return \i&&0===\i.length.{0,150}?children:)\[\.\.\.(\i).{0,100}?claimedAt\?\?""\)\)/,
                    replace: "const questTweaksSorted=$self.sortQuests($2);$1questTweaksSorted"
                }
            ]
        },
        {
            find: ".sharePolicy!==",
            group: true,
            predicate: () => !getQuestTweaksSettings().disableQuestsEverything,
            replacement: {
                match: /(?<=return )(?=\i.sharePolicy!==\i.\i.NOT_SHAREABLE)/,
                replace: "true||"
            }
        }
    ],

    flux: {
        CHANNEL_SELECT() { setOnQuestsPage(); },

        QUESTS_FETCH_CURRENT_QUESTS_SUCCESS(data: { quests: Quest[] }): void {
            setInitialQuestDataFetched(true);
            QL.log("QUESTS_FETCH_CURRENT_QUESTS_SUCCESS", data);
            validateIgnoredQuests(data.quests);
            resumeAutoCompletesIfReady();
            processAutomaticQuests(data.quests);
        },

        QUESTS_ENROLL_SUCCESS(data: any): void {
            QL.log("QUESTS_ENROLL_SUCCESS", data);
            validateIgnoredQuests();
        },

        QUESTS_CLAIM_REWARD_SUCCESS(data: any): void {
            QL.log("QUESTS_CLAIM_REWARD_SUCCESS", data);
            validateIgnoredQuests();
        },

        QUESTS_USER_STATUS_UPDATE(data: any): void {
            QL.log("QUESTS_USER_STATUS_UPDATE", data);

            const userStatus = snakeToCamel(data).userStatus as QuestUserStatus | undefined;
            const claimedAt = !!userStatus?.claimedAt;
            const completedRecently = userStatus?.completedAt
                ? Date.now() - new Date(userStatus.completedAt).getTime() <= 5000
                : false;

            validateIgnoredQuests();

            if (completedRecently && !claimedAt && !notifiedCompletedQuests.has(userStatus!.questId)) {
                notifiedCompletedQuests.add(userStatus!.questId);

                if (getQuestTweaksSettings().notifyOnQuestComplete) {
                    notifyQuestCompletion(Stores.QuestStore.getQuest(userStatus!.questId));
                }

                if (getQuestTweaksSettings().questCompletedAlertSound) {
                    playAudio(
                        getQuestTweaksSettings().questCompletedAlertSound!,
                        { volume: Math.max(0, Math.min(100, getQuestTweaksSettings().questCompletedAlertVolume)) }
                    );
                }
            }
        },

        USER_SETTINGS_MODAL_OPEN(): void {
            setSettingsModalOpen(true);
        },

        USER_SETTINGS_MODAL_CLOSE(): void {
            setSettingsModalOpen(false);
            promptToRestartIfDirty();
        },

        CONNECTION_OPEN(): void {
            startPerAccountTasks("CONNECTION_OPEN");
        },

        async CURRENT_USER_UPDATE(): Promise<void> {
            await onceReady;
            startPerAccountTasks("CURRENT_USER_UPDATE");
        },

        LOGIN_SUCCESS(): void {
            startPerAccountTasks("LOGIN_SUCCESS");
        },

        LOGOUT(): void {
            bumpAccountSessionGeneration();
            setInitialQuestDataFetched(false);
            stopPerAccountTasks("LOGOUT");
        },

        RUNNING_GAMES_CHANGE(data: { games: { id: string }[] }): void {
            stopAutoCompletesForRunningGames(data.games.map(game => game.id));
        }
    },

    contextMenus: {
        "quests-entry": QuestTileContextMenu
    },

    renderQuestTweaksButton: withErrorBoundary("QuestTweaks button", QuestButton),

    start() {
        isPluginStarted = true;

        if (!enabledOnStartup && majicSettings.plugins[PLUGIN_NAME]?.enabled) {
            setRestartDirty(true);
        }

        initializeRestartTracking(settings);

        if (enabledOnStartup) {
            addServerListElement("above", PLUGIN_NAME, () => this.renderQuestTweaksButton({}));
        }

        onceReady.then(() => {
            if (!isPluginStarted) {
                return;
            }

            showPendingQuestTweaksNotice();

            if (!getQuestTweaksSettings().disableQuestsEverything) {
                startPerAccountTasks("PLUGIN_START");
            } else {
                removeServerListElement("above", PLUGIN_NAME);
            }
        });
    },

    stop() {
        isPluginStarted = false;

        const pluginEnabled = majicSettings.plugins[PLUGIN_NAME]?.enabled;
        const userId = activeAccountUserId ?? getCurrentUserId();

        disposeRestartTracking();
        removeServerListElement("above", PLUGIN_NAME);
        stopPerAccountTasks("PLUGIN_STOP", pluginEnabled);

        if (!pluginEnabled && userId) {
            resetQuestsToResume(undefined, userId);
        }
    }
});
