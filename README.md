# Apex Racing · Pit Wall

A live race-control board for the fictional Apex Racing team. Six cars are simulated in the
browser and the board follows one of the three Apex drivers. There is no backend and no network
call after the page loads.

Built with React 19, TypeScript and Tailwind CSS v4 on Vite.

---

## 1. How to run

Node 22 or newer is required. Development was done on v22.21.1.

```bash
git clone https://github.com/Ayve-178/race-control.git
cd race-control
npm install
npm run dev
```

The app starts on **<http://localhost:5173>**.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Type-check, then a production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | 457 tests across 41 files |
| `npm run lint` | ESLint, including the rule that keeps React out of the simulator |

Everything is bundled. The fonts, the car image and the circuit are local files, so the board
works offline and looks the same on a slow connection.

## 2. Overview

This is a pit-wall board for a race engineer. The screen is read in a fixed order. The urgency
band at the top says where the car is and whether the lap is good. The car, the driver and the
race context sit below it. Nothing scrolls on a desktop except the event log. The layout
follows a static HTML mock of the frame at 1440 by 900, and every panel is separated by a
hairline rule rather than a card.

| | |
|---|---|
| **Masthead**, 44px | The brand, the circuit, the live pulse, the session controls and the driver picker. Only the clock and the pulse move. |
| **Urgency band**, 96px | Position, lap, current lap against best, best lap, top speed. |
| **Left column**, 420px | The circuit with its sector splits, then the stint and the weather. |
| **Centre column**, 460px | The car, with a readout at each corner and a lead line to its wheel. Every wheel is a button. Below it the power unit: revs, engine temperature, fuel and the ERS battery with its mode. The mode tells the engineer whether the driver has deployment for the next straight or is still harvesting. |
| **Right column** | Heart rate, breathing and stress as traces, then the race control log. The log is the one panel that scrolls. |

Colour has three jobs. In text it means deviation, so a nominal number is uncoloured. On the car
it means state, including the good one: all four tyres are painted green, amber or red, so an
engineer can see "all four are fine" without reading a number. Everywhere else it is identity.
Each weather reading and each physio trace has its own tint, and the selected car is cyan wherever
it appears.

Three things to know before opening it:

- It runs in real time. A 1:23 lap takes 1:23.
- The first minute is scripted. A lap completes, a position changes and a tyre warning fires
  inside sixty seconds. The simulator also runs thirty seconds of warm-up before the first paint,
  so the traces have history. See [Trade-offs](#7-trade-offs).
- Every number on screen comes from the simulator.

## 3. Architecture

```
src/
  sim/        the race, in plain TypeScript. cannot import React, and a lint rule enforces it
    models/   car, field, tyres, brakes, engine, fuel, ers, physio, weather, flags, episodes, events
    race.ts   the race state and the pure tick function
  store/      a hand-written store on useSyncExternalStore
  app/        the board: masthead, urgency band, the three-column composition
  race/       circuit, stint, weather, the event log
  car/        the tyres and brakes on the car, and the power unit
  driver/     the three physio traces
  components/ presentational primitives that know nothing about racing
  styles/     index (cascade order), tokens, theme, reset, base, components, app
tests/        one test file per module, mirroring the src tree, plus the vitest setup
```

The simulator has no React in it. `src/sim` is plain TypeScript, and an ESLint
`no-restricted-imports` rule fails the build if anything in it imports React. The whole race is one
pure function, `tick(state, dt, rng)`, that returns new state and touches nothing else. That is why
the behaviour can be tested by calling a function. The only part without a test is the
`setInterval`, which is three lines.

The store is a small hand-written one on `useSyncExternalStore`. Telemetry changes twice a second.
Passing the state down as props would re-render the whole tree on every tick, and memoisation
would then be needed to undo that. Instead each panel subscribes to the one value it draws:

```tsx
const flag = useRace((view) => view.race.flags.flag)
```

The snapshot is a single object that is replaced when something changes, never rebuilt on read, so
React compares it by identity. A test counts commits with React's `Profiler` and fails if a
selector is widened.

One thing stays out of React. The car markers move at 60 fps in a `requestAnimationFrame` loop.
It interpolates between the last two tick positions and writes a transform through a ref. It does
not predict ahead from the car's speed, because that would copy the tick's advance formula into a
component, where it would drift out of agreement with the real one.

The layout is four media queries and no JavaScript. An earlier version used container queries and
a `matchMedia` hook that mounted one zone at a time below 600px. The mock changes its composition
at stated window widths, so the window is the right thing to ask, and the stylesheet answers it.
Nothing unmounts at any width, so there is no width at which a panel loses its state.

Every panel names the grid cell it belongs in, and the column decides where that cell is. The same
seven names, `circuit`, `stint`, `weather`, `tyres`, `power`, `physio` and `log`, are placed by
`grid-template-areas`, and the tablet and phone layouts place them again. The markup never changes
between breakpoints, only the arrangement.

## 4. Live data simulation

The tick is 500 ms. Elapsed time comes from the wall clock rather than from the interval, so a lap
takes as long as a lap takes even when the browser is late with a timer. The step is clamped to two
seconds so a backgrounded tab cannot teleport the race.

Every drifting reading is the same primitive: a value with a target it moves toward, a drift rate
and a deadband. A tyre temperature, a heart rate and the wind speed are one object with different
numbers. Twelve bespoke update functions would be twelve places to get "must feel intentional"
wrong.

Spikes are episodes, and they recover on their own. An episode does not set a value. It shifts a
channel's target by an offset for a while. When the episode ends the offset goes back to zero and
the reading finds its own way home at its own rate. Offsets add up, so two episodes can affect one
channel without knowing about each other.

Readings that share a cause move together. The five weather readings are not five independent
drifts. One cloud front moves all of them, in the directions real weather moves them. The four
tyres come apart because the circuit works the four corners of the car differently.

Events come from threshold crossings with a latch. Each band has two lines: one to cross going in
and a lower one to cross coming back out. Without that, a reading resting on a limit would cross it
over and over and the feed would fill with a warning being announced and retracted. The same
latched band feeds the gauges and the feed, so the two cannot disagree.

Switching driver remaps everything and lands on real history. All three Apex cars are simulated
the whole time, so each one has a genuine last minute of heart rate, breathing and stress. The
traces live in the race state rather than in the chart component. A chart that kept its own
history would start again every time the picker moved. Position, lap, tyres, power unit, physio
and the event feed all follow the picker.

## 5. Responsive strategy

The board was checked with a screenshot and a horizontal-overflow measurement at 1440, 1024, 768
and 390, and at the awkward widths 1217, 936, 672 and 514. There is no overflow at any of them. The
hierarchy changes at each step, so it is not a scaled desktop.

| Width | What the board does |
|---|---|
| **1440** | The mock's own frame, at the size it was drawn. |
| **1280 to 1439** | The frame goes elastic and the columns keep their proportions. |
| **1024 to 1279** | The context column narrows to 264px. The stint list goes from two columns to one, the weather strip from five to three, and the traces drop their older axis ticks rather than losing the gauge or the reading. |
| **768 to 1023** | Two columns, and the page starts to scroll. The context column becomes a full-width strip with the circuit spanning two rows. The four tyre readouts stop flanking the car and become a 2 by 2 block beneath it. The urgency band sticks to the top. |
| **Below 768** | One column, with the urgency band stuck to the top. The masthead drops the wordmark to the roundel, hides the country and the clock, cuts the live label to its dot and the driver to an avatar. The circuit name truncates only after all of that. |

What survives longest: position and lap, the selected tyre, the event log. What goes first: the
older axis ticks on the traces, the country beside the circuit name, the word beside the live dot,
and the band's best lap and top speed.

The two cells the band drops below 1024, best lap and top speed, reappear in the stint panel. That
panel renders them at every width and hides them with CSS while the band can carry them.

Every column has one row that can absorb a short viewport, and in the context column it is the
circuit. It is an SVG with a viewBox, so it loses nothing but size. The three lists below it would
lose rows. A panel with `overflow: hidden` has an automatic minimum size of zero, so its `1fr` row
can be squeezed to nothing. The weather panel lost its fifth row that way at two widths before the
floors were made explicit.

Long names, long event text, missing values and large numbers were tested by replacing the seed
with deliberately awful content for a while. The masthead gives every item somewhere to shrink
before a circuit name longer than Hockenheim can collide with anything.

## 6. Challenges and pitfalls

### Tabular figures do not stop a number gaining a digit

Tabular figures make one digit the same width as another, so `7601` does not jitter against
`7600`. They do nothing when a number gains a digit. The revs cross ten thousand twice a lap and a
tyre cools through a hundred several times a stint, and both were pushing the unit beside them. The
tyre temperature now reserves three characters. The rest were found with a script that watches
every readout on the running app for twenty seconds and reports any that changes width. It watches
154 of them, and no numeric readout moves now. None of this shows in a screenshot, which is why it
survived several visual passes.

### A long name did not overflow, it collided

Given a 38-character circuit name, the masthead drew it straight across the readouts beside it.
Nothing overflowed the page, so the overflow measurement said everything was fine. `white-space:
nowrap` says not to break the line, and says nothing about what to do when the line does not fit.
The element keeps its full width and paints over its neighbours while the parent stays the right
size. A long driver name was worse: the picker grew past the bar, and its own `overflow: hidden`
clipped the other two drivers out of reach. The fix is `min-width: 0` on every flex child that can
truncate, and a shrink order in the masthead so the name gives up last.

### The pinned tyre and its focus ring painted the same property

Both were drawn with `box-shadow`, and the two selectors tied on specificity. Source order decided,
and the pin won. Tabbing onto an already pinned wheel changed nothing on screen. The focus ring on
the wheels is an `outline` now, because the band glow and the alarm pulse are box-shadows too and
would paint over it. Nobody tests that combination by hand, so the wheels have a keyboard test.

### Tailwind reads prose

Tailwind finds class names by scanning text, and it scans everything it is pointed at. A test with
`const { container } = render(...)`, a code comment with the words "scroll container", and a
sentence in section 3 of this file were each enough to emit a `container` utility. Nothing uses
it, and it carries a media query per breakpoint. The tests folder and this README are excluded
with `@source not` now. It came back once, when the tests moved to their own folder and the
exclusion path did not follow, so it is a thing to check before trusting a bundle size.

### A 2px spacing base halves every numeric utility

The mock steps its spacing 2/4/6/8/12/16/24, so Tailwind's spacing base is 2px and `p-4` is 8px.
That is right for padding and gaps. It also means a 32px icon button written as `w-8` comes out at
16px, and nothing reports it, because it is a valid utility producing a valid size. Eleven
dimensions were wrong this way. The one that showed was the vertical rail beside each physio
trace: 6px wide with a 6px inset, so it rendered as nothing and looked like a CSS bug rather than
an arithmetic one. The rule is written in `theme.css`: numbers are for spacing, and any literal
pixel dimension is an arbitrary value like `w-[32px]`.

### A watermark drawn as an element is not a watermark drawn as a background

The mock paints the team roundel into the board's background at about 3% opacity. The first
version was a 720px element. It hung 58px off the right edge and scrolled the page sideways, which
the overflow measurement caught. It also sat under the grain layer's `mix-blend-mode`, so it was
re-composited on every frame the markers moved: 50 fps, with 73 frames over 20 ms in a ten second
watch. As a background layer on the board it is painted once, and the board runs at 60 fps with
nothing over 20 ms. A background layer has no opacity of its own, so the 3.5% is baked into the
SVG data URI.

## 7. Trade-offs

The incidents are on a timetable rather than rolled for. The yellow flag comes at 100 seconds, the
virtual safety car at 300 and the safety car at 640, and the flags repeat every fifteen minutes.
The tyre and engine overheats and the driver spike run on an eight minute cycle, and one car pits
after lap 16. The whole race replays identically from one seed.

This costs the feel of an unpredictable session, which is a real loss in a racing simulation. It
buys three things that mattered more: a demo that can be shown without hoping, a walkthrough video
that can be recorded twice and give the same race, and tests that assert the exact state after two
hundred ticks. A random generator cannot be demonstrated. Opening the page to show someone a
yellow flag would be down to luck.

## 8. Performance notes

Measured on the production build in headless Chrome at 1440 by 900, watched for ten seconds. The
first numbers came from the dev server and were wrong: 116 requests and 4.5 MB, because Vite serves
unbundled modules in development and the request count was a count of source files.

| | |
|---|---|
| Requests, total transfer | 9, 382 kB |
| JS | 281 kB, 87 kB gzipped |
| CSS | 32 kB, 8 kB gzipped |
| Car image | 209 kB, over half the payload |
| Fonts | 5 files, 84 kB, all self-hosted |
| First contentful paint | about 0.9 s |
| JS heap, settled | 4 MB |
| Elements on the page | 403 |
| DOM mutations per tick | about 220, of which about 175 are the six track markers at 60 fps |
| Frames | 60/s, p95 16.8 ms, none over 20 ms, no long tasks |
| Network requests after load | 0 |

On the JS and CSS figures: Tailwind moves class names out of the stylesheet and into the markup,
so they ship in the JS bundle. Against the plain CSS version, JS is about 9 kB heavier and CSS
about 7 kB heavier, while the stylesheet is 1,147 lines shorter in the repository. That is roughly
16 kB uncompressed and 2 kB gzipped for a styling layer written in one idiom instead of two.

On the mutation figure: the markers are meant to move every frame. The number that matters for "a
tick must not re-render the whole app" is the other 40 or so.

The store's selectors mean a tick wakes only the panels whose numbers moved. The driver
picker and the stint panel both record zero re-renders across four seconds of ticking, and a test
fails if a selector is widened. That test caught two panels selecting whole objects that the
simulator rebuilds every tick, for values that change once every few laps, and neither looked
wrong on screen. The fonts are latin subsets only, and a modern browser fetches five files. The car
image is a 640-pixel PNG. The marker loop only interpolates, so the 60 fps path re-derives nothing
the 2 Hz path already computed.

Memoisation is skipped on purpose. Each trace rebuilds a 120-point polyline twice a second and
never shows up in the frame times. A `useMemo` there would trade a real cost, a dependency
comparison on every render and a reader wondering what the array protects, for an imagined one.
The car image is the obvious next win at half the payload. It is left alone because more
compression costs visible quality on the one photograph in the product.

## 9. Tools used

| Tool | For |
|---|---|
| React 19, TypeScript, Vite | The application |
| Tailwind CSS v4 | Styling, configured from this project's own design tokens rather than its defaults |
| Vitest, Testing Library, jsdom | 457 tests across 41 files |
| ESLint | Including the rule that keeps React out of `src/sim` |
| `@fontsource` | Self-hosted Archivo and JetBrains Mono |
| Chrome DevTools Protocol | Small Node scripts written for this project: screenshots and overflow at a list of widths, touch-target measurement, WCAG contrast read off the running app, a keyboard walkthrough, an accessibility-tree audit, axe-core, per-tick DOM mutation and frame timing, and the readout width check from section 6 |
| axe-core | Fetched on demand rather than added as a dependency, because it checks the work and is not part of the product |

The work ran in phases against a written plan, a design brief and a list of things to avoid. Two
approaches were measured and rejected along the way: the viewport fit discussed in section 5, and
letting the car schematic grow into spare panel height.

Every fault in section 6 was found by looking at the running application or by measuring it. The
test suite passed straight through all of them. Two of the measurement scripts were wrong at first.
One reported a skipped heading level that was not skipped, and one passed the single control on the
board that had no focus ring. Both were fixed by breaking the application on purpose and checking
that the script noticed.

---

## Notes for a reviewer

- The seeded race means the board is identical every time it is opened. To see a flag, wait 100
  seconds. The safety car is at 640.
- Pin a tyre and leave it. It survives everything else updating, which is the point of it.
- The driver picker remaps the entire board, including the event feed and the physio history.
- At 390 the board is a different layout, not a squeezed one.
