class GameManager {
    #lives;

    constructor(lives) {
        this.palette = new PaletteManager();
        this.fonts = new FontManager();
        this.sounds = new SoundManager("mp3");

        this.#lives = lives;
    }

    // Builds settings/defaults
    #settings() {
        this.settings = {
            music: true, // Start background music automatically
            bestTime: {
                enabled: true, // Set true to show best time under timer
            },
        };

        this.position = {
            floor: {
                y: (height * 3) / 4, // Base world floor height
                platformY: undefined, // Active floor while standing on a platform (undefined means ground floor)
                jumpStartY: undefined, // Y where the current jump started (used for jump arc limit)
            },
            cameraX: 0, // Horizontal camera offset in world coordinates
            cameraY: 0, // Vertical camera offset in world coordinates
        };

        this.limit = {
            gameMinXPos: -2000, // Left world bound
            gameMaxXPos: 5000, // Right world bound
            jump: 100, // Max vertical jump distance in pixels
            timeS: 30, // Starting time allowance in seconds (0 disables timer mode)
            plummet: height + 100, // Off-screen Y cap for plummeting animation
        };

        // Number of generated elements for each category
        this.elements = {
            butterflies: 5,
            canyons: 14,
            clouds: 20,
            collectables: 15,
            enemies: 4,
            mountains: 15,
            platforms: {
                levelOne: 8,
                levelTwo: 5,
                levelThree: 2,
            },
            trees: 20,
        };

        this.state = {
            gameover: false,
            completed: false,
            bestTimeS: 0, // Best completion duration in seconds. The lower, the better
        };

        // Set default Palette - used to create the dark effect on game over
        this.palette.use("light");

        // Fonts
        this.fonts.use("rimouski");

        // Set sounds volume levels
        this.sounds.setVolume("boost", 0.2);
        this.sounds.setVolume("butterfly", 0.2);
        this.sounds.setVolume("collectable", 0.6);
        this.sounds.setVolume("falling", 0.3);
        this.sounds.setVolume("gameMusic", 0.2);
        this.sounds.setVolume("gameOver", 0.3);
        this.sounds.setVolume("jumping", 0.2);
        this.sounds.setVolume("levelCompleted", 0.3);
    }

    preload() {
        this.fonts.preload();
        this.sounds.preload();
    }

    setup() {
        this.#settings();
        this.sounds.warmup(["gameMusic"]);
        this.#startGameMusic();

        this.character = new CharacterManager(width / 2, this.position.floor.y, this.#lives, this.palette);
        this.level = new LevelManager(
            this.character,
            this.position,
            this.limit,
            this.elements,
            this.palette,
            this.sounds,
            this.fonts,
            this.state,
            this.settings,
        );
        this.restart();
    }

    draw() {
        this.level.draw("pre");

        push();
        // camera control
        this.cameraControl();

        // draw ground
        this.level.drawGround();

        // draw mountains
        this.level.renderMountains();

        // draw trees
        this.level.renderTrees();

        // draw clouds
        this.level.renderClouds();

        // draw and check the canyons
        this.level.renderCanyons();
        this.level.checkCanyons(() => {
            if (this.character.position.y >= this.limit.plummet) {
                this.checkDie();
            }
        });

        // draw platforms
        this.level.renderPlatforms();
        this.level.checkPlatforms();

        // draw butterflies
        this.level.renderButterflies();
        this.level.checkButterflies();

        // draw and check collectables
        this.level.renderCollectables();
        this.level.checkCollectables();

        // draw Flagpole
        this.level.checkFlagpole();
        this.level.drawFlagpole(this.level.flagpole.x);

        // draw and check enemies
        this.level.renderEnemies();
        this.level.checkEnemies(() => {
            this.checkDie();
        });

        // Initial instructions text
        this.level.drawInstructionsText();

        // Handles character's views according to the character state
        this.#handleCharacterActions();

        pop();

        this.level.draw("post");

        // Character movements logic
        this.checkWalking();

        // Character jumping logic
        this.checkJumping();
    }

    // Restarts the level after losing a life
    start() {
        this.character.start();
        this.#resetCamera();
        this.level.start();
    }
    // Restarts the whole game
    restart() {
        this.#startGameMusic();
        this.#resetCamera();
        this.character.restart();
        this.level.restart();
        this.palette.use("light");
    }
    // Updates camera follow and limits
    cameraControl() {
        translate(-this.position.cameraX, this.position.cameraY);

        if (!this.character.getState("isPlummeting") && !this.level.flagpole.isReached && this.#canWalk()) {
            this.position.cameraX = this.character.position.x - width / 2;

            // Follow Y only once the character reaches upper platforms
            const followThresholdY = this.position.floor.y - 100;
            const targetCameraY = this.character.position.y < followThresholdY ? followThresholdY - this.character.position.y : 0;
            this.position.cameraY = lerp(this.position.cameraY, targetCameraY, 0.2); // Smooth camera with lerp
        } else {
            // Return smoothly to the default framing
            this.position.cameraY = lerp(this.position.cameraY, 0, 0.2);
        }

        this.#controlGameLimits();
    }
    // Manages the character views based movment state
    #handleCharacterActions() {
        //on left jumping
        if (this.isDirection("isLeft") && this.character.isFallingOrJumping()) {
            this.character.jumpingLeft(this.character.position.x, this.character.position.y);
        }
        //on right jumping
        else if (this.isDirection("isRight") && this.character.isFallingOrJumping()) {
            this.character.jumpingRight(this.character.position.x, this.character.position.y);
        }
        //on left walking
        else if (this.character.direction.isLeft) {
            this.character.walkingTurnedLeft(this.character.position.x, this.character.position.y);
        }
        //on right walking
        else if (this.character.direction.isRight) {
            this.character.walkingTurnedRight(this.character.position.x, this.character.position.y);
        }
        //on jumping or plummeting
        else if (this.character.state.isFalling || this.character.state.isJumping || this.character.state.isPlummeting) {
            this.character.jumpingFacingForwards(this.character.position.x, this.character.position.y);
        }
        //on standing
        else {
            this.character.standingFacingFrontwards(this.character.position.x, this.character.position.y);
        }
    }

    // Handles logic for x moving
    checkWalking() {
        if (!this.#canWalk()) {
            this.#controlGameLimits(); // Controls game boundaries
            return;
        }

        const movement = createVector(0, 0);
        if (this.character.getDirection("isLeft")) {
            movement.x -= this.character.velocity.walk;
        }
        if (this.character.getDirection("isRight")) {
            movement.x += this.character.velocity.walk;
        }

        // Boost the character
        if (this.character.boost.frames > 0) {
            movement.add(createVector(this.character.boost.direction * this.character.velocity.walk * this.character.boost.multiplier, 0));
            this.character.boost.frames -= 1;
        }

        // Add movements only when there is an input vector
        if (movement.magSq() > 0) {
            this.character.position.add(movement);
        }

        this.#controlGameLimits();
    }
    // Handles logic for jump and fall physics
    checkJumping() {
        // Jumping case
        const positionFloorY = this.position.floor.platformY ?? this.position.floor.y;
        const jumpStartY = this.position.floor.jumpStartY ?? positionFloorY;

        if (this.character.getState("isJumping")) {
            // Smooth jump: reduce the speed near the top while preparing for falling state
            const progress = (jumpStartY - this.character.position.y) / this.limit.jump;
            const clamped = max(0, min(1, progress));
            const slowFactor = 1 - 0.6 * pow(clamped, 2);
            const jumpStep = max(this.character.velocity.jump * slowFactor, this.character.velocity.jump * 0.35);
            this.character.position.add(createVector(0, -jumpStep));

            // When matching the jump limit coord, set falling state and reset the other states
            if (this.character.position.y <= jumpStartY - this.limit.jump) {
                this.character.position.y = jumpStartY - this.limit.jump;
                this.character.setState("isFalling", true, true);
            }
        } else if (this.character.getState("isFalling")) {
            // If already on/under the current floor, immediately resolve landing
            if (this.character.position.y >= positionFloorY) {
                this.character.position.y = positionFloorY;
                this.character.setState("isFalling", false);
                this.position.floor.jumpStartY = undefined;
                return;
            }

            // Falling case
            this.character.position.add(createVector(0, this.character.velocity.fall));

            // Landing case, resets isFalling to false
            if (this.character.position.y >= positionFloorY) {
                this.character.position.y = positionFloorY;
                this.character.setState("isFalling", false);
                this.position.floor.jumpStartY = undefined;
            }
        } else {
            this.position.floor.jumpStartY = undefined; // Reset jumpStartY
        }
    }

    // Handles life loss and restart/gameover
    checkDie() {
        if (this.character.hasLives()) {
            this.character.lives--; // Remove live if character has still lives left

            if (this.character.hasLives()) {
                this.start(); // If character has left lives still, start the game again
            } else {
                this.handleGameOver(); // If no lives left, set game over
            }
        }
    }
    // Handles final gameover state
    handleGameOver() {
        // Freeze movement state and keep the character off-screen on game over
        this.character.setDirection(undefined, undefined, true);
        this.character.setState("isPlummeting", false, true); // Reset all the states
        this.character.position.y = this.limit.plummet;
        this.position.floor.jumpStartY = undefined;
        this.position.floor.platformY = undefined;
        this.state.gameover = true;
        this.state.completed = false;
        this.sounds.stop("falling");
        this.sounds.stop("gameMusic");
        this.sounds.play("gameOver");
        this.palette.use("dark"); // Turn the game into night
    }
    // Shortcut for direction state checks
    isDirection(direction) {
        return this.character.getDirection(direction);
    }
    // Handles key-down input
    keyPressed() {
        if (!this.character?.hasLives() || this.level.flagpole.isReached) {
            if (keyCode === 27) {
                this.restart(); // Restart the game with ESC on Game over or Level Completed
            } else {
                return;
            }
        }

        this.#startGameMusic(); // Workaround for Chrome audio protection. Starts audio with the next user action

        if (this.character.getState("isPlummeting")) {
            this.character.setDirection(undefined, undefined, true);
            return;
        }

        // On A or ArrowLeft press
        if (keyCode === 65 || keyCode === 37) {
            this.character.setDirection("isLeft", true);
        }

        // On D or ArrowRight press
        if (keyCode === 68 || keyCode === 39) {
            this.character.setDirection("isRight", true);
        }

        // On Spacebar press -> boost in walking direction
        if (keyCode === 32) {
            const dir = this.character.getDirection("isRight") ? 1 : this.character.getDirection("isLeft") ? -1 : 0;
            if (dir !== 0) {
                this.sounds.play("boost");
                this.character.boost.direction = dir;
                this.character.boost.frames = this.character.boost.duration;
            }
        }

        // On W or ArrowUp press -> jump
        if ((keyCode === 87 || keyCode === 38) && !this.character.isFallingOrJumping() && !this.character.getState("isPlummeting")) {
            this.sounds.play("jumping");
            this.position.floor.jumpStartY = this.position.floor.platformY ?? this.position.floor.y;
            this.character.setState("isJumping", true);
        }
    }
    // Handles key-up input
    keyReleased() {
        if (this.character?.getState("isPlummeting")) {
            return;
        }

        // On A or ArrowLeft press
        if (keyCode === 65 || keyCode === 37) {
            this.character.setDirection("isLeft", false);
        }

        // On D or ArrowRight press
        if (keyCode === 68 || keyCode === 39) {
            this.character.setDirection("isRight", false);
        }
    }
    // Checks if movement is allowed
    #canWalk() {
        return this.character.hasLives() && !this.character.getState("isPlummeting") && !this.level.flagpole.isReached;
    }
    // Clamps character and camera to world bounds
    #controlGameLimits() {
        const minX = this.limit.gameMinXPos + this.character.settings.characterWidth;
        const maxX = this.limit.gameMaxXPos - this.character.settings.characterWidth;
        const minCameraX = minX - this.character.settings.characterWidth;
        const maxCameraX = maxX + this.character.settings.characterWidth - width;
        const maxCameraY = max(0, this.position.floor.y - 120);

        this.character.position.x = min(max(this.character.position.x, minX), maxX); // Limit the character movements
        this.position.cameraX = min(max(this.position.cameraX, minCameraX), maxCameraX); // Limit the camera
        this.position.cameraY = min(max(this.position.cameraY, 0), maxCameraY); // Limit the vertical camera
    }
    // Resets camera offsets
    #resetCamera() {
        this.position.cameraX = 0;
        this.position.cameraY = 0;
    }
    // Starts background music when enabled
    #startGameMusic() {
        const gameMusic = this.sounds.get("gameMusic");
        if (!gameMusic || !gameMusic.isLoaded()) {
            return;
        }
        if (!gameMusic.isPlaying() && this.settings.music) {
            this.sounds.play("gameMusic", { loop: true });
        }
    }
}
