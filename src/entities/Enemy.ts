type EnemyConfig = {
    x: number;
    minX: number;
    maxX: number;
    direction?: number;
    inRange?: boolean;
};

type EnemyBehavior = {
    speed: number;
    speedInRange: number;
    distRange: number;
    verticalRange: number;
    chaseDeadzone: number;
};

type EnemyUpdateState = {
    characterX: number;
    characterY: number;
    floorY: number;
    behavior: EnemyBehavior;
};

export default class Enemy {
    position: ReturnType<typeof createVector>;
    velocity: ReturnType<typeof createVector>;
    minX: number;
    maxX: number;
    direction: 1 | -1;
    inRange: boolean;

    // Sets up enemy patrol state
    constructor({ x, minX, maxX, direction = 1, inRange = false }: EnemyConfig) {
        const initialX = Number.isFinite(x) ? x : 0;
        this.position = createVector(initialX, 0);
        this.velocity = createVector(0, 0);
        this.minX = Number.isFinite(minX) ? minX : initialX;
        this.maxX = Number.isFinite(maxX) ? maxX : initialX;
        this.direction = direction >= 0 ? 1 : -1;
        this.inRange = Boolean(inRange);
    }

    // Gets enemy x position
    get x(): number {
        return this.position.x;
    }

    // Sets enemy x position
    set x(value: number) {
        if (Number.isFinite(value)) {
            this.position.x = value;
        }
    }

    // Updates patrol and chase movement
    update({ characterX, characterY, floorY, behavior }: EnemyUpdateState): void {
        const patrolSpeed = behavior.speed;
        const chaseSpeed = behavior.speedInRange;
        const horizontalDistance = characterX - this.position.x;
        const verticalDistance = abs(characterY - floorY);
        const isHorizontallyNear = abs(horizontalDistance) <= behavior.distRange;
        const isVerticallyNear = verticalDistance <= behavior.verticalRange;
        const inDeadzone = abs(horizontalDistance) <= behavior.chaseDeadzone;

        this.inRange = isHorizontallyNear && isVerticallyNear;

        let direction: 1 | -1 = this.direction >= 0 ? 1 : -1;
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
    isTouching(characterX: number, characterY: number, floorY: number, distContact: number): boolean {
        const dx = characterX - this.position.x;
        const dy = characterY - floorY;
        return sqrt(dx * dx + dy * dy) < distContact;
    }
}
