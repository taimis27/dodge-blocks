# Star Drift

Star Drift is a browser-based space survival shooter where the player controls a spacecraft, destroys incoming enemies, collects power-ups, and attempts to survive for as long as possible while building a high score.

The game starts with relatively simple threats and progressively introduces stronger enemies, projectiles, tracking missiles, and more demanding spawn patterns.

---

## Table of Contents

- [Game Overview](#game-overview)
- [Player](#player)
- [Player Weapons](#player-weapons)
- [Player Hull](#player-hull)
- [Shield System](#shield-system)
- [Damage and Respawn](#damage-and-respawn)
- [Enemy Types](#enemy-types)
- [Difficulty and Level Progression](#difficulty-and-level-progression)
- [Enemy Spawn Scaling](#enemy-spawn-scaling)
- [Power-Ups](#power-ups)
- [Power-Up Spawn System](#power-up-spawn-system)
- [Scoring](#scoring-system)
- [Combat Effects](#combat-effects)
- [Player Destruction](#player-destruction)
- [Leaderboard](#score-leaderboard)
- [Pause System](#pause-system)
- [Main Menu and Game Reset](#main-menu-and-game-reset)
- [Space Background](#space-background)
- [Game Flow](#game-flow)
- [Difficulty Progression Summary](#difficulty-progression-summary)
- [Controls](#controls)
- [Core Gameplay Loop](#core-gameplay-loop)
- [Technical Gameplay Summary](#technical-gameplay-summary)

---

## Game Overview

Star Drift is a browser-based space survival and combat game.

The player controls a small spacecraft positioned near the bottom of the screen. Enemy spacecraft and other hazards enter from the top and move toward the player.

The player's objective is to:

- Move left and right to avoid threats.
- Automatically fire at incoming enemies.
- Destroy enemy spacecraft and missiles.
- Collect power-ups.
- Manage hull and shields.
- Survive increasingly difficult levels.
- Build the highest possible score.
- Attempt to place a score on the local leaderboard.

The game combines arcade-style shooting, survival, movement, power-up collection, and score chasing.

---

## Player

The player controls the main Star Drift spacecraft.

### Base Player Stats

| Stat | Value |
|---|---:|
| Movement Speed | 360 px/s |
| Starting Hull | 3 |
| Maximum Hull | 3 |
| Starting Weapon Level | 1 |
| Starting Shield | 0 |

The player's horizontal position is restricted to the game area so the spacecraft cannot move outside the left or right boundaries.

---

## Player Weapons

The player automatically fires every **200 milliseconds**, which is approximately **5 firing cycles per second**.
The weapon level determines how many bullets are fired simultaneously. The maximum weapon level is **5**.

Higher weapon levels increase the number of projectiles fired per attack rather than increasing the normal damage of each bullet.

---

## Player Hull

The spacecraft starts with:

**3 / 3 Hull**

When the player is hit without a shield or active immunity, one hull point is removed. When hull reaches zero, the spacecraft is destroyed and the game enters the game-over sequence.

---

## Shield System

Shields provide additional protection against incoming damage. The player can hold a maximum of **3 shield stacks**. A shield can protect against enemy bullets, enemy spacecraft collisions, and tracking missile collisions.

The Shield power-up is unavailable when the player already has the maximum of 3 shield stacks.

---

## Damage and Respawn

When the player loses a hull point but still has hull remaining, the game enters a respawn sequence.

During this sequence:

- The player is destroyed and temporarily disappears.
- Existing enemies are cleared.
- Existing enemy bullets are cleared.
- Existing missile hazards are cleared.
- The player returns to the center of the screen.
- Temporary protection is provided during the respawn sequence.
- A **GET READY** period occurs before normal gameplay resumes.
- The player returns with **1 shield**.

If the player's final hull point is lost, the destruction sequence leads to game over instead.

---

# Enemy Types

Star Drift contains three main enemy spacecraft types:

1. Scout
2. Fighter
3. Tracking Missile
4. Heavy

---

## Scout

The **Scout** is the basic enemy spacecraft. It is introduced at **Level 1** and is the most common enemy throughout the game.

### Scout Stats

| Stat | Value |
|---|---:|
| Size | 24 × 28 px |
| Base Speed | 30 px/s |
| Maximum Speed | 330 px/s |
| Starting HP | 1 |
| Maximum HP | 5 |
| Weapon | None |
| Score | 25 |

Scouts do not fire projectiles. Their main threat comes from moving toward the player and occupying space that the player must avoid or destroy. Scout HP increases as the player progresses through the levels.

---

## Fighter

The **Fighter** is a larger and more dangerous enemy introduced at **Level 2**. Fighters combine movement with ranged attacks.

### Fighter Stats

| Stat | Value |
|---|---:|
| Size | 40 × 30 px |
| Base Speed | 45 px/s |
| Maximum Speed | 345 px/s |
| Starting HP | 4 |
| Maximum HP | 10 |
| Weapon | 1 projectile |
| Score | 50 |

Fighters begin appearing occasionally at Level 2. Their appearance frequency increases as the player progresses.

---

## Tracking Missiles

Tracking missiles are introduced at **Level 4**. Unlike normal enemy spacecraft, missiles are treated as a separate hazard.
They enter from the top of the screen and adjust their horizontal movement toward the player's current position.

### Missile Stats

At Level 4:

| Stat | Value |
|---|---:|
| Speed | 120 px/s |
| HP | 3 |

As the level increases:

- Missile speed increases by **30 px/s per level** after Level 4.
- Missile HP increases by **2 per level** after Level 4.
- Missile speed is capped at **420 px/s**.
- Missile HP is capped at **12**.

This makes missiles increasingly dangerous during longer runs.

---

## Heavy

The **Heavy** is the strongest enemy spacecraft. It is introduced at **Level 7**.

### Heavy Stats

| Stat | Value |
|---|---:|
| Size | 60 × 42 px |
| Base Speed | 20 px/s |
| Maximum Speed | 220 px/s |
| Starting HP | 12 |
| Maximum HP | 24 |
| Weapon | 2 projectiles |
| Special Projectile | Homing |
| Score | 100 |

The Heavy is larger and more durable than the Scout and Fighter. It fires two projectiles at a time, and its projectiles have homing behavior that adjusts their horizontal movement toward the player. The Heavy's projectiles have homing behavior.

---

Enemy fire intervals become shorter as the player's difficulty level increases.

---

## Difficulty and Level Progression

Difficulty is based on how long the player has survived.

The game starts at:

**Level 1**

The first level lasts:

**15 seconds**

The required time for subsequent levels increases by 5 seconds until the level duration reaches 60 seconds. The difficulty therefore increases gradually while later levels allow longer periods between level transitions.

---

## Enemy Spawn Scaling

Enemy spawn intervals become shorter as the player survives longer. The base enemy spawn interval starts around:

**2.2 seconds**

The interval decreases with elapsed time. The minimum spawn interval is **400 milliseconds** At sufficiently high difficulty, there is also a chance for two enemies to spawn simultaneously.

This begins at:

**Level 8**

with a **25% chance** of spawning two enemies instead of one.

---

# Power-Ups

Power-ups begin appearing from **Level 2**. They fall downward from the top of the game area and are collected when the player moves into them.

There are four power-up types:

- Multi-Shot
- Shield
- Immunity
- Golden Bullet

Only one power-up can be active on the screen at a time.

---

## Multi-Shot Power-Up

**Multi-Shot** increases the player's weapon level by one.nEach pickup increases the weapon level until the maximum of:

**Level 5**

The corresponding number of bullets per shot increases from one to five. Once Weapon Level 5 is reached, Multi-Shot power-ups are removed from the available power-up pool.

### Appearance

The Multi-Shot power-up uses a **purple** visual theme and displays three circular symbols.

---

## Shield Power-Up

The Shield power-up adds:

**+1 shield stack**

The maximum is:

**3 shield stacks**

If the player already has three shields, the Shield power-up is removed from the possible power-up selection.

### Appearance

The Shield power-up uses a **green** visual theme with a shield symbol.

---

## Immunity Power-Up

The Immunity power-up makes the player temporarily immune to damage.

Duration:

**10 seconds**

While active:

- Enemy bullets cannot damage the player.
- Enemy spacecraft cannot damage the player.
- Tracking missiles cannot damage the player.
- The player's spacecraft is rendered with reduced opacity to visually indicate the effect.

### Appearance

The Immunity power-up uses a **cyan** visual theme with wings symbol.

---

## Golden Bullet Power-Up

The Golden Bullet power-up temporarily changes the player's bullets into powerful golden projectiles.

Duration:

**7 seconds**

During this period:

- Normal enemies are destroyed in a single hit.
- Tracking missiles take **2 damage per bullet** instead of 1.
- Player bullets use a golden visual effect.

Against normal enemies, Golden Bullets effectively bypass their normal HP.

### Appearance

The Golden Bullet power-up uses a **gold/yellow** visual theme and displays a bullet symbol.

---

## Power-Up Spawn System

The initial power-up selection uses weighted probabilities.

| Power-Up | Weight |
|---|---:|
| Multi-Shot | 70 |
| Shield | 20 |
| Immunity | 5 |
| Golden Bullet | 5 |

These are weighted values rather than fixed percentages.

Power-ups are removed from the selection pool when they are no longer useful. For example:

- Multi-Shot is removed at Weapon Level 5.
- Shield is removed as long as the player has 3 shield stacks.
- Immunity is removed while immunity is already active.
- Golden Bullet is removed while Golden Bullet is already active.

---

# Scoring System

The player continuously gains score from survival. The score increases at approximately:

**6 points per second**

Additional points are awarded for destroying enemies and missiles.

### Enemy Scores

| Target | Score |
|---|---:|
| Scout | +25 |
| Fighter | +50 |
| Heavy | +100 |
| Tracking Missile | +70 |

Destroying enemies therefore rewards active combat while surviving.

---

## Combat Effects

Star Drift includes visual feedback for combat events.

### Enemy Hit

When an enemy is hit:

- The enemy briefly flashes.
- An impact effect appears at the point of contact.

### Enemy Destruction

When an enemy reaches zero HP:

- The enemy is removed.
- The player receives its score.
- A score popup appears.
- An explosion effect is displayed.

### Missile Destruction

Destroyed tracking missiles also produce:

- Impact effects.
- Score popups.
- Explosion effects.

### Shield Hit

When a shield absorbs damage:

- A green impact effect appears.
- A shield/lightning effect is displayed.

---

## Player Destruction

When the player's hull reaches zero, the game enters a destruction sequence. During this sequence, the game's visual elements slow down over approximately **2 seconds**.

After the destruction sequence finishes:

- The game ends.
- The final score is displayed.
- The player can submit their score to the leaderboard if it qualifies.

---

# Score Leaderboard

Star Drift includes a local high-score leaderboard. The leaderboard stores up to:

**5 scores**

Scores are stored using the browser's **localStorage**, meaning the leaderboard is saved locally in the player's browser. Scores are sorted from highest to lowest.

Players can enter a name of up to:

**18 characters**

Names are sanitized before being saved. The leaderboard can be viewed from the game's start screen and after a game ends.

---

## Pause System

The game includes a pause button while gameplay is active.

The pause menu provides options to:

- Continue the game.
- Restart the game.
- Return to the Main Menu.

The pause system is available during normal gameplay and the explosion state.

---

## Main Menu and Game Reset

Starting a new game resets the gameplay state, including:

- Player position
- Hull
- Weapon level
- Shields
- Power-up effects
- Score
- Level
- Enemies
- Missiles
- Player bullets
- Enemy bullets
- Visual effects
- Timers

Returning to the Main Menu also resets the active game environment. The background star field continues providing ambient animation on the main screen.

---

# Space Background

The game uses a layered star field to create a sense of movement through space. There are two star layers.

### Far Stars

- 58 stars
- Smaller
- Slower movement
- Lower opacity
- Speed range: **18–34 px/s**

### Near Stars

- 22 stars
- Larger
- Faster movement
- Higher opacity
- Speed range: **42–68 px/s**

The two layers move at different speeds to create a **parallax effect**.

Individual stars also have twinkle behavior.

---

# Game Flow

```text
Main Menu
    ↓
Start Game
    ↓
GET READY
    ↓
Level 1
    ↓
Enemies + Automatic Shooting
    ↓
Collect Power-Ups
    ↓
Destroy Enemies
    ↓
Level Increases
    ↓
New / Stronger Enemies
    ↓
Survive
    ↓
Player Takes Damage
    ↓
Respawn
    ↓
Continue
    ↓
Hull Reaches 0
    ↓
Explosion
    ↓
Game Over
    ↓
Score / Leaderboard
```

---

# Difficulty Progression Summary

| Level | Main Gameplay Changes |
|---|---|
| **1** | Scout enemies introduced |
| **2** | Fighters introduced; power-ups become available |
| **3** | Fighter frequency increases |
| **4** | Tracking missiles introduced |
| **5** | Missile threats continue; fighter presence continues |
| **6** | Increased fighter frequency |
| **7** | Heavy enemies introduced |
| **8+** | Higher spawn pressure; chance for multiple enemies |

Enemy HP and movement speeds can also increase as the level increases.

---

# Controls

### Keyboard

| Control | Action |
|---|---|
| **Left Arrow / A** | Move left |
| **Right Arrow / D** | Move right |

### On-Screen Controls

The game also provides left and right on-screen controls for supported screen layouts.

The player does not need a manual fire control because the spacecraft fires automatically.

---

# Core Gameplay Loop

The central gameplay loop of Star Drift is:

**Move → Shoot → Dodge → Collect → Upgrade → Survive → Score**

The player balances two main objectives:

### Survival

Avoid enemy spacecraft, projectiles, and tracking missiles.

### Combat

Destroy enemies to earn points and reduce the number of threats on screen.

Power-ups temporarily improve offensive or defensive capabilities, helping the player handle increasingly difficult situations.

---

# Technical Gameplay Summary

| System | Implementation |
|---|---|
| Game Type | Browser-based space survival shooter |
| Game World | 420 × 560 px |
| Player Movement | Horizontal |
| Player Speed | 360 px/s |
| Starting Hull | 3 |
| Maximum Shield | 3 stacks |
| Starting Weapon | Level 1 |
| Maximum Weapon | Level 5 |
| Fire Rate | 200 ms |
| Player Bullet Speed | 460 px/s |
| Enemy Types | Scout, Fighter, Heavy |
| Missile Hazard | Tracking missile |
| Power-Ups | Multi-Shot, Shield, Immunity, Golden Bullet |
| Starting Level | 1 |
| Power-Ups Begin | Level 2 |
| Missiles Begin | Level 4 |
| Heavy Enemies Begin | Level 7 |
| Multiple Enemy Spawns | Level 8+ |
| Leaderboard | Top 5 |
| Maximum Player Name | 18 characters |
| Score Storage | Browser localStorage |

---

## Game Design Summary

Star Drift is designed around a straightforward arcade principle:

**Survive longer. Become stronger. Destroy more enemies. Beat your high score.**

The game begins with simple enemy encounters and gradually introduces more complex threats. The player's weapon can grow from a single projectile into a five-projectile spread, while shields, temporary immunity, and Golden Bullets provide defensive and offensive advantages.

The combination of automatic shooting, responsive horizontal movement, enemy projectiles, tracking missiles, shield stacks, temporary power-ups, escalating enemy HP, and increasing spawn pressure creates a gameplay loop centered on **reaction, positioning, combat, and survival**.
