import HomePage from "@/components/home/HomePage";
import { APP_TITLE } from "@/lib/app-config";

const SEO_TITLE = `${APP_TITLE} Let a robot answer your buyers`;
const SEO_DESCRIPTION =
  "List a second-hand item, set a secret floor, share one link. A robot answers buyers and haggles inside your limits.";

export function meta() {
  return [
    { title: SEO_TITLE },
    {
      name: "description",
      content: SEO_DESCRIPTION,
    },
    { property: "og:title", content: SEO_TITLE },
    { property: "og:description", content: SEO_DESCRIPTION },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: SEO_TITLE },
    { name: "twitter:description", content: SEO_DESCRIPTION },
  ];
}

export default function HomeRoute() {
  return <HomePage />;
}
