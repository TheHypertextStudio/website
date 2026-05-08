# Microcopy & content style guide

The constitution lives in [`docs/mission.md`](../mission.md). Read that first; it's the tiebreaker. This page is the operational distillation — the specific microcopy patterns the studio keeps finding itself rewriting.

Voice rules from the constitution (§7) condensed: calm, declarative, considered. No chirping, no pitching, no power-words. Plain language. Vary sentence length. No AI-prose hedge spirals. When in doubt, write the way a thoughtful person would write a letter to someone they respect.

---

## The thing this site is not

It is not a product website. It is the studio's site — a publication that documents the studio's work and thinking. The products have their own sites (`logdate.app`, etc.); this one isn't trying to sell them.

Concretely, that means: don't render products like SaaS landing pages would. No card-with-screenshot grids. No primary "Visit" CTA buttons. No "Details" modals as the only path to longer copy. No hero animations. Products are documented as research entries — title, status, the design question, a description, an inline figure. The reader who wants to use the product clicks the URL in the meta line.

If a draft starts to read like a product hero on a startup landing page, return here.

---

## No second person (with two exceptions)

Site copy doesn't use second-person pronouns — `you`, `your`, `yours`, `yourself`, or any contractions. The studio addresses readers in third person ("readers", "people", "anyone") or first-person plural ("we", "us", "the studio"). Imperatives are fine; they imply a subject without naming one.

Why: second person reads as a brand talking _at_ a reader. The studio is a publication that documents work, not a service pitching at customers.

Concrete substitutions:

| Don't                                                 | Do                                                   |
| ----------------------------------------------------- | ---------------------------------------------------- |
| "Software for the version of you that planned ahead." | "Software for the version of us that planned ahead." |
| "Know what you're agreeing to."                       | "Know what's actually being agreed to."              |
| "A better home to document and store your memories."  | "A more careful home for personal memory."           |
| "You set windows when distractions are off-limits…"   | "Distraction windows are set while focus is good…"   |

**Two exceptions:**

1. **The privacy page.** Privacy/legal copy addresses the reader directly by convention. "Your data", "your rights", "if you write to us" is the register people expect from a privacy notice; rewriting it in third person reads as evasive.
2. **Source-code easter eggs.** View-source comments addressed to the curious reader (e.g. the `<!-- Welcome. The page you're reading is a static document. -->` greeting) are part of the site's craft layer, not its public copy.

The constitution (`docs/mission.md`) is also exempt — it's an internal document.

---

## Don't render products as cards

Products are documented, not advertised. The work section on the home page renders each as a typeset entry, not a card:

- **Name** at title register (h3, sub-section level — clearly below the section heading).
- **Meta line** in mono: `STAGE · platforms · canonical URL` (URL only when the product is ready). The URL is a regular reference link, not a button.
- **The design question** the product is the apparatus for, as the lede paragraph (body-large serif, with a `THE QUESTION` overline).
- **Description** as body prose in `--color-secondary`, capped at the body measure.
- **Figure** inline as supporting illustration, capped at the body measure.

The work section does **not** have:

- Card borders, drop shadows, hover lifts, or rounded corners.
- A "Details" button that opens a modal.
- A primary "Visit" CTA button.
- A grid of three side-by-side product cards (that's a SaaS feature grid).
- Hero screenshots dominating the entry.
- The tagline as the headline. The tagline is a quotable phrase that lives in the constitution and on the product's own site; the studio's framing of the work is the question, not the tagline.

---

## Words and phrases the site does not use

| Don't                                                                                            | Why                                                                                                                          |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| "Coming soon", "Planned launch", "first release", "stay tuned"                                   | Empty promise. Use a status pill ("In design", "Beta") and an unlinked entry.                                                |
| "We'll publish a study alongside the first release"                                              | Performative roadmap. Just describe what the thing is.                                                                       |
| "Faithfully," / "Yours,"                                                                         | Twee. Cut.                                                                                                                   |
| "Made with care in [city]"                                                                       | Filler. The mailing address is the city; that's enough.                                                                      |
| "Discover", "Unlock", "Empower", "Innovative", "Seamless", "Intuitive", "Robust"                 | Marketing-speak. The studio doesn't sell.                                                                                    |
| "We're a small studio. …" as page openers                                                        | Performative humility. The size of the team is not the lede on every page.                                                   |
| "Pricing" / "Free / Premium" tier framing                                                        | Startup vocabulary. The studio doesn't run tiers.                                                                            |
| "Beta with N active users"                                                                       | Quantitative bragging. Use a status pill.                                                                                    |
| "longest-running experiment" / "the apparatus" used purely as garnish                            | The constitution uses these words with specific meaning. Use them only with that meaning.                                    |
| Italic blockquote pulled-out questions                                                           | Performative typography. Render the question as a paragraph with an overline.                                                |
| Manifesto-style aphorism lists ("Calm before clever" etc.)                                       | Save the principles for the constitution. The site shouldn't put posters on the wall.                                        |
| Overlines / mono-uppercase eyebrow labels above headings ("THE QUESTION", "FEATURED", "STUDIES") | Tells the reader what kind of thing follows when the thing itself already does. AI-generated layouts overuse them; we don't. |

The terms `design lab`, `fourth mode`, `apparatus`, and `studies are the studio's intellectual contribution` come from the constitution and are correct framings — use them when they help the reader understand what the studio actually is, not as decoration.

---

## Patterns the site keeps using

**Page intros: short, factual.** One sentence saying what the page is about, in serif at body-large size.

**Empty states: declarative.** "There's no page at this address." not "Oops! It looks like…".

**Status indication via UI, not copy.** Products that aren't ready show a status pill ("Beta", "In design") in the meta line and don't render a canonical URL. They don't get a paragraph of "we're working on it" copy.

**Privacy / legal pages: plain language.** Section headings are honest descriptions ("What we collect", "What we don't collect"). The privacy page is the only place second person is allowed.

---

## Headings

The site has a real typographic scale. Use semantic levels and let the scale do its job; don't override sizes per page.

| Role       | Element             | Size                       | Use                                          |
| ---------- | ------------------- | -------------------------- | -------------------------------------------- |
| Display    | `.display`          | clamp(2.25, 4.5vw, 3.5rem) | Thesis, hero statements (one per page max)   |
| Headline   | `h1`                | 2rem                       | Page titles                                  |
| Title (lg) | `h2`                | 1.875rem                   | Top-level sections within a page             |
| Title      | `h3`                | 1.0625–1.25rem             | Sub-sections, product names                  |
| Title (sm) | `h4`                | 1.0625rem                  | Tertiary sub-sections                        |
| Body (lg)  | `.body-lg`, `.lede` | 1.125rem                   | Lede paragraphs                              |
| Body       | default `<p>`       | 1rem                       | Running prose                                |
| Body (sm)  | `.body-sm`          | 0.9375rem                  | Captions, meta                               |
| Label      | `.label`            | 0.8125rem                  | Mono uppercase: column headers, panel labels |
| Label (sm) | `.label-sm`         | 0.75rem                    | Densest UI labels                            |
| Overline   | `.overline`         | 0.75rem                    | Eyebrows above sections                      |

**Product names are h3, not h2.** They sit visually below the page's section headings.

---

## Links

- **External links** get `rel="external noopener"` and a `title`. The `↗` arrow after them is automatic via CSS.
- **Internal links** never get `rel="external"`.
- **Not-yet-ready references** are not rendered as `<a>` at all. They're a `<span class="stage">` pill or an unlinked text reference. Never use `aria-disabled="true"` on an `<a>`.
- **Permalink anchors** (`.anchor`) are subtle by default and lift to `--color-secondary` on heading hover. Hidden at mobile.

---

## Numbers and dates

- **Dates:** ISO 8601 in machine attributes (`<time datetime="2026-05-04">`). In display text, format via `src/i18n/format.ts`.
- **Years:** Arabic numerals. No copyright year span — the site is MIT-licensed.
- **Versions / build hashes:** the actual git short SHA when one exists. Hide the row when there isn't one rather than show a placeholder.

---

## Mailing address

```
Hypertext Studio
1810 East Sahara Avenue
STE 75246
Las Vegas, NV 89104
```

Monospace. Wrapped in `<address>`.

---

## Footer

The footer is a closing scene, not a content dump. It carries: a brief studio block (description + mailing + email), a sitemap, the rel=me identity chain, the operational status panel, the wordmark anchor, and the small print. It does not restate the mission, list design decisions, or carry a copyright year span.

---

## Reviewing your own copy

Before pushing, read the copy back. Ask:

1. Does this read like a product website would write it? If yes, rewrite.
2. Is anything in here a hedge, an apology, a flourish, or a humble-brag?
3. Does this say what the thing **is**, or what the studio **hopes** it will be?
4. Could this be one sentence shorter without losing meaning?
5. Would this be embarrassing to read out loud at a conference?

If yes to any: cut, tighten, ship.

---

This guide is itself a work in progress; update it when the same kind of mistake keeps recurring.
