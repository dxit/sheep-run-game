# Sheep Run (p5.js Platformer)

A side-scrolling platform game built with `p5.js` and `p5.sound`, starring a sheep.

![Sheep Run gameplay screenshot](docs/images/sheep-run-gameplay.png)
_Gameplay overview._

![Sheep Run enemy encounter screenshot](docs/images/sheep-run-enemy-encounter.png)
_Enemy encounter with a wolf._

## Features

- Scrollable world with camera follow and world bounds
- Procedurally generated level elements (clouds, mountains, trees, canyons, platforms, wolves, butterflies, carrots)
- Multiple game states: active run, game over, level completed
- Lives, score, and optional timer system
- Best-time tracking for completed runs
- Sound effects and background music
- Faster startup: deferred script loading and lazy-loaded background music
- Built-in loading overlay while assets initialize
- Carrots as core collectables
- Butterfly bonuses: time butterfly (pink, `+10s`) and life butterfly (gold, `+1 life`)
- Butterfly spawning is guaranteed every run (with platform safety fallback)
- Consistent multi-file architecture (`entities`, `managers`, `utils`)

## Controls

- `A` or `Left Arrow`: move left
- `D` or `Right Arrow`: move right
- `W` or `Up Arrow`: jump
- `Space`: boost in movement direction
- `Esc`: restart (after game over or level completion)

## Run Locally

Clone or download this project, then run any local static server from the project root.

### Option 1: Node.js - `serve` (no install required)

```bash
npx serve .
```

Open the URL printed in the terminal (usually `http://localhost:3000`)

### Option 2: Python (built-in)

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`

### Option 3: Node.js - `http-server` (no install required)

```bash
npx http-server -p 8000
```

Open `http://localhost:8000`

### Option 4: Node.js - `live-server` (auto refresh on file changes)

```bash
npx live-server --port=8000
```

Open `http://localhost:8000`

### Option 5: PHP built-in server

```bash
php -S localhost:8000
```

Open `http://localhost:8000`

### Option 6: Ruby built-in server

```bash
ruby -run -e httpd . -p 8000
```

Open `http://localhost:8000`

### Option 7: VS Code Live Server extension

1. Install the `Live Server` extension.
2. Open `index.html`.
3. Click `Go Live`.

## Project Structure

```text
.
├── assets/
│   ├── fonts/
│   └── sounds/
├── docs/
│   └── images/
│       ├── sheep-run-enemy-encounter.png
│       └── sheep-run-gameplay.png
├── index.html
├── src/
│   ├── entities/
│   │   ├── Enemy.js
│   │   └── Platform.js
│   ├── managers/
│   │   ├── CharacterManager.js
│   │   ├── FontManager.js
│   │   ├── GameManager.js
│   │   ├── LevelManager.js
│   │   ├── PaletteManager.js
│   │   └── SoundManager.js
│   └── utils/
│       ├── LoaderOverlay.js
│       └── Utility.js
├── sketch.js
├── p5.min.js
├── p5.sound.min.js
└── CREDITS.md
```

## Tech Stack

- `JavaScript (ES6+)`
- `p5.js`
- `p5.sound`

## Credits

- Audio credits: [CREDITS.md](CREDITS.md)
