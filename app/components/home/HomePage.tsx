import { useT } from "@agent-native/core/client/i18n";
import { IconLayoutKanban, IconPlus } from "@tabler/icons-react";
import { Link } from "react-router";

import { Robot, type RobotState } from "@/components/robot/Robot";
import { Button } from "@/components/ui/button";

const STEPS: { n: string; state: RobotState; title: string; body: string }[] = [
  { n: "1", state: "idle", title: "home.step1Title", body: "home.step1Body" },
  { n: "2", state: "holding", title: "home.step2Title", body: "home.step2Body" },
  { n: "3", state: "talking", title: "home.step3Title", body: "home.step3Body" },
];

export default function HomePage() {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-12 px-4 py-10 sm:px-8">
      <section className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-5">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">{t("home.title")}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">{t("home.lede")}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="bg-tag text-tag-foreground hover:bg-tag/90">
              <Link to="/listings/new">
                <IconPlus className="size-4" aria-hidden />
                {t("home.newListing")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/board">
                <IconLayoutKanban className="size-4" aria-hidden />
                {t("home.openBoard")}
              </Link>
            </Button>
          </div>
        </div>
        <div className="mx-auto flex items-end justify-center gap-4 sm:gap-6">
          <Robot character="keeper" state="holding" size={200} className="max-sm:h-[150px] max-sm:w-[150px]" />
          <div className="grid shrink-0 grid-cols-2 gap-1 pb-2">
            <Robot character="lowballer" state="idle" size={56} decorative />
            <Robot character="sweet_talker" state="idle" size={56} decorative />
            <Robot character="prober" state="thinking" size={56} decorative />
            <Robot character="jailbreaker" state="idle" size={56} decorative />
          </div>
        </div>
      </section>

      <ol className="grid gap-3 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
              {s.n}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-semibold">{t(s.title)}</h2>
              <p className="text-sm text-muted-foreground">{t(s.body)}</p>
            </div>
            <Robot character="keeper" state={s.state} size={48} decorative className="ms-auto shrink-0 self-end" />
          </li>
        ))}
      </ol>

      <p className="flex items-center gap-3 text-sm text-muted-foreground">
        <Robot character="jailbreaker" state="talking" size={32} decorative />
        {t("home.sparring")}
      </p>
    </div>
  );
}
