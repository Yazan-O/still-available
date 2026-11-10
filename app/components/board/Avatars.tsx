import { Robot, type RobotState } from "@/components/robot/Robot";
import { cn } from "@/lib/utils";

import { attackerOf, buyerLabel, type SellerThread } from "./model";

export function BuyerAvatar({
  thread,
  size = 36,
  state = "talking",
}: {
  thread: Pick<SellerThread, "kind" | "sparPersona" | "buyerName">;
  size?: number;
  state?: RobotState;
}) {
  const attacker = attackerOf(thread);
  if (attacker) return <Robot character={attacker} state={state} size={size} decorative />;
  const name = buyerLabel(thread);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background",
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
