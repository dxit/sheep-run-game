class Enemy {
    // Sets up enemy patrol state
    constructor({ x, minX, maxX, direction = 1, inRange = false }) {
        const initialX = Number.isFinite(x) ? x : 0;
        this.position = createVector(initialX, 0);
        this.velocity = createVector(0, 0);
        this.minX = Number.isFinite(minX) ? minX : initialX;
        this.maxX = Number.isFinite(maxX) ? maxX : initialX;
        this.direction = direction >= 0 ? 1 : -1;
        this.inRange = Boolean(inRange);
    }

    // Gets enemy x position
    get x() {
        return this.position.x;
    }

    // Sets enemy x position
    set x(value) {
        if (Number.isFinite(value)) {
            this.position.x = value;
        }
    }

    // Updates patrol and chase movement
    update({ characterX, characterY, floorY, behavior }) {
        const patrolSpeed = behavior.speed;
        const chaseSpeed = behavior.speedInRange;
        const enemyFloorPos = createVector(this.position.x, floorY);
        const characterPos = createVector(characterX, characterY);
        const offsetToCharacter = p5.Vector.sub(characterPos, enemyFloorPos);
        const horizontalDistance = offsetToCharacter.x;
        const verticalDistance = abs(offsetToCharacter.y);
        const isHorizontallyNear = abs(horizontalDistance) <= behavior.distRange;
        const isVerticallyNear = verticalDistance <= behavior.verticalRange;
        const inDeadzone = abs(horizontalDistance) <= behavior.chaseDeadzone;

        this.inRange = isHorizontallyNear && isVerticallyNear;

        let direction = this.direction >= 0 ? 1 : -1;
        if (this.inRange && !inDeadzone) {
            direction = horizontalDistance >= 0 ? 1 : -1;
        }

        const speed = this.inRange ? (inDeadzone ? 0 : chaseSpeed) : patrolSpeed;
        this.velocity.set(speed * direction, 0);
        this.position.add(this.velocity);

        if (this.position.x <= this.minX) {
            this.position.x = this.minX;
            if (!this.inRange) {
                direction = 1;
            }
        } else if (this.position.x >= this.maxX) {
            this.position.x = this.maxX;
            if (!this.inRange) {
                direction = -1;
            }
        }

        this.direction = direction;
    }

    // Checks if the enemy gets in contact with the character
    isTouching(characterX, characterY, floorY, distContact) {
        const enemyFloorPos = createVector(this.position.x, floorY);
        const characterPos = createVector(characterX, characterY);
        return p5.Vector.dist(enemyFloorPos, characterPos) < distContact;
    }
}

