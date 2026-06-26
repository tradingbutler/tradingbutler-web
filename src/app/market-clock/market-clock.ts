import { Component, afterNextRender, signal } from '@angular/core';

interface SessionDef {
  name: string;
  city: string;
  /** Session open window in UTC hours; wraps midnight when startH > endH. */
  startH: number;
  endH: number;
}

export interface SessionView {
  name: string;
  city: string;
  open: boolean;
  /** Human label for the next state change, e.g. "Closes in 2h 10m". */
  change: string;
}

export interface ExchangeView {
  name: string;
  region: string;
  tzLabel: string;
  open: boolean;
  /** Tooltip text mirroring the main sessions, e.g. "Open · Closes in 2h 10m". */
  detail: string;
}

/** Secondary stock exchanges shown smaller. Open windows are local minutes
 *  from midnight; evaluated in each exchange's own IANA zone so DST is correct. */
interface ExchangeDef {
  name: string;
  region: string;
  tz: string;
  /** Short timezone label shown on the chip (both forms where DST applies). */
  tzLabel: string;
  ranges: Array<[number, number]>;
}

const EXCHANGES: ExchangeDef[] = [
  { name: 'Frankfurt', region: 'Germany', tz: 'Europe/Berlin', tzLabel: 'CET/CEST', ranges: [[540, 1050]] },
  { name: 'Shanghai', region: 'China', tz: 'Asia/Shanghai', tzLabel: 'CST', ranges: [[570, 690], [780, 900]] },
  { name: 'Hong Kong', region: 'Hong Kong', tz: 'Asia/Hong_Kong', tzLabel: 'HKT', ranges: [[570, 720], [780, 960]] },
  { name: 'Mumbai', region: 'India', tz: 'Asia/Kolkata', tzLabel: 'IST', ranges: [[555, 930]] },
];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Weekday + minutes-from-midnight for a moment, in an IANA timezone. */
function localAt(tz: string, at: Date): { dow: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  let dow = 0;
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === 'weekday') dow = WEEKDAY_INDEX[p.value] ?? 0;
    else if (p.type === 'hour') hour = Number(p.value) % 24;
    else if (p.type === 'minute') minute = Number(p.value);
  }
  return { dow, minutes: hour * 60 + minute };
}

function exchangeOpen(e: ExchangeDef, at: Date): boolean {
  const { dow, minutes } = localAt(e.tz, at);
  if (dow === 0 || dow === 6) return false;
  return e.ranges.some(([a, b]) => minutes >= a && minutes < b);
}

/** Same scan as the forex sessions: find when this exchange next flips state. */
function nextExchangeChange(now: Date, e: ExchangeDef): string {
  const openNow = exchangeOpen(e, now);
  for (let t = STEP_MS; t <= SCAN_CAP_MS; t += STEP_MS) {
    if (exchangeOpen(e, new Date(now.getTime() + t)) !== openNow) {
      return `${openNow ? 'Closes' : 'Opens'} in ${formatDelta(t)}`;
    }
  }
  return openNow ? 'Open' : 'Closed';
}

/** Approximate main-session windows in UTC (24h clock). */
const SESSIONS: SessionDef[] = [
  { name: 'Sydney', city: 'AEST', startH: 22, endH: 7 },
  { name: 'Tokyo', city: 'JST', startH: 0, endH: 9 },
  { name: 'London', city: 'GMT/BST', startH: 8, endH: 17 },
  { name: 'New York', city: 'EST/EDT', startH: 13, endH: 22 },
];

const STEP_MS = 5 * 60 * 1000;
const SCAN_CAP_MS = 72 * 60 * 60 * 1000;

/** True while inside a session's daily window (handles the midnight wrap). */
function inDailyWindow(d: Date, startH: number, endH: number): boolean {
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return startH < endH ? h >= startH && h < endH : h >= startH || h < endH;
}

/** The forex week runs Sun 22:00 UTC → Fri 22:00 UTC; closed otherwise. */
function isForexWeek(d: Date): boolean {
  const day = d.getUTCDay();
  const h = d.getUTCHours();
  if (day === 6) return false;
  if (day === 5 && h >= 22) return false;
  if (day === 0 && h < 22) return false;
  return true;
}

function sessionOpen(d: Date, s: SessionDef): boolean {
  return isForexWeek(d) && inDailyWindow(d, s.startH, s.endH);
}

function formatDelta(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Scans forward in coarse steps to find when this session next flips state. */
function nextChange(now: Date, s: SessionDef): string {
  const openNow = sessionOpen(now, s);
  for (let t = STEP_MS; t <= SCAN_CAP_MS; t += STEP_MS) {
    if (sessionOpen(new Date(now.getTime() + t), s) !== openNow) {
      return `${openNow ? 'Closes' : 'Opens'} in ${formatDelta(t)}`;
    }
  }
  return openNow ? 'Open' : 'Closed';
}

/**
 * "Is the market open right now?" — a live forex session clock. Every value is
 * derived from the visitor's own clock (UTC), so it needs no backend and is
 * always real. Rendered browser-only via afterNextRender to stay hydration-safe.
 */
@Component({
  selector: 'app-market-clock',
  imports: [],
  templateUrl: './market-clock.html',
  styleUrl: './market-clock.scss',
})
export class MarketClock {
  protected readonly ready = signal(false);
  protected readonly marketOpen = signal(false);
  protected readonly utcTime = signal('');
  protected readonly sessions = signal<SessionView[]>([]);
  protected readonly exchanges = signal<ExchangeView[]>([]);

  constructor() {
    afterNextRender(() => {
      this.update();
      const timer = setInterval(() => this.update(), 1000);
      // afterNextRender runs once; clearing on unload is enough for a landing page.
      window.addEventListener('beforeunload', () => clearInterval(timer), { once: true });
    });
  }

  private update(): void {
    const now = new Date();
    this.utcTime.set(
      now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
      }),
    );
    this.marketOpen.set(isForexWeek(now) && SESSIONS.some((s) => sessionOpen(now, s)));
    this.sessions.set(
      SESSIONS.map((s) => ({
        name: s.name,
        city: s.city,
        open: sessionOpen(now, s),
        change: nextChange(now, s),
      })),
    );
    this.exchanges.set(
      EXCHANGES.map((e) => {
        const open = exchangeOpen(e, now);
        return {
          name: e.name,
          region: e.region,
          tzLabel: e.tzLabel,
          open,
          detail: `${open ? 'Open' : 'Closed'} · ${nextExchangeChange(now, e)}`,
        };
      }),
    );
    this.ready.set(true);
  }
}
