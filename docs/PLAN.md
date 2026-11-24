# No-Show 2030: Rebuild Plan

As of 2026-11-22. Source brief: `NO-SHOW 2030_ Can You Save Scania Without Selling More Trucks.md`.

We build the new four-screen game as a fresh app in this repository. The work is a relay: each person does all of their tasks, hands off, and the next person starts. Nuh finishes the job.

```text
Luke  ──handoff──▶  Celestine  ──handoff──▶  Nuh  ──▶  v2.0 released
setup, content,     shared UI and the        screens, wiring,
data logic          relationship map         polish, release
```

| Order | Person        | Owns                                                  | Done when                                                                  |
| ----- | ------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| 1     | **Luke**      | Repo setup, tooling, all content, data logic          | Every task in Luke's list is merged, CI is green, handoff note posted      |
| 2     | **Celestine** | Styles, shared UI pieces, the system relationship map | Every task in Celestine's list is merged, CI is green, handoff note posted |
| 3     | **Nuh**       | App state, all five screens, final checks, release    | `v2.0` is tagged and deployed                                              |

---

## How the handoff works

Everyone is remote, so each handoff is written down, not spoken.

1. Merge all your work into `main`, with CI green.
2. Add your section to `docs/HANDOFF.md`: what is done, what is not, known issues, and where the next person should start.
3. Message the next person with a link to that section.
4. Stay reachable for questions, but the next person owns the code from now on.

---

## 1. Luke: setup, content and data logic

Luke goes first because everything else reads his data. Work down the list in order.

- [ ] **L1**: Tag the current `main` as `v1-campaign-game`. Move the 3D game into `legacy/src-3d/`. Remove `three` and `@types/three`. Create the empty folder skeleton from the [architecture section](#architecture-and-folder-structure).
- [ ] **L2**: Add ESLint (typescript-eslint, react-hooks, jsx-a11y), Prettier, Vitest and Testing Library. Add npm scripts for lint, format, test and typecheck.
- [ ] **L3**: Add the GitHub Actions CI workflow (typecheck, lint, test, build), a PR template and CODEOWNERS.
- [ ] **L4**: Post the [decisions](#decisions-to-settle-before-luke-starts-l5) in the team channel, collect answers from Celestine and Nuh, and record them in `docs/decisions/`.
- [ ] **L5**: Write `domain/types.ts`, the shared data contract (Option, Action, Actor, SystemElement, Relationship, Consequence).
- [ ] **L6**: Build the actor registry in `content/actors.ts`: canonical ids, names and categories. Map every name variant in the brief to one id.
- [ ] **L7**: Write all four strategies into `content/options/`, one file each: Better Freight Utilisation, Multimodal Logistics, Flexible Freight Demand, Circular Vehicle Lifecycle.
- [ ] **L8**: Write a short role for each actor in each of the 12 actions. The brief does not provide these.
- [ ] **L9**: Write `content/baseline.ts`: today's relationships, as agreed in L4.
- [ ] **L10**: Write the extra Screen D content agreed in L4 (for example beneficiaries and unintended effects).
- [ ] **L11**: Write the intro, Screen A (leverage point and event-time philosophy) and reflection text in `content/copy.ts`.
- [ ] **L12**: Write the three selectors in `domain/selectors.ts`, with unit tests:
  - `actorsFor`: the actors across the chosen actions, without duplicates, each role tagged with its action.
  - `buildSystemMap`: merge links, remove duplicates (two-way aware), compare with the baseline, record which actions produced each link.
  - `consequencesFor`: consequences grouped into the four categories, each linked to its action.
- [ ] **L13**: Write the content-integrity tests: every actor id exists, each option has exactly 3 actions, every action has at least 1 consequence per category, and ids are unique.
- [ ] **L14**: Hand off to Celestine.

## 2. Celestine: shared UI and the system map

Celestine starts when Luke's handoff note is posted. Work down the list in order.

- [ ] **C1**: Pull `styles/tokens.css` and `styles/base.css` out of the old stylesheet (`legacy/src-3d/styles.css`). Let the page scroll.
- [ ] **C2**: Port the info tooltip, icons and Kbd into `ui/` with no old game imports.
- [ ] **C3**: Build the shared UI pieces: Button, Card, Chip, StepIndicator.
- [ ] **C4**: Choose the map layout approach (a fixed position table or a force-directed layout). Record the choice in `docs/decisions/`.
- [ ] **C5**: Build a dev-only map preview page that renders the map for any strategy and set of actions. It is used for building and checking the map, and is left out of the production build.
- [ ] **C6**: Build the node component, with different shapes for actors and system elements.
- [ ] **C7**: Build the link component: curved paths, arrowheads, two-way markers, and labels that do not overlap.
- [ ] **C8**: Write the layout and fit it to the viewport. Only render the nodes in the current map.
- [ ] **C9**: Style existing, changed and new links differently, using line style and a badge as well as colour.
- [ ] **C10**: Add interactions: hovering or focusing a node highlights its links and dims the rest. Hovering a link shows its label and source actions. Selecting a node shows that actor's role.
- [ ] **C11**: Animate links in and out as actions are toggled, and switch it off when reduced motion is set.
- [ ] **C12**: Build the legend and the text version of the map (a relationship list).
- [ ] **C13**: Make it work on narrow screens: the list first, with a toggle to open the map.
- [ ] **C14**: In the preview page, check all 28 combinations (4 strategies × 7 non-empty action sets) for overlapping nodes or labels.
- [ ] **C15**: Write component tests: the right number of nodes and links for a given map, and the keyboard focus order.
- [ ] **C16**: Hand off to Nuh.

## 3. Nuh: screens, wiring and release

Nuh starts when Celestine's handoff note is posted, and finishes the job. Work down the list in order.

- [ ] **N1**: Build the journey state in `app/`: one reducer with typed actions for the current step, chosen strategy and chosen actions. Include tests.
- [ ] **N2**: Sync the journey state with the URL hash, so refresh, the back button and shared links work.
- [ ] **N3**: Build the app layout: header, step indicator (Intro, Leverage, Strategy, Actions, Consequences), back and next, restart.
- [ ] **N4**: Build the intro screen.
- [ ] **N5**: Build Screen A: the leverage point, the event-time explanation, and a preview of the four strategies.
- [ ] **N6**: Build Screen B: four strategy cards, one choice. Changing strategy clears the chosen actions after a confirmation.
- [ ] **N7**: Build Screen C: the action checklist, the actor panel with roles, and Celestine's map driven by `buildSystemMap`.
- [ ] **N8**: Build Screen D: four category panels with an action tag on each item, the reflection panel, and "try another strategy" and restart.
- [ ] **N9**: Write flow tests: a full walk through the game, and Next stays disabled until a choice is made.
- [ ] **N10**: Responsive check at 360, 768 and 1280px wide.
- [ ] **N11**: Accessibility check of the whole app (axe, keyboard only, a quick screen-reader pass).
- [ ] **N12**: Update the page title, meta tags and favicon. Apply the sound decision from L4.
- [ ] **N13**: Rewrite the README: the concept, the flow, how the content is structured, and how to add an action.
- [ ] **N14**: Deploy a preview, playtest with 2–3 people outside the team, and fix the top issues.
- [ ] **N15**: Deploy to production and tag `v2.0`.

---

## Reference

### Why a fresh app

The current app is a 3D planning game, so almost none of its logic carries over. You split 40 factory slots across 4 freight lanes and 3 truck types, then play 4 quarters. The new brief has no slots, lanes, quarters, money or carbon scoring. It is a guided, content-driven explorer.

| Area                 | Files                                                                  | Verdict                                                                |
| -------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Game rules           | `data.ts`, `engine.ts`, `campaign.ts`                                  | Archive. Built on lanes, powertrains and quarters.                     |
| 3D world             | `three/World.ts`, `kit.ts`, `props.ts`                                 | Archive. The new map is a graph of actors, which a 2D SVG does better. |
| App shell and panels | `App.tsx`, `Sidebar.tsx`, `Overlays.tsx`, `ActionCard.tsx`, `Tour.tsx` | Archive. Reuse the welcome-screen and tooltip patterns.                |
| Design tokens        | top of `styles.css`                                                    | Keep (Celestine, C1).                                                  |
| Small UI pieces      | `ui/bits.tsx`, `ui/sfx.ts`                                             | Keep, remove old game imports (Celestine, C2).                         |
| Toolchain            | `package.json`, `vite.config.ts`, `tsconfig.json`                      | Keep. Remove three.js (Luke, L1).                                      |
| Ideas                | README FAQ                                                             | Keep as Screen A content (Luke, L11).                                  |

Habits not to repeat: a 958-line component with 26 props, callbacks passed through many layers, a circular import between `App.tsx` and `Sidebar.tsx`, one 3,514-line global stylesheet, copied localStorage helpers, and no tests or CI.

### Gaps in the brief

These are things the brief leaves undefined. The named person writes or settles them.

| Gap                                                                            | What to do                                                            | Who                       |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------- |
| No role text for actors                                                        | Write a short role for each actor in each action                      | Luke (L8)                 |
| The same actor is named in different ways                                      | One canonical id per actor, with a variant table                      | Luke (L6)                 |
| Some arrows point to facilities or outcomes, not actors                        | Model them as a second node type: system elements                     | Luke (L5), Celestine (C6) |
| No baseline to show what is new or changed                                     | Agree and write today's relationships                                 | Luke (L4, L9)             |
| Screen D asks for more detail than the brief gives                             | Agree the scope, then write it                                        | Luke (L4, L10)            |
| Two-way relationships (↔)                                                      | Direction field in the data; the merge treats A↔B and B↔A as one link | Luke (L5, L12)            |
| Screen A shows the philosophy, which the old README kept off screen on purpose | Accept the reversal and adapt the FAQ text                            | Luke (L11)                |

How the brief's two flow descriptions line up: Intro and Screen A come before Step 1. Screen B is Step 1. Screen C covers Steps 2 and 3. Screen D is Step 4.

### Architecture and folder structure

Data flows one way: typed content, then pure selectors, then screens. Content and domain logic never import React. Features may import `domain`, `content` and `ui`. Nothing imports from `features`.

```text
src/
  main.tsx                 mounts the app
  app/                     layout, step navigation, journey state, URL hash sync        (Nuh)
  content/                 all game text and data, typed, no logic                       (Luke)
    actors.ts              actor and system-element registry
    baseline.ts            today's relationships
    options/               one file per strategy
    copy.ts                intro, leverage point and reflection text
  domain/                  pure functions and types, no React                            (Luke)
    types.ts               the shared data contract
    selectors.ts           actorsFor, buildSystemMap, consequencesFor
    *.test.ts              unit and content-integrity tests
  features/
    intro/  leverage/  strategy/  actions/  consequences/                                (Nuh)
    system-map/            nodes, links, layout, legend, text version, preview page      (Celestine)
  ui/                      Button, Card, Chip, InfoTip, StepIndicator, Icon              (Celestine)
  styles/                  tokens.css, base.css                                          (Celestine)
  lib/                     small utilities: storage, classnames
legacy/                    archived 2D and 3D versions, not built
docs/                      this plan, HANDOFF.md, decisions/
```

### Engineering standards

- **Content as data.** All text and data live in `content/` and follow `domain/types.ts`. Components never hard-code game text.
- **Pure logic.** Selectors are pure functions, never import React, and are fully unit-tested. Derived data is computed, never stored in state.
- **One state store.** One reducer with typed actions holds the journey. No prop drilling, no global mutable state.
- **Merging links.** Duplicates are removed by from + to + label. Two-way links use a sorted key. Each merged link keeps the actions that produced it and is tagged existing, changed or new against the baseline.
- **Styling.** CSS Modules per component plus `tokens.css`. Mobile-first from 360px wide. Dark mode through tokens only.
- **Accessibility.** Real buttons and checkboxes with visible focus. A text version of the map. New links are dashed or labelled, not only coloured. Respect reduced motion.
- **Quality gates.** TypeScript strict mode. ESLint and Prettier (2-space indent, single quotes). CI runs typecheck, lint, test and build on every PR, and nothing merges red.
- **PRs.** Small PRs, one task each, with the task id in the branch name (for example `c9-link-status-styles`). Use the PR template (what, why, how tested, screenshot). While the work is with one person, the previous person reviews their PRs when they can.

### Decisions to settle before Luke starts L5

Luke collects these in L4. Answer in the team channel.

| Decision                                                                     | Recommendation                                                                                                                                                                   | Used in  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| What is the baseline (today's system)?                                       | 4–6 links: Scania sells trucks to hauliers, hauliers carry freight for customers, energy providers supply fuel and electricity, banks finance trucks, workshops maintain trucks. | L9, C9   |
| Should the event-time idea do work in the game, not just appear on Screen A? | Yes. Tag each Screen D consequence with the events it depends on, marked thin, adjacent or in motion.                                                                            | L10, N8  |
| Is the extra Screen D detail in scope?                                       | Keep beneficiaries and unintended effects. Leave out investment figures: there is no sourced data.                                                                               | L10      |
| One strategy per run, or compare strategies?                                 | One per run, with "try another strategy".                                                                                                                                        | N6, N8   |
| Keep sound and confetti?                                                     | Drop confetti. Keep sound optional and off by default.                                                                                                                           | N12      |
| Who signs off the content?                                                   | One named person, with a review by the course team before release.                                                                                                               | L11, N14 |
| Where is it deployed?                                                        | Vercel or Netlify, with a preview deploy on every PR.                                                                                                                            | N14, N15 |
