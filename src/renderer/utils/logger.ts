/*
 * Majic — logger
 */

export class Logger {
    constructor(private readonly name: string, private readonly color = "#b18cff") {}

    private print(level: "log" | "info" | "warn" | "error" | "debug", args: unknown[]) {
        console[level](
            `%c Majic %c ${this.name} `,
            "background:#7c3aed;color:#fff;font-weight:bold;border-radius:4px 0 0 4px",
            `background:${this.color};color:#000;border-radius:0 4px 4px 0`,
            ...args
        );
    }

    log = (...args: unknown[]) => this.print("log", args);
    info = (...args: unknown[]) => this.print("info", args);
    warn = (...args: unknown[]) => this.print("warn", args);
    error = (...args: unknown[]) => this.print("error", args);
    debug = (...args: unknown[]) => this.print("debug", args);
}
