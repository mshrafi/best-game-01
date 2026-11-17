# ABYSSAL ECHO

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/mshrafi/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/mshrafi/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

A 2D deep-sea echolocation game. Pilot the submersible **LUMEN** down a
pitch-dark ocean trench. The dark hides everything — press **SPACE** to fire
a sonar pulse and briefly light up the cave walls, pearls, mines and eels.

## Goal

Collect **12 lumin pearls** while descending to **500m** and reach the
**Trench Heart** to win. Drifting mines cost 1 hull on touch; eels patrol
the trench and chase you when your sonar lights them up. **3 hull hits**
and LUMEN sinks — game over.

## How to play

- **WASD / arrow keys** — thrust (with smooth inertia and drift)
- **SPACE** — sonar ping (limited charge, recharges over time)
- **P** — pause · **R** — restart · **M** — mute
- Click / tap also starts the game and fires sonar.

Difficulty ramps with depth: the trench narrows, mines grow denser and
eels get faster the deeper you dive.

## Feel

Smooth thrust physics, screen shake on hull hits, particle bursts on
pearl pickups, expanding sonar rings, a headlamp cone, thruster bubbles,
and fully synthesised WebAudio sound — sonar ping, pickup chime, hit
thud, a low ambient drone and a win arpeggio. No network, no external
assets: all art is drawn on canvas, all sound is synthesised.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots: `?shot=start` title · `?shot=play&seed=1` mid-game ·
`?shot=play&seed=7` deep water · `?shot=end` win screen.
