/*
 * Majic — QuestTweaks startup state
 */

import { settings } from "@api/settings";

import { PLUGIN_NAME } from "./settings/store";

export const enabledOnStartup = settings.plugins[PLUGIN_NAME]?.enabled;
