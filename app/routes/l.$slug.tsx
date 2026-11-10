import type { BuyerThreadResponse, PublicListing } from "@shared/buyer";
import {
  data,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { BuyerPage } from "@/components/buyer/BuyerPage";
import { PageSkeleton } from "@/components/buyer/States";

type LoaderData = { listing: PublicListing | null; notFound: boolean };

export async function loader({ params, request }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  try {
    const res = await fetch(
      new URL(`/api/buyer/${encodeURIComponent(slug)}/thread`, request.url),
      { headers: { accept: "application/json" } },
    );
    if (res.status === 404)
      return data<LoaderData>({ listing: null, notFound: true }, { status: 404 });
    if (!res.ok) return data<LoaderData>({ listing: null, notFound: false });
    const body = (await res.json()) as BuyerThreadResponse;
    return data<LoaderData>({ listing: body.listing, notFound: false });
  } catch {
    return data<LoaderData>({ listing: null, notFound: false });
  }
}

export const meta: MetaFunction<typeof loader> = ({ loaderData: d }) => {
  const listing = d?.listing;
  if (!listing) {
    const title = d?.notFound ? "Listing not found: still available?" : "Still available?";
    return [
      { title },
      { property: "og:title", content: title },
      { name: "robots", content: "noindex" },
    ];
  }
  const title = `${listing.title}: still available?`;
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: listing.currency,
    maximumFractionDigits: 0,
  }).format(listing.askPrice);
  const lead = listing.description.replace(/\s+/g, " ").trim();
  const description = `${price}. ${lead.length > 150 ? `${lead.slice(0, 147)}…` : lead} Ask the seller's robot anything, or make an offer.`;
  const tags = [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { name: "twitter:card", content: listing.photoUrl ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "robots", content: "noindex" },
  ];
  if (listing.photoUrl?.startsWith("http"))
    tags.push({ property: "og:image", content: listing.photoUrl });
  return tags;
};

export function HydrateFallback() {
  return <PageSkeleton />;
}

export default function BuyerListingRoute() {
  const { slug = "" } = useParams();
  const d = useLoaderData<typeof loader>();
  return <BuyerPage key={slug} slug={slug} initialListing={d?.listing ?? null} notFound={d?.notFound ?? false} />;
}
