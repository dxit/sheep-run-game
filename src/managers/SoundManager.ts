export default class SoundManager {
    format: string;
    sounds: Record<string, ReturnType<typeof loadSound> | undefined>;
    paths: Record<string, string>;
    lazySounds: Set<string>;
    pendingVolume: Record<string, number>;
    pendingRate: Record<string, number>;

    // Sets up sound storage and format
    constructor(format = "mp3") {
        this.format = format || "mp3";
        soundFormats(this.format);
        this.sounds = {};
        this.paths = {
            boost: "assets/sounds/boost.mp3",
            butterfly: "assets/sounds/butterfly.mp3",
            collectable: "assets/sounds/eat_crunchy.mp3",
            falling: "assets/sounds/falling.mp3",
            gameMusic: "assets/sounds/game-music.mp3",
            gameOver: "assets/sounds/game-over.mp3",
            jumping: "assets/sounds/jumping.mp3",
            levelCompleted: "assets/sounds/level-completed.mp3",
            wolf: "assets/sounds/wolf.mp3",
        };
        // Lazy-load heavier/background assets to reduce startup blocking.
        this.lazySounds = new Set(["gameMusic"]);
        this.pendingVolume = {};
        this.pendingRate = {};
    }

    // Preloads only startup-critical sounds (lazy sounds are loaded later)
    preload(): void {
        for (const name of Object.keys(this.paths)) {
            if (this.lazySounds.has(name)) {
                continue;
            }
            this.#load(name);
        }
    }

    // Starts loading selected sounds in the background
    warmup(names: string[] = []): void {
        const list = Array.isArray(names) && names.length ? names : Array.from(this.lazySounds);
        for (const name of list) {
            this.#load(name);
        }
    }

    // Gets a sound by name
    get(name: string): ReturnType<typeof loadSound> | undefined {
        if (!this.sounds[name] && this.paths[name]) {
            this.#load(name);
        }
        if (!this.sounds[name]) {
            console.warn(`The sound ${name} is not found`);
            return undefined;
        }
        return this.sounds[name];
    }

    // Sets volume
    setVolume(name: string, volume: number): void {
        if (!this.paths[name]) {
            console.warn(`The sound ${name} is not found`);
            return;
        }
        if (typeof volume !== "number" || Number.isNaN(volume) || volume < 0 || volume > 1) {
            console.warn(`Cannot set sound ${name} to volume ${volume}`);
            return;
        }
        this.pendingVolume[name] = volume;
        const sound = this.sounds[name];
        if (sound) {
            sound.setVolume(volume);
        }
    }

    // Sets rate
    setRate(name: string, rate: number): void {
        if (!this.paths[name]) {
            console.warn(`The sound ${name} is not found`);
            return;
        }
        if (typeof rate !== "number" || Number.isNaN(rate) || rate <= 0) {
            console.warn(`Cannot set sound ${name} to rate ${rate}`);
            return;
        }
        this.pendingRate[name] = rate;
        const sound = this.sounds[name];
        if (sound) {
            sound.rate(rate);
        }
    }

    // Plays a sound by name
    play(name: string, { loop = false, overlap = false }: { loop?: boolean; overlap?: boolean } = {}): void {
        const sound = this.get(name);
        if (!sound) {
            return;
        }
        if (!sound.isLoaded()) {
            return;
        }
        if (sound.isPlaying() && !overlap) {
            sound.stop();
        }
        if (loop) {
            sound.loop();
        } else {
            sound.play();
        }
    }

    // Stops a sound by name
    stop(name: string): void {
        const sound = this.get(name);
        if (!sound) {
            return;
        }
        if (!sound.isLoaded()) {
            return;
        }
        sound.stop();
    }

    // Loads one sound and applies deferred settings once ready
    #load(name: string): ReturnType<typeof loadSound> | undefined {
        if (this.sounds[name]) {
            return this.sounds[name];
        }

        const path = this.paths[name];
        if (!path) {
            return undefined;
        }

        const sound = loadSound(
            path,
            () => {
                this.#applyPendingSettings(name);
            },
            () => {
                console.warn(`Unable to load sound ${name} from ${path}`);
            },
        );
        this.sounds[name] = sound;
        return sound;
    }

    // Applies pending volume/rate values to a loaded sound
    #applyPendingSettings(name: string): void {
        const sound = this.sounds[name];
        if (!sound) {
            return;
        }

        if (this.pendingVolume[name] !== undefined) {
            sound.setVolume(this.pendingVolume[name]);
        }

        if (this.pendingRate[name] !== undefined) {
            sound.rate(this.pendingRate[name]);
        }
    }
}
