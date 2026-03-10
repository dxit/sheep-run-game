export type NumericRange = {
    min: number;
    max: number;
};

export default class Utility {
    // Validates and merges ranges
    static normalizeRanges(ranges: Array<Partial<NumericRange>> = []): NumericRange[] {
        const cleaned: NumericRange[] = [];
        for (const input of ranges) {
            const rawMin = Number(input?.min);
            const rawMax = Number(input?.max);
            if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
                continue;
            }
            const start = Math.min(rawMin, rawMax);
            const end = Math.max(rawMin, rawMax);
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
                last.max = Math.max(last.max, current.max);
            }
        }
        return merged;
    }

    // Subtracts blocked ranges from one base range
    static subtractRanges(baseRange: Partial<NumericRange>, blockedRanges: Array<Partial<NumericRange>> = []): NumericRange[] {
        const rawMin = Number(baseRange?.min);
        const rawMax = Number(baseRange?.max);
        if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
            return [];
        }
        const start = Math.min(rawMin, rawMax);
        const end = Math.max(rawMin, rawMax);
        if (end - start <= 1) {
            return [];
        }

        const blocked = Utility.normalizeRanges(blockedRanges);
        const free: NumericRange[] = [];
        let currentStart = start;

        for (const block of blocked) {
            const blockStart = Math.max(start, block.min);
            const blockEnd = Math.min(end, block.max);

            if (blockEnd <= currentStart) {
                continue;
            }

            if (blockStart > currentStart) {
                free.push({ min: currentStart, max: blockStart });
            }

            currentStart = Math.max(currentStart, blockEnd);
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
    static findRangeForPoint(ranges: NumericRange[] = [], x = 0): NumericRange | undefined {
        return ranges.find((range) => x >= range.min && x <= range.max);
    }

    // Removes and returns one random item from array
    static takeRandom<T>(list: T[] = []): T | undefined {
        if (!Array.isArray(list) || !list.length) {
            return undefined;
        }
        const index = Math.floor(Math.random() * list.length);
        const [item] = list.splice(index, 1);
        return item;
    }

    // Returns a random integer between min and max
    static randomToFloor(min: number, max: number): number {
        const lower = Math.min(min, max);
        const upper = Math.max(min, max);
        return Math.floor(Math.random() * (upper - lower) + lower);
    }
}
