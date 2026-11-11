/*
 * Majic — UI kit used by Majic's own pages
 */

import { enableStyle } from "@api/styles";
import { t } from "@i18n";
import { DiscordIcon, React, useEffect, useRef, useState } from "@webpack/common";
import type { ReactNode } from "react";

const CSS = `
.majic-page { display: flex; flex-direction: column; gap: 16px; color: var(--text-normal); font-family: var(--font-primary); }
.majic-heading { margin: 0; color: var(--header-primary); font-size: 20px; font-weight: 600; line-height: 24px; }
.majic-subheading { margin: 0 0 8px; color: var(--header-secondary); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .02em; }
.majic-text { margin: 0; font-size: 14px; line-height: 20px; color: var(--text-normal); }
.majic-muted { color: var(--text-muted); font-size: 13px; line-height: 18px; }
.majic-card { padding: 16px; border-radius: 8px; background: var(--background-secondary); border: 1px solid var(--background-modifier-accent); }
.majic-row { display: flex; align-items: center; gap: 12px; }
.majic-row-grow { flex: 1; min-width: 0; }
.majic-switch { position: relative; flex-shrink: 0; width: 40px; height: 24px; border-radius: 12px; border: none; padding: 0; cursor: pointer; background: var(--background-modifier-accent, #4e5058); transition: background .15s; }
.majic-switch[aria-checked="true"] { background: var(--majic-accent); }
.majic-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform .15s; }
.majic-switch[aria-checked="true"]::after { transform: translateX(16px); }
.majic-switch:disabled { opacity: .5; cursor: not-allowed; }
.majic-button { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #fff; background: var(--majic-accent); }
.majic-button:hover { filter: brightness(1.1); }
.majic-button[data-variant="secondary"] { background: var(--background-modifier-accent, #4e5058); color: var(--text-normal); }
.majic-button[data-variant="danger"] { background: var(--status-danger, #da373c); }
.majic-dropdown { position: relative; width: 100%; }
.majic-dropdown-button { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--background-modifier-accent); background: var(--background-tertiary, #1e1f22); color: var(--text-normal); font-size: 14px; font-family: inherit; text-align: left; cursor: pointer; transition: border-color .15s; }
.majic-dropdown-button:hover { border-color: var(--interactive-muted, #4e5058); }
.majic-dropdown-button[data-open="true"], .majic-dropdown-button:focus-visible { border-color: var(--majic-accent); outline: none; }
.majic-dropdown-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.majic-dropdown-list { position: absolute; z-index: 1000; top: calc(100% + 4px); left: 0; right: 0; max-height: 240px; overflow-y: auto; padding: 6px; border-radius: 8px; background: var(--background-floating, #111214); box-shadow: var(--elevation-high, 0 8px 16px rgba(0,0,0,.24)); border: 1px solid var(--background-modifier-accent); }
.majic-dropdown-option { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 4px; color: var(--interactive-normal); font-size: 14px; cursor: pointer; }
.majic-dropdown-option[data-highlighted="true"] { background: var(--background-modifier-hover); color: var(--interactive-hover); }
.majic-dropdown-option[aria-selected="true"] { color: var(--header-primary); font-weight: 500; }
.majic-input, .majic-textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 4px; border: 1px solid var(--background-modifier-accent); background: var(--background-tertiary, #1e1f22); color: var(--text-normal); font-size: 14px; font-family: inherit; }
.majic-textarea { min-height: 220px; resize: vertical; font-family: var(--font-code, monospace); font-size: 13px; }
.majic-slider { position: relative; height: 24px; display: flex; align-items: center; cursor: pointer; touch-action: none; outline: none; }
.majic-slider-track { width: 100%; height: 6px; border-radius: 3px; background: var(--background-modifier-accent, #4e5058); overflow: hidden; }
.majic-slider-fill { height: 100%; background: var(--majic-accent); }
.majic-slider-thumb { position: absolute; top: 50%; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.4); transform: translate(-50%, -50%); transition: transform .1s; pointer-events: none; }
.majic-slider:hover .majic-slider-thumb, .majic-slider[data-dragging="true"] .majic-slider-thumb { transform: translate(-50%, -50%) scale(1.15); }
.majic-slider:focus-visible .majic-slider-thumb { box-shadow: 0 0 0 3px var(--majic-accent); }
.majic-slider-value { min-width: 36px; text-align: right; color: var(--text-muted); font-size: 13px; font-variant-numeric: tabular-nums; }
.majic-icon-button { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 4px; border: none; background: none; color: var(--interactive-normal); cursor: pointer; font-size: 16px; }
.majic-icon-button:hover { background: var(--background-modifier-hover); color: var(--interactive-hover); }
.majic-notice-card { padding: 12px 16px; border-radius: 8px; background: var(--info-warning-background, rgba(240,177,50,.1)); border: 1px solid var(--info-warning-foreground, #f0b132); }
`;

export const ensureUiStyles = () => enableStyle("ui", CSS);

export function Page({ children }: { children: ReactNode }) {
    ensureUiStyles();
    return <div className="majic-page">{children}</div>;
}

export const Heading = ({ children }: { children: ReactNode }) => <h2 className="majic-heading">{children}</h2>;
export const SubHeading = ({ children }: { children: ReactNode }) => <h3 className="majic-subheading">{children}</h3>;
export const Text = ({ children, muted }: { children: ReactNode; muted?: boolean }) => <p className={muted ? "majic-text majic-muted" : "majic-text"}>{children}</p>;
export const Card = ({ children }: { children: ReactNode }) => <div className="majic-card">{children}</div>;

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange(value: boolean): void; disabled?: boolean; label?: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            className="majic-switch"
            onClick={() => onChange(!checked)}
        />
    );
}

export function Button({ children, onClick, variant = "primary" }: { children: ReactNode; onClick(): void; variant?: "primary" | "secondary" | "danger" }) {
    return <button type="button" className="majic-button" data-variant={variant} onClick={onClick}>{children}</button>;
}

export function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange(value: string): void; placeholder?: string; type?: string }) {
    return <input className="majic-input" type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.currentTarget.value)} />;
}

export function TextArea({ value, onChange, placeholder }: { value: string; onChange(value: string): void; placeholder?: string }) {
    return <textarea className="majic-textarea" spellCheck={false} value={value} placeholder={placeholder} onChange={e => onChange(e.currentTarget.value)} />;
}

export function Select<T extends string | number | boolean>({ value, options, onChange, placeholder }: { value: T; options: readonly { label: string; value: T }[]; onChange(value: T): void; placeholder?: string }) {
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const rootRef = useRef<HTMLDivElement>(null);
    const selectedIndex = options.findIndex(o => o.value === value);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    const openList = () => {
        setHighlighted(Math.max(selectedIndex, 0));
        setOpen(true);
    };

    const choose = (index: number) => {
        const option = options[index];
        if (option) onChange(option.value);
        setOpen(false);
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        switch (event.key) {
            case "ArrowDown":
            case "ArrowUp": {
                event.preventDefault();
                if (!open) return openList();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setHighlighted(i => (i + step + options.length) % options.length);
                break;
            }
            case "Enter":
            case " ":
                event.preventDefault();
                if (open) choose(highlighted);
                else openList();
                break;
            case "Escape":
                setOpen(false);
                break;
        }
    };

    return (
        <div className="majic-dropdown" ref={rootRef}>
            <button
                type="button"
                className="majic-dropdown-button"
                aria-haspopup="listbox"
                aria-expanded={open}
                data-open={open}
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={onKeyDown}
            >
                <span className="majic-dropdown-label">{options[selectedIndex]?.label ?? placeholder ?? t("ui.select")}</span>
                <DiscordIcon name={open ? "ChevronSmallUpIcon" : "ChevronSmallDownIcon"} size={18} />
            </button>
            {open && (
                <div className="majic-dropdown-list" role="listbox">
                    {options.map((option, i) => (
                        <div
                            key={i}
                            role="option"
                            aria-selected={i === selectedIndex}
                            className="majic-dropdown-option"
                            data-highlighted={i === highlighted}
                            onMouseEnter={() => setHighlighted(i)}
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => choose(i)}
                        >
                            <span className="majic-dropdown-label">{option.label}</span>
                            {i === selectedIndex && <DiscordIcon name="CheckmarkLargeIcon" size={16} color="var(--majic-accent)" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function Slider({ value, min, max, step, onChange, format = v => String(Math.round(v * 100) / 100) }: {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange(value: number): void;
    format?(value: number): string;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);
    const range = max - min || 1;

    const snap = (raw: number) => {
        const clamped = Math.min(max, Math.max(min, raw));
        return step ? Math.round((clamped - min) / step) * step + min : clamped;
    };

    const valueAt = (clientX: number) => {
        const rect = trackRef.current!.getBoundingClientRect();
        return snap(min + ((clientX - rect.left) / rect.width) * range);
    };

    const update = (next: number) => {
        if (next !== value) onChange(next);
    };

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        update(valueAt(event.clientX));
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (dragging) update(valueAt(event.clientX));
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        const increment = step ?? range / 100;
        const delta = { ArrowRight: increment, ArrowUp: increment, ArrowLeft: -increment, ArrowDown: -increment }[event.key];
        if (delta == null) return;
        event.preventDefault();
        update(snap(value + delta));
    };

    const percent = ((Math.min(max, Math.max(min, value)) - min) / range) * 100;

    return (
        <div className="majic-row">
            <div
                ref={trackRef}
                className="majic-slider majic-row-grow"
                role="slider"
                tabIndex={0}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
                data-dragging={dragging}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
                onKeyDown={onKeyDown}
            >
                <div className="majic-slider-track">
                    <div className="majic-slider-fill" style={{ width: `${percent}%` }} />
                </div>
                <div className="majic-slider-thumb" style={{ left: `${percent}%` }} />
            </div>
            <span className="majic-slider-value">{format(value)}</span>
        </div>
    );
}
