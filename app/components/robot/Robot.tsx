import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

import {
  CHARACTERS,
  faceFor,
  type CharacterDef,
  type RobotCharacter,
  type RobotState,
} from "./characters";
import { INK, PAPER, SW, type Pt } from "./parts";

import "./robot.css";

export {
  ROBOT_CHARACTERS,
  ROBOT_STATES,
  type RobotCharacter,
  type RobotState,
} from "./characters";

export interface RobotProps {
  character: RobotCharacter;
  state?: RobotState;
  size?: number;
  className?: string;
  label?: string;
  decorative?: boolean;
}

const STATE_PHRASE: Record<RobotState, string> = {
  idle: "waiting",
  thinking: "thinking",
  talking: "talking",
  holding: "holding its price",
  blocking: "blocking an attempt",
  deal: "celebrating a deal",
  asleep: "powered down",
};

export function robotLabel(character: RobotCharacter, state: RobotState) {
  const def = CHARACTERS[character];
  const who = character === "keeper" ? `${def.name}, ${def.role}` : def.name;
  const what =
    state === "asleep" && character === "keeper"
      ? "powered down while the seller takes over"
      : STATE_PHRASE[state];
  return `${who}, ${what}`;
}

type Pose = "down" | "talk" | "think" | "cross" | "shield" | "up" | "slump";

const POSE: Record<RobotState, Pose> = {
  idle: "down",
  thinking: "think",
  talking: "talk",
  holding: "cross",
  blocking: "shield",
  deal: "up",
  asleep: "slump",
};

function Arm({
  from,
  ctrl,
  to,
  color,
  className,
  style,
}: {
  from: Pt;
  ctrl: Pt;
  to: Pt;
  color: string;
  className?: string;
  style?: CSSProperties;
}) {
  const d = `M${from[0]} ${from[1]} Q${ctrl[0]} ${ctrl[1]} ${to[0]} ${to[1]}`;
  return (
    <g className={cn("rb-arm", className)} style={style}>
      <path d={d} stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" />
      <path d={d} stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" />
      <circle cx={to[0]} cy={to[1]} r={5.6} fill={color} stroke={INK} strokeWidth={3} />
    </g>
  );
}

function arms(def: CharacterDef, pose: Pose) {
  const [[lx, ly], [rx, ry]] = def.shoulders;
  const c = def.color;
  const downL = <Arm from={[lx, ly]} ctrl={[lx - 9, ly + 10]} to={[lx - 6, ly + 24]} color={c} />;
  const downR = <Arm from={[rx, ry]} ctrl={[rx + 9, ry + 10]} to={[rx + 6, ry + 24]} color={c} />;
  switch (pose) {
    case "down":
      return { back: [downL, downR], front: [] };
    case "slump":
      return {
        back: [
          <Arm from={[lx, ly]} ctrl={[lx - 4, ly + 12]} to={[lx - 1, ly + 26]} color={c} />,
          <Arm from={[rx, ry]} ctrl={[rx + 4, ry + 12]} to={[rx + 1, ry + 26]} color={c} />,
        ],
        front: [],
      };
    case "talk":
      return {
        back: [
          downL,
          <Arm
            from={[rx, ry]}
            ctrl={[rx + 14, ry + 8]}
            to={[rx + 17, ry - 8]}
            color={c}
            className="rb-gesture"
            style={{ transformOrigin: `${rx}px ${ry}px` }}
          />,
        ],
        front: [],
      };
    case "think":
      return {
        back: [downL],
        front: [<Arm from={[rx, ry]} ctrl={[rx + 8, def.chin[1] + 16]} to={def.chin} color={c} />],
      };
    case "cross":
      return {
        back: [],
        front: [
          <Arm from={[lx, ly]} ctrl={[lx + 4, ly + 16]} to={[72, ly + 11]} color={c} />,
          <Arm from={[rx, ry]} ctrl={[rx - 4, ry + 18]} to={[48, ry + 8]} color={c} />,
        ],
      };
    case "shield":
      return {
        back: [],
        front: [
          <Arm from={[lx, ly]} ctrl={[lx - 2, ly + 14]} to={[52, 84]} color={c} />,
          <Arm from={[rx, ry]} ctrl={[rx + 2, ry + 14]} to={[68, 84]} color={c} />,
        ],
      };
    case "up":
      return {
        back: [
          <Arm from={[lx, ly]} ctrl={[lx - 14, ly - 2]} to={[lx - 13, ly - 25]} color={c} />,
          <Arm from={[rx, ry]} ctrl={[rx + 14, ry - 2]} to={[rx + 13, ry - 25]} color={c} />,
        ],
        front: [],
      };
  }
}

const CONFETTI: [number, number, string, "r" | "c"][] = [
  [12, 44, "#E8643A", "r"],
  [22, 18, "#E9B03B", "c"],
  [40, 4, "#4F78B5", "r"],
  [84, 3, "#E98AA0", "c"],
  [100, 17, "#2F7A62", "r"],
  [108, 44, "#E9B03B", "r"],
  [6, 70, "#E98AA0", "r"],
  [114, 70, "#4F78B5", "c"],
];

function Fx({ state }: { state: RobotState }) {
  switch (state) {
    case "thinking":
      return (
        <g className="rb-fx">
          <circle cx={88} cy={24} r={2.2} fill="hsl(var(--card))" stroke="currentColor" strokeWidth={2} />
          <rect x={90} y={2} width={29} height={15} rx={7.5} fill="hsl(var(--card))" stroke="currentColor" strokeWidth={2.4} />
          <circle className="rb-dot" cx={98} cy={9.5} r={2.3} fill="currentColor" />
          <circle className="rb-dot" cx={104.5} cy={9.5} r={2.3} fill="currentColor" />
          <circle className="rb-dot" cx={111} cy={9.5} r={2.3} fill="currentColor" />
        </g>
      );
    case "talking":
      return (
        <g className="rb-fx" stroke="currentColor" strokeWidth={2.8} fill="none" strokeLinecap="round">
          <path className="rb-wave" d="M104 30 Q109 38 104 46" />
          <path className="rb-wave" d="M110 24 Q118 38 110 52" />
        </g>
      );
    case "holding":
      return (
        <g className="rb-fx" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" opacity={0.55}>
          <path d="M16 114 H28 M92 114 H104" />
          <path d="M20 108 l-4 -3 M100 108 l4 -3" />
        </g>
      );
    case "blocking":
      return (
        <g className="rb-fx">
          <g className="rb-shield">
            <path d="M60 56 L83 63 V82 C83 95 72 103 60 107 C48 103 37 95 37 82 V63 Z" fill={PAPER} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M60 62 L77 67 V82 C77 91 70 97 60 101 C50 97 43 91 43 82 V67 Z" fill="none" stroke="#E8643A" strokeWidth={2.4} strokeLinejoin="round" />
            <rect x={49} y={78.5} width={22} height={7} rx={3.5} fill="#E8643A" stroke={INK} strokeWidth={2.4} />
          </g>
          <g className="rb-impact" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
            <path d="M28 66 L19 61 M27 78 L16 78 M28 90 L19 95" />
            <path d="M92 66 L101 61 M93 78 L104 78 M92 90 L101 95" />
          </g>
        </g>
      );
    case "deal":
      return (
        <g className="rb-fx">
          {CONFETTI.map(([x, y, color, shape], i) => (
            <g
              key={i}
              className="rb-confetti"
              style={{ "--dx": `${(60 - x) * 0.8}px`, "--dy": `${(56 - y) * 0.8}px` } as CSSProperties}
            >
              {shape === "c" ? (
                <circle cx={x} cy={y} r={3} fill={color} stroke={INK} strokeWidth={1.4} />
              ) : (
                <rect x={x - 4} y={y - 2} width={8} height={4} rx={1} fill={color} stroke={INK} strokeWidth={1.4} transform={`rotate(${i * 37} ${x} ${y})`} />
              )}
            </g>
          ))}
        </g>
      );
    case "asleep":
      return (
        <g className="rb-fx" fill="currentColor" fontFamily="var(--font-sans-app)" fontWeight={800}>
          <text className="rb-z" x={92} y={34} fontSize={14}>z</text>
          <text className="rb-z" x={100} y={22} fontSize={11}>z</text>
          <text className="rb-z" x={107} y={12} fontSize={8}>z</text>
        </g>
      );
    default:
      return null;
  }
}

export function Robot({
  character,
  state = "idle",
  size = 96,
  className,
  label,
  decorative = false,
}: RobotProps) {
  const def = CHARACTERS[character];
  const pose = POSE[state];
  const { back, front } = arms(def, pose);
  const face = faceFor(def, state);
  const name = label ?? robotLabel(character, state);
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cn("rb", size < 56 && "rb--small", className)}
      data-robot={character}
      data-state={state}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <g key={state}>
        <ellipse className="rb-shadow" cx={60} cy={114} rx={34} ry={4} fill="currentColor" opacity={0.14} />
        <g className="rb-fig">
          {back.map((a, i) => (
            <g key={`b${i}`}>{a}</g>
          ))}
          {def.back}
          <g className="rb-body">{def.body}</g>
          <g className="rb-head">{def.head(face.eyes, face.mouth, state)}</g>
          {def.front?.(state)}
          {front.map((a, i) => (
            <g key={`f${i}`}>{a}</g>
          ))}
        </g>
        <Fx state={state} />
      </g>
    </svg>
  );
}
