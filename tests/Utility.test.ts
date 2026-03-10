import { describe, expect, it, vi } from "vitest";
import Utility from "../src/utils/Utility";

describe("Utility", () => {
    it("normalizes and merges valid ranges", () => {
        const ranges = Utility.normalizeRanges([
            { min: 10, max: 2 },
            { min: 5, max: 8 },
            { min: 7, max: 12 },
            { min: Number.NaN, max: 20 },
            { min: 15, max: 15 },
        ]);

        expect(ranges).toEqual([
            { min: 2, max: 12 },
        ]);
    });

    it("subtracts blocked intervals from a base range", () => {
        const free = Utility.subtractRanges(
            { min: 0, max: 100 },
            [
                { min: 10, max: 20 },
                { min: 40, max: 50 },
                { min: 80, max: 120 },
            ],
        );

        expect(free).toEqual([
            { min: 0, max: 10 },
            { min: 20, max: 40 },
            { min: 50, max: 80 },
        ]);
    });

    it("finds the first range that contains a point", () => {
        const found = Utility.findRangeForPoint(
            [
                { min: 10, max: 20 },
                { min: 30, max: 40 },
            ],
            35,
        );

        expect(found).toEqual({ min: 30, max: 40 });
    });

    it("takes one random element and mutates the source list", () => {
        const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.6);
        const source = ["a", "b", "c"];

        const picked = Utility.takeRandom(source);

        expect(picked).toBe("b");
        expect(source).toEqual(["a", "c"]);

        randomSpy.mockRestore();
    });

    it("returns a floored random value between bounds (even if bounds are inverted)", () => {
        const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42);

        const value = Utility.randomToFloor(10, 2);

        expect(value).toBeGreaterThanOrEqual(2);
        expect(value).toBeLessThan(10);
        expect(value).toBe(5);

        randomSpy.mockRestore();
    });
});
