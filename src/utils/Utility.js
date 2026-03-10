class Utility {
    // Validates and merges ranges
    static normalizeRanges(ranges = []) {
        const cleaned = [];
        for (const input of ranges) {
            const rawMin = Number(input?.min);
            const rawMax = Number(input?.max);
            if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
                continue;
            }
            const start = min(rawMin, rawMax);
            const end = max(rawMin, rawMax);
            if (end - start <= 1) {
                continue;
            }
            cleaned.push({ min: start, max: end });
        }

        cleaned.sort((left, right) => left.min - right.min);

        const merged = [];
        for (const current of cleaned) {
            const last = merged[merged.length - 1];
            if (!last || current.min > last.max) {
                merged.push(current);
            } else {
                last.max = max(last.max, current.max);
            }
        }
        return merged;
    }

    // Subtracts blocked ranges from one base range
    static subtractRanges(baseRange, blockedRanges = []) {
        const rawMin = Number(baseRange?.min);
        const rawMax = Number(baseRange?.max);
        if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
            return [];
        }
        const start = min(rawMin, rawMax);
        const end = max(rawMin, rawMax);
        if (end - start <= 1) {
            return [];
        }

        const blocked = Utility.normalizeRanges(blockedRanges);
        const free = [];
        let currentStart = start;

        for (const block of blocked) {
            const blockStart = max(start, block.min);
            const blockEnd = min(end, block.max);

            if (blockEnd <= currentStart) {
                continue;
            }

            if (blockStart > currentStart) {
                free.push({ min: currentStart, max: blockStart });
            }

            currentStart = max(currentStart, blockEnd);
            if (currentStart >= end) {
                break;
            }
        }

        if (currentStart < end) {
            free.push({ min: currentStart, max: end });
        }

        return free.filter((segment) => segment.max - segment.min > 1);
    }

    // Finds the first range that contains x
    static findRangeForPoint(ranges = [], x = 0) {
        return ranges.find((range) => x >= range.min && x <= range.max);
    }

    // Removes and returns one random item from array
    static takeRandom(list = []) {
        if (!Array.isArray(list) || !list.length) {
            return undefined;
        }
        const index = floor(random(0, list.length));
        const [item] = list.splice(index, 1);
        return item;
    }

    // Returns a random integer between min and max
    static randomToFloor(min, max) {
        return floor(random(min, max));
    }
}
