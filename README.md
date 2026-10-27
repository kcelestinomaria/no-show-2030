# No Show 2030

> **A date is not a future. An event is.**
> A truck that does not run does not cut carbon.

No Show 2030 is a 3D planning game that runs in your web browser. You run a truck factory. You decide which trucks to build for four long-haul freight routes. Then you see which trucks actually drive and which ones sit in the yard.

The game began as a KTH project. It makes one point: plans that say *"40% electric trucks by 2030"* often fail. A date on a slide does not make chargers, workshops, bank loans or short border queues appear. A truck only runs when the things it depends on have **really happened**. In the game, these things are called **events**.

---

## Contents

1. [Quick start](#quick-start)
2. [The idea behind the game](#the-idea-behind-the-game)
3. [How to play](#how-to-play)
4. [The rules in detail](#the-rules-in-detail)
5. [Controls](#controls)
6. [How the code is organised](#how-the-code-is-organised)
7. [How the code works](#how-the-code-works)
8. [Contributing](#contributing)
9. [Building and deploying](#building-and-deploying)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## Quick start

### What you need

| Tool | Version | How to check |
|---|---|---|
| [Node.js](https://nodejs.org/) | 18 or newer (20 LTS or newer is best) | `node --version` |
| npm | Comes with Node.js | `npm --version` |
| [Git](https://git-scm.com/) | Any recent version | `git --version` |
| A web browser | Recent Chrome, Edge, Firefox or Safari with **WebGL** turned on | Visit [get.webgl.org](https://get.webgl.org/) |

### Run it on your computer

```bash
# 1. Download the code
git clone https://github.com/kcelestinomaria/no-show-2030.git
cd no-show-2030

# 2. Install the libraries the project uses (only needed the first time)
npm install

# 3. Start the development server
npm run dev
```

The terminal will print an address, usually **http://localhost:5173**. Open it in your browser.

The development server reloads the page by itself every time you save a file. To stop it, press `Ctrl + C` in the terminal.

### All commands

| Command | What it does |
|---|---|
| `npm install` | Downloads every library listed in `package.json` into `node_modules/`. |
| `npm run dev` | Starts a local server with live reload, for working on the code. |
| `npm run build` | Checks all the TypeScript for errors, then builds a fast, small version of the site into `dist/`. |
| `npm run preview` | Serves the built `dist/` folder so you can test the real production build. Run `npm run build` first. |

---

## The idea behind the game

This section explains *why* the game exists and what it is trying to teach. You don't need it to play, but the rules make much more sense once you have read it.

### 1. Two ways to think about the future

There are two common ways to plan for change.

**Planning by date (the "year scenario").** You choose a year and a share: *"By 2030, 40% of new trucks will be electric."* Then you work backwards: if 40% are electric, carbon falls by X, so we build Y electric trucks. The date is the starting point, and everything else follows from it.

**Planning by event.** You ask a different question: *"What has to be true in the world before someone will actually buy and use an electric truck on this road?"* You list those things: a charger the truck can reach, a workshop that can repair it, a bank willing to lend money for it, a border queue short enough to fit inside a driver's shift. Then you look at each one and ask: *Is it happening yet?*

The game's motto, **"A date is not a future. An event is."**, says the second way is the honest one. A year on a slide does not build a charger. Real things built by real people do. Until they exist, the future on the slide is only a guess.

### 2. Why one missing piece is enough to stop a truck

A haulier is a company that moves goods by truck. A haulier doesn't buy a truck because it is clean. They buy it because it can **do the job tomorrow** and **pay for itself**. To do that, many things must be true at the same time, and if any important one is missing, the truck doesn't get bought, or it gets bought and then can't work.

The game models this as a **chain** of four events. A chain is only as strong as its weak links. That is why the rule is strict: the events must average **¾ or more** before the chain opens. Two strong events and two empty promises (a score of ½) are not enough. In real life, a great charger network doesn't help if no bank will finance the truck and no shipper will accept the smaller load an electric truck can carry.

The three event states stand for how real something is:

- **Thin**: someone has announced it. There is a date, a press release, a target. Nothing physical exists. It counts for **nothing**.
- **Adjacent**: something real has started: a pilot project, a signed letter of intent, a half-built site. It counts for **half**, because it might still stall.
- **In motion**: it exists and works. It counts **in full**.

On the 3D map you can *see* this difference. Thin events are see-through holograms, adjacent ones stand inside scaffolding, and in-motion ones are solid buildings with their lights on.

### 3. "On paper" carbon versus real carbon

This is the heart of the game.

When a plan says "40% electric", it usually calculates carbon as if **every planned truck runs**. The game calls this **"CO₂e on paper"**. It is what you see in the top bar while you plan.

But carbon is only cut by trucks that **actually drive**. An electric truck parked in a yard because there is no charger cuts **zero** carbon. So the game counts carbon only on trucks that ran. After each quarter, the top bar switches to **"CO₂e ran"**, the real number.

The gap between those two numbers is the gap between a plan and reality. The old deck's paper number usually looks great. Its real number tells a different story, because its electric trucks were never able to run.

### 4. Stranded trucks: the cost of building too early

Building a truck for a world that doesn't exist yet isn't free. The game punishes it in two ways:

- The slot is paid for whether the truck runs or not (−2).
- A gas or electric truck on a closed chain is **stranded**: it cannot run at all, so it costs an extra −3.

In the real world these are "stranded assets": expensive machines that lose value because the world around them didn't arrive in time. In the game, all of that cost lands on your factory's book.

### 5. Why the haulier buys diesel first

On each lane, the work goes to **diesel first, then gas, then electric**. This is not because the game likes diesel. It reflects how buyers behave. When a diesel truck can leave tomorrow with fuel, workshops and resale value all in place, it wins the contract. Cleaner trucks only get the work that is left over, or the work on lanes where their own chain is fully open.

This means that **building more electric trucks does not, by itself, take work away from diesel**. To change the mix, you have to make the clean trucks' chains as solid as diesel's, and you have to avoid flooding a lane with more trucks than it has work.

### 6. The same truck, different roads

The four lanes were chosen to show that "the future of trucking" is not one future:

- **Stockholm – Ruhr** (EU core): a charger pilot exists and the grid is clean and live, but finance and payload are still thin. Electric is *close* here.
- **Madrid – Lyon** (southern Europe): chargers and the tariff exist only as dates on a slide.
- **Mombasa – Kampala** (East Africa): electric is *empty*. Nothing in its chain has closed. Diesel works because fuel, workshops, parts and a resale market are all already there.
- **Johannesburg – Lusaka** (Southern Africa): the border queue sets the clock for every powertrain. If a truck can't cross inside one driver shift, nothing else matters.

A single global target, like "40% electric by 2030", treats these four roads as if they were the same. The game shows they are not. A plan that fits Stockholm can strand trucks in Kampala.

### 7. What you control, and what you don't

The **event desk** shows a second big idea: some events are **yours to build**, and others **belong to someone else**.

- **Backing** your own events (training workshops, stocking parts, offering finance, guaranteeing to buy trucks back) always works. It costs money and takes one quarter per step. A truck maker really can do these things.
- **Leaning** on outside actors (grid operators, charger companies, fuel suppliers, shippers, border agencies, fleet owners, regulators) only *raises the chance* that they deliver on their date. They keep their own clocks. Sometimes they show up. Sometimes there is a **no-show**, and the date slips.

That is where the name **No Show 2030** comes from. Many plans quietly assume every outside actor delivers on time. The game makes you live with the ones who don't, and rewards you for putting money where you *do* have control.

### 8. The old deck as a mirror

The old deck plays every quarter beside you, in exactly the same world, with the same lucky and unlucky events. It never changes its plan: 50% diesel, 10% gas, 40% electric, every quarter.

It is there as a fair comparison. Each quarter's report puts your result next to the old deck's. When the campaign ends, the **Book** star asks one simple question: *did watching the events make more money than following the date?* The **Carbon** star then asks whether the trucks that really ran met the final target.

### 9. What the game leaves out

The game is a teaching model, not a forecast. All the numbers are simplified and made up to make the trade-offs clear. In particular, some of the most important people in real freight are **not in the room**: the driver, the clearing agent at the border, and the people who run the grid. The game only shows them as events you can see but cannot fully control. A real plan would need to talk to them directly.

### The idea in one paragraph

A plan built on a year assumes the world will be ready on that date. A plan built on events checks whether the world *is* ready, lane by lane, and invests in the missing pieces it can control. Trucks built for a world that hasn't arrived don't cut carbon. They sit in the yard and cost money. **Build the events first, then the trucks.**

---

## How to play

### The story

It is **Q3 2030**. You plan production at a truck factory. You have **40 factory slots**, and each slot is one truck you can build this quarter. Four freight routes (the game calls them **lanes**) need trucks:

| Key | Lane | Region | Length | Contract points |
|---|---|---|---|---|
| `1` | Stockholm – Ruhr | EU core | 1,450 km | 12 |
| `2` | Madrid – Lyon | Southern EU | 1,100 km | 8 |
| `3` | Mombasa – Kampala | Northern Corridor | 1,150 km | 10 |
| `4` | Johannesburg – Lusaka | SADC | 1,600 km | 10 |

On each lane you can build three kinds of truck (**powertrains**): **diesel**, **gas** or **electric**.

Your boss has a slide deck that says *"40% electric by 2030"*. That plan, called **the old deck**, plays beside you every quarter in the same world. At the end you find out whether you beat it.

### One quarter, step by step

1. **Plan.** Use the `+` and `−` buttons in the **Plan** tab to put your 40 slots on lanes and powertrains. The top bar shows *CO₂e on paper*: the carbon your plan *claims* if every truck ran.
2. **Use the event desk (optional).** You get **3 desk actions** each quarter. Spend money from your treasury to make events happen (see [Back and Lean](#the-event-desk-back-and-lean)).
3. **Run the quarter.** Click **Run** (or press `R`). Trucks drive out on the map. Trucks that can work drive the lane. Trucks that can't stay in the yard. This takes about 4.5 seconds. Press `Space` to skip it.
4. **Read the book.** A report shows what you earned and how much carbon the trucks that ran *actually* produced. It also shows how the old deck did in the same world.
5. **Next quarter.** Click **Next** (or press `N`). The news arrives first: which outside events showed up and which were *no-shows*. Then you plan again.

The campaign has four quarters: **Q3 2030 → Q4 2030 → Q1 2031 → Q2 2031**. The carbon target gets stricter each quarter.

### Your first five minutes

- The first time you open the game, a **welcome screen and guided tour** start. You can replay the tour any time with the **Tour** button on the camera dock.
- Hover over anything with a small **ⓘ** to read a short explanation. The **Guide** tab (press `?`) lists every term in one place.
- Click a building on the map to open an **action card** for that event. From there you can back or lean on it without leaving the map.
- Each lane has a coloured diamond (the **lane signal**):
  - 🟢 **Green:** every slot here can run.
  - 🟠 **Amber:** more slots than work, so some trucks will idle.
  - 🔴 **Red:** some slots are on a closed chain, so those trucks cannot run at all.
  - ⚪ **Grey:** nothing committed here.

---

## The rules in detail

Every rule below comes straight from the code (`src/data.ts`, `src/engine.ts` and `src/campaign.ts`). If you change the code, please update this section too.

### Events and their three states

An **event** is something that must be true in the real world before a haulier (a trucking company) will buy and run a truck. Examples: "Megawatt charger on the spine" or "Residual value a bank will finance".

Every event is in one of three states:

| State | Meaning | Score | Looks like on the map |
|---|---|---|---|
| **In motion** | It is really happening: built, signed, priced, staffed. | 1 | A solid building with its lights on |
| **Adjacent** | A pilot, a letter of intent, a half-built site. | ½ | A building inside scaffolding |
| **Thin** | Only a date on a slide. | 0 | A see-through hologram |

### Chains: when can a truck run?

Each lane has one **chain** per powertrain. A chain is a list of four events, so there are 4 lanes × 3 powertrains = 12 chains.

- The **chain score** is the average of its event scores.
- A chain is **open** when its score is **0.75 or more**.
- A truck can run only if its chain is open.
- **Electric trucks also need a live grid.** Each lane has a separate "Grid power that is clean and live" event, and it must be *in motion*.

**Worked example.** At the start, the electric chain on Stockholm – Ruhr is: in motion (1), in motion (1), thin (0), thin (0). The score is 2 ÷ 4 = **0.5**, so the chain is closed. Back the thin "Residual value a bank will finance" event once and it becomes adjacent, so the score becomes 2.5 ÷ 4 = 0.625. Back it again the next quarter and it becomes in motion, so the score becomes 3 ÷ 4 = **0.75**. Now the chain is open. Stockholm's grid is already in motion, so electric trucks can now run there.

At the very start of the game, **only diesel chains are open** on every lane.

### Who gets the work: contract points

Each lane has a number of **contract points**, which is the amount of work available. Each running truck wins at most one point. The haulier buys **diesel first, then gas, then electric**, because they buy the truck that can leave tomorrow.

So if a lane has 10 points and you send 8 diesel and 5 electric trucks, and both chains are open, diesel wins 8 points, electric wins the last 2, and 3 electric trucks sit **idle**.

### Money

| Item | Amount |
|---|---|
| Each contract point won | **+5** |
| Each slot you commit (whether the truck runs or not) | **−2** |
| Each **stranded** truck: a gas or electric truck whose chain is closed (or electric with no live grid) | **−3 extra** |
| Each **spare** slot you leave unused | **−0.5** (no charge if you commit nothing at all) |
| Carbon fine (see below) | **−1 per point over the target** |

Diesel trucks on a lane with no work left are *idle*, not *stranded*, so they pay no extra penalty.

You start with **20** in the **treasury**. After each quarter, the treasury changes by that quarter's result minus fines. Desk actions are paid from the treasury straight away.

### Carbon

Carbon is measured as **CO₂e per km**, compared with fossil diesel, which counts as 100:

| Truck | CO₂e per km |
|---|---|
| Diesel, fossil fuel | 100 |
| Diesel, when the lane's "Biodiesel at the pump" event is in motion | 40 |
| Gas | 75 |
| Electric on a live grid | 35 |

Your carbon score is the **average over trucks that actually ran**, weighted by lane length. Idle and stranded trucks don't count. A truck that doesn't run doesn't cut carbon.

The **target** gets stricter each quarter:

| Quarter | Q3 2030 | Q4 2030 | Q1 2031 | Q2 2031 |
|---|---|---|---|---|
| Target (CO₂e/km) | 80 (−20%) | 75 (−25%) | 70 (−30%) | 60 (−40%) |

If your number is over the target, you pay a fine of **1 per point over**, rounded to one decimal place.

The top bar shows **"CO₂e on paper"** while you plan. That number pretends every committed truck runs, which is the old deck's way of counting. After the quarter runs, it changes to **"CO₂e ran"**, the real number.

### The old deck

The old deck is a fixed plan: **50% diesel, 10% gas, 40% electric**, spread over the lanes by contract points. It never changes its mind. In Q3 2030 it commits 20 diesel, 4 gas and 16 electric trucks. Every gas and electric chain is closed, so **20 of its trucks are stranded** and it loses money. That is the whole point of the game.

### The event desk: Back and Lean

You get **3 desk actions per quarter**. There are two kinds of event:

**Your own events** (workshops, parts, finance offers, buy-back guarantees) → **Back** it.
- Thin → adjacent costs **10**. Adjacent → in motion costs **16**.
- It **lands at the start of next quarter**, one step up, every time. Nothing is random here.
- You can't back an event in the last quarter (Q2 2031), because there is no next quarter for it to land in.

**Outside events** (the grid operator, charge-point operators, fuel suppliers, shippers, border agencies, fleet owners, regulators) → **Lean** on it.
- Each outside event has a **due quarter** and a **chance** of showing up on that date (between 30% and 60%).
- Leaning costs **8** and adds **+25%** to that chance. You can lean on the same event at most **twice**. The chance never goes above **95%**.
- When the due quarter comes:
  - **It showed:** the event moves up one step. If it is now adjacent, it is due again next quarter.
  - **No show:** the date slips by one quarter, and sometimes two (a 35% chance).
- You can only lean on an event whose date is still in the future.

Some events are **the same fact in the world**. For example, the Johannesburg – Lusaka border queue affects both the gas and the electric chains. Linked events always move together.

### The randomness is fixed (deterministic)

The game never uses `Math.random` for rules. Whether an outside event shows up is decided by a hash of the **seed**, the event and the quarter. The default seed is **2030**. **The same seed and the same choices always give the same result.** This makes the game fair to discuss and easy to test.

At the end of the game you can replay **the same world** (same seed) or start **a new world** (a random seed from 1000 to 9999).

### Winning: three stars

After Q2 2031 the campaign ends and you get up to three stars:

| Star | How to earn it |
|---|---|
| **Carbon** | Your last quarter (Q2 2031) met its target of 60. |
| **Contracts** | On average you won **75% or more** of all contract points across the four quarters. |
| **Book** | Your total result (quarter results minus fines minus desk spending) beat the old deck's total. |

---

## Controls

### Mouse

| Action | What it does |
|---|---|
| Drag | Orbit (rotate) the camera |
| Right-drag | Pan the camera |
| Scroll | Zoom |
| Hover over something | Show a tooltip |
| Click a lane | Select it and fly the camera there |
| Click a building (event) | Open its action card (Back or Lean) |

### Keyboard

| Key | What it does |
|---|---|
| `1` `2` `3` `4` | Jump to a lane (in the order of the lane table above) |
| `0` | Overview of the whole map |
| `F` | Fly to the factory |
| `L` | Show or hide event labels |
| `R` | Run the quarter (while planning) |
| `Space` | Skip the truck animation (while running) |
| `N` | Go to the next quarter (when the report is open) |
| `M` | Turn sound on or off |
| `?` | Open the Guide tab |
| `Esc` | Close a card or window, or go back to the overview |

### Saved in your browser

The game uses `localStorage` for three small things only: whether you have seen the tour, whether you have dismissed the camera hint, and your sound setting. **Your game itself is not saved.** Reloading the page starts a new campaign.

---

## How the code is organised

The game is a **single-page web app** written in **TypeScript**. It uses:

- **[React 18](https://react.dev/)** for the user interface: sidebar, top bar, pop-up windows.
- **[three.js](https://threejs.org/)** for the 3D map.
- **[Vite](https://vitejs.dev/)** to run the development server and build the site.

It has **no backend, no database and no environment variables**. Everything runs in the browser.

```
no-show-2030/
├── index.html            The one HTML page. Loads fonts and starts src/main.tsx.
├── package.json          Project name, scripts (dev/build/preview) and libraries.
├── vite.config.ts        Vite settings. Puts three.js in its own file for faster loading.
├── tsconfig.json         TypeScript settings (strict mode, no unused variables).
├── src/
│   ├── main.tsx          Entry point. Mounts <App /> into the page.
│   ├── App.tsx           The conductor. Holds game state, connects UI and 3D, handles keys.
│   ├── data.ts           ALL the numbers: lanes, chains, events, prices, carbon values.
│   ├── engine.ts         The rules for ONE quarter. Pure functions.
│   ├── campaign.ts       The four-quarter campaign: desk, outside actors, news, final score.
│   ├── styles.css        All the styling.
│   ├── three/            The 3D world (draws only; no rules here)
│   │   ├── World.ts      Scene, camera, lanes, trucks, animations, mouse picking.
│   │   ├── kit.ts        Basic shapes, colours, materials, trees, holograms, scaffolding.
│   │   └── props.ts      One 3D building for each kind of event (charger, bank, workshop…).
│   └── ui/               The 2D interface
│       ├── Sidebar.tsx   The Plan / Desk / Book / Guide tabs and the charts.
│       ├── Overlays.tsx  Tooltip, quarter report, news window, final score window.
│       ├── ActionCard.tsx  The card that opens when you click a building.
│       ├── Tour.tsx      Welcome screen and guided tour.
│       ├── copy.ts       Every explainer text (the ⓘ tooltips and the Guide).
│       ├── bits.tsx      Small shared pieces: number formats, icons, steppers, badges.
│       ├── sfx.ts        Sound effects, made in code with the Web Audio API (no audio files).
│       └── Confetti.tsx  Confetti when you hit a target.
└── legacy/               The original 2D version, kept for reference only.
    ├── index.html        It is NOT built or served, and it is not wired to src-classic.
    └── src-classic/
```

---

## How the code works

### The big idea: rules and drawing are separate

```
          data.ts  (every number)
             │
             ▼
         engine.ts  (one quarter: commit in → result out)
             │
             ▼
        campaign.ts  (four quarters, desk, outside events, final score)
             │
             ▼
          App.tsx  (holds the Campaign state in React)
          │     │
          ▼     ▼
   ui/*.tsx    three/World.ts
  (2D panels)  (3D map; draws only what it is told)
```

1. **`data.ts` holds every number.** If you want to change a price, a lane, an event or a carbon value, change it here, and only here.
2. **`engine.ts` is pure.** `resolve(commit, world)` takes a plan and a world and returns a `Result`. It uses no randomness, has no side effects and doesn't touch the screen. The same input always gives the same output.
3. **`campaign.ts` is also pure.** Each action is a function that takes the old `Campaign` and returns a new one, without changing the old one:
   - `newCampaign(seed)`: the starting state.
   - `back(g, key)` / `lean(g, key)`: desk actions.
   - `runQuarter(g)`: plays your plan and the old deck against the same world.
   - `finishRun(g)`: marks the run animation as done.
   - `nextQuarter(g)`: lands backed events, rolls outside events, moves on.
   - `finalOf(g)`: the final stars and title.
4. **`App.tsx` connects everything.** It keeps the `Campaign` in React state. It gives the 3D `World` a description of what to show (`setView`). It also listens for clicks and key presses.
5. **`three/World.ts` only draws.** It never decides who wins. It gets told the world state and the quarter result, and it animates them.

### The game phases

```
plan ──Run──▶ running ──animation ends──▶ report ──Next──▶ plan (next quarter)
                                             │
                                             └── after Q2 2031 ──▶ over
```

### Event keys

Every event has a text key. `campaign.ts` builds these keys:

- Chain events: `<lane>/<powertrain>/<index>`, for example `sto-ruhr/electric/3`.
- Side events: `<lane>/biodiesel` and `<lane>/grid`.

`EVENT_META` in `campaign.ts` says who owns each event (`you` or an outside actor). For outside events it also gives the due quarter and the chance of showing up.

---

## Contributing

Everyone is welcome, including first-time contributors.

### Step by step

1. **Fork** the repository on GitHub (the *Fork* button, top right), or ask the owner for access.
2. **Clone** your fork and install:
   ```bash
   git clone https://github.com/<your-username>/no-show-2030.git
   cd no-show-2030
   npm install
   ```
3. **Make a branch** with a short, clear name:
   ```bash
   git checkout -b fix-tooltip-overlap
   ```
4. **Make your change.** Run `npm run dev` and check it in the browser.
5. **Check that it builds.** This is the project's main safety check:
   ```bash
   npm run build
   ```
   It must finish with no errors. TypeScript is strict here: unused variables and unused parameters are errors.
6. **Play through it.** There are no automatic tests yet, so please play at least one full quarter, and the whole campaign if you touched the rules.
7. **Commit and push:**
   ```bash
   git add .
   git commit -m "Fix tooltip overlapping the sidebar on small screens"
   git push -u origin fix-tooltip-overlap
   ```
8. **Open a pull request** on GitHub. Say *what* you changed, *why*, and *how you tested it*. A screenshot or short screen recording helps a lot for visual changes.

### House rules for the code

These rules keep the game fair, testable and easy to change:

- **Numbers live in `data.ts`.** Don't hard-code prices, scores or carbon values anywhere else. (Campaign-only numbers such as targets and desk costs are at the top of `campaign.ts`.)
- **Keep `engine.ts` and `campaign.ts` pure.** No `Math.random`, no `Date.now`, no DOM, no React, no three.js. Return new objects; don't change the ones you were given.
- **Randomness goes through `roll(seed, key, quarter)`**, so that the same seed always gives the same game.
- **The 3D world only draws.** Rules never go in `src/three/`.
- **Player-facing explainer text goes in `ui/copy.ts`.** Keep it short, concrete and in plain English.
- **Keep the screen calm.** Show one clear signal per fact, and put the details behind hover or a click. Don't fill the screen with text.
- **Match the style around you:** two-space indent, single quotes, the same naming and the same small amount of comments.
- **If you change a rule, update the "The rules in detail" section of this README** and the matching text in `ui/copy.ts`.

### Good first contributions

- Add automatic tests for `engine.ts` and `campaign.ts`. They are pure functions, so they are easy to test. [Vitest](https://vitest.dev/) fits well with Vite.
- Save the campaign to `localStorage` so a page reload doesn't lose your game.
- Improve accessibility, for example keyboard access to the 3D map and screen-reader text.
- Add a new lane or event in `data.ts`, with a matching entry in `EVENT_META`. A new event may also need a new building in `three/props.ts`.

### Reporting a bug

Open an issue on GitHub. Include:
- What you did, step by step.
- What you expected to happen.
- What happened instead, with a screenshot if you can.
- Your browser and operating system.
- The seed, if it matters. The default seed is 2030; "New world" picks a random one.

---

## Building and deploying

```bash
npm run build     # creates the dist/ folder
npm run preview   # optional: test the built site at http://localhost:4173
```

`dist/` is a plain **static website**: HTML, CSS and JavaScript only. Any static host can serve it, for example Vercel, Netlify, GitHub Pages or Cloudflare Pages.

**Vercel or Netlify settings:**

| Setting | Value |
|---|---|
| Framework | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |

With the Vercel command-line tool you can deploy straight from the project folder:

```bash
npm i -g vercel
vercel           # preview deployment
vercel --prod    # production deployment
```

You can also connect the GitHub repository in your host's dashboard, so that every push to `main` deploys automatically.

> The page loads its fonts (Fraunces, Geist, Geist Mono) from Google Fonts. Without internet access the game still works but falls back to system fonts.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| **"3D needs WebGL."** appears and there is no map | Your browser or graphics card has WebGL turned off. Turn on hardware acceleration in your browser settings, update your graphics drivers, or try another browser. The sidebar still works without 3D. |
| `npm install` fails | Check that `node --version` shows 18 or newer. Delete `node_modules` and `package-lock.json` only as a last resort, then run `npm install` again. |
| `npm run dev` says the port is in use | Vite will try the next port by itself. Read the address it prints in the terminal. |
| `npm run build` shows TypeScript errors | Read the file name and line number in the message. Common causes are an unused variable or import, or a wrong type. Fix it and build again. |
| The game feels slow | Close other heavy tabs. The game already lowers its resolution when the frame rate drops. Pressing `L` to hide labels also helps. |
| No sound | Press `M` or click the sound button on the dock. Browsers only allow sound after you click or press a key on the page. |
| The tour no longer appears | Click **Tour** on the camera dock. |

---

## FAQ

### About the idea

**Where did this game come from?**
It was made for **DM2803 Transformative Change in Complex Systems**, a course in the Sustainable Digitalisation master's programme at KTH Royal Institute of Technology. The course asks students to do three things: name a **goal conflict**, show why a normal engineering method fails on it, and design an **intervention** that does not pretend the conflict is solved. Students must also check who the intervention favours, in the short and the long term: the organisation, people, other species and ecosystems.

The case is real-world truck manufacturing. Scania set a science-based target to cut CO₂e per kilometre from its trucks *in use* by **20% by 2025** (compared with 2015). The project's source material reports that it reached **about 11%**, and that **more than 96%** of its emissions come from trucks on the road, not from the factory. (Check Scania's latest annual and sustainability report for the exact figures.) The planning deck treated 2030 as a place and built towards it. Hauliers did not buy that place, so the carbon stayed on the diesel trucks that actually ran.

**Why is it called "No Show 2030"?**
2030 was invited, but it did not show up. The chargers, the finance and the customers that were supposed to make the year real were not there when the trucks were ready, so the trucks became no-shows too.

**What is African time philosophy?**
It is a way of understanding time that the Kenyan philosopher and theologian **John S. Mbiti** described in his book *African Religions and Philosophy* (1969). He based it mainly on East African languages such as Kikamba and Gikuyu. Its core ideas:

- **Time is made of events.** Time is not an empty line that exists on its own. It is the events that fill it. People reckon time by what happens ("when the cows are milked", "when the rains came"), not by numbers on a calendar.
- **Two dimensions: *Sasa* and *Zamani*.** These are Swahili words. *Sasa* is the "now" period: the present, the recent past, and the **near future that is already taking shape**. *Zamani* is the deep past, where all events finally settle.
- **The far future is almost empty.** Events far ahead have not started to happen, so in this view they are not yet real time. Mbiti calls them **"potential time"**, not "actual time". Time moves *backwards* from Sasa into Zamani, not forwards towards a distant goal.

In short: **the near future is thick, and the far future is empty until something happens in it.**

Two important cautions:
- This is **one philosopher's account**, and it has been criticised. The Ghanaian philosopher **Kwame Gyekye**, for example, showed that Akan thought clearly includes a distant future, and other writers argue that Mbiti generalised from a few languages to a whole continent. Africa has many cultures and many ideas of time.
- It is **not** the stereotype of "African time" meaning being late. That use of the phrase is unrelated and is not what this project draws on.

**How is the game tied to Western versus African time philosophy?**
The game puts two ideas of the future side by side and lets you watch them play out against each other.

| | "Western" linear time | Event-time (after Mbiti) |
|---|---|---|
| What time is | An empty, measurable line that runs on its own. Newton described time that "flows equably without relation to anything external". | A composition of events. No events, no time. |
| The future | A destination. A year like 2030 is a place you can plan to arrive at. | Thick near the present, empty far away. It only fills up as events start. |
| How you plan | Pick the date, then work backwards to what must be built by then. | Look at what is already happening, and build on that. |
| In the game | **The old deck**: "40% electric by 2030", whatever the world looks like | **Your plan**: commit trucks only where the chain of events is open |

The rules carry the event-time idea directly:
- An **in-motion** event is *actual time*: it has happened, so it counts in full.
- An **adjacent** event is *potential time* on the edge of becoming actual: people and equipment are in place, so it counts half.
- A **thin** event is a date with nothing behind it. In event-time it is not yet part of the future at all, so it counts **zero**.
- Each lane's **depth** for each powertrain (thick, adjacent, thin or empty) is the same idea: diesel's future is thick, while electric's future on Mombasa – Kampala is empty.
- A **no-show** is what linear time cannot see. The date arrives, but the event does not, so in event-time the future simply has not started.

To be clear, the game does not claim that "Western people" or "African people" think only one way. Both kinds of reasoning exist everywhere. The point is that **one of them describes a truck market better**: a haulier decides by what is already in motion, not by the year printed on a slide. The two African lanes are in the game because freight there is real and important, not to illustrate the philosophy.

**If African time philosophy inspired it, why doesn't the game say so on screen?**
On purpose. The game is about the goal conflict, not about philosophy. The philosophy is the *engine* under the rules, and the screen shows what the engine does: thin, adjacent and in-motion events, open chains, and trucks that run or don't. When presenting, the advice is to mention it only if someone asks what the engine is made of, in one line: *event-time; the near future is thick and the far future is empty until something happens in it.* Then go back to the goal conflict.

**Is this transformative?**
Yes, but in a specific and limited way.

*The goal conflict.* The climate target is real, and a manufacturer needs hauliers to buy the trucks. A plan that treats a year as a destination meets the target **on a slide** and misses it **on the road**. The game shows this with real numbers from its own rules. In Q3 2030 the old deck's paper carbon is about **61.7**, which looks well under the target of 80. But 20 of its trucks are stranded, so the carbon of the trucks that actually ran is about **80.6**, which misses the target, and the book loses money (−40).

*Why the normal method fails.* Scenario planning counts what is **built**. Carbon is only cut by kilometres that are **driven**. So the method rewards building trucks that then sit in the yard.

*The intervention is a planning rule, not a new truck.* The change is in how the future gets counted: **only events that are happening count as future.** In Donella Meadows' well-known list of *leverage points* (places to intervene in a system), this works on the system's **rules** and **information flows**, and it questions its **paradigm**: the belief that a named year is a forecast. That is deeper than changing a product, which is why it counts as transformative.

*A shared language.* The event chain acts as a **boundary object**, a term from Star and Griesemer (1989) for something different groups can all read in their own way. Planners, a haulier and a sustainability lead can look at the same chain and agree that a missing charger is not a *delay* against 2030. It means 2030 **has not started yet**.

*What it does not do.* It does not deliver the transition. It is a way to stop a **false** intervention, the kind that builds for a year instead of for the road. See the next two questions for who it favours and where it stops.

**Who does it favour, in the short and the long term?**
- **The organisation, short term:** fewer stranded trucks and a healthier book.
- **Hauliers and drivers:** trucks that can actually work on their lane.
- **Ecosystems, long term:** only if the kilometres are real. Cleaner trucks cut carbon only once they run, and the game's desk shows that opening those chains takes money and time.
- **Other people in the system** (the driver, the clearing agent at the border, the grid operator) appear in the model only as **events**. They are not part of the decision, so the game cannot claim to serve them.

**What are its limits?**
- **The room still belongs to the manufacturer.** Everyone else is modelled, not consulted.
- **It is short-term.** The core lesson is one replacement cycle, and the campaign is only four quarters.
- **It does not fix the world.** It does not build the corridor, shorten the border queue, clean the grid, or address the mineral supply chain behind batteries.
- **It could be misread** as "just keep building diesel". The intended reading is the opposite: put money into the events you can make happen, so that clean trucks have a road to run on.
- **All numbers are simplified teaching values**, and there is one fixed seed, so the lesson is the same every time.

**Could it become a real tool?**
Possibly. The same rule could be used with a manufacturer's real routes and real events, and a product version would use their data instead of the classroom numbers.

### Teaching with it

**How do I demo it in about four minutes?**
1. **Run the old deck first.** Open the Plan tab, click **Load the old deck** and press **Run**. Electric trucks sit in the yard. Paper carbon looked like about 62; the trucks that ran come in at about 80.6, over the target of 80, and the book is −40. Say: *"The plan hit the target on a slide and missed it on the road."*
2. **Then plan by events.** Go back to Q3 2030 with **Restart this world** in the Guide tab (or reload the page). Then commit diesel only where its chain is open, leaving spare capacity where the electric chain is thin. Put all 12 Stockholm – Ruhr points on diesel, because biodiesel is already in motion there, so those trucks run at 40 instead of 100. One plan that works: **12 Stockholm, 8 Madrid, 10 Mombasa, 0 Johannesburg**, all diesel. Carbon comes in at about **72.3**, under the target. Cash is **+85**, and 75% of contracts are kept. Say: *"The target is real. The date was not."*
3. **Name the intervention** as a change in the planning rule, not a new powertrain.
4. **Close on the limits** (see above) before someone else raises them.

### About the game

**Is this a real forecast?**
No. The lanes and events are a simplified, made-up setup for learning. The point is the *way of thinking*: plan around events that are happening, not around dates on a slide.

**Why can't I hit the carbon target in the first quarter just by building electric trucks?**
Because at the start every electric chain is closed. Electric trucks would be stranded: they cost money and cut no carbon. Look for cleaner trucks that *can* run, and use the desk to open chains for later quarters.

**Why does the old deck lose?**
It commits 40% electric trucks on a fixed date, whatever the state of the world. Those trucks can't run, so they are stranded.

**Can I change the numbers to try other scenarios?**
Yes. Edit `src/data.ts` (and the top of `src/campaign.ts`). The dev server reloads at once.

**What is in the `legacy/` folder?**
The original 2D version of the game. It is kept only as a reference and is not part of the build.

---

## License

No license file has been added yet, so all rights are reserved by the author by default. If you want to reuse this work outside of contributing here, please contact the repository owner first.
