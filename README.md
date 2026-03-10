# Sheep Run (p5.js Platformer)

A side-scrolling platform game built with `p5.js` and `p5.sound`, starring a sheep.

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

1. Clone or download this project.
2. Start a local server from the project root:

```bash
python3 -m http.server 8000
```

3. Open: `http://localhost:8000`

## Deploy to GitHub Pages

1. Create a new repository on GitHub (for example: `sheep-run`).
2. In this project folder, run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

3. On GitHub, open your repository settings:
   - Go to `Settings` -> `Pages`
   - Under `Build and deployment`, set:
     - `Source`: `Deploy from a branch`
     - `Branch`: `main` and `/ (root)`
   - Save.
4. Wait 1-3 minutes, then open:
   - `https://<your-username>.github.io/<your-repo>/`

Asset paths are relative, so the game works on both local servers and GitHub Pages project URLs.

## Project Structure

```text
.
├── assets/
│   ├── fonts/
│   └── sounds/
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
