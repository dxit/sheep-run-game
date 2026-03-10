class LevelManager {
    // Sets up level data and tuning
    constructor(character, position, limit, elements, palette, sounds, fonts, state, gameSettings = {}) {
        this.character = character;
        this.position = position;
        this.limit = limit;
        this.elements = elements;
        this.palette = palette;
        this.sounds = sounds;
        this.fonts = fonts;
        this.state = state;
        // Global toggles passed from GameManager
        this.gameSettings = {
            bestTime: {
                enabled: gameSettings?.bestTime?.enabled, // Controls whether the best-time row is rendered
            },
        };
        this.butterflies = [];
        this.canyons = [];
        this.clouds = [];
        this.collectables = [];
        this.enemies = [];
        this.mountains = [];
        this.platforms = [];
        this.trees = [];
        this.flagpole = {
            x: this.limit.gameMaxXPos - 50,
            y: undefined,
            isReached: false,
            isCollectablesHintVisible: false,
        };
        this.score = 0;
        this.forbiddenRanges = [];
        this.canyonRanges = [];
        // Level-scoped tuning values for generation, collision and rendering behavior
        this.settings = {
            generalBuffer: 100, // Default horizontal exclusion zone used by generators around protected points
            mountain: {
                width: 350, // Base mountain width before scale multiplier
            },
            parallax: {
                mountains: 0.55,
                trees: 0.8,
            },
            butterfly: {
                distContact: 30, // Pickup distance
                spawn: {
                    heightAbovePlatform: 32, // Vertical offset from supporting platform
                    marginX: 22, // Horizontal inset from platform edges
                },
                extraTimeS: 10, // Seconds granted by a time butterfly
            },
            canyon: {
                minWidth: 70, // Canyon width range
                maxWidth: 180,
                minGap: 300, // Minimum spacing between generated canyons
                spawnBuffer: 260, // Keep canyons away from the initial character position
                flagpoleBuffer: 300, // Keep canyons away from the flagpole area
            },
            platform: {
                height: 20,
                grassHeight: 6,
                generation: {
                    // Avoid spawning platforms too close to start/flagpole
                    protectedBuffer: 240,
                    levels: {
                        one: {
                            width: { min: 170, max: 240 }, // Width range for generated level 1 platforms
                            gapOffset: 0, // Gap adjustment
                            fallback: { xOffset: 0, width: 210 }, // Fallback x-offset/width for level 1
                        },
                        two: {
                            width: { min: 145, max: 210 }, // Width range for generated level 2 platforms
                            gapOffset: -10, // Gap adjustment
                            fallback: { xOffset: 45, width: 180 }, // Fallback x-offset/width for level 2
                        },
                        three: {
                            width: { min: 130, max: 185 }, // Width range for generated level 3 platforms
                            gapOffset: -20, // Gap adjustment
                            fallback: { xOffset: 80, width: 150 }, // Fallback x-offset/width for level 3
                        },
                    },
                    // Vertical step range between platform layers
                    offsetY: {
                        min: 55,
                        max: 90,
                    },
                    dependency: {
                        slackX: 300, // Horizontal tolerance when building child-level spawn ranges
                    },
                    spacing: {
                        minGapPerLevel: 90, // Base minimum gap between platforms before offset
                        edgeBuffer: 140, // Keep generated platforms away from world edges
                    },
                    minTopY: 95, // Upper Y boundary to keep top platforms reachable
                },
            },
            flagpole: {
                area: {
                    // Trigger rectangle offsets relative to flagpole x and y
                    minOffsetX: -65,
                    maxOffsetX: 40,
                    minOffsetY: -170,
                    maxOffsetY: 6,
                },
            },
            collectable: {
                distContact: 50, // Character-to-collectable pickup distance
                spawn: {
                    edgeBuffer: 120, // Keep collectables away from world edges
                    flagpoleBuffer: 70, // Keep collectables before the flagpole
                },
            },
            enemy: {
                speed: this.character.velocity.walk / 2, // Base patrol speed
                get speedInRange() {
                    return this.speed * 1.5; // Speed multiplier while actively chasing the character
                },
                distRange: 300,
                distContact: 50,
                verticalRange: 60,
                chaseDeadzone: 6, // Horizontal deadzone to avoid direction flips near target
                spawn: {
                    spacing: 260, // Preferred spacing between generated enemy bases
                    edgePadding: 40, // Padding from walkable segment borders for patrol limits
                    startBuffer: 380, // Keep enemies away from initial character area
                    flagpoleBuffer: 300, // Keep enemies away from flagpole area
                    // Patrol distance constraints
                    minPatrol: 200,
                    maxPatrol: 400,
                    minSegmentWidth: 200, // Minimum walkable segment required to place an enemy
                    occupancyWidth: 90, // Width occupied by enemy during generation spacing checks
                },
            },
        };
        const isTimeEnabled = this.limit.timeS > 0;
        // Timer state and timer-related transient UI effects
        this.timer = {
            enabled: isTimeEnabled, // Whether timed mode is active
            maxS: isTimeEnabled ? max(1, round(this.limit.timeS)) : 0, // Current allowed total time in seconds
            leftS: isTimeEnabled ? max(1, round(this.limit.timeS)) : 0, // Remaining time in seconds
            startedAtMs: 0, // Millisecond anchor used for elapsed time
            isExpired: false, // True after timeout is over
            bonusFlash: {
                frames: 0, // Remaining frames for the green bonus-time banner flash
                durationFrames: 60, // Total duration of the bonus-time flash
            },
            timeoutPenalty: {
                pending: false, // Delayed timeout banner trigger (set on timeout, consumed on life restart)
                frames: 0, // Remaining frames for timeout penalty banner
                durationFrames: 120, // Total duration of timeout penalty banner
            },
        };
    }
    // Gets parallax factor for a layer
    #getParallaxFactor(layerName, fallback = 1) {
        const factor = this.settings?.parallax?.[layerName];
        if (!Number.isFinite(factor)) {
            return fallback;
        }
        return min(1, max(0, factor));
    }
    // Builds all level elements
    setup() {
        this.#createElements();
    }
    // Draws pre or post UI layer
    draw(kind) {
        if (kind === "pre") {
            this.palette.background(this.palette.colors.terrain.sky.day); //fill the sky blue
        }
        else if (kind === "post") {
            this.drawScoreText();
            this.drawLivesText();
            this.drawTimeText();
            this.drawBestTimeText();
            this.drawTimeoutPenaltyText();
            this.drawFlagpoleCollectablesHintText();
            if (!this.character.hasLives() || this.state.gameover) {
                this.drawGameover();
            }
            else if (this.flagpole.isReached || this.state.completed) {
                this.drawLevelCompleted();
            }
        }
    }
    // Starts a new life run
    start() {
        this.#resetFlagpole();
        this.#resetCollectables();
        this.#resetButterflies();
        this.#resetScore();
        this.#resetTimer();
        this.state.completed = false;
        this.state.gameover = false;
        if (this.timer.timeoutPenalty.pending) {
            this.timer.timeoutPenalty.frames = this.timer.timeoutPenalty.durationFrames;
            this.timer.timeoutPenalty.pending = false;
        }
    }
    // Restarts level with regenerated layout
    restart() {
        this.#resetFlagpole();
        this.#resetScore();
        this.#resetTimer();
        this.state.completed = false;
        this.state.gameover = false;
        this.timer.timeoutPenalty.pending = false;
        this.timer.timeoutPenalty.frames = 0;
        this.#createElements();
    }
    // Populates the main arrays with the proper objects
    #createElements() {
        this.#resetRanges();
        // Forbid starting character coords and flagpole
        this.#setForbiddenRanges([
            {
                min: this.character.position.x - this.settings.generalBuffer,
                max: this.character.position.x + this.settings.generalBuffer,
            },
            {
                min: this.flagpole.x - this.settings.generalBuffer,
                max: this.flagpole.x + this.settings.generalBuffer,
            },
        ]);
        // Dependency chain:
        // canyons -> enemies -> platforms -> butterflies
        this.#createCanyons();
        // Keep canyon ranges for dependent generation
        this.#setCanyonRanges(this.canyons.map((canyon) => ({ min: canyon.x, max: canyon.x + canyon.w })));
        this.#createEnemies();
        this.#createPlatforms();
        this.#createButterflies();
        // Independent decorative and collectible elements
        this.#createClouds();
        this.#createMountains();
        this.#createTrees();
        this.#createCollectables();
    }
    // Stores the shared forbidden x-ranges used by generators
    #setForbiddenRanges(ranges = []) {
        this.forbiddenRanges = Array.isArray(ranges) ? ranges : [];
    }
    // Stores canyon x-ranges so other generators can avoid placing overlapping elements
    #setCanyonRanges(ranges = []) {
        this.canyonRanges = Array.isArray(ranges) ? ranges : [];
    }
    // Resets flagpole completion and hint visibility for a new run
    #resetFlagpole() {
        this.flagpole.isReached = false;
        this.flagpole.isCollectablesHintVisible = false;
    }
    // Clears generation range caches before rebuilding level elements
    #resetRanges() {
        this.forbiddenRanges = [];
        this.canyonRanges = [];
    }
    // Resets collected score progress for the current attempt
    #resetScore() {
        this.score = 0;
    }
    // Re-initializes timer state from configured limit and restores normal music pacing
    #resetTimer() {
        const isTimeEnabled = this.limit.timeS > 0;
        const totalS = isTimeEnabled ? max(1, round(this.limit.timeS)) : 0;
        this.timer.enabled = isTimeEnabled;
        this.timer.maxS = totalS;
        this.timer.leftS = totalS;
        this.timer.startedAtMs = millis();
        this.timer.isExpired = false;
        this.timer.bonusFlash.frames = 0;
        this.#syncGameMusicRate();
    }
    // Marks all collectables as not found (used on life reset without regenerating layout)
    #resetCollectables() {
        for (const collectable of Object.values(this.collectables)) {
            collectable.isFound = false;
        }
    }
    // Marks all butterflies as available again after life loss
    #resetButterflies() {
        for (const butterfly of Object.values(this.butterflies)) {
            butterfly.isConsumed = false;
        }
    }
    // Dynamically adjusts background music playback rate based on remaining timer percentage (if time is enabled)
    #syncGameMusicRate() {
        const normalRate = 1;
        if (!this.timer.enabled || this.timer.maxS <= 0 || this.flagpole.isReached || !this.character.hasLives() || this.timer.isExpired) {
            this.sounds.setRate("gameMusic", normalRate);
            return;
        }
        const ratioLeft = this.timer.leftS / this.timer.maxS;
        let targetRate = normalRate;
        if (ratioLeft <= 0.25) {
            targetRate = 1.4;
        }
        else if (ratioLeft <= 0.5) {
            targetRate = 1.2;
        }
        this.sounds.setRate("gameMusic", targetRate);
    }
    // Handles timer countdown state and returns current seconds left
    #updateTimer() {
        // If timer is not active, returns the biggest value in JS as time left
        if (!this.timer.enabled) {
            this.#syncGameMusicRate();
            return Number.POSITIVE_INFINITY;
        }
        // If the game is over due to completed level or game over, freeze the time to the left one
        if (this.flagpole.isReached || !this.character.hasLives() || this.timer.isExpired) {
            this.#syncGameMusicRate();
            return this.timer.leftS;
        }
        // Calculate the left time
        const nowMs = millis();
        // Push startedAt into the future in case of bonus-time accumulation (butterflies)
        if (this.timer.startedAtMs > nowMs) {
            this.timer.startedAtMs = nowMs;
        }
        const elapsedS = floor(max(0, nowMs - this.timer.startedAtMs) / 1000);
        this.timer.leftS = max(0, this.timer.maxS - elapsedS);
        this.#syncGameMusicRate();
        // On timeout, removes the one life and restarts the game or sets game over
        if (this.timer.leftS <= 0 && !this.timer.isExpired) {
            this.timer.isExpired = true;
            this.character.lives--;
            if (this.character.hasLives()) {
                // On timeout, lose one life and restart the level instead of immediate game over
                this.timer.timeoutPenalty.pending = true;
                this.sounds.play("gameOver");
                this.character.start();
                this.start();
            }
            else {
                // No live left, therefore game over
                this.state.gameover = true;
                this.state.completed = false;
                this.character.setDirection(undefined, undefined, true);
                this.sounds.stop("gameMusic");
                this.sounds.play("gameOver");
                this.palette.use("dark");
            }
        }
        // Return time left in seconds
        return this.timer.leftS;
    }
    // Public method to return the time left in seconds
    getTimeLeftS() {
        return this.#updateTimer();
    }
    // Draws one mountain
    drawMountain({ x, scale: scaleCoef = 1 }) {
        const mountainW = this.settings.mountain.width;
        const y = this.position.floor.y;
        const height = 200;
        push();
        translate(x, y);
        scale(scaleCoef);
        translate(-x, -y);
        // main body
        this.palette.fill(this.palette.colors.terrain.earth.base);
        triangle(x, y, x + mountainW, y, x + mountainW / 2, y - height);
        // snow
        this.palette.fill(this.palette.colors.shared.white);
        beginShape();
        vertex(x + mountainW / 2, y - height);
        vertex(x + mountainW / 2.81, y - 142);
        vertex(x + mountainW / 2.33, y - 132);
        vertex(x + mountainW / 2.06, y - 142);
        vertex(x + mountainW / 1.84, y - 132);
        vertex(x + mountainW / 1.55, y - 142);
        endShape(CLOSE);
        // shadow
        this.palette.fill(this.palette.colors.shared.shadow.mid);
        triangle(x + mountainW / 2, y - height, x + mountainW / 1.6, y, x + mountainW, y);
        pop();
    }
    // Draws tree
    drawTree({ x, scale: scaleCoef = 1 }) {
        const y = this.position.floor.y;
        // Animation
        const leafSway = sin(frameCount * 0.03 + x * 0.01) * 6;
        const leafSwaySmall = sin(frameCount * 0.04 + x * 0.015 + 1.2) * 4;
        push();
        translate(x, y);
        scale(scaleCoef);
        translate(0, -142);
        // tree trunk
        beginShape();
        this.palette.fill(this.palette.colors.terrain.tree.trunk);
        vertex(-8, 142);
        vertex(7, 142);
        vertex(7, 110);
        vertex(30, 74);
        vertex(5, 95);
        vertex(5, 68);
        vertex(-8, 67);
        vertex(-6, 104);
        endShape(CLOSE);
        // tree leafs
        this.palette.fill(this.palette.colors.terrain.foliage.primary);
        ellipse(leafSway * 0.6, 20, 120, 120);
        this.palette.fill(this.palette.colors.terrain.foliage.secondary);
        ellipse(40 + leafSwaySmall, 60, 60, 60);
        pop();
    }
    // Draws collectable
    drawCollectable({ x, y, w }) {
        const anchorOffsetX = w * 0.16;
        noStroke();
        push();
        translate(x, y);
        rotate(PI / 4);
        // Keep the visual carrot centered on the collectable anchor even when scaled
        translate(-anchorOffsetX, 0);
        // carrot body (smooth, rounded + tapered)
        this.palette.fill(this.palette.colors.collectable.body);
        ellipse(0, 0, w * 0.9, w * 0.55);
        ellipse(w * 0.45, 0, w * 0.6, w * 0.4);
        ellipse(w * 0.78, 0, w * 0.3, w * 0.22); // rounded tip
        // carrot shading
        this.palette.fill(this.palette.colors.collectable.shade);
        ellipse(-w * 0.05, 0, w * 0.6, w * 0.35);
        ellipse(w * 0.4, 0, w * 0.4, w * 0.26);
        // highlight
        this.palette.fill(this.palette.colors.collectable.highlight);
        ellipse(-w * 0.2, -w * 0.08, w * 0.2, w * 0.32);
        // ridges
        this.palette.stroke(this.palette.colors.collectable.ridge);
        strokeWeight(1);
        line(-w * 0.25, -w * 0.16, w * 0.55, 0);
        line(-w * 0.25, 0, w * 0.6, 0);
        line(-w * 0.25, w * 0.16, w * 0.5, 0);
        noStroke();
        // leafy top
        this.palette.fill(this.palette.colors.collectable.leaf);
        beginShape();
        vertex(-w * 0.55, -w * 0.1);
        vertex(-w * 0.8, -w * 0.35);
        vertex(-w * 0.6, -w * 0.25);
        vertex(-w * 0.85, -w * 0.05);
        vertex(-w * 0.6, 0.05);
        endShape(CLOSE);
        this.palette.fill(this.palette.colors.collectable.leaf);
        beginShape();
        vertex(-w * 0.5, 0.1);
        vertex(-w * 0.7, -w * 0.15);
        vertex(-w * 0.45, -w * 0.05);
        vertex(-w * 0.75, 0.2);
        vertex(-w * 0.45, 0.2);
        endShape(CLOSE);
        pop();
    }
    // Draws life
    drawLife({ x, y, w }) {
        const h = w * 0.9;
        noStroke();
        push();
        translate(x, y);
        // heart body
        this.palette.fill(this.palette.colors.ui.text.danger);
        ellipse(-w * 0.22, -h * 0.14, w * 0.48, w * 0.48);
        ellipse(w * 0.22, -h * 0.14, w * 0.48, w * 0.48);
        triangle(-w * 0.46, -h * 0.02, w * 0.46, -h * 0.02, 0, h * 0.66);
        // highlight
        this.palette.fill(this.palette.colors.shared.highlight.soft);
        ellipse(-w * 0.16, -h * 0.2, w * 0.14, w * 0.2);
        pop();
    }
    // Draws canyon
    drawCanyon({ x, w }) {
        const topY = this.position.floor.y;
        const bottomY = height;
        const creekY = topY + 50;
        const creekH = bottomY - creekY;
        // Minimal width without breaking the graphic
        const canyonWidth = max(40, w);
        noStroke();
        // Shallow stream base
        this.palette.fill(this.palette.colors.terrain.water.shallow);
        rect(x, creekY, canyonWidth, creekH);
        // Deeper channel
        this.palette.fill(this.palette.colors.terrain.water.deep);
        rect(x + canyonWidth * 0.2, creekY + 20, canyonWidth * 0.6, creekH - 20);
        // Stone-lined banks
        this.palette.fill(this.palette.colors.terrain.earth.edge);
        quad(x, topY, x + canyonWidth * 0.18, topY + 24, x + canyonWidth * 0.12, bottomY, x, bottomY);
        quad(x + canyonWidth, topY, x + canyonWidth * 0.82, topY + 24, x + canyonWidth * 0.88, bottomY, x + canyonWidth, bottomY);
        // Mossy edges
        this.palette.fill(this.palette.colors.terrain.moss.primary);
        rect(x - 6, topY - 6, canyonWidth + 12, 6, 4);
        ellipse(x + canyonWidth * 0.12, topY - 4, 16, 8);
        ellipse(x + canyonWidth * 0.88, topY - 4, 16, 8);
        // River stones
        this.palette.fill(this.palette.colors.terrain.rock.primary);
        ellipse(x + canyonWidth * 0.25, creekY + 18, 14, 9);
        ellipse(x + canyonWidth * 0.55, creekY + 36, 18, 10);
        ellipse(x + canyonWidth * 0.78, creekY + 24, 12, 8);
        // Ripples
        this.palette.fill(this.palette.colors.terrain.water.ripple);
        ellipse(x + canyonWidth * 0.35, creekY + 10, 24, 6);
        ellipse(x + canyonWidth * 0.65, creekY + 22, 28, 7);
    }
    // Draws cloud
    drawCloud(params) {
        const { x, y, scale: scaleCoef = 1 } = params;
        push();
        noStroke();
        translate(x, y);
        scale(scaleCoef);
        this.palette.fill(this.palette.colors.shared.white);
        ellipse(0, 0, 50, 50);
        ellipse(80, 0, 50, 50);
        ellipse(60, -20, 40, 40);
        ellipse(30, -20, 60, 60);
        rect(0, -15, 80, 40); // Fill gaps between ellipses
        pop();
    }
    // Draws butterfly
    drawButterfly({ position, scale: scaleCoef = 1, kind = 0, direction = 1, phase = 0 }) {
        const c = this.palette.colors;
        const flap = sin(frameCount * 0.3 + phase) * 0.6 + 0.8;
        const bob = sin(frameCount * 0.08 + phase) * 3;
        const paletteByKind = kind === 1
            ? {
                body: c.butterfly.life.body,
                wingPrimary: c.butterfly.life.wing.primary,
                wingSecondary: c.butterfly.life.wing.secondary,
            }
            : {
                body: c.butterfly.time.body,
                wingPrimary: c.butterfly.time.wing.primary,
                wingSecondary: c.butterfly.time.wing.secondary,
            };
        push();
        translate(position.x, position.y + bob);
        scale(scaleCoef, scaleCoef);
        rotate((direction === 1 ? -PI : 0) + PI / 4);
        noStroke();
        // Body
        this.palette.fill(paletteByKind.body);
        rect(-3, -10, 6, 20, 3);
        ellipse(0, -12, 6, 6);
        // Antennae
        this.palette.stroke(paletteByKind.body);
        strokeWeight(1);
        line(-1, -14, -6, -22);
        line(1, -14, 6, -22);
        noStroke();
        // Wings (left)
        push();
        translate(-2, -4);
        scale(flap, 1);
        this.palette.fill(paletteByKind.wingPrimary);
        ellipse(-10, -6, 22, 16);
        this.palette.fill(paletteByKind.wingSecondary);
        ellipse(-12, 6, 18, 14);
        pop();
        // Wings (right)
        push();
        translate(2, -4);
        scale(flap, 1);
        this.palette.fill(paletteByKind.wingPrimary);
        ellipse(10, -6, 22, 16);
        this.palette.fill(paletteByKind.wingSecondary);
        ellipse(12, 6, 18, 14);
        pop();
        pop();
    }
    // Draws enemy
    drawEnemy(x, y = this.position.floor.y, direction = 1, inRange = false) {
        push();
        translate(x, y);
        if (direction < 0) {
            scale(-1, 1);
        }
        scale(0.6);
        // Define Palette
        const furDark = this.palette.color(this.palette.colors.enemy.fur.dark);
        const furMid = this.palette.color(this.palette.colors.enemy.fur.mid);
        const furLight = this.palette.color(this.palette.colors.enemy.fur.light);
        const snoutColor = this.palette.color(this.palette.colors.enemy.snout);
        const noseTip = this.palette.color(this.palette.colors.enemy.nose);
        let eyeColor = this.palette.color(this.palette.colors.enemy.eye.idle);
        // Change eye color if it's in character range
        if (inRange) {
            eyeColor = this.palette.color(this.palette.colors.enemy.eye.alert);
        }
        noStroke();
        // BACK LEG & BACK EAR
        fill(furDark);
        // Back hind leg
        beginShape();
        vertex(-30, -70); // Hip
        vertex(-50, -40); // Knee joint
        vertex(-40, -5); // Ankle
        vertex(-40, 0); // Paw back
        vertex(-15, 0); // Paw front
        vertex(-25, -8); // Paw front end
        vertex(-20, -40); // Inner thigh upwards
        endShape(CLOSE);
        // Back Ear
        triangle(45, -110, 65, -145, 75, -105);
        // TAIL
        fill(furMid);
        beginShape();
        vertex(-38, -85); // Tail root
        vertex(-78, -70); // Bushy mid-section top
        vertex(-108, -40); // Tail tip point
        vertex(-88, -20); // Tail tip bottom
        vertex(-48, -40); // Bushy mid-section bottom
        endShape(CLOSE);
        // BODY MAIN MASS
        fill(furMid);
        beginShape();
        vertex(-40, -85); // Rump
        vertex(20, -90); // Shoulders
        vertex(40, -60); // Chest front
        vertex(30, -30); // Chest bottom
        vertex(-10, -40); // Belly tuck
        vertex(-35, -50); // Flank
        endShape(CLOSE);
        // NECK RUFF
        fill(furLight);
        beginShape();
        vertex(20, -90);
        vertex(50, -110); // Back of neck
        vertex(60, -80);
        vertex(50, -60);
        vertex(35, -55);
        endShape(CLOSE);
        // FRONT LEG
        fill(furLight);
        beginShape();
        vertex(20, -70); // Shoulder joint
        vertex(25, -30); // Elbow
        vertex(15, 0); // Paw back
        vertex(35, 0); // Paw front
        vertex(40, -35); // Front of leg up
        vertex(35, -65); // Top front
        endShape(CLOSE);
        // HEAD
        // Main Cranium
        fill(furLight);
        beginShape();
        vertex(45, -110);
        vertex(75, -105);
        vertex(80, -85); // Jaw hinge
        vertex(55, -80); // Jawline back
        endShape(CLOSE);
        // Snout/Muzzle
        fill(snoutColor);
        beginShape();
        vertex(75, -105); // Bridge top
        vertex(110, -95); // Nose tip top
        vertex(105, -85); // Nose tip bottom
        vertex(80, -85); // Mouth corner
        endShape(CLOSE);
        // Nose Tip
        fill(noseTip);
        triangle(110, -95, 110, -90, 100, -97);
        // Front Ear (Closest ear)
        fill(furLight);
        triangle(50, -110, 65, -150, 75, -110);
        // Inner ear shadow
        fill(furMid);
        triangle(55, -112, 65, -140, 70, -112);
        // EYE (pulse smaller when in range)
        fill(eyeColor);
        push();
        translate(71, -97);
        scale(1.5, 1.5);
        beginShape();
        vertex(-6, -3);
        vertex(7, 0);
        vertex(-1, 3);
        endShape(CLOSE);
        pop();
        pop();
    }
    // Draws ground
    drawGround() {
        noStroke();
        const groundStartX = this.limit.gameMinXPos; // Starting x coord
        const topY = this.position.floor.y; // Starting y coord
        const w = abs(this.limit.gameMinXPos) + abs(this.limit.gameMaxXPos); // Calculate the full extention
        const groundEndX = groundStartX + w; // End of x coord
        // Base grass
        this.palette.fill(this.palette.colors.terrain.ground.base);
        rect(groundStartX, topY, w, height - topY);
        // Darker soil band near the surface
        this.palette.fill(this.palette.colors.terrain.foliage.edge);
        rect(groundStartX, topY, w, 14);
        // Lighter grass highlight
        this.palette.fill(this.palette.colors.terrain.foliage.highlightSoft);
        rect(groundStartX, topY + 20, w, 8);
        // Grass tufts
        this.palette.stroke(this.palette.colors.terrain.foliage.blade);
        strokeWeight(2);
        const grassTuftsIncrement = 30;
        for (let i = groundStartX; i <= groundEndX; i += grassTuftsIncrement) {
            const h = 6 + 4 * sin(i * 0.12);
            line(i, topY, i + 6, topY - h);
            line(i + 4, topY, i + 10, topY - h * 0.8);
        }
        noStroke();
        // Stones in the turf
        const stoneIncrement = 140;
        this.palette.fill(this.palette.colors.terrain.rock.mutedSoft);
        for (let i = groundStartX; i <= groundEndX; i += stoneIncrement) {
            const y = topY + 38 + 6 * sin(i * 0.08);
            ellipse(i + 20, y, 12, 7);
            ellipse(i + 55, y + 6, 9, 5);
        }
    }
    // Draws flagpole
    drawFlagpole(x) {
        // Layout constants for the pen and pole around the same world-space anchor
        const floorY = this.position.floor.y;
        const penX = x - 120;
        const penY = floorY - 68;
        const penW = 115;
        const penH = 68;
        const poleX = x;
        const poleTopY = floorY - 155;
        const poleW = 8;
        const flagW = 34;
        const flagH = 22;
        const flagStartY = floorY - flagH - 8;
        const flagTopY = poleTopY + 10;
        const flagLiftSpeed = 2.4;
        // Initialize flag position once, then animate upward after level completion
        if (typeof this.flagpole.y !== "number") {
            this.flagpole.y = flagStartY;
        }
        if (this.flagpole.isReached) {
            this.flagpole.y = max(flagTopY, this.flagpole.y - flagLiftSpeed);
        }
        else {
            this.flagpole.y = flagStartY;
        }
        push();
        noStroke();
        // Pen shadow
        this.palette.fill(this.palette.colors.shared.shadow.soft);
        rect(penX + 4, floorY - 6, penW + 22, 8, 3);
        // Pen interior patch
        this.palette.fill(this.palette.colors.terrain.foliage.highlightSoft);
        rect(penX + 6, penY + 8, penW - 12, penH - 10, 4);
        // Wooden posts and rails
        this.palette.fill(this.palette.colors.terrain.earth.base);
        const postW = 8;
        const railH = 6;
        for (let px = penX; px <= penX + penW; px += 18) {
            rect(px, penY, postW, penH, 2);
        }
        rect(penX - 3, penY + 16, penW + 14, railH, 2);
        rect(penX - 3, penY + 34, penW + 14, railH, 2);
        rect(penX - 3, penY + 52, penW + 14, railH, 2);
        this.palette.fill(this.palette.colors.terrain.flagpole.fence.shadow);
        rect(penX - 3, penY + 16, penW + 14, 2);
        rect(penX - 3, penY + 34, penW + 14, 2);
        rect(penX - 3, penY + 52, penW + 14, 2);
        // Pole body with highlight and base cap
        this.palette.fill(this.palette.colors.terrain.flagpole.pole.body);
        rect(poleX, poleTopY, poleW, floorY - poleTopY);
        this.palette.fill(this.palette.colors.terrain.flagpole.pole.highlight);
        rect(poleX + 1, poleTopY + 4, 2, floorY - poleTopY - 8);
        this.palette.fill(this.palette.colors.terrain.flagpole.pole.base);
        rect(poleX - 3, floorY - 6, poleW + 6, 6, 2);
        // Flag color changes when the level is completed
        this.palette.fill(this.flagpole.isReached ? this.palette.colors.terrain.flagpole.flag.completed : this.palette.colors.terrain.flagpole.flag.default);
        triangle(poleX + poleW, this.flagpole.y, poleX + poleW + flagW, this.flagpole.y + flagH / 2, poleX + poleW, this.flagpole.y + flagH);
        // Highlight for depth
        this.palette.fill(this.palette.colors.shared.highlight.soft);
        triangle(poleX + poleW + 3, this.flagpole.y + 3, poleX + poleW + 17, this.flagpole.y + flagH / 2, poleX + poleW + 3, this.flagpole.y + flagH - 3);
        pop();
    }
    // Draws platform
    drawPlatform({ x, y, w }) {
        const { height, grassHeight } = this.settings.platform;
        const soilY = y + grassHeight;
        const soilH = height - grassHeight;
        push();
        noStroke();
        // Top grass
        this.palette.fill(this.palette.colors.terrain.foliage.primary);
        rect(x, y, w, grassHeight, 4, 4, 2, 2);
        this.palette.fill(this.palette.colors.terrain.foliage.edge);
        rect(x, y + grassHeight - 2, w, 2);
        // Soil
        this.palette.fill(this.palette.colors.terrain.earth.base);
        rect(x, soilY, w, soilH, 2, 2, 4, 4);
        // Inner shadow for depth
        this.palette.fill(this.palette.colors.shared.shadow.soft);
        rect(x + 4, soilY + 4, max(0, w - 8), max(0, soilH - 7), 2);
        // Small stones
        this.palette.fill(this.palette.colors.terrain.rock.primary);
        ellipse(x + w * 0.2, soilY + soilH * 0.55, 7, 4);
        ellipse(x + w * 0.55, soilY + soilH * 0.7, 6, 4);
        ellipse(x + w * 0.82, soilY + soilH * 0.5, 8, 5);
        // Grass blades on top edge
        this.palette.stroke(this.palette.colors.terrain.foliage.blade);
        strokeWeight(1.5);
        for (let i = x + 6; i < x + w - 6; i += 18) {
            line(i, y + grassHeight - 1, i + 2, y + grassHeight - 4);
        }
        noStroke();
        pop();
    }
    // Draws gameover
    drawGameover() {
        const title = "GAME OVER";
        const hint = "Press ESC to restart";
        const panelW = 510;
        const panelH = 96;
        const panelX = width / 2 - panelW / 2;
        const panelY = height / 2 - panelH / 2;
        noStroke();
        this.palette.fill(this.palette.colors.ui.panel.gameover);
        rect(panelX, panelY, panelW, panelH, 10);
        this.palette.fill(this.palette.colors.ui.text.inverse);
        this.fonts.use("rimouski", 28);
        text(title, width / 2 - textWidth(title) / 2, panelY + 38);
        this.fonts.use("rimouski", 16);
        text(hint, width / 2 - textWidth(hint) / 2, panelY + 72);
    }
    // Draws level completed
    drawLevelCompleted() {
        const title = "LEVEL COMPLETED";
        const hint = "Press ESC to restart";
        const panelW = 510;
        const panelH = 96;
        const panelX = width / 2 - panelW / 2;
        const panelY = height / 2 - panelH / 2;
        noStroke();
        this.palette.fill(this.palette.colors.ui.panel.completed);
        rect(panelX, panelY, panelW, panelH, 10);
        this.palette.fill(this.palette.colors.ui.text.inverse);
        this.fonts.use("rimouski", 28);
        text(title, width / 2 - textWidth(title) / 2, panelY + 38);
        this.fonts.use("rimouski", 16);
        text(hint, width / 2 - textWidth(hint) / 2, panelY + 72);
    }
    // Draws timeout penalty text
    drawTimeoutPenaltyText() {
        if (this.timer.timeoutPenalty.frames <= 0 || !this.character.hasLives() || this.state.completed) {
            return;
        }
        const alpha = min(220, max(0, round((this.timer.timeoutPenalty.frames / this.timer.timeoutPenalty.durationFrames) * 220)));
        noStroke();
        const panelColor = this.palette.color(this.palette.colors.ui.panel.warning);
        panelColor.setAlpha(alpha);
        fill(panelColor);
        rect(width / 2 - 220, 95, 440, 54, 10);
        const textColor = this.palette.color(this.palette.colors.ui.text.inverse);
        textColor.setAlpha(alpha);
        fill(textColor);
        this.fonts.use("rimouski", 26);
        const t = "TIME OVER  -1 LIFE";
        text(t, width / 2 - textWidth(t) / 2, 132);
        this.timer.timeoutPenalty.frames--;
    }
    // Draws flagpole collectables hint text
    drawFlagpoleCollectablesHintText() {
        if (!this.flagpole.isCollectablesHintVisible || this.state.completed || this.state.gameover || !this.character.hasLives()) {
            return;
        }
        noStroke();
        this.palette.fill(this.palette.colors.ui.panel.hint);
        rect(width / 2 - 255, 150, 510, 42, 10);
        this.palette.fill(this.palette.colors.ui.text.inverse);
        this.fonts.use("rimouski", 20);
        const t = "Collect all the carrots before using the flagpole";
        text(t, width / 2 - textWidth(t) / 2, 178);
    }
    // Draws instructions text
    drawInstructionsText() {
        if (!this.character.hasLives())
            return;
        this.palette.fill(this.palette.colors.ui.text.primary);
        textSize(20);
        if (this.timer.enabled) {
            text(`You have only ${this.limit.timeS} seconds!`, width / 8, height / 4 - 20);
        }
        textSize(15);
        text("Use A or Left Arrow to go left", width / 8, height / 4 + 20);
        text("Use D or Right Arrow to go right", width / 8, height / 4 + 40);
        text("Use W or Up Arrow to jump", width / 8, height / 4 + 60);
        text("Use Space Bar to boost", width / 8, height / 4 + 80);
    }
    // Draws lives text
    drawLivesText() {
        this.fonts.use("rimouski");
        if (this.character.hasLives()) {
            this.palette.fill(this.palette.colors.ui.text.primary);
        }
        else {
            this.palette.fill(this.palette.colors.ui.text.danger);
        }
        textSize(20);
        text("Lives:", 30, 75);
        for (let i = 0; i < this.character.lives; i++) {
            this.drawLife({ x: 102 + 24 * i, y: 68, w: 16 });
        }
    }
    // Draws score text
    drawScoreText() {
        this.fonts.use("rimouski");
        textSize(20);
        const t = `Score: ${this.score * 10}/${this.elements.collectables * 10}`;
        const hasAllCollectables = this.collectables.length > 0 && this.collectables.every((collectable) => collectable.isFound);
        if (this.state.completed || hasAllCollectables) {
            const x = 30;
            const y = 50;
            const px = 14;
            const py = 10;
            const h = 34;
            noStroke();
            this.palette.fill(this.palette.colors.ui.panel.statusSuccess);
            rect(x - px, y - h + py, textWidth(t) + px * 2, h, 10);
            this.palette.fill(this.palette.colors.ui.text.inverse);
            text(t, x, y);
            return;
        }
        // Change color on game over
        if (this.character.hasLives()) {
            this.palette.fill(this.palette.colors.ui.text.primary);
        }
        else {
            this.palette.fill(this.palette.colors.ui.text.danger);
        }
        text(t, 30, 50);
    }
    // Draws time text
    drawTimeText() {
        this.fonts.use("rimouski");
        textSize(20);
        const isTimerEnabled = this.timer.enabled;
        const timeLeftS = this.getTimeLeftS();
        const ratioLeft = isTimerEnabled && this.timer.maxS > 0 ? timeLeftS / this.timer.maxS : 1;
        const t = isTimerEnabled ? `Time left: ${timeLeftS}s` : "Time: OFF";
        const x = 860;
        const y = 50;
        const px = 14;
        const py = 10;
        const h = 34;
        const showTimeBonusFlash = this.timer.bonusFlash.frames > 0 && !this.state.completed && !this.state.gameover && this.character.hasLives();
        if (this.state.completed) {
            noStroke();
            this.palette.fill(this.palette.colors.ui.panel.statusSuccess);
            rect(x - px, y - h + py, textWidth(t) + px * 2, h, 10);
            this.palette.fill(this.palette.colors.ui.text.inverse);
            text(t, x, y);
            return;
        }
        if (showTimeBonusFlash) {
            const alpha = round((this.timer.bonusFlash.frames / this.timer.bonusFlash.durationFrames) * 220);
            noStroke();
            const bonusColor = this.palette.color(this.palette.colors.ui.panel.statusSuccess);
            bonusColor.setAlpha(alpha);
            fill(bonusColor);
            rect(x - px, y - h + py, textWidth(t) + px * 2, h, 10);
            this.palette.fill(this.palette.colors.ui.text.inverse);
            this.timer.bonusFlash.frames--;
        }
        else if (isTimerEnabled && ratioLeft <= 0.25) {
            this.palette.fill(this.palette.colors.ui.text.danger);
        }
        else if (isTimerEnabled && ratioLeft <= 0.5) {
            this.palette.fill(this.palette.colors.ui.text.warning);
        }
        else if (this.character.hasLives()) {
            this.palette.fill(this.palette.colors.ui.text.primary);
        }
        else {
            this.palette.fill(this.palette.colors.ui.text.danger);
        }
        text(t, x, y);
    }
    // Draws best-time text
    drawBestTimeText() {
        const isBestTimeEnabled = this.gameSettings.bestTime.enabled;
        const bestTimeS = this.state.bestTimeS;
        if (!isBestTimeEnabled || bestTimeS <= 0) {
            return;
        }
        this.fonts.use("rimouski");
        textSize(20);
        const t = `Best Time: ${bestTimeS}s`;
        const x = 860;
        const y = 82;
        const px = 14;
        const py = 10;
        const h = 34;
        if (this.state.completed) {
            noStroke();
            this.palette.fill(this.palette.colors.ui.panel.statusSuccess);
            rect(x - px, y - h + py, textWidth(t) + px * 2, h, 10);
            this.palette.fill(this.palette.colors.ui.text.inverse);
            text(t, x, y);
            return;
        }
        if (this.state.gameover || !this.character.hasLives()) {
            this.palette.fill(this.palette.colors.ui.text.danger);
        }
        else {
            this.palette.fill(this.palette.colors.ui.text.primary);
        }
        text(t, x, y);
    }
    // Renders and wraps clouds
    renderClouds() {
        // Get min and max x value of the current in-view
        const cameraLeft = this.position.cameraX;
        const cameraRight = cameraLeft + width;
        for (const cloud of Object.values(this.clouds)) {
            cloud.x += cloud.animationSpeed;
            const leftEdge = cloud.x - 25 * cloud.scale;
            const rightEdge = cloud.x + 105 * cloud.scale;
            // Wrap only after the cloud has moved out of the current view as well
            if (leftEdge > this.limit.gameMaxXPos && leftEdge > cameraRight) {
                let spawnX = this.limit.gameMinXPos - 105 * cloud.scale;
                const spawnLeft = spawnX - 25 * cloud.scale;
                const spawnRight = spawnX + 105 * cloud.scale;
                const spawnOverlapsView = spawnLeft <= cameraRight && cameraLeft <= spawnRight;
                // If default spawn would be visible, force spawn just outside the left side of current view
                if (spawnOverlapsView) {
                    spawnX = cameraLeft - 105 * cloud.scale - 20;
                }
                cloud.x = spawnX;
            }
            else if (rightEdge < this.limit.gameMinXPos && rightEdge < cameraLeft) {
                // Symmetric fallback for left-moving clouds
                cloud.x = cameraRight + 25 * cloud.scale + 20;
            }
            this.drawCloud(cloud);
        }
    }
    // Renders mountains
    renderMountains() {
        // Get factor for parallax fx
        const factor = this.#getParallaxFactor("mountains", 1);
        push();
        translate(this.position.cameraX * (1 - factor), 0);
        for (const mountain of Object.values(this.mountains)) {
            this.drawMountain(mountain);
        }
        pop();
    }
    // Renders trees
    renderTrees() {
        // Get factor for parallax fx
        const factor = this.#getParallaxFactor("trees", 1);
        push();
        translate(this.position.cameraX * (1 - factor), 0);
        for (const tree of Object.values(this.trees)) {
            this.drawTree(tree);
        }
        pop();
    }
    // Renders collectables
    renderCollectables() {
        for (const collectable of Object.values(this.collectables)) {
            if (!collectable.isFound) {
                this.drawCollectable(collectable);
            }
        }
    }
    // Renders canyons
    renderCanyons() {
        for (const canyon of this.canyons) {
            this.drawCanyon(canyon);
        }
    }
    // Renders platforms
    renderPlatforms() {
        for (const platform of this.platforms) {
            this.drawPlatform(platform);
        }
    }
    // Renders butterflies
    renderButterflies() {
        for (const butterfly of this.butterflies) {
            if (butterfly.isConsumed) {
                continue;
            }
            this.#updateButterflyMotion(butterfly);
            this.drawButterfly(butterfly);
        }
    }
    // Updates one butterfly drift motion
    #updateButterflyMotion(butterfly) {
        // Small oscillating drift so butterflies don't move in straight lines
        const drift = createVector(sin(frameCount * 0.02 + butterfly.phase) * 0.03, cos(frameCount * 0.03 + butterfly.phase) * 0.02);
        butterfly.velocity.add(drift);
        // Pull back toward anchor when the butterfly exits its radius
        const toAnchor = createVector(butterfly.anchor.x - butterfly.position.x, butterfly.anchor.y - butterfly.position.y);
        if (toAnchor.mag() > butterfly.range) {
            toAnchor.setMag(0.12);
            butterfly.velocity.add(toAnchor);
        }
        // Clamp speed and apply movement
        butterfly.velocity.limit(butterfly.maxSpeed);
        butterfly.position.add(butterfly.velocity);
        // Keep wing orientation aligned with horizontal movement
        if (abs(butterfly.velocity.x) > 0.02) {
            butterfly.direction = butterfly.velocity.x >= 0 ? 1 : -1;
        }
    }
    // Renders enemies
    renderEnemies() {
        const characterX = this.character.position.x;
        const characterY = this.character.position.y;
        const floorY = this.position.floor.y;
        for (const enemy of this.enemies) {
            enemy.update({
                characterX,
                characterY,
                floorY,
                behavior: this.settings.enemy,
            });
            this.drawEnemy(enemy.x, floorY, enemy.direction, enemy.inRange);
        }
        if (this.enemies.some((enemy) => enemy.inRange)) {
            this.character.setState("isScared", true);
        }
        else if (this.character.getState("isScared")) {
            this.character.setState("isScared", false);
        }
    }
    // Handle collectables contact logic
    checkCollectables() {
        for (const collectable of this.collectables) {
            if (!collectable.isFound &&
                dist(collectable.x, collectable.y, this.character.position.x, this.character.position.y) < this.settings.collectable.distContact) {
                this.sounds.play("collectable");
                collectable.isFound = true;
                this.score++;
            }
        }
    }
    // Handle canyons logic "contact" logic
    checkCanyons(fnOnContact) {
        if (!this.character.hasLives() || this.state.gameover || this.flagpole.isReached) {
            if (this.character.getState("isPlummeting")) {
                this.character.setState("isPlummeting", false);
            }
            return;
        }
        for (const canyon of this.canyons) {
            if (!this.character.getState("isPlummeting") &&
                this.character.position.x - this.character.settings.characterWidth / 2 >= canyon.x &&
                this.character.position.x + this.character.settings.characterWidth / 2 <= canyon.x + canyon.w &&
                this.character.position.y >= this.position.floor.y) {
                this.sounds.play("falling");
                this.character.setState("isPlummeting", true);
                this.character.setState("isFalling", true);
                this.character.setState("isJumping", false);
            }
        }
        // Sets the character height as a limit for gamerChar_y in order to hide the character and prevent infinite incremental
        if (this.character.getState("isPlummeting")) {
            this.character.position.y = min(this.limit.plummet, this.character.position.y + this.character.velocity.plummet);
        }
        if (typeof fnOnContact === "function") {
            fnOnContact();
        }
    }
    // Handle flagpole contact logic
    checkFlagpole() {
        const hasAllCollectables = this.collectables.every((collectable) => collectable.isFound);
        const area = this.settings.flagpole.area;
        // Build a rectangular trigger area around the flagpole so completion does not require an exact x match
        const flagpoleArea = {
            minX: this.flagpole.x + area.minOffsetX,
            maxX: this.flagpole.x + area.maxOffsetX,
            minY: this.position.floor.y + area.minOffsetY,
            maxY: this.position.floor.y + area.maxOffsetY,
        };
        const characterHalfW = this.character.settings.characterWidth / 2;
        const isInFlagpoleAreaX = this.character.position.x + characterHalfW >= flagpoleArea.minX && this.character.position.x - characterHalfW <= flagpoleArea.maxX;
        const isInFlagpoleAreaY = this.character.position.y >= flagpoleArea.minY && this.character.position.y <= flagpoleArea.maxY;
        const isInFlagpoleArea = isInFlagpoleAreaX && isInFlagpoleAreaY;
        this.flagpole.isCollectablesHintVisible =
            isInFlagpoleArea && !hasAllCollectables && !this.flagpole.isReached && this.character.hasLives() && !this.state.gameover;
        // Completion is gated in this order: all collectables -> timer not expired -> character inside flag area
        if (!hasAllCollectables)
            return;
        const timeLeftS = this.getTimeLeftS();
        if (this.timer.enabled && timeLeftS <= 0)
            return;
        if (!isInFlagpoleArea)
            return;
        if (!this.flagpole.isReached) {
            this.#updateBestTimeFromCompletion();
            this.flagpole.isReached = true;
            this.state.completed = true;
            this.state.gameover = false;
            this.flagpole.isCollectablesHintVisible = false;
            this.sounds.stop("gameMusic");
            this.sounds.play("levelCompleted");
        }
    }
    // Updates bestTimeS from completion duration
    #updateBestTimeFromCompletion() {
        const startedAtMs = this.timer.startedAtMs;
        if (startedAtMs <= 0) {
            return;
        }
        const elapsedMs = max(0, millis() - startedAtMs);
        const completionTimeS = max(1, ceil(elapsedMs / 1000));
        const previous = this.state.bestTimeS;
        if (previous <= 0 || completionTimeS < previous) {
            this.state.bestTimeS = completionTimeS;
        }
    }
    // Handle enemies contact
    checkEnemies(fnOnContact) {
        if (!this.character.hasLives() || this.state.gameover || this.flagpole.isReached) {
            if (this.character.getState("isScared")) {
                this.character.setState("isScared", false);
            }
            return;
        }
        const characterX = this.character.position.x;
        const characterY = this.character.position.y;
        const floorY = this.position.floor.y;
        const distContact = this.settings.enemy.distContact;
        for (const enemy of this.enemies) {
            if (enemy.isTouching(characterX, characterY, floorY, distContact)) {
                this.sounds.play("wolf");
                if (typeof fnOnContact === "function") {
                    fnOnContact();
                }
                // Apply only one hit per frame/run cycle and avoid multi-life loss loops.
                break;
            }
        }
    }
    // Handle platforms contact
    checkPlatforms() {
        let activePlatformY = undefined;
        let lostAnyContact = false;
        const state = {
            isFalling: this.character.getState("isFalling"),
            isJumping: this.character.getState("isJumping"),
        };
        for (const platform of this.platforms) {
            const { hasContact, lostContact } = platform.updateContact(this.character.position.x, this.character.position.y, state);
            if (hasContact) {
                // Keep the latest contacted platform as active floor for this frame
                activePlatformY = platform.y;
            }
            else if (lostContact) {
                lostAnyContact = true;
            }
        }
        this.position.floor.platformY = activePlatformY;
        // Trigger falling only when contact was lost while not actively jumping
        if (activePlatformY === undefined && lostAnyContact && !state.isJumping) {
            this.character.setState("isFalling", true);
        }
    }
    // handle butterflies contact
    checkButterflies() {
        for (const butterfly of this.butterflies) {
            if (butterfly.isConsumed) {
                continue;
            }
            const butterflyPosition = butterfly.position;
            if (!butterflyPosition) {
                continue;
            }
            const isInContact = dist(butterflyPosition.x, butterflyPosition.y, this.character.position.x, this.character.position.y) <
                this.settings.butterfly.distContact;
            if (!isInContact) {
                continue;
            }
            if (butterfly.kind === 0) {
                if (this.timer.enabled && !this.timer.isExpired) {
                    const previousLeftS = this.timer.leftS;
                    const bonusS = max(0, this.settings.butterfly.extraTimeS);
                    // Bonus time extends the current allowance, so it can exceed the initial timer value
                    this.timer.maxS += bonusS;
                    this.timer.leftS += bonusS;
                    if (this.timer.leftS > previousLeftS) {
                        this.timer.bonusFlash.frames = this.timer.bonusFlash.durationFrames;
                    }
                    this.#syncGameMusicRate();
                }
            }
            else {
                this.character.lives++;
            }
            butterfly.isConsumed = true;
            this.sounds.play("butterfly");
        }
    }
    // Builds walkable ground ranges (world range minus blocked ranges)
    #getWalkableRanges(extraBlockedRanges = []) {
        const worldRange = {
            min: this.limit.gameMinXPos,
            max: this.limit.gameMaxXPos,
        };
        const blockedRanges = [...this.canyons.map((canyon) => ({ min: canyon.x, max: canyon.x + canyon.w })), ...extraBlockedRanges];
        return Utility.subtractRanges(worldRange, blockedRanges);
    }
    // Generates cloud elements
    #createClouds() {
        this.clouds = this.#generateElements({
            total: this.elements.clouds,
            minScale: 0.7,
            maxScale: 1.1,
            getWidth: (scale) => 130 * scale,
            decorate: (base, i) => ({
                ...base,
                y: random(80, 140),
                animationSpeed: random(0.2, 0.6),
                phase: i * 0.7,
            }),
        });
    }
    // Generates mountain elements
    #createMountains() {
        this.mountains = this.#generateElements({
            total: this.elements?.mountains,
            minScale: 0.7,
            maxScale: 1.1,
            minGap: 60,
            getWidth: (scale) => this.settings.mountain.width * scale,
            avoidRanges: this.forbiddenRanges,
            allowFallbackPlacement: false,
        });
    }
    // Generates tree elements
    #createTrees() {
        this.trees = this.#generateElements({
            total: this.elements.trees,
            minScale: 0.7,
            maxScale: 1,
            minGap: 20,
            getWidth: (scale) => 110 * scale,
        });
    }
    // Generates collectable elements
    #createCollectables() {
        const spawn = this.settings.collectable.spawn;
        const minX = this.limit.gameMinXPos + spawn.edgeBuffer;
        const maxX = this.flagpole.x - spawn.flagpoleBuffer;
        if (maxX <= minX) {
            this.collectables = [];
            return;
        }
        this.collectables = this.#generateElements({
            total: this.elements.collectables,
            minScale: 20,
            maxScale: 40,
            minGap: 100,
            minX,
            maxX,
            avoidRanges: [...this.forbiddenRanges, ...this.canyonRanges],
            decorate: (base) => ({ ...base, y: this.position.floor.y - Utility.randomToFloor(30, 90) }),
        });
    }
    // Generates canyon elements
    #createCanyons() {
        const protectedRanges = [
            {
                min: this.character.position.x - this.settings.canyon.spawnBuffer,
                max: this.character.position.x + this.settings.canyon.spawnBuffer,
            },
            {
                min: this.flagpole.x - this.settings.canyon.flagpoleBuffer,
                max: this.flagpole.x + this.settings.canyon.flagpoleBuffer,
            },
        ];
        const canyonList = this.#generateElements({
            total: this.elements.canyons,
            minGap: this.settings.canyon.minGap,
            minX: this.limit.gameMinXPos,
            maxX: this.limit.gameMaxXPos,
            avoidRanges: protectedRanges,
            allowFallbackPlacement: false,
            getWidth: () => Utility.randomToFloor(this.settings.canyon.minWidth, this.settings.canyon.maxWidth),
            decorate: (base) => ({
                x: base.x,
                w: base.w,
            }),
        });
        canyonList.sort((left, right) => left.x - right.x);
        this.canyons = canyonList;
    }
    // Creates one platform object
    factoryPlatform({ x, y, w, isContact = false, level = 1 }) {
        return new Platform({ x, y, w, isContact, level });
    }
    // Generates a platform level from parent platforms
    #createDependentPlatformLevel({ parents = [], total = 0, level = 1, widthMin = 120, widthMax = 180, minGap = 80, blockedRanges = [] }) {
        const generation = this.settings.platform.generation;
        const offsetY = generation.offsetY;
        if (!Array.isArray(parents) || parents.length === 0 || total <= 0) {
            return [];
        }
        const slackX = generation.dependency?.slackX;
        const placementRanges = Utility.normalizeRanges(parents.map((parent) => ({
            min: parent.x - slackX,
            max: parent.x + parent.w + slackX,
        })));
        if (placementRanges.length === 0) {
            return [];
        }
        const bases = this.#generateElements({
            total,
            minGap,
            placementRanges,
            avoidRanges: blockedRanges,
            allowFallbackPlacement: false,
            getWidth: () => Utility.randomToFloor(widthMin, widthMax),
        });
        const platforms = [];
        for (const base of bases) {
            const centerX = base.x + base.w / 2;
            let selectedParent = undefined;
            let closestDistance = Number.POSITIVE_INFINITY;
            // Lock each child platform to the nearest parent platform so layers remain jump-reachable
            for (const parent of parents) {
                const parentCenterX = parent.x + parent.w / 2;
                const distance = abs(parentCenterX - centerX);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    selectedParent = parent;
                }
            }
            if (!selectedParent) {
                continue;
            }
            // Raise the child by a random vertical gap, clamped by minTopY
            const deltaY = Utility.randomToFloor(offsetY.min, offsetY.max);
            const y = max(generation.minTopY, selectedParent.y - deltaY);
            platforms.push(this.factoryPlatform({
                x: base.x,
                y,
                w: base.w,
                level,
            }));
        }
        return platforms;
    }
    // Generates all platform levels
    #createPlatforms() {
        const generation = this.settings.platform.generation;
        const levels = generation.levels;
        const spacing = generation.spacing;
        const offsetY = generation.offsetY;
        const protectedBuffer = max(this.settings.generalBuffer, generation.protectedBuffer);
        const protectedRanges = [
            {
                min: this.character.position.x - protectedBuffer,
                max: this.character.position.x + protectedBuffer,
            },
            {
                min: this.flagpole.x - protectedBuffer,
                max: this.flagpole.x + protectedBuffer,
            },
        ];
        const platformCounts = this.elements.platforms;
        const requestedTotal = platformCounts.levelOne + platformCounts.levelTwo + platformCounts.levelThree;
        const blockedRanges = [...this.forbiddenRanges, ...this.canyonRanges, ...protectedRanges];
        const worldMinX = this.limit.gameMinXPos + spacing.edgeBuffer;
        const worldMaxX = this.limit.gameMaxXPos - spacing.edgeBuffer;
        const levelOneBases = this.#generateElements({
            total: platformCounts.levelOne,
            minGap: spacing.minGapPerLevel + levels.one.gapOffset,
            minX: worldMinX,
            maxX: worldMaxX,
            avoidRanges: blockedRanges,
            allowFallbackPlacement: false,
            getWidth: () => Utility.randomToFloor(levels.one.width?.min, levels.one.width?.max),
        });
        const levelOne = levelOneBases.map((base) => this.factoryPlatform({
            x: base.x,
            y: max(generation.minTopY, this.position.floor.y - Utility.randomToFloor(offsetY.min, offsetY.max)),
            w: base.w,
            level: 1,
        }));
        const levelTwo = this.#createDependentPlatformLevel({
            parents: levelOne,
            total: platformCounts.levelTwo,
            level: 2,
            widthMin: levels.two.width?.min,
            widthMax: levels.two.width?.max,
            minGap: max(0, spacing.minGapPerLevel + levels.two.gapOffset),
            blockedRanges,
        });
        const levelThree = this.#createDependentPlatformLevel({
            parents: levelTwo,
            total: platformCounts.levelThree,
            level: 3,
            widthMin: levels.three.width?.min,
            widthMax: levels.three.width?.max,
            minGap: max(0, spacing.minGapPerLevel + levels.three.gapOffset),
            blockedRanges,
        });
        let ensuredLevelTwo = [...levelTwo];
        if (platformCounts.levelTwo > 0 && !ensuredLevelTwo.length && levelOne.length > 0) {
            const parent = levelOne[0];
            const w = Utility.randomToFloor(levels.two.width?.min, levels.two.width?.max);
            const x = min(max(parent.x + 25, this.limit.gameMinXPos + 90), this.limit.gameMaxXPos - w - 90);
            const y = max(generation.minTopY, parent.y - Utility.randomToFloor(offsetY.min, offsetY.max));
            ensuredLevelTwo = [this.factoryPlatform({ x, y, w, level: 2 })];
        }
        let ensuredLevelThree = [...levelThree];
        if (platformCounts.levelThree > 0 && !ensuredLevelThree.length && ensuredLevelTwo.length > 0) {
            const parent = ensuredLevelTwo[0];
            const w = Utility.randomToFloor(levels.three.width?.min, levels.three.width?.max);
            const x = min(max(parent.x + 20, this.limit.gameMinXPos + 90), this.limit.gameMaxXPos - w - 90);
            const y = max(generation.minTopY, parent.y - Utility.randomToFloor(offsetY.min, offsetY.max));
            ensuredLevelThree = [this.factoryPlatform({ x, y, w, level: 3 })];
        }
        this.platforms = [...levelOne, ...ensuredLevelTwo, ...ensuredLevelThree];
        if (requestedTotal > 0 && !this.platforms.length) {
            const minFallbackX = max(this.character.position.x + protectedBuffer + 40, this.limit.gameMinXPos + spacing.edgeBuffer);
            const maxFallbackX = min(this.flagpole.x - protectedBuffer - 280, this.limit.gameMaxXPos - 280);
            const baseX = min(max(minFallbackX, this.limit.gameMinXPos + 140), max(maxFallbackX, this.limit.gameMinXPos + 140));
            const y1 = this.position.floor.y - Utility.randomToFloor(offsetY.min, offsetY.max);
            const y2 = max(generation.minTopY, y1 - Utility.randomToFloor(offsetY.min, offsetY.max));
            const y3 = max(generation.minTopY, y2 - Utility.randomToFloor(offsetY.min, offsetY.max));
            const fallback = [];
            if (platformCounts.levelOne > 0) {
                fallback.push(this.factoryPlatform({
                    x: baseX + levels.one.fallback?.xOffset,
                    y: y1,
                    w: levels.one.fallback?.width,
                    level: 1,
                }));
            }
            if (platformCounts.levelTwo > 0) {
                fallback.push(this.factoryPlatform({
                    x: baseX + levels.two.fallback?.xOffset,
                    y: y2,
                    w: levels.two.fallback?.width,
                    level: 2,
                }));
            }
            if (platformCounts.levelThree > 0) {
                fallback.push(this.factoryPlatform({
                    x: baseX + levels.three.fallback?.xOffset,
                    y: y3,
                    w: levels.three.fallback?.width,
                    level: 3,
                }));
            }
            this.platforms = fallback;
        }
        this.#ensurePlatformsForButterflies();
    }
    // Creates one emergency platform used to guarantee butterfly spawn capacity
    #createEmergencyPlatform({ level = 1, avoidRanges = [] }) {
        const generation = this.settings.platform.generation;
        const levels = generation.levels;
        const spacing = generation.spacing;
        const offsetY = generation.offsetY;
        const levelKey = level === 3 ? "three" : level === 2 ? "two" : "one";
        const defaultWidthByLevel = {
            1: { min: 170, max: 240 },
            2: { min: 145, max: 210 },
            3: { min: 130, max: 185 },
        };
        const widthConfig = levels[levelKey]?.width;
        const widthMin = widthConfig?.min ?? defaultWidthByLevel[level].min;
        const widthMax = widthConfig?.max ?? defaultWidthByLevel[level].max;
        const widthStart = min(widthMin, widthMax);
        const widthEnd = max(widthMin, widthMax);
        const width = widthEnd > widthStart ? Utility.randomToFloor(widthStart, widthEnd) : widthStart;
        const minX = this.limit.gameMinXPos + spacing.edgeBuffer;
        const maxX = this.limit.gameMaxXPos - spacing.edgeBuffer;
        if (maxX <= minX || maxX - minX < width) {
            return undefined;
        }
        const base = this.#generateElements({
            total: 1,
            minX,
            maxX,
            minGap: max(0, spacing.minGapPerLevel),
            avoidRanges,
            getWidth: () => width,
        })[0];
        const fallbackCenterX = (this.character.position.x + this.flagpole.x) / 2;
        const fallbackX = min(max(round(fallbackCenterX - width / 2), minX), maxX - width);
        const x = base?.x ?? fallbackX;
        const w = base?.w ?? width;
        const levelStep = level === 3 ? 3 : level === 2 ? 2 : 1;
        const yOffset = Utility.randomToFloor(offsetY.min, offsetY.max) * levelStep;
        const y = max(generation.minTopY, this.position.floor.y - yOffset);
        return this.factoryPlatform({ x, y, w, level });
    }
    // Guarantees the minimum number/type of platforms needed to spawn all butterflies
    #ensurePlatformsForButterflies() {
        const requiredTotal = max(0, floor(this.elements.butterflies));
        if (requiredTotal <= 0) {
            return;
        }
        const requiredLifePlatforms = requiredTotal > 1 ? 1 : 0;
        const generation = this.settings.platform.generation;
        const protectedBuffer = max(this.settings.generalBuffer, generation.protectedBuffer);
        const platformPadding = max(24, floor(generation.spacing.minGapPerLevel / 2));
        const baseAvoidRanges = [
            ...this.forbiddenRanges,
            ...this.canyonRanges,
            {
                min: this.character.position.x - protectedBuffer,
                max: this.character.position.x + protectedBuffer,
            },
            {
                min: this.flagpole.x - protectedBuffer,
                max: this.flagpole.x + protectedBuffer,
            },
        ];
        const avoidRanges = () => [
            ...baseAvoidRanges,
            ...this.platforms.map((platform) => ({
                min: platform.x - platformPadding,
                max: platform.x + platform.w + platformPadding,
            })),
        ];
        let guard = 0;
        while (this.platforms.filter((platform) => platform.level === 3).length < requiredLifePlatforms && guard < 8) {
            const emergencyPlatform = this.#createEmergencyPlatform({
                level: 3,
                avoidRanges: avoidRanges(),
            });
            if (!emergencyPlatform) {
                break;
            }
            this.platforms.push(emergencyPlatform);
            guard++;
        }
        guard = 0;
        while (this.platforms.length < requiredTotal && guard < requiredTotal * 3) {
            const emergencyPlatform = this.#createEmergencyPlatform({
                level: this.platforms.length % 3 === 0 ? 2 : 1,
                avoidRanges: avoidRanges(),
            });
            if (!emergencyPlatform) {
                break;
            }
            this.platforms.push(emergencyPlatform);
            guard++;
        }
    }
    // Generates enemy patrol zones and enemies
    #createEnemies() {
        const spawn = this.settings.enemy.spawn;
        const startBuffer = max(max(this.settings.generalBuffer, spawn.startBuffer), this.settings.enemy.distRange + spawn.edgePadding);
        const flagpoleBuffer = max(this.settings.generalBuffer, spawn.flagpoleBuffer);
        const protectedRanges = [
            {
                min: this.character.position.x - startBuffer,
                max: this.character.position.x + startBuffer,
            },
            {
                min: this.flagpole.x - flagpoleBuffer,
                max: this.flagpole.x + flagpoleBuffer,
            },
        ];
        // Enemies can patrol only on ground segments not occupied by canyons or forbidden zones (character starting point, flagpole)
        const walkableRanges = this.#getWalkableRanges([...this.forbiddenRanges, ...protectedRanges]).filter((range) => range.max - range.min >= spawn.minSegmentWidth);
        if (walkableRanges.length === 0) {
            this.enemies = [];
            return;
        }
        const enemyBases = this.#generateElements({
            total: this.elements.enemies,
            minGap: spawn.spacing,
            placementRanges: walkableRanges,
            allowFallbackPlacement: false,
            getWidth: () => spawn.occupancyWidth,
        });
        this.enemies = enemyBases
            .map((base) => {
            const x = base.x + base.w / 2;
            // Keep each enemy in one concrete walkable segment to avoid crossing canyon gaps
            const segment = Utility.findRangeForPoint(walkableRanges, x);
            if (!segment) {
                return null;
            }
            const segmentMin = segment.min + spawn.edgePadding;
            const segmentMax = segment.max - spawn.edgePadding;
            if (segmentMax - segmentMin < spawn.minPatrol) {
                return null;
            }
            const clampedX = min(max(x, segmentMin), segmentMax);
            const patrolRange = min(segmentMax - segmentMin, Utility.randomToFloor(spawn.minPatrol, spawn.maxPatrol));
            const halfPatrol = patrolRange / 2;
            let minX = max(segmentMin, clampedX - halfPatrol);
            let maxX = min(segmentMax, clampedX + halfPatrol);
            if (maxX - minX < spawn.minPatrol) {
                const center = (minX + maxX) / 2;
                minX = max(segmentMin, center - spawn.minPatrol / 2);
                maxX = min(segmentMax, center + spawn.minPatrol / 2);
            }
            if (maxX <= minX) {
                return null;
            }
            return new Enemy({
                x: clampedX,
                minX,
                maxX,
                direction: random() < 0.5 ? -1 : 1,
                inRange: false,
            });
        })
            .filter((enemy) => enemy !== null);
    }
    // Generates butterflies from platforms
    #createButterflies() {
        this.butterflies = [];
        const total = max(0, this.elements.butterflies);
        if (total <= 0 || this.platforms.length === 0) {
            return;
        }
        // Time butterflies (kind 0) can use any level; life butterflies (kind 1) are level 3 only
        const lifeTarget = total > 1 ? 1 : 0;
        const timeTarget = total - lifeTarget;
        const allCandidates = [...this.platforms];
        const lifeCandidates = [...this.platforms.filter((platform) => platform.level === 3)];
        // Fallback list for life butterflies if level 3 platforms are unavailable.
        const lifeFallbackCandidates = [...allCandidates].sort((left, right) => right.level - left.level);
        const spawnConfig = this.settings.butterfly.spawn;
        const createButterflyOnPlatform = (platform, kind, phaseIndex) => {
            const margin = min(spawnConfig.marginX, platform.w / 3);
            const minX = platform.x + margin;
            const maxX = platform.x + platform.w - margin;
            if (maxX <= minX) {
                return false;
            }
            const x = random(minX, maxX);
            const y = platform.y - spawnConfig.heightAbovePlatform + random(-5, 5);
            const velocity = createVector(random(-1, 1), random(-1, 1));
            if (velocity.magSq() === 0) {
                velocity.set(1, 0);
            }
            velocity.normalize().mult(random(0.25, 0.65));
            this.butterflies.push({
                position: createVector(x, y),
                anchor: createVector(x, y),
                velocity,
                maxSpeed: random(0.65, 1.2),
                range: random(35, 80),
                scale: random(0.4, 0.55),
                kind,
                direction: velocity.x >= 0 ? 1 : -1,
                phase: phaseIndex * 0.7,
                isConsumed: false,
            });
            return true;
        };
        const removeFromPool = (pool, item) => {
            const index = pool.indexOf(item);
            if (index >= 0) {
                pool.splice(index, 1);
            }
        };
        const pickRandom = (pool) => {
            if (!Array.isArray(pool) || !pool.length) {
                return undefined;
            }
            return pool[floor(random(0, pool.length))];
        };
        const createButterflyGuaranteed = ({ kind, phaseIndex, preferredPool = [], fallbackPool = [] }) => {
            const attempts = max(1, (preferredPool.length + fallbackPool.length) * 3);
            for (let attempt = 0; attempt < attempts; attempt++) {
                const platform = pickRandom(preferredPool) ?? pickRandom(fallbackPool);
                if (!platform) {
                    break;
                }
                if (!createButterflyOnPlatform(platform, kind, phaseIndex)) {
                    // Remove invalid choices to avoid retrying the same impossible platform endlessly.
                    removeFromPool(preferredPool, platform);
                    continue;
                }
                removeFromPool(preferredPool, platform);
                removeFromPool(availablePlatforms, platform);
                return true;
            }
            return false;
        };
        let phaseIndex = 0;
        const availablePlatforms = [...allCandidates];
        for (let i = 0; i < lifeTarget; i++) {
            if (!createButterflyGuaranteed({
                kind: 1,
                phaseIndex,
                preferredPool: lifeCandidates,
                fallbackPool: lifeFallbackCandidates,
            })) {
                this.butterflies = [];
                return;
            }
            phaseIndex++;
        }
        for (let i = 0; i < timeTarget; i++) {
            if (!createButterflyGuaranteed({
                kind: 0,
                phaseIndex,
                preferredPool: availablePlatforms,
                fallbackPool: allCandidates,
            })) {
                this.butterflies = [];
                return;
            }
            phaseIndex++;
        }
    }
    // Generic element generator with spacing and forbidden-range checks
    #generateElements({ total = 0, minScale = 1, maxScale = 1, minGap = 0, maxAttempts = 200, minX = this.limit.gameMinXPos, maxX = this.limit.gameMaxXPos, getWidth = (scale, _index = 0) => scale, avoidRanges = [], placementRanges = undefined, allowFallbackPlacement = true, decorate = undefined, }) {
        const quantity = max(0, floor(total));
        if (quantity <= 0) {
            return [];
        }
        const boundedRange = {
            min: min(minX, maxX),
            max: max(minX, maxX),
        };
        const rawPlacementRanges = Array.isArray(placementRanges) && placementRanges.length ? placementRanges : [boundedRange];
        const normalizedPlacementRanges = Utility.normalizeRanges(rawPlacementRanges.map((range) => ({
            min: max(boundedRange.min, range?.min),
            max: min(boundedRange.max, range?.max),
        })));
        if (!normalizedPlacementRanges.length) {
            return [];
        }
        const forbiddenRanges = Utility.normalizeRanges(avoidRanges);
        const placedElements = [];
        const results = [];
        // Checks whether a candidate overlaps forbidden ranges
        const inForbidden = (interval) => {
            for (const range of forbiddenRanges) {
                if (interval.min <= range.max && range.min <= interval.max) {
                    return true;
                }
            }
            return false;
        };
        // Resolves a safe positive width for one candidate
        const safeWidth = (scale, index) => {
            const width = getWidth(scale, index);
            if (width <= 0) {
                return 1;
            }
            return max(1, floor(width));
        };
        // Picks one range that can fit the candidate width
        const pickPlacementRange = (width) => {
            const availableRanges = normalizedPlacementRanges.filter((range) => range.max - range.min >= width);
            if (availableRanges.length === 0) {
                return undefined;
            }
            return availableRanges[floor(random(0, availableRanges.length))];
        };
        // Builds one random candidate base
        const createCandidateBase = (index) => {
            const scale = round(random(minScale, maxScale) * 10) / 10;
            const w = safeWidth(scale, index);
            const range = pickPlacementRange(w);
            if (!range) {
                return undefined;
            }
            const maxPos = range.max - w;
            const x = round(random(range.min, maxPos > range.min ? maxPos : range.min));
            return { x, w, scale };
        };
        // Validates spacing and forbidden overlap for one candidate
        const canPlace = (base) => {
            const interval = { min: base.x, max: base.x + base.w };
            if (inForbidden(interval)) {
                return false;
            }
            for (const placed of placedElements) {
                const other = { min: placed.x, max: placed.x + placed.w };
                const gap = interval.min > other.max ? interval.min - other.max : other.min - interval.max;
                // return false if doesn't respect min gap
                if (gap < minGap) {
                    return false;
                }
            }
            return true;
        };
        // Finalizes and stores the generated element
        const pushResult = (base, index) => {
            const item = decorate ? decorate(base, index) : base;
            if (item === undefined || item === null) {
                return false;
            }
            placedElements.push(base);
            results.push(item);
            return true;
        };
        for (let i = 0; i < quantity; i++) {
            let isPlaced = false;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const base = createCandidateBase(i);
                if (!base) {
                    continue;
                }
                if (canPlace(base) && pushResult(base, i)) {
                    isPlaced = true;
                    break;
                }
            }
            if (!isPlaced && allowFallbackPlacement) {
                for (let fallbackAttempt = 0; fallbackAttempt < maxAttempts; fallbackAttempt++) {
                    const base = createCandidateBase(i);
                    if (!base) {
                        continue;
                    }
                    const interval = { min: base.x, max: base.x + base.w };
                    if (!inForbidden(interval) && pushResult(base, i)) {
                        break;
                    }
                }
            }
        }
        return results;
    }
}
