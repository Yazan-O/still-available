import { ListingsPage, ListingsSkeleton } from "@/components/listings/ListingsPage";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: `Listings · ${APP_TITLE}` }];
}

export function HydrateFallback() {
  return <ListingsSkeleton />;
}

export default function ListingsRoute() {
  return <ListingsPage />;
}
