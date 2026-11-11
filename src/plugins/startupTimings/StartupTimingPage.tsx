/*
 * Majic — StartupTimings page
 */

import { createStrings } from "@i18n";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";

export const s = createStrings({
    en: {
        title: "Startup Timings",
        traceEnded: "Trace ended at: {time}",
        start: "Start",
        interval: "Interval",
        delta: "Delta",
        event: "Event",
        serverTrace: "Server Trace",
        loading: "Loading..."
    },
    fr: {
        title: "Temps de démarrage",
        traceEnded: "Trace terminée à : {time}",
        start: "Début",
        interval: "Intervalle",
        delta: "Delta",
        event: "Événement",
        serverTrace: "Trace du serveur",
        loading: "Chargement..."
    }
});

interface Log {
    emoji: string;
    prefix: string;
    log: string;
    timestamp?: number;
    delta?: number;
}

interface LogGroup {
    index: number;
    timestamp: number;
    logs: Log[];
    nativeLogs: any[];
    serverTrace: string;
}

interface AppStartPerformance {
    prefix: string;
    logs: Log[];
    logGroups: LogGroup[];
    endTime_: number;
    isTracing_: boolean;
}

const AppStartPerformance = findByPropsLazy("markWithDelta", "markAndLog", "markAt") as AppStartPerformance;

function TimerItem({ emoji, prefix, log, delta, instance }: Log & { instance: { sinceStart: number; sinceLast: number } }) {
    return (
        <>
            <span>{instance.sinceStart.toFixed(3)}s</span>
            <span>{instance.sinceLast.toFixed(3)}s</span>
            <span>{delta?.toFixed(0) ?? ""}</span>
            <span><pre style={{ margin: 0 }}>{emoji} {prefix ?? " "}{log}</pre></span>
        </>
    );
}

function TimingSection({ title, logs, traceEnd }: { title: string; logs: Log[]; traceEnd?: number }) {
    const startTime = logs.find(l => l.timestamp)?.timestamp ?? 0;

    let lastTimestamp = startTime;
    const timings = logs.map(log => {
        const timestamp = log.timestamp ?? lastTimestamp;
        const sinceStart = (timestamp - startTime) / 1000;
        const sinceLast = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        return { sinceStart, sinceLast };
    });

    return (
        <section>
            <h4 className="majic-st-heading">{title}</h4>
            <code>
                {traceEnd && (
                    <div style={{ color: "var(--text-strong)", marginBottom: 5, userSelect: "text" }}>
                        {s("traceEnded", { time: new Date(traceEnd).toTimeString() })}
                    </div>
                )}
                <div style={{ color: "var(--text-strong)", display: "grid", gridTemplateColumns: "repeat(3, auto) 1fr", gap: "2px 10px", userSelect: "text" }}>
                    <span>{s("start")}</span>
                    <span>{s("interval")}</span>
                    <span>{s("delta")}</span>
                    <span style={{ marginBottom: 5 }}>{s("event")}</span>
                    {AppStartPerformance.logs.map((log, i) => <TimerItem key={i} {...log} instance={timings[i]} />)}
                </div>
            </code>
        </section>
    );
}

function ServerTrace({ trace }: { trace: string }) {
    return (
        <section>
            <h4 className="majic-st-heading">{s("serverTrace")}</h4>
            <code>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, color: "var(--text-strong)", userSelect: "text" }}>
                    {trace.split("\n").map((line, idx) => <span key={idx}>{line}</span>)}
                </div>
            </code>
        </section>
    );
}

function StartupTimingPage() {
    if (!AppStartPerformance?.logs) return <div className="majic-text">{s("loading")}</div>;

    const serverTrace = AppStartPerformance.logGroups.find(g => g.serverTrace)?.serverTrace;

    return (
        <>
            <TimingSection title={s("title")} logs={AppStartPerformance.logs} traceEnd={AppStartPerformance.endTime_} />
            <div style={{ marginTop: 5 }}>&nbsp;</div>
            {serverTrace && <ServerTrace trace={serverTrace} />}
        </>
    );
}

export default withErrorBoundary("StartupTimings", StartupTimingPage);
