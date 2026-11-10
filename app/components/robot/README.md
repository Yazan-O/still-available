# Robots, bubbles, offer ladder

Preview and design reference: `/robots` (`?theme=dark`, `?motion=off` for still poses).

## Robot
`<Robot character state size className label decorative />` from `@/components/robot/Robot`.
- `character`: `keeper` (seller's robot, green), `lowballer` (mustard ball), `sweet_talker` (pink egg), `prober` (blue, lens and clipboard), `jailbreaker` (charcoal hood, green slit eyes).
- `state`: `idle`, `thinking`, `talking`, `holding`, `blocking` (one-shot shield), `deal` (one-shot jump and confetti), `asleep` (seller took over).
- `size` in px, default 96. Use 24-40 in lists and bubbles, 96-160 in panels, 240 in hero or video.
- Accessible name is built in (`robotLabel(character, state)`); pass `decorative` when text beside it already says who it is.
- One-shot states replay when `state` changes. To replay the same state, change the React `key`.
- `prefers-reduced-motion` and a `.rb-still` ancestor freeze every robot on its pose.

## SpeechBubble
`<SpeechBubble from="buyer|robot|seller|system" typing name meta character avatar />`.
Buyer sits right (ink bubble), robot and seller sit left (card and peach). System lines are centred pills.
`typing` swaps the text for three dots. Put a 40 px `<Robot>` in `avatar`.

## OfferLadder
`<OfferLadder ask counters offers floor robotLimit currency height />`. Pass `floor` and `robotLimit` only in seller views; never on `/l/:slug`.
Outcome colours: deal = `deal`, countered = `tag`, passed = muted, refused = `floor` dashed and struck through.
Offers below half the ask sit under an axis break so one silly offer does not squash the scale.

## Tokens
Palette lives in `app/design-system.ts` (applied app-wide) and is mirrored in `app/global.css` for `.light` / `.dark` scoped wrappers.
Standard shadcn names: `background foreground card popover primary secondary muted accent destructive border input ring sidebar-*`.
App tokens (Tailwind classes `bg-*`, `text-*`, `border-*`): `tag` (price-tag orange, the brand accent), `deal`, `floor`,
`bot-keeper bot-lowballer bot-sweet-talker bot-prober bot-jailbreaker bot-glow`. `--bot-ink` is the robot outline colour.
Font: Inter Variable everywhere, tabular numbers for prices (`tabular-nums`). Radius `0.75rem`.

## Do
- Drive `state` from thread data (robot mode, last event), never from a timer.
- Use the character colour tokens for badges and dots that refer to a robot.
- Keep `tag` for prices and the one call to action per screen.

## Don't
- No purple, no gradients, no glow effects on UI chrome.
- Don't recolour or restyle robots per page; add a state here instead.
- Don't show `floor` or `robotLimit` anywhere a buyer can see.
- Don't add sounds or music.
