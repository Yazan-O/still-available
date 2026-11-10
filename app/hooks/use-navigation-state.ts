import {
  appBasePath,
  appPathFromLocalRoute,
} from "@agent-native/core/client/api-path";
import { useAgentRouteState } from "@agent-native/core/client/navigation";
import { useSyncExternalStore } from "react";

import {
  chatThreadPath,
  HOME_PATH,
  isChatPathname,
  NEW_CHAT_PATH,
  threadIdFromPath,
} from "@/lib/chat-paths";
import { TAB_ID } from "@/lib/tab-id";

export interface NavigationState {
  view?: string;
  path?: string;
  publicPath?: string;
  threadId?: string;
  listingId?: string;
}

const boardThreadListing = new Map<string, string>();
const boardListeners = new Set<() => void>();
let boardVersion = 0;

export function setBoardThreadListing(threadId: string, listingId: string) {
  if (boardThreadListing.get(threadId) === listingId) return;
  boardThreadListing.set(threadId, listingId);
  boardVersion += 1;
  boardListeners.forEach((l) => l());
}

function subscribeBoard(listener: () => void) {
  boardListeners.add(listener);
  return () => boardListeners.delete(listener);
}

export function useNavigationState() {
  useSyncExternalStore(subscribeBoard, () => boardVersion, () => 0);
  useAgentRouteState<NavigationState>({
    browserTabId: TAB_ID,
    requestSource: TAB_ID,
    getNavigationState: ({ pathname }) => navigationStateForPath(pathname),
    getCommandPath: commandPathForNavigation,
  });
}

export function commandPathForNavigation(command: NavigationState): string {
  const fallbackPath = pathForCommand(command);
  const path = typeof command?.path === "string" ? command.path : "";
  if (!path) return fallbackPath;

  const basePath = appBasePath();
  if (!basePath) return path;

  const suffixIndex = path.search(/[?#]/);
  const pathname = suffixIndex === -1 ? path : path.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : path.slice(suffixIndex);
  const publicPath =
    typeof command?.publicPath === "string" ? command.publicPath : "";
  const publicPathSuffixIndex = publicPath.search(/[?#]/);
  const declaredPublicPath =
    publicPathSuffixIndex === -1
      ? publicPath
      : publicPath.slice(0, publicPathSuffixIndex);
  const publicViewPath = appPathFromLocalRoute(pathForView(command?.view));
  if (
    matchesPathPrefix(pathname, basePath) &&
    (matchesPathPrefix(pathname, publicViewPath) ||
      (declaredPublicPath && declaredPublicPath === pathname))
  ) {
    return `${pathname.slice(basePath.length) || "/"}${suffix}`;
  }
  return path;
}

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function segmentAfter(pathname: string, prefix: string): string | undefined {
  if (!pathname.startsWith(prefix)) return undefined;
  const id = pathname.slice(prefix.length).split("/")[0];
  return id ? decodeURIComponent(id) : undefined;
}

export function navigationStateForPath(pathname: string): NavigationState {
  const boardThreadId = segmentAfter(pathname, "/board/");
  const listingId =
    segmentAfter(pathname, "/listings/") ?? (boardThreadId ? boardThreadListing.get(boardThreadId) : undefined);
  const threadId = boardThreadId ?? threadIdFromPath(pathname);
  return {
    view: viewForPath(pathname),
    path: pathname,
    publicPath: appPathFromLocalRoute(pathname),
    ...(threadId ? { threadId } : {}),
    ...(listingId ? { listingId } : {}),
  };
}

function viewForPath(pathname: string): string {
  if (pathname.startsWith("/listings/")) return "listing";
  if (pathname === "/listings") return "listings";
  if (pathname.startsWith("/board/")) return "thread";
  if (pathname === "/board") return "board";
  if (isChatPathname(pathname)) return "chat";
  if (pathname === HOME_PATH) return "home";
  if (pathname.startsWith("/database")) return "database";
  if (pathname.startsWith("/extensions")) return "extensions";
  if (pathname.startsWith("/observability")) return "observability";
  if (pathname.startsWith("/settings/agent") || pathname.startsWith("/agent")) {
    return "agent";
  }
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/team")) return "settings";
  return "chat";
}

function pathForView(view?: string): string {
  switch (view) {
    case "listings":
    case "listing":
      return "/listings";
    case "board":
    case "thread":
      return "/board";
    case "chat":
    case "ask":
      return NEW_CHAT_PATH;
    case "home":
      return HOME_PATH;
    case "database":
      return "/database";
    case "extensions":
      return "/extensions";
    case "observability":
      return "/observability";
    case "agent":
      return "/settings/agent";
    case "settings":
      return "/settings";
    case "team":
      return "/settings/organization";
    default:
      return HOME_PATH;
  }
}

export function pathForCommand(command: any): string {
  const path = pathForView(command?.view);
  const listingId = typeof command?.listingId === "string" ? command.listingId.trim() : "";
  if (command?.view === "listing" && listingId) return `/listings/${encodeURIComponent(listingId)}`;
  const boardThreadId = typeof command?.threadId === "string" ? command.threadId.trim() : "";
  if (command?.view === "thread" && boardThreadId) return `/board/${encodeURIComponent(boardThreadId)}`;
  if (command?.view !== "chat" && command?.view !== "ask") return path;
  const threadId =
    typeof command?.threadId === "string" ? command.threadId.trim() : "";
  return threadId ? chatThreadPath(threadId) : path;
}
