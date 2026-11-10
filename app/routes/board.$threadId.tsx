import { useParams } from "react-router";

import { ThreadSkeleton, ThreadView } from "@/components/board/ThreadView";
import { useBoardLive } from "@/components/board/use-board";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: `Conversation — ${APP_TITLE}` }];
}

export function HydrateFallback() {
  return <ThreadSkeleton />;
}

export default function BoardThreadRoute() {
  const { threadId = "" } = useParams();
  useBoardLive();
  return <ThreadView key={threadId} threadId={threadId} />;
}
