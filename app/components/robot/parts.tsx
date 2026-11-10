export const INK = "var(--bot-ink)";
export const SW = 3.5;
export const PAPER = "#FFFDF8";

export type Pt = readonly [number, number];
export type EyeMode = "open" | "up" | "lidded" | "stern" | "happy" | "closed";
export type MouthMode =
  | "flat"
  | "smirk"
  | "talk"
  | "smile"
  | "o"
  | "grit"
  | "sleep";

const line = {
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function GlowEyes({
  mode,
  at,
  w = 10,
  h = 6,
  glow,
}: {
  mode: EyeMode;
  at: readonly [Pt, Pt];
  w?: number;
  h?: number;
  glow: string;
}) {
  return (
    <g className="rb-eyes">
      {at.map(([cx, cy], i) => {
        const x0 = cx - w / 2;
        const x1 = cx + w / 2;
        const key = `${cx}-${cy}`;
        if (mode === "happy")
          return (
            <path
              key={key}
              d={`M${x0} ${cy + 2} Q${cx} ${cy - 5} ${x1} ${cy + 2}`}
              stroke={glow}
              strokeWidth={3}
              {...line}
            />
          );
        if (mode === "closed")
          return (
            <path
              key={key}
              d={`M${x0} ${cy} Q${cx} ${cy + 3} ${x1} ${cy}`}
              stroke={glow}
              strokeOpacity={0.5}
              strokeWidth={2.5}
              {...line}
            />
          );
        if (mode === "stern") {
          const top = cy - h / 2;
          const bot = cy + h / 2;
          const pts =
            i === 0
              ? `${x0},${top} ${x1},${cy} ${x1},${bot} ${x0},${bot}`
              : `${x0},${cy} ${x1},${top} ${x1},${bot} ${x0},${bot}`;
          return <polygon key={key} points={pts} fill={glow} />;
        }
        const hh = mode === "lidded" ? h * 0.5 : h;
        const y =
          mode === "up"
            ? cy - h / 2 - 2.5
            : mode === "lidded"
              ? cy - hh / 2 + 1
              : cy - h / 2;
        return (
          <rect
            key={key}
            x={x0}
            y={y}
            width={w}
            height={hh}
            rx={hh / 2}
            fill={glow}
          />
        );
      })}
    </g>
  );
}

export function RoundEyes({
  mode,
  at,
  r,
  lid,
  lashes,
}: {
  mode: EyeMode;
  at: readonly [Pt, Pt];
  r: number;
  lid: string;
  lashes?: boolean;
}) {
  return (
    <g className="rb-eyes">
      {at.map(([cx, cy], i) => {
        const key = `${cx}-${cy}`;
        if (mode === "happy")
          return (
            <path
              key={key}
              d={`M${cx - r * 0.85} ${cy + r * 0.35} Q${cx} ${cy - r} ${cx + r * 0.85} ${cy + r * 0.35}`}
              stroke={INK}
              strokeWidth={3.2}
              {...line}
            />
          );
        if (mode === "closed")
          return (
            <path
              key={key}
              d={`M${cx - r * 0.85} ${cy} Q${cx} ${cy + r * 0.7} ${cx + r * 0.85} ${cy}`}
              stroke={INK}
              strokeWidth={3}
              {...line}
            />
          );
        const py =
          mode === "up"
            ? cy - r * 0.38
            : mode === "lidded"
              ? cy + r * 0.28
              : cy + r * 0.08;
        const side = i === 0 ? 1 : -1;
        return (
          <g key={key}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={PAPER}
              stroke={INK}
              strokeWidth={2.5}
            />
            <circle
              className="rb-pupil"
              cx={cx + (mode === "stern" ? side * r * 0.12 : 0)}
              cy={py}
              r={r * 0.55}
              fill={INK}
            />
            {r >= 6 && mode !== "lidded" ? (
              <circle
                cx={cx + r * 0.22}
                cy={py - r * 0.2}
                r={r * 0.18}
                fill={PAPER}
              />
            ) : null}
            {mode === "lidded" ? (
              <path
                d={`M${cx - r - 0.5} ${cy + 0.5} A${r + 0.5} ${r + 0.5} 0 0 1 ${cx + r + 0.5} ${cy + 0.5} Z`}
                fill={lid}
                stroke={INK}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
            ) : null}
            {mode === "stern" ? (
              <path
                d={
                  i === 0
                    ? `M${cx - r - 1} ${cy - r - 2} L${cx + r + 0.5} ${cy - r * 0.35}`
                    : `M${cx + r + 1} ${cy - r - 2} L${cx - r - 0.5} ${cy - r * 0.35}`
                }
                stroke={INK}
                strokeWidth={3.4}
                {...line}
              />
            ) : null}
            {lashes && mode !== "stern" ? (
              <path
                d={
                  i === 0
                    ? `M${cx - r * 0.75} ${cy - r * 0.7} l-3 -3`
                    : `M${cx + r * 0.75} ${cy - r * 0.7} l3 -3`
                }
                stroke={INK}
                strokeWidth={2.4}
                {...line}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export function Mouth({
  mode,
  x,
  y,
  w,
  color = INK,
}: {
  mode: MouthMode;
  x: number;
  y: number;
  w: number;
  color?: string;
}) {
  const s = { stroke: color, strokeWidth: 3, ...line };
  switch (mode) {
    case "flat":
      return <path d={`M${x - w / 2} ${y} H${x + w / 2}`} {...s} />;
    case "smirk":
      return (
        <path
          d={`M${x - w / 2} ${y + 0.5} Q${x + w * 0.15} ${y + 2} ${x + w / 2} ${y - 2.5}`}
          {...s}
        />
      );
    case "smile":
      return (
        <path
          d={`M${x - w / 2} ${y - 1.5} Q${x} ${y + 5} ${x + w / 2} ${y - 1.5}`}
          {...s}
        />
      );
    case "talk":
      return (
        <ellipse
          className="rb-mouth-talk"
          cx={x}
          cy={y + 1}
          rx={w * 0.34}
          ry={3.6}
          fill={color}
        />
      );
    case "o":
      return (
        <circle
          cx={x + 2}
          cy={y}
          r={2.3}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
        />
      );
    case "grit":
      return (
        <g>
          <rect
            x={x - w / 2}
            y={y - 3}
            width={w}
            height={6}
            rx={2}
            fill={PAPER}
            stroke={INK}
            strokeWidth={2}
          />
          <path d={`M${x - w / 2} ${y} H${x + w / 2}`} stroke={INK} strokeWidth={1.4} />
        </g>
      );
    case "sleep":
      return <ellipse cx={x} cy={y + 1} rx={2.2} ry={1.6} fill={color} />;
  }
}
