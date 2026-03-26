import React from "react";
import { FlexWidget, SvgWidget } from "react-native-android-widget";

// ── Fire icon variants ──────────────────────────────────────
// All drawn at viewBox 0 0 24 24. Caller scales via transform.

// Style A: Duolingo-style rounded teardrop with inner glow
const FIRE_A_OUTER = "M12 2C12 2 6 8 6 13C6 16.9 8.7 20 12 20C15.3 20 18 16.9 18 13C18 8 12 2 12 2Z";
const FIRE_A_INNER = "M12 8C12 8 9 11 9 13.5C9 15.4 10.3 17 12 17C13.7 17 15 15.4 15 13.5C15 11 12 8 12 8Z";

function fireA(color: string, inner: string, scale: number, tx: number, ty: number): string {
  return `<g transform="translate(${tx},${ty}) scale(${scale})"><path d="${FIRE_A_OUTER}" fill="${color}"/><path d="${FIRE_A_INNER}" fill="${inner}"/></g>`;
}

// Style B: Sharper, more angular flame
const FIRE_B = "M12 1L8.5 8C7.5 10 7 11.5 7 13C7 15.8 9.2 18 12 18C14.8 18 17 15.8 17 13C17 11.5 16.5 10 15.5 8L12 1ZM12 7L14 11C14.5 12 14.7 12.5 14.7 13.2C14.7 14.7 13.5 16 12 16C10.5 16 9.3 14.7 9.3 13.2C9.3 12.5 9.5 12 10 11L12 7Z";

function fireB(color: string, scale: number, tx: number, ty: number): string {
  return `<g transform="translate(${tx},${ty}) scale(${scale})"><path d="${FIRE_B}" fill="${color}" fill-rule="evenodd"/></g>`;
}

// Style C: Emoji-style with separate tip
const FIRE_C_BASE = "M12 2C12 2 5.5 9 5.5 14C5.5 17.6 8.4 20.5 12 20.5C15.6 20.5 18.5 17.6 18.5 14C18.5 9 12 2 12 2Z";
const FIRE_C_TIP = "M12 9C12 9 8.5 12.5 8.5 15C8.5 16.9 10.1 18.5 12 18.5C13.9 18.5 15.5 16.9 15.5 15C15.5 12.5 12 9 12 9Z";

function fireC(color: string, tipColor: string, scale: number, tx: number, ty: number): string {
  return `<g transform="translate(${tx},${ty}) scale(${scale})"><path d="${FIRE_C_BASE}" fill="${color}"/><path d="${FIRE_C_TIP}" fill="${tipColor}"/></g>`;
}

// ── Color helpers ────────────────────────────────────────────

function getColors(goalMet: boolean, isDanger: boolean) {
  return {
    bg: goalMet ? "#071a0e" : isDanger ? "#170808" : "#0c1220",
    border: goalMet ? "#166534" : isDanger ? "#7f1d1d" : "#1e293b",
    flame: goalMet ? "#22c55e" : isDanger ? "#ef4444" : "#ff9600",
    flameInner: goalMet ? "#bbf7d0" : isDanger ? "#fecaca" : "#ffdd44",
    flameTip: goalMet ? "#4ade80" : isDanger ? "#f87171" : "#ffe066",
    num: goalMet ? "#4ade80" : isDanger ? "#f87171" : "#ff9600",
    muted: "#94a3b8",
    track: "#1e293b",
  };
}

// ── Shared types ─────────────────────────────────────────────

interface WeekDay {
  label: string;
  met: boolean;
  isToday: boolean;
  hasData: boolean;
}

interface StreakWidgetProps {
  streak?: number;
  goalMet?: boolean;
  isDanger?: boolean;
  todayScore?: number;
  goal?: number;
  week?: WeekDay[];
  variant?: "bold" | "compact" | "week" | "ring" | "score" | "duo" | "mini" | "flame";
}

// ── Variant: Bold ───────────────────────────────────────────
// Large fire A centered above big number.

function BoldWidget({ streak, goalMet, isDanger }: { streak: number; goalMet: boolean; isDanger: boolean }) {
  const c = getColors(goalMet, isDanger);
  const showDays = streak < 1000;

  const svgStr = `<svg width="120" height="140" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="140" rx="16" fill="${c.bg}" stroke="${c.border}" stroke-width="1.5"/>
    ${fireA(c.flame, c.flameInner, 2.5, 30, 6)}
    <text x="60" y="${showDays ? 100 : 108}" text-anchor="middle" fill="${c.num}" font-size="42" font-weight="900" font-family="sans-serif">${streak}</text>
    ${showDays ? `<text x="60" y="120" text-anchor="middle" fill="${c.muted}" font-size="12" font-weight="600" font-family="sans-serif">${streak === 1 ? "day" : "days"}</text>` : ""}
  </svg>`;

  return (
    <FlexWidget clickAction="OPEN_SIGNALS" style={{ height: "match_parent", width: "match_parent", justifyContent: "center", alignItems: "center" }}>
      <SvgWidget svg={svgStr} style={{ height: "match_parent", width: "match_parent" }} />
    </FlexWidget>
  );
}

// ── Variant: Compact ────────────────────────────────────────
// Horizontal: fire B inline with number.

function CompactWidget({ streak, goalMet, isDanger }: { streak: number; goalMet: boolean; isDanger: boolean }) {
  const c = getColors(goalMet, isDanger);
  const digits = String(streak).length;
  // Fire on left, number right next to it, "days" only if number is small
  const fireSize = 1.5;
  const fireW = 24 * fireSize;
  const totalW = 140;
  const numFontSize = 28;
  const numW = digits * 16;
  const showDays = streak < 100;
  const daysW = showDays ? 36 : 0;
  const contentW = fireW + 4 + numW + (showDays ? 4 + daysW : 0);
  const startX = (totalW - contentW) / 2;

  const svgStr = `<svg width="${totalW}" height="56" viewBox="0 0 ${totalW} 56" xmlns="http://www.w3.org/2000/svg">
    <rect width="${totalW}" height="56" rx="14" fill="${c.bg}" stroke="${c.border}" stroke-width="1.5"/>
    ${fireB(c.flame, fireSize, startX, 10)}
    <text x="${startX + fireW + 4}" y="37" fill="${c.num}" font-size="${numFontSize}" font-weight="900" font-family="sans-serif">${streak}</text>
    ${showDays ? `<text x="${startX + fireW + 4 + numW + 4}" y="37" fill="${c.muted}" font-size="13" font-weight="600" font-family="sans-serif">${streak === 1 ? "day" : "days"}</text>` : ""}
  </svg>`;

  return (
    <FlexWidget clickAction="OPEN_SIGNALS" style={{ height: "match_parent", width: "match_parent", justifyContent: "center", alignItems: "center" }}>
      <SvgWidget svg={svgStr} style={{ height: "match_parent", width: "match_parent" }} />
    </FlexWidget>
  );
}

// ── Variant: Duo ────────────────────────────────────────────
// Duolingo-style: fire C icon inline with large bold number, vibrant orange bg.

function DuoWidget({ streak, goalMet, isDanger }: { streak: number; goalMet: boolean; isDanger: boolean }) {
  const c = getColors(goalMet, isDanger);
  const bg = goalMet ? "#052e16" : isDanger ? "#2d0a0a" : "#1c1145";
  const border = goalMet ? "#166534" : isDanger ? "#7f1d1d" : "#312e81";
  const digits = String(streak).length;
  const fireScale = 2.0;
  const fireW = 24 * fireScale;
  const fontSize = digits >= 4 ? 36 : 44;
  const numW = digits * (fontSize * 0.58);
  const contentW = fireW + 2 + numW;
  const W = 160;
  const H = 72;
  const startX = (W - contentW) / 2;
  const baseY = H / 2 + fontSize * 0.34;

  const svgStr = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" rx="16" fill="${bg}" stroke="${border}" stroke-width="1.5"/>
    ${fireC(c.flame, c.flameTip, fireScale, startX, (H - 24 * fireScale) / 2)}
    <text x="${startX + fireW + 2}" y="${baseY}" fill="${c.num}" font-size="${fontSize}" font-weight="900" font-family="sans-serif">${streak}</text>
  </svg>`;

  return (
    <FlexWidget clickAction="OPEN_SIGNALS" style={{ height: "match_parent", width: "match_parent", justifyContent: "center", alignItems: "center" }}>
      <SvgWidget svg={svgStr} style={{ height: "match_parent", width: "match_parent" }} />
    </FlexWidget>
  );
}

// ── Variant: Mini ───────────────────────────────────────────
// Smallest possible: just fire + number, no border, no "days".

function MiniWidget({ streak, goalMet, isDanger }: { streak: number; goalMet: boolean; isDanger: boolean }) {
  const c = getColors(goalMet, isDanger);
  const digits = String(streak).length;
  const fireScale = 1.3;
  const fireW = 24 * fireScale;
  const fontSize = 22;
  const numW = digits * 13;
  const contentW = fireW + 2 + numW;
  const W = Math.max(80, contentW + 20);
  const H = 44;
  const startX = (W - contentW) / 2;

  const svgStr = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" rx="12" fill="${c.bg}" stroke="${c.border}" stroke-width="1"/>
    ${fireA(c.flame, c.flameInner, fireScale, startX, (H - 24 * fireScale) / 2)}
    <text x="${startX + fireW + 2}" y="${H / 2 + fontSize * 0.35}" fill="${c.num}" font-size="${fontSize}" font-weight="900" font-family="sans-serif">${streak}</text>
  </svg>`;

  return (
    <FlexWidget clickAction="OPEN_SIGNALS" style={{ height: "match_parent", width: "match_parent", justifyContent: "center", alignItems: "center" }}>
      <SvgWidget svg={svgStr} style={{ height: "match_parent", width: "match_parent" }} />
    </FlexWidget>
  );
}

// ── Variant: Flame ──────────────────────────────────────────
// Tall: large fire C filling most of the widget, number overlaid at bottom.

function FlameWidget({ streak, goalMet, isDanger }: { streak: number; goalMet: boolean; isDanger: boolean }) {
  const c = getColors(goalMet, isDanger);
  const W = 110;
  const H = 150;
  const fireScale = 3.5;

  const svgStr = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" rx="16" fill="${c.bg}" stroke="${c.border}" stroke-width="1.5"/>
    ${fireC(c.flame, c.flameTip, fireScale, (W - 24 * fireScale) / 2, 4)}
    <text x="${W / 2}" y="${H - 22}" text-anchor="middle" fill="#fff" font-size="36" font-weight="900" font-family="sans-serif">${streak}</text>
  </svg>`;

  return (
    <FlexWidget clickAction="OPEN_SIGNALS" style={{ height: "match_parent", width: "match_parent", justifyContent: "center", alignItems: "center" }}>
      <SvgWidget svg={svgStr} style={{ height: "match_parent", width: "match_parent" }} />
    </FlexWidget>
  );
}

// ── Variant: Week ───────────────────────────────────────────
// Fire + streak inline on top, 7 day dots below.

function WeekWidget({ streak, goalMet, isDanger, week }: { streak: number; goalMet: boolean; isDanger: boolean; week: WeekDay[] }) {
  const c = getColors(goalMet, isDanger);
  const W = 200;
  const H = 108;

  // Top row: fire + number centered
  const fireScale = 1.3;
  const fireW = 24 * fireScale;
  const digits = String(streak).length;
  const numW = digits * 16;
  const showDays = streak < 100;
  const daysW = showDays ? 36 : 0;
  const topContentW = fireW + 2 + numW + (showDays ? 4 + daysW : 0);
  const topStartX = (W - topContentW) / 2;

  // Week dots
  const dotR = 8;
  const dotGap = 6;
  const totalDotsWidth = 7 * dotR * 2 + 6 * dotGap;
  const dotsStartX = (W - totalDotsWidth) / 2;

  let weekDots = "";
  const days = week.length === 7 ? week : Array.from({ length: 7 }, (_, i) => ({ label: ["S","M","T","W","T","F","S"][i], met: false, isToday: i === 6, hasData: false }));

  days.forEach((day, i) => {
    const cx = dotsStartX + i * (dotR * 2 + dotGap) + dotR;
    const cy = 72;
    const dotColor = day.met ? "#22c55e" : day.isToday ? c.track : day.hasData ? "#7f1d1d" : c.track;
    const strokeColor = day.isToday && !day.met ? "#3b82f6" : "none";
    const sw = day.isToday && !day.met ? "1.5" : "0";

    weekDots += `<circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${dotColor}" stroke="${strokeColor}" stroke-width="${sw}"/>`;
    if (day.met) {
      weekDots += `<path d="M${cx - 3.5} ${cy}l2.5 2.5 4.5-5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    weekDots += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="${c.muted}" font-size="8" font-family="sans-serif">${day.label}</text>`;
  });

  const svgStr = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" rx="16" fill="${c.bg}" stroke="${c.border}" stroke-width="1.5"/>
    ${fireA(c.flame, c.flameInner, fireScale, topStartX, 10)}
    <text x="${topStartX + fireW + 2}" y="35" fill="${c.num}" font-size="26" font-weight="900" font-family="sans-serif">${streak}</text>
    ${showDays ? `<text x="${topStartX + fireW + 2 + numW + 4}" y="35" fill="${c.muted}" font-size="11" font-weight="600" font-family="sans-serif">${streak === 1 ? "day" : "days"}</text>` : ""}
    ${weekDots}
  </svg>`;

  return (
    <FlexWidget clickAction="OPEN_SIGNALS" style={{ height: "match_parent", width: "match_parent", justifyContent: "center", alignItems: "center" }}>
      <SvgWidget svg={svgStr} style={{ height: "match_parent", width: "match_parent" }} />
    </FlexWidget>
  );
}

// ── Variant: Ring ───────────────────────────────────────────
// Circular progress ring, streak in center, % below.

function RingWidget({ streak, goalMet, isDanger, todayScore, goal }: { streak: number; goalMet: boolean; isDanger: boolean; todayScore: number; goal: number }) {
  const c = getColors(goalMet, isDanger);
  const W = 120;
  const H = 128;
  const cx = W / 2;
  const cy = 56;
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(100, todayScore) / 100;
  const dashOffset = circumference * (1 - progress);
  const ringColor = goalMet ? "#22c55e" : todayScore >= goal * 0.5 ? "#ff9600" : "#334155";

  const svgStr = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" rx="16" fill="${c.bg}" stroke="${c.border}" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.track}" stroke-width="6"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ringColor}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" fill="${c.num}" font-size="30" font-weight="900" font-family="sans-serif">${streak}</text>
    <text x="${cx}" y="${H - 12}" text-anchor="middle" fill="${goalMet ? "#22c55e" : c.muted}" font-size="13" font-weight="700" font-family="sans-serif">${Math.round(todayScore)}%</text>
  </svg>`;

  return (
    <FlexWidget clickAction="OPEN_SIGNALS" style={{ height: "match_parent", width: "match_parent", justifyContent: "center", alignItems: "center" }}>
      <SvgWidget svg={svgStr} style={{ height: "match_parent", width: "match_parent" }} />
    </FlexWidget>
  );
}

// ── Variant: Score ──────────────────────────────────────────
// Fire + streak left, progress bar below, % right.

function ScoreWidget({ streak, goalMet, isDanger, todayScore, goal }: { streak: number; goalMet: boolean; isDanger: boolean; todayScore: number; goal: number }) {
  const c = getColors(goalMet, isDanger);
  const W = 200;
  const H = 76;

  // Top row
  const fireScale = 1.2;
  const fireW = 24 * fireScale;
  const digits = String(streak).length;

  // Progress bar
  const barW = 150;
  const barH = 8;
  const barX = (W - barW) / 2;
  const barY = 56;
  const progress = Math.min(100, todayScore) / 100;
  const fillW = Math.max(4, barW * progress);
  const barColor = goalMet ? "#22c55e" : todayScore >= goal * 0.5 ? "#ff9600" : "#3b82f6";
  const goalX = barX + barW * (goal / 100);

  // Center fire + number
  const numW = digits * 15;
  const topContentW = fireW + 2 + numW;
  const topStartX = 16;

  const svgStr = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" rx="14" fill="${c.bg}" stroke="${c.border}" stroke-width="1.5"/>
    ${fireB(c.flame, fireScale, topStartX, 8)}
    <text x="${topStartX + fireW + 2}" y="34" fill="${c.num}" font-size="24" font-weight="900" font-family="sans-serif">${streak}</text>
    <text x="${W - 18}" y="34" text-anchor="end" fill="${goalMet ? "#22c55e" : c.muted}" font-size="14" font-weight="700" font-family="sans-serif">${Math.round(todayScore)}%</text>
    <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="4" fill="${c.track}"/>
    <rect x="${barX}" y="${barY}" width="${fillW}" height="${barH}" rx="4" fill="${barColor}"/>
    <line x1="${goalX}" y1="${barY - 2}" x2="${goalX}" y2="${barY + barH + 2}" stroke="${c.muted}" stroke-width="1.5" stroke-dasharray="2,2"/>
  </svg>`;

  return (
    <FlexWidget clickAction="OPEN_SIGNALS" style={{ height: "match_parent", width: "match_parent", justifyContent: "center", alignItems: "center" }}>
      <SvgWidget svg={svgStr} style={{ height: "match_parent", width: "match_parent" }} />
    </FlexWidget>
  );
}

// ── Main Export ──────────────────────────────────────────────

export function SignalStreakWidget({
  streak = 0,
  goalMet = false,
  isDanger = false,
  todayScore = 0,
  goal = 75,
  week = [],
  variant = "bold",
}: StreakWidgetProps) {
  switch (variant) {
    case "compact":
      return <CompactWidget streak={streak} goalMet={goalMet} isDanger={isDanger} />;
    case "duo":
      return <DuoWidget streak={streak} goalMet={goalMet} isDanger={isDanger} />;
    case "mini":
      return <MiniWidget streak={streak} goalMet={goalMet} isDanger={isDanger} />;
    case "flame":
      return <FlameWidget streak={streak} goalMet={goalMet} isDanger={isDanger} />;
    case "week":
      return <WeekWidget streak={streak} goalMet={goalMet} isDanger={isDanger} week={week} />;
    case "ring":
      return <RingWidget streak={streak} goalMet={goalMet} isDanger={isDanger} todayScore={todayScore} goal={goal} />;
    case "score":
      return <ScoreWidget streak={streak} goalMet={goalMet} isDanger={isDanger} todayScore={todayScore} goal={goal} />;
    default:
      return <BoldWidget streak={streak} goalMet={goalMet} isDanger={isDanger} />;
  }
}
