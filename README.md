# Majic

![](https://img.shields.io/badge/license-GPL--3.0-7c3aed?style=for-the-badge)
![](https://img.shields.io/badge/status-beta-ec4899?style=for-the-badge)

A little bit of magic for your Discord client

## Features

-   Plugin system: add features to Discord or change how it looks
-   Privacy friendly: blocks Discord analytics, metrics & crash reporting out of the box and has no telemetry
-   Custom CSS: style Discord the way you like
-   DevTools unlocked, even on Stable
-   Works on Stable, PTB, Canary and Development

## Installing / Uninstalling

Download the installer from the [latest release](https://github.com/MajicCord/Majic/releases/latest):

-   **Windows**: `MajicInstaller.exe`
-   **Linux** and **macOS**: `MajicInstallerCli-linux` / `MajicInstallerCli-macos`, from a terminal

Pick your Discord install, then click **Install**. Majic updates itself automatically afterwards. Use **Uninstall** in the same installer to remove it.

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
