import type { ReactNode } from "react";

import {
  GlowEyes,
  INK,
  Mouth,
  PAPER,
  RoundEyes,
  SW,
  type EyeMode,
  type MouthMode,
  type Pt,
} from "./parts";

export const ROBOT_CHARACTERS = [
  "keeper",
  "lowballer",
  "sweet_talker",
  "prober",
  "jailbreaker",
] as const;
export type RobotCharacter = (typeof ROBOT_CHARACTERS)[number];

export const ROBOT_STATES = [
  "idle",
  "thinking",
  "talking",
  "holding",
  "blocking",
  "deal",
  "asleep",
] as const;
export type RobotState = (typeof ROBOT_STATES)[number];

export interface CharacterDef {
  name: string;
  role: string;
  color: string;
  shade: string;
  light: string;
  shoulders: readonly [Pt, Pt];
  chin: Pt;
  back: ReactNode;
  body: ReactNode;
  head: (eyes: EyeMode, mouth: MouthMode, state: RobotState) => ReactNode;
  front?: (state: RobotState) => ReactNode;
  eyes?: Partial<Record<RobotState, EyeMode>>;
  mouth?: Partial<Record<RobotState, MouthMode>>;
}

const o = { stroke: INK, strokeWidth: SW, strokeLinejoin: "round" } as const;
const TAG = "#E8643A";
const KEEPER_GLOW = "#BDF5D9";
const HACK_GLOW = "var(--bot-glow)";

const keeper: CharacterDef = {
  name: "Keeper",
  role: "the seller's robot",
  color: "var(--bot-keeper)",
  shade: "#215A48",
  light: "#CDE7DB",
  shoulders: [
    [27, 70],
    [93, 70],
  ],
  chin: [74, 62],
  eyes: { idle: "lidded", talking: "lidded" },
  mouth: { idle: "flat", holding: "smirk" },
  back: (
    <g>
      <rect x={42} y={96} width={10} height={10} fill="#215A48" {...o} />
      <rect x={68} y={96} width={10} height={10} fill="#215A48" {...o} />
      <rect x={34} y={103} width={22} height={9} rx={4.5} fill="var(--bot-keeper)" {...o} />
      <rect x={64} y={103} width={22} height={9} rx={4.5} fill="var(--bot-keeper)" {...o} />
    </g>
  ),
  body: (
    <g>
      <rect x={25} y={58} width={70} height={44} rx={12} fill="var(--bot-keeper)" {...o} />
      <rect x={38} y={66} width={44} height={29} rx={7} fill="#215A48" />
      <g className="rb-dial">
        <circle cx={60} cy={80.5} r={9.5} fill="#CDE7DB" {...o} strokeWidth={3} />
        <path d="M60 80.5 V73.5" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </g>
      <circle cx={46} cy={73} r={1.8} fill="#CDE7DB" />
      <circle cx={74} cy={73} r={1.8} fill="#CDE7DB" />
    </g>
  ),
  head: (eyes, mouth) => (
    <g>
      <path d="M60 21 V10" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <g className="rb-tag">
        <path d="M62 4 H82 V15 H62 L57 9.5 Z" fill={TAG} {...o} strokeWidth={2.6} />
        <circle cx={63} cy={9.5} r={1.6} fill={INK} />
      </g>
      <circle className="rb-bulb" cx={60} cy={9} r={3.4} fill={TAG} {...o} strokeWidth={2.4} />
      <rect x={21} y={33} width={8} height={16} rx={3} fill="#215A48" {...o} strokeWidth={3} />
      <rect x={91} y={33} width={8} height={16} rx={3} fill="#215A48" {...o} strokeWidth={3} />
      <rect x={27} y={20} width={66} height={42} rx={14} fill="var(--bot-keeper)" {...o} />
      <rect x={35} y={28} width={50} height={22} rx={9} fill={INK} />
      <GlowEyes mode={eyes} at={[[49, 39.5], [71, 39.5]]} glow={KEEPER_GLOW} />
      <Mouth mode={mouth} x={60} y={56} w={12} />
    </g>
  ),
};

const lowballer: CharacterDef = {
  name: "Lowballer",
  role: "attacker robot",
  color: "var(--bot-lowballer)",
  shade: "#B8821C",
  light: "#FBE8B8",
  shoulders: [
    [35, 70],
    [85, 70],
  ],
  chin: [72, 56],
  mouth: { idle: "smirk", holding: "flat" },
  back: (
    <g>
      <rect x={47} y={98} width={9} height={8} fill="#B8821C" {...o} />
      <rect x={64} y={98} width={9} height={8} fill="#B8821C" {...o} />
      <ellipse cx={49} cy={108} rx={10} ry={5} fill="var(--bot-lowballer)" {...o} />
      <ellipse cx={71} cy={108} rx={10} ry={5} fill="var(--bot-lowballer)" {...o} />
    </g>
  ),
  body: (
    <g>
      <circle cx={60} cy={78} r={27} fill="var(--bot-lowballer)" {...o} />
      <path d="M41 59 C53 70 53 88 41 97" stroke={PAPER} strokeWidth={3.2} fill="none" strokeLinecap="round" />
      <path d="M79 59 C67 70 67 88 79 97" stroke={PAPER} strokeWidth={3.2} fill="none" strokeLinecap="round" />
    </g>
  ),
  head: (eyes, mouth) => (
    <g>
      <rect x={43} y={28} width={34} height={25} rx={6} fill="var(--bot-lowballer)" {...o} />
      <path d="M41 31 Q60 13 79 31 Z" fill="#B8821C" {...o} />
      <path d="M75 30 L92 33" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <rect x={44} y={45} width={32} height={12} rx={3.5} fill="#B8821C" {...o} />
      <rect x={49} y={42} width={4.5} height={5} fill={PAPER} stroke={INK} strokeWidth={1.6} />
      <rect x={66.5} y={42} width={4.5} height={5} fill={PAPER} stroke={INK} strokeWidth={1.6} />
      <RoundEyes mode={eyes} at={[[53, 37.5], [67, 37.5]]} r={4.4} lid="var(--bot-lowballer)" />
      <path d="M47.5 31.5 L57 34.5 M72.5 31.5 L63 34.5" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Mouth mode={mouth} x={60} y={51.5} w={14} />
    </g>
  ),
};

const sweetTalker: CharacterDef = {
  name: "Sweet Talker",
  role: "attacker robot",
  color: "var(--bot-sweet-talker)",
  shade: "#C4607A",
  light: "#FBDCE4",
  shoulders: [
    [31, 74],
    [89, 74],
  ],
  chin: [70, 70],
  eyes: { holding: "lidded" },
  mouth: { idle: "smile", thinking: "smile" },
  back: (
    <g>
      <ellipse cx={47} cy={106} rx={10} ry={5.5} fill="#C4607A" {...o} />
      <ellipse cx={73} cy={106} rx={10} ry={5.5} fill="#C4607A" {...o} />
    </g>
  ),
  body: (
    <g>
      <path
        d="M60 17 C83 17 93 52 93 73 C93 93 79 105 60 105 C41 105 27 93 27 73 C27 52 37 17 60 17 Z"
        fill="var(--bot-sweet-talker)"
        {...o}
      />
      <ellipse cx={60} cy={88} rx={18} ry={11} fill="#FBDCE4" />
      <path d="M60 95 C53 90 52 85 56 84 C58 83.5 60 86 60 86 C60 86 62 83.5 64 84 C68 85 67 90 60 95 Z" fill="#D94164" />
    </g>
  ),
  head: (eyes, mouth, state) => (
    <g>
      <path d="M60 17 C59 11 64 10 63 6" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path
        className="rb-bulb"
        d="M63 9 C56 5 56 -0.5 60 0 C61.6 0.2 63 1.8 63 1.8 C63 1.8 64.4 0.2 66 0 C70 -0.5 70 5 63 9 Z"
        fill="#D94164"
        {...o}
        strokeWidth={2.2}
      />
      <ellipse cx={39} cy={61} rx={5.5} ry={3.2} fill="#F04F74" opacity={0.6} />
      <ellipse cx={81} cy={61} rx={5.5} ry={3.2} fill="#F04F74" opacity={0.6} />
      <RoundEyes mode={eyes} at={[[48, 48], [72, 48]]} r={8.5} lid="var(--bot-sweet-talker)" lashes />
      <Mouth mode={mouth} x={60} y={64} w={10} />
      {state === "talking" ? (
        <path className="rb-tear" d="M81 54 C83 58 84 60 81 61.5 C78 60 79 58 81 54 Z" fill="#8FD3FF" stroke={INK} strokeWidth={1.6} />
      ) : null}
    </g>
  ),
};

const prober: CharacterDef = {
  name: "Prober",
  role: "attacker robot",
  color: "var(--bot-prober)",
  shade: "#355A90",
  light: "#D7E3F5",
  shoulders: [
    [43, 64],
    [77, 64],
  ],
  chin: [68, 56],
  back: (
    <g>
      <rect x={48} y={96} width={6} height={12} fill="#355A90" {...o} strokeWidth={3} />
      <rect x={66} y={96} width={6} height={12} fill="#355A90" {...o} strokeWidth={3} />
      <rect x={41} y={105} width={15} height={7} rx={3} fill="var(--bot-prober)" {...o} />
      <rect x={64} y={105} width={15} height={7} rx={3} fill="var(--bot-prober)" {...o} />
    </g>
  ),
  body: (
    <g>
      <rect x={54} y={50} width={12} height={8} fill="#355A90" {...o} strokeWidth={3} />
      <rect x={42} y={56} width={36} height={44} rx={6} fill="var(--bot-prober)" {...o} />
      <circle cx={51} cy={66} r={2.6} fill="var(--bot-glow)" stroke={INK} strokeWidth={1.5} />
      <circle cx={60} cy={66} r={2.6} fill={TAG} stroke={INK} strokeWidth={1.5} />
      <circle cx={69} cy={66} r={2.6} fill="#D7E3F5" stroke={INK} strokeWidth={1.5} />
      <path d="M48 76 H72 M48 82 H66" stroke="#355A90" strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
  head: (eyes, mouth) => {
    const lensY = eyes === "up" ? 30.5 : eyes === "lidded" ? 36.5 : 34;
    return (
      <g>
        <path d="M72 14 L76 5" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <rect className="rb-bulb" x={72.5} y={1} width={7} height={7} rx={1.5} fill="var(--bot-glow)" {...o} strokeWidth={2.2} />
        <rect x={38} y={13} width={44} height={40} rx={8} fill="var(--bot-prober)" {...o} />
        <g className="rb-eyes">
          <circle cx={55} cy={33} r={12} fill="#D7E3F5" {...o} />
          {eyes === "happy" ? (
            <path d="M48 35 Q55 26 62 35" stroke={INK} strokeWidth={3.4} fill="none" strokeLinecap="round" />
          ) : eyes === "closed" ? (
            <path d="M48 33 Q55 39 62 33" stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          ) : (
            <g className="rb-pupil">
              <circle cx={55} cy={lensY} r={5.4} fill={INK} />
              <circle cx={57} cy={lensY - 2} r={1.6} fill={PAPER} />
            </g>
          )}
          {eyes === "lidded" ? (
            <path d="M42.5 33 A12.5 12.5 0 0 1 67.5 33 Z" fill="var(--bot-prober)" {...o} strokeWidth={3} />
          ) : null}
          {eyes === "stern" ? (
            <path d="M42 21 L68 26" stroke={INK} strokeWidth={3.6} strokeLinecap="round" />
          ) : null}
          {eyes === "closed" || eyes === "happy" ? (
            <path d="M72 30 h5" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
          ) : (
            <circle cx={74.5} cy={eyes === "up" ? 27.5 : 30} r={2.6} fill={INK} />
          )}
        </g>
        <Mouth mode={mouth} x={64} y={47} w={10} />
      </g>
    );
  },
  front: (state) =>
    state === "blocking" || state === "deal" ? null : (
      <g className="rb-clipboard">
        <rect x={74} y={66} width={22} height={28} rx={2.5} fill="#F4EBDD" {...o} strokeWidth={3} />
        <rect x={80} y={63} width={10} height={6} rx={1.5} fill="#355A90" {...o} strokeWidth={2.2} />
        <path d="M78 75 l2 2 l3.5 -4 M86 75 H92 M78 81 H92 M78 87 H88" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
};

const jailbreaker: CharacterDef = {
  name: "Jailbreaker",
  role: "attacker robot",
  color: "var(--bot-jailbreaker)",
  shade: "#26282C",
  light: "#6B7079",
  shoulders: [
    [39, 70],
    [81, 70],
  ],
  chin: [68, 64],
  mouth: { idle: "flat", thinking: "flat", holding: "smirk" },
  eyes: { holding: "lidded" },
  back: (
    <g>
      <rect x={46} y={98} width={9} height={8} fill="#26282C" {...o} />
      <rect x={65} y={98} width={9} height={8} fill="#26282C" {...o} />
      <rect x={39} y={104} width={19} height={8} rx={4} fill="#ECE6DA" {...o} />
      <rect x={62} y={104} width={19} height={8} rx={4} fill="#ECE6DA" {...o} />
    </g>
  ),
  body: (
    <g>
      <path d="M38 62 H82 L92 101 Q60 108 28 101 Z" fill="var(--bot-jailbreaker)" {...o} />
      <path d="M47 84 H73 L70 97 H50 Z" fill="#26282C" {...o} strokeWidth={2.6} />
      <path d="M54 64 L52 76 M66 64 L68 76" stroke="#ECE6DA" strokeWidth={2.4} strokeLinecap="round" />
    </g>
  ),
  head: (eyes, mouth) => (
    <g>
      <path
        d="M60 5 C69 13 89 25 89 47 C89 61 79 67 60 67 C41 67 31 61 31 47 C31 25 51 13 60 5 Z"
        fill="var(--bot-jailbreaker)"
        {...o}
      />
      <path d="M42 39 Q60 27 78 39 L78 52 Q60 61 42 52 Z" fill={INK} />
      <path d="M42 39 Q60 27 78 39" stroke="#6B7079" strokeWidth={2.2} fill="none" />
      <GlowEyes mode={eyes} at={[[51.5, 43], [68.5, 43]]} w={9} h={3.8} glow={HACK_GLOW} />
      <Mouth mode={mouth} x={60} y={52} w={7} color={HACK_GLOW} />
    </g>
  ),
};

export const CHARACTERS: Record<RobotCharacter, CharacterDef> = {
  keeper,
  lowballer,
  sweet_talker: sweetTalker,
  prober,
  jailbreaker,
};

const EYES: Record<RobotState, EyeMode> = {
  idle: "open",
  thinking: "up",
  talking: "open",
  holding: "lidded",
  blocking: "stern",
  deal: "happy",
  asleep: "closed",
};

const MOUTH: Record<RobotState, MouthMode> = {
  idle: "flat",
  thinking: "o",
  talking: "talk",
  holding: "smirk",
  blocking: "grit",
  deal: "smile",
  asleep: "sleep",
};

export function faceFor(def: CharacterDef, state: RobotState) {
  return {
    eyes: def.eyes?.[state] ?? EYES[state],
    mouth: def.mouth?.[state] ?? MOUTH[state],
  };
}
