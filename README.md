# ✨ Majic

![](https://img.shields.io/badge/license-GPL--3.0-7c3aed?style=for-the-badge)
![](https://img.shields.io/badge/status-early%20development-ec4899?style=for-the-badge)

A little bit of magic for your Discord client

## Features

-   Plugin system: add features to Discord or change how it looks
-   Privacy friendly: blocks Discord analytics, metrics & crash reporting out of the box and has no telemetry
-   Custom CSS: style Discord the way you like
-   DevTools unlocked, even on Stable
-   Works on Stable, PTB and Canary

## Installing / Uninstalling

Majic is still in early development and doesn't have an installer yet.

<details>
<summary>Install from source</summary>

Requires [Node.js](https://nodejs.org) 22+ and [pnpm](https://pnpm.io).

```sh
git clone https://github.com/MajicCord/Majic.git
cd Majic
pnpm install
pnpm build
pnpm inject
```

Fully quit Discord (tray icon → Quit) and start it again. To uninstall, run `pnpm uninject`.

</details>

## Disclaimer

Discord is a trademark of Discord Inc. and is only mentioned for the sake of descriptivity.
Mention of it does not imply any affiliation with or endorsement by Discord Inc.
