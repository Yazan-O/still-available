import { useParams } from "react-router";

import { ListingDetailPage, ListingDetailSkeleton } from "@/components/listings/ListingDetailPage";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: `Listing · ${APP_TITLE}` }];
}

export function HydrateFallback() {
  return <ListingDetailSkeleton />;
}

export default function ListingRoute() {
  const { id = "" } = useParams();
  return <ListingDetailPage key={id} id={id} />;
}
