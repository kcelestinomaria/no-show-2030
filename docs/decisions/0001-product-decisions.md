# 0001: Product decisions (L4)

Status: accepted. Decided on 2026-11-28.

These five decisions settle the open questions from the brief before the data types are written (L5). Each one lists the tasks that depend on it.

## 1. Today's system (the baseline)

Screen C marks relationships as existing, changed or new. "Existing" means these links, which hold before any action is taken:

- Scania sells trucks to hauliers.
- Hauliers carry freight for customers.
- Energy providers supply fuel and electricity to hauliers.
- Banks finance trucks for hauliers.
- Workshops maintain trucks for hauliers.

Used in: L9 (`content/baseline.ts`), C9 (link styling).

## 2. Event time does work in the game

The idea is not only text on Screen A. Each consequence on Screen D is tagged with the events it depends on, and each event has a state:

- **thin**: a date on a plan, nothing happening yet
- **adjacent**: a pilot, a letter of intent, something partly under way
- **in motion**: actually happening

Used in: L5 (types), L10 (content), N8 (Screen D).

## 3. Screen D scope

Each action's consequences cover the four categories in the brief (Economic, Environmental, System changes, Risks), plus:

- **who benefits**
- **unintended effects**

Investment figures are left out, because there is no sourced data for them.

Used in: L5 (types), L10 (content), L13 (integrity tests), N8 (Screen D).

## 4. One strategy per run

The player picks one strategy per run. Screen D ends with "Try another strategy", which goes back to Screen B, and "Restart".

Used in: N1 (journey state), N6 (Screen B), N8 (Screen D).

## 5. Sound and confetti

No confetti. Sound is optional and off by default, and the player's choice is remembered.

Used in: N12.
