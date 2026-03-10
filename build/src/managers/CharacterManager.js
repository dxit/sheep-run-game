class CharacterManager {
    #x;
    #y;
    #lives;
    #currentLives;
    palette;
    position;
    settings;
    velocity;
    boost;
    direction;
    state;
    action;
    legsPosition;
    constructor(x, y, lives, palette) {
        this.#x = x; // Used to restore the original character x position
        this.#y = y; // Used to restore the original character y position
        this.#lives = lives ?? 3; // Used to restore the original lives. Fallback to 3
        this.#currentLives = this.#lives;
        this.palette = palette;
        this.position = createVector(x, y);
        this.settings = {
            characterWidth: 38, // Approximate character width for overlap checks
        };
        this.velocity = {
            walk: 4, // Horizontal movement speed
            fall: 3, // Standard downward speed while falling
            // Returns plummet speed derived from fall speed
            get plummet() {
                return this.fall * 3; // Faster fall speed used when plummeting in canyons
            },
            jump: 8, // Initial upward jump speed
        };
        this.boost = {
            frames: 0, // Remaining active boost frames
            duration: 10, // Boost length in frames
            multiplier: 2.5, // Additional multiplier over base walk speed
            direction: 0, // Active boost direction (-1 left, +1 right, 0 none)
        };
        // Input direction flags
        this.direction = {
            isLeft: false,
            isRight: false,
        };
        // Runtime character state flags
        this.state = {
            isPlummeting: false,
            isJumping: false,
            isFalling: false,
            isScared: false,
        };
        // Allowed actions - listed to avoid string typos
        this.action = {
            standing: "STANDING",
            jumping: "JUMPING",
            jumpingLeft: "JUMPING_LEFT",
            jumpingRight: "JUMPING_RIGHT",
            movingLeft: "MOVING_LEFT",
            movingRight: "MOVING_RIGHT",
        };
        // List of legs positions - listed to avoid string typos
        this.legsPosition = {
            front: "FRONT",
            back: "BACK",
        };
    }
    get lives() {
        return this.#currentLives;
    }
    set lives(value) {
        this.#currentLives = max(0, value);
    }
    // Returns whether it has lives
    hasLives() {
        return this.#currentLives > 0;
    }
    // Starts the current run
    start() {
        this.#resetPosition();
        this.#resetDirection();
        this.#resetState();
        this.#resetBoost();
    }
    // Restarts the game state
    restart() {
        this.start();
        this.#resetLives();
    }
    // Sets direction
    setDirection(direction, value, reset = false) {
        if (reset) {
            this.#resetDirection();
        }
        if (!direction || typeof value !== "boolean") {
            return;
        }
        this.direction[direction] = value;
    }
    // Gets direction
    getDirection(direction) {
        return this.direction[direction];
    }
    // Little abstraction in order to avoid to touch the object directly and gain more control
    setState(state, value, reset = false) {
        if (reset) {
            this.#resetState();
        }
        if (!state || typeof value !== "boolean") {
            return;
        }
        this.state[state] = value;
    }
    // Gets state
    getState(state) {
        return this.state[state];
    }
    // Resets movement direction flags
    #resetDirection() {
        for (const key of Object.keys(this.direction)) {
            this.direction[key] = false;
        }
    }
    // Resets character state flags
    #resetState() {
        for (const key of Object.keys(this.state)) {
            this.state[key] = false;
        }
    }
    // Resets character position to spawn point
    #resetPosition() {
        this.position = createVector(this.#x, this.#y);
    }
    // Resets boost state
    #resetBoost() {
        this.boost.frames = 0;
        this.boost.direction = 0;
    }
    // Resets lives to initial value
    #resetLives() {
        this.#currentLives = this.#lives;
    }
    // Returns whether falling or jumping
    isFallingOrJumping() {
        return this.state.isJumping || this.state.isFalling;
    }
    // Handles standing facing frontwards
    standingFacingFrontwards(x, y) {
        const action = this.action.standing;
        this.#composeElements(action, { x, y });
    }
    // Handles jumping facing forwards
    jumpingFacingForwards(x, y) {
        const action = this.action.jumping;
        this.#composeElements(action, { x, y });
    }
    // Handles walking turned left
    walkingTurnedLeft(x, y) {
        const action = this.action.movingLeft;
        this.#composeElements(action, { x, y });
    }
    // Handles walking turned right
    walkingTurnedRight(x, y) {
        const action = this.action.movingRight;
        this.#composeElements(action, { x, y });
    }
    // Handles jumping left
    jumpingLeft(x, y) {
        const action = this.action.jumpingLeft;
        this.#composeElements(action, { x, y });
    }
    // Handles jumping right
    jumpingRight(x, y) {
        const action = this.action.jumpingRight;
        this.#composeElements(action, { x, y });
    }
    // Draws full character by composing parts
    #composeElements(action, pos) {
        this.#legs(action, this.legsPosition.back, pos);
        this.#body(action, pos);
        this.#legsFront(action, pos);
        this.#ears(action, pos);
        this.#head(action, pos);
        this.#mouth(action, pos);
        this.#eyes(action, pos);
    }
    // Draws head by action state
    #head(kind = this.action.standing, { x, y }) {
        if (kind === this.action.jumping) {
            push();
            translate(x, y - 15);
            // head shadow
            this.palette.fill(this.palette.colors.shared.shadow.soft);
            ellipse(0, -45, 32, 35);
            // head
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -50, 34, 40);
            // hair
            this.palette.fill(this.palette.colors.shared.white);
            ellipse(-10, -69, 10);
            ellipse(10, -69, 10);
            ellipse(0, -72, 12);
            ellipse(-3, -68, 8);
            ellipse(3, -68, 8);
            this.palette.fill(this.palette.colors.character.shadow.medium);
            ellipse(-10, -69, 10);
            ellipse(10, -69, 10);
            ellipse(-3, -68, 8);
            ellipse(3, -68, 8);
            this.palette.fill(this.palette.colors.shared.white);
            ellipse(-10, -70, 10, 8);
            ellipse(10, -70, 10, 8);
            ellipse(-3, -69, 8, 6);
            ellipse(3, -69, 8, 6);
            pop();
        }
        else if ([this.action.movingRight, this.action.jumpingRight].includes(kind)) {
            push();
            translate(x + 10, y - 51);
            rotate(-0.2);
            this.palette.fill(this.palette.colors.shared.shadow.soft);
            ellipse(0, 5, 32, 35);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, 0, 34, 40);
            this.palette.fill(this.palette.colors.shared.white);
            ellipse(-10, -19, 10);
            ellipse(10, -19, 10);
            ellipse(0, -22, 12);
            ellipse(-3, -18, 8);
            ellipse(3, -18, 8);
            this.palette.fill(this.palette.colors.character.shadow.medium);
            ellipse(-10, -19, 10);
            ellipse(10, -19, 10);
            ellipse(-3, -18, 8);
            ellipse(3, -18, 8);
            this.palette.fill(this.palette.colors.shared.white);
            ellipse(-10, -20, 10, 8);
            ellipse(10, -20, 10, 8);
            ellipse(-3, -19, 8, 6);
            ellipse(3, -19, 8, 6);
            pop();
        }
        else if ([this.action.movingLeft, this.action.jumpingLeft].includes(kind)) {
            push();
            translate(x - 10, y - 51);
            rotate(0.2);
            this.palette.fill(this.palette.colors.shared.shadow.soft);
            ellipse(0, 5, 32, 35);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, 0, 34, 40);
            this.palette.fill(this.palette.colors.shared.white);
            ellipse(-10, -19, 10);
            ellipse(10, -19, 10);
            ellipse(0, -22, 12);
            ellipse(-3, -18, 8);
            ellipse(3, -18, 8);
            this.palette.fill(this.palette.colors.character.shadow.medium);
            ellipse(-10, -19, 10);
            ellipse(10, -19, 10);
            ellipse(-3, -18, 8);
            ellipse(3, -18, 8);
            this.palette.fill(this.palette.colors.shared.white);
            ellipse(-10, -20, 10, 8);
            ellipse(10, -20, 10, 8);
            ellipse(-3, -19, 8, 6);
            ellipse(3, -19, 8, 6);
            pop();
        }
        else {
            push();
            translate(x, y);
            // head shadow
            this.palette.fill(this.palette.colors.shared.shadow.soft);
            ellipse(0, -45, 32, 35);
            // head
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -50, 34, 40);
            // hair
            this.palette.fill(this.palette.colors.shared.white);
            ellipse(-10, -69, 10);
            ellipse(10, -69, 10);
            ellipse(0, -72, 12);
            ellipse(-3, -68, 8);
            ellipse(3, -68, 8);
            this.palette.fill(this.palette.colors.character.shadow.medium);
            ellipse(-10, -69, 10);
            ellipse(10, -69, 10);
            ellipse(-3, -68, 8);
            ellipse(3, -68, 8);
            this.palette.fill(this.palette.colors.shared.white);
            ellipse(-10, -70, 10, 8);
            ellipse(10, -70, 10, 8);
            ellipse(-3, -69, 8, 6);
            ellipse(3, -69, 8, 6);
            pop();
        }
    }
    // Draws body by action state
    #body(kind = this.action.standing, { x, y }) {
        // Body for movingRight and jumpingRight
        if ([this.action.movingRight, this.action.jumpingRight].includes(kind)) {
            push();
            translate(x, y);
            this.palette.fill(this.palette.colors.shared.white);
            rect(-29, -62, 51, 39);
            ellipse(-10, -62, 15);
            ellipse(-22, -60, 15);
            ellipse(-30, -56, 10);
            ellipse(-31, -45, 15);
            ellipse(-32, -35, 11);
            ellipse(-30, -26, 10);
            ellipse(-23, -22, 10);
            ellipse(-11, -20, 15);
            ellipse(0, -20, 15);
            ellipse(10, -20, 15);
            ellipse(20, -26, 10);
            ellipse(25, -35, 11);
            ellipse(25, -45, 15);
            ellipse(24, -56, 10);
            pop();
        }
        // Body for movingLeft and jumpingLeft
        else if ([this.action.movingLeft, this.action.jumpingLeft].includes(kind)) {
            push();
            translate(x, y);
            scale(-1, 1);
            this.palette.fill(this.palette.colors.shared.white);
            rect(-29, -62, 51, 39);
            ellipse(-10, -62, 15);
            ellipse(-22, -60, 15);
            ellipse(-30, -56, 10);
            ellipse(-31, -45, 15);
            ellipse(-32, -35, 11);
            ellipse(-30, -26, 10);
            ellipse(-23, -22, 10);
            ellipse(-11, -20, 15);
            ellipse(0, -20, 15);
            ellipse(10, -20, 15);
            ellipse(20, -26, 10);
            ellipse(25, -35, 11);
            ellipse(25, -45, 15);
            ellipse(24, -56, 10);
            pop();
        }
        else {
            this.palette.fill(this.palette.colors.shared.white);
            rect(x - 23, y - 62, 45, 37);
            ellipse(x - 20, y - 56, 10);
            ellipse(x - 21, y - 45, 15);
            ellipse(x - 22, y - 35, 11);
            ellipse(x - 20, y - 26, 10);
            ellipse(x - 11, y - 20, 15);
            ellipse(x, y - 20, 15);
            ellipse(x + 10, y - 20, 15);
            ellipse(x + 19, y - 26, 10);
            ellipse(x + 21, y - 35, 11);
            ellipse(x + 19, y - 45, 15);
            ellipse(x + 18, y - 56, 10);
        }
    }
    // Draws eyes by action state
    #eyes(kind = this.action.standing, { x, y }) {
        let pupilSize = 3;
        // Apply special style if isScared or isPlummeting
        if (this.getState("isScared") || this.getState("isPlummeting")) {
            pupilSize = 2;
        }
        this.palette.fill(this.palette.colors.shared.white);
        push();
        if (kind === this.action.jumping) {
            translate(x, y - 15);
        }
        else if ([this.action.movingRight, this.action.jumpingRight].includes(kind)) {
            translate(x + 20, y - 2);
            rotate(-0.2);
        }
        else if ([this.action.movingLeft, this.action.jumpingLeft].includes(kind)) {
            translate(x - 20, y - 2);
            rotate(0.2);
        }
        else {
            translate(x, y);
        }
        // Apply special style if isScared
        if (this.getState("isScared")) {
            ellipse(-7, -57, 14, 13);
            ellipse(7, -57, 14, 13);
        }
        else {
            ellipse(-7, -57, 8, 7);
            ellipse(7, -57, 8, 7);
        }
        this.palette.fill(this.palette.colors.character.eye.pupil);
        if (kind === this.action.jumping && this.getState("isJumping")) {
            ellipse(-6, -57 - 2, pupilSize, pupilSize);
            ellipse(6, -57 - 2, pupilSize, pupilSize);
        }
        else if (kind === this.action.jumping && this.getState("isFalling")) {
            ellipse(-6, -52 - 2, pupilSize, pupilSize);
            ellipse(6, -52 - 2, pupilSize, pupilSize);
        }
        else if ([this.action.movingRight, this.action.jumpingRight].includes(kind)) {
            ellipse(-5, -57, pupilSize, pupilSize);
            ellipse(9, -57, pupilSize, pupilSize);
        }
        else if ([this.action.movingLeft, this.action.jumpingLeft].includes(kind)) {
            ellipse(-9, -57, pupilSize, pupilSize);
            ellipse(5, -57, pupilSize, pupilSize);
        }
        else {
            ellipse(-6, -57, pupilSize, pupilSize);
            ellipse(6, -57, pupilSize, pupilSize);
        }
        pop();
    }
    // Draws mouth by action state
    #mouth(kind = this.action.standing, { x, y }) {
        push();
        if (kind === this.action.jumping) {
            translate(x, y - 15);
        }
        else if ([this.action.movingRight, this.action.jumpingRight].includes(kind)) {
            translate(x + 21, y - 1);
            rotate(-0.2);
        }
        else if ([this.action.movingLeft, this.action.jumpingLeft].includes(kind)) {
            translate(x - 21, y - 1);
            rotate(0.2);
        }
        else {
            translate(x, y);
        }
        this.palette.stroke(this.palette.colors.character.feature.line);
        strokeWeight(1);
        curve(-8, -48, -8, -42, 0, -36, 5, -38);
        curve(8, -48, 8, -42, 0, -36, 5, -38);
        line(0, -36, 0, -32);
        noStroke();
        pop();
    }
    // Draws ears by action state
    #ears(kind = this.action.standing, { x, y }) {
        if (kind === this.action.jumping) {
            push();
            translate(x - 16, y - 61);
            rotate(-0.9);
            this.palette.fill(this.palette.colors.character.feature.line);
            ellipse(0, -1, 20, 9);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -2, 20, 9);
            noFill();
            this.palette.stroke(this.palette.colors.character.feature.line);
            strokeWeight(1);
            curve(-19, 10, -9, -2, 9, -3, 12, 10);
            noStroke();
            pop();
            push();
            translate(x + 16, y - 61);
            rotate(0.9);
            this.palette.fill(this.palette.colors.character.feature.line);
            ellipse(0, -1, 20, 9);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -2, 20, 9);
            noFill();
            this.palette.stroke(this.palette.colors.character.feature.line);
            strokeWeight(1);
            curve(-19, 10, -9, -2, 9, -3, 12, 10);
            noStroke();
            pop();
        }
        else if ([this.action.movingRight, this.action.jumpingRight].includes(kind)) {
            push();
            translate(x - 8, y - 55);
            rotate(-0.7);
            this.palette.fill(this.palette.colors.character.feature.line);
            ellipse(0, -1, 20, 9);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -2, 20, 9);
            noFill();
            this.palette.stroke(this.palette.colors.character.feature.line);
            strokeWeight(1);
            curve(-19, 10, -9, -2, 9, -3, 12, 10);
            noStroke();
            pop();
            push();
            translate(x + 26, y - 62);
            rotate(0.5);
            this.palette.fill(this.palette.colors.character.feature.line);
            ellipse(0, -1, 20, 9);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -2, 20, 9);
            noFill();
            this.palette.stroke(this.palette.colors.character.feature.line);
            strokeWeight(1);
            curve(-19, 10, -9, -2, 9, -3, 12, 10);
            noStroke();
            pop();
        }
        else if ([this.action.movingLeft, this.action.jumpingLeft].includes(kind)) {
            push();
            translate(x - 25, y - 59);
            rotate(-0.5);
            this.palette.fill(this.palette.colors.character.feature.line);
            ellipse(0, -1, 20, 9);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -2, 20, 9);
            noFill();
            this.palette.stroke(this.palette.colors.character.feature.line);
            strokeWeight(1);
            curve(-19, 10, -9, -2, 9, -3, 12, 10);
            noStroke();
            pop();
            push();
            translate(x + 10, y - 54);
            rotate(0.8);
            this.palette.fill(this.palette.colors.character.feature.line);
            ellipse(0, -1, 20, 9);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -2, 20, 9);
            noFill();
            this.palette.stroke(this.palette.colors.character.feature.line);
            strokeWeight(1);
            curve(-19, 10, -9, -2, 9, -3, 12, 10);
            noStroke();
            pop();
        }
        else {
            push();
            translate(x - 18, y - 60);
            rotate(-0.7);
            this.palette.fill(this.palette.colors.character.feature.line);
            ellipse(0, -1, 20, 9);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -2, 20, 9);
            noFill();
            this.palette.stroke(this.palette.colors.character.feature.line);
            strokeWeight(1);
            curve(-19, 10, -9, -2, 9, -3, 12, 10);
            noStroke();
            pop();
            push();
            translate(x + 18, y - 60);
            rotate(0.7);
            this.palette.fill(this.palette.colors.character.feature.line);
            ellipse(0, -1, 20, 9);
            this.palette.fill(this.palette.colors.character.skin.base);
            ellipse(0, -2, 20, 9);
            noFill();
            this.palette.stroke(this.palette.colors.character.feature.line);
            strokeWeight(1);
            curve(-19, 10, -9, -2, 9, -3, 12, 10);
            noStroke();
            pop();
        }
    }
    // Draws legs by action and position
    #legs(kind = this.action.standing, position = this.legsPosition.back, { x, y }) {
        push();
        translate(x, y);
        const l_array = [];
        if (kind === this.action.jumping && position === this.legsPosition.front) {
            l_array.push([-15, -40, 1]);
            l_array.push([10, -36, -1]);
        }
        else if (kind === this.action.jumping) {
            l_array.push([-15, -19, 0.2]);
            l_array.push([10, -19, -0.2]);
        }
        else if (kind === this.action.jumpingLeft) {
            l_array.push([-16, -17, 0.6]);
            l_array.push([-5, -17, 0.6]);
            l_array.push([22, -20, -0.5]);
            l_array.push([13, -20, -0.5]);
        }
        else if (kind === this.action.jumpingRight) {
            l_array.push([-4, -17, -0.5]);
            l_array.push([7, -17, -0.5]);
            l_array.push([-26, -20, 0.6]);
            l_array.push([-17, -20, 0.6]);
        }
        else if (kind === this.action.movingRight) {
            l_array.push([-4, -17]);
            l_array.push([7, -17]);
            l_array.push([-26, -20]);
            l_array.push([-17, -20]);
        }
        else if (kind === this.action.movingLeft) {
            l_array.push([-16, -17]);
            l_array.push([-5, -17]);
            l_array.push([22, -20]);
            l_array.push([13, -20]);
        }
        else {
            l_array.push([-12, -20]);
            l_array.push([8, -20]);
        }
        for (const leg of l_array) {
            push();
            translate(leg[0], leg[1]);
            if (typeof leg[2] !== "undefined") {
                rotate(leg[2]);
            }
            this.palette.fill(this.palette.colors.character.skin.base);
            rect(0, 0, 4, 20);
            this.palette.fill(this.palette.colors.character.shadow.deep);
            rect(0, 17, 4, 3);
            pop();
        }
        pop();
    }
    // Draws front legs when needed
    #legsFront(kind = this.action.standing, { x, y }) {
        if (kind === this.action.jumping) {
            this.#legs(this.action.jumping, this.legsPosition.front, { x, y });
        }
        else {
            return;
        }
    }
}
