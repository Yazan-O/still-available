import { BoardSkeleton, BoardView } from "@/components/board/BoardView";
import { useBoardLive } from "@/components/board/use-board";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: `Board — ${APP_TITLE}` }];
}

export function HydrateFallback() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <BoardSkeleton />
    </div>
  );
}

export default function BoardRoute() {
  useBoardLive();
  return <BoardView />;
}
