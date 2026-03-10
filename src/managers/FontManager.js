class FontManager {
    // Sets up font storage
    constructor() {
        this.fonts = {};
        this.defaultFont = "sans-serif";
    }

    // Loads custom fonts
    preload() {
        this.fonts.rimouski = loadFont("assets/fonts/rimouski_sb.otf");
    }

    // Applies a font (and optional size)
    use(name, size = undefined) {
        if (this.#isValidFont(name)) {
            textFont(this.fonts[name]);
        } else {
            textFont(this.defaultFont);
        }

        if (typeof size === "number" && Number.isFinite(size)) {
            textSize(size);
        }
    }

    // Checks whether a font is loaded
    #isValidFont(name) {
        return Boolean(this.fonts[name]);
    }
}
