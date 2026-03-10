class Platform {
    x;
    y;
    w;
    isContact;
    level;
    contactTolerance;
    // Sets up one platform
    constructor({ x, y, w, isContact = false, level = 1 }) {
        this.x = Number.isFinite(x) ? x : 0;
        this.y = Number.isFinite(y) ? y : 0;
        this.w = Number.isFinite(w) ? w : 0;
        this.isContact = Boolean(isContact);
        this.level = Number.isFinite(level) ? level : 1;
        this.contactTolerance = 6;
    }
    // Checks if the character is on the platform
    hasContact(characterX, characterY, { isFalling = false, isJumping = false } = {}) {
        // Check if it's in the platform range
        const isWithinXRange = characterX >= this.x && characterX <= this.x + this.w;
        if (!isWithinXRange) {
            return false;
        }
        // While jumping it should not stick to the platform's top
        if (isJumping) {
            return false;
        }
        const deltaY = characterY - this.y;
        if (isFalling) {
            return deltaY >= -this.contactTolerance && deltaY <= this.contactTolerance;
        }
        return abs(deltaY) <= this.contactTolerance;
    }
    // Updates and returns platform contact state
    updateContact(characterX, characterY, state = {}) {
        const hasContact = this.hasContact(characterX, characterY, state);
        const lostContact = this.isContact && !hasContact;
        this.isContact = hasContact;
        return { hasContact, lostContact };
    }
}
