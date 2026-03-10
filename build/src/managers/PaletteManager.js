class PaletteManager {
    themes;
    theme;
    // Sets up theme palette data
    constructor(defaultTheme = "light") {
        this.themes = this.#buildThemes();
        this.theme = this.themes[defaultTheme] ? defaultTheme : "light";
    }
    // Switches active theme
    use(theme) {
        if (this.themes[theme]) {
            this.theme = theme;
        }
    }
    // Returns active theme colors
    get colors() {
        return this.themes[this.theme] || this.themes.light;
    }
    // Builds a p5 color from a token
    color(token) {
        if (Array.isArray(token)) {
            const values = token.filter((value) => Number.isFinite(value));
            if (values.length === 4) {
                return color(values[0], values[1], values[2], values[3]);
            }
            if (values.length === 3) {
                return color(values[0], values[1], values[2]);
            }
            if (values.length === 2) {
                return color(values[0], values[1]);
            }
            if (values.length === 1) {
                return color(values[0]);
            }
        }
        return color(0, 0, 0);
    }
    // Applies the fill color
    fill(token) {
        fill(this.color(token));
    }
    // Applies the stroke color
    stroke(token) {
        stroke(this.color(token));
    }
    // Applies the background color
    background(token) {
        background(this.color(token));
    }
    // Builds light and dark theme objects
    #buildThemes() {
        const light = {
            ui: {
                text: {
                    primary: [0, 0, 0],
                    inverse: [255, 255, 255],
                    danger: [255, 0, 0],
                    warning: [240, 140, 40],
                },
                panel: {
                    gameover: [190, 35, 35, 220],
                    completed: [60, 150, 60, 220],
                    warning: [240, 140, 40, 220],
                    hint: [225, 120, 35, 220],
                    statusSuccess: [60, 150, 60, 220],
                },
            },
            shared: {
                white: [255, 255, 255],
                shadow: {
                    soft: [0, 0, 0, 20],
                    mid: [0, 0, 0, 50],
                },
                highlight: {
                    soft: [255, 255, 255, 150],
                },
            },
            terrain: {
                sky: {
                    day: [100, 155, 255],
                },
                earth: {
                    base: [145, 113, 95],
                    edge: [120, 110, 100],
                },
                tree: {
                    trunk: [25, 85, 53],
                },
                foliage: {
                    primary: [76, 143, 74],
                    secondary: [65, 122, 63],
                    edge: [40, 120, 60],
                    highlightSoft: [90, 175, 90, 160],
                    blade: [30, 110, 60],
                },
                ground: {
                    base: [60, 145, 70],
                },
                moss: {
                    primary: [60, 135, 70],
                },
                rock: {
                    primary: [150, 145, 140],
                    mutedSoft: [110, 120, 95, 180],
                },
                water: {
                    shallow: [70, 135, 185],
                    deep: [55, 115, 165],
                    ripple: [135, 200, 230, 170],
                },
                flagpole: {
                    flag: {
                        completed: [255, 215, 0],
                        default: [175, 0, 0],
                    },
                    fence: {
                        shadow: [60, 50, 50],
                    },
                    pole: {
                        body: [90, 95, 110],
                        highlight: [100, 100, 100],
                        base: [50, 55, 65],
                    },
                },
            },
            collectable: {
                body: [240, 140, 40],
                shade: [215, 118, 30],
                highlight: [255, 200, 130, 140],
                ridge: [235, 120, 30, 150],
                leaf: [80, 170, 90],
            },
            enemy: {
                fur: {
                    dark: [50, 55, 65],
                    mid: [90, 95, 110],
                    light: [140, 145, 160],
                },
                snout: [170, 175, 190],
                nose: [30, 30, 40],
                eye: {
                    idle: [255, 210, 60],
                    alert: [255, 80, 50],
                },
            },
            butterfly: {
                life: {
                    body: [50, 55, 65],
                    wing: {
                        primary: [255, 215, 0],
                        secondary: [255, 210, 60],
                    },
                },
                time: {
                    body: [60, 50, 50],
                    wing: {
                        primary: [220, 120, 170, 200],
                        secondary: [240, 170, 210, 200],
                    },
                },
            },
            character: {
                skin: {
                    base: [247, 210, 186],
                },
                shadow: {
                    medium: [0, 0, 0, 40],
                    deep: [0, 0, 0, 200],
                },
                feature: {
                    line: [197, 168, 148],
                },
                eye: {
                    pupil: [100],
                },
            },
        };
        const dark = {
            ui: {
                text: {
                    primary: [232, 238, 248],
                    inverse: [232, 238, 248],
                    danger: [220, 70, 70],
                    warning: [210, 120, 50],
                },
                panel: {
                    gameover: [190, 35, 35, 220],
                    completed: [60, 150, 60, 220],
                    warning: [240, 140, 40, 220],
                    hint: [225, 120, 35, 220],
                    statusSuccess: [60, 150, 60, 220],
                },
            },
            shared: {
                white: [232, 238, 248],
                shadow: {
                    soft: [0, 0, 0, 35],
                    mid: [0, 0, 0, 75],
                },
                highlight: {
                    soft: [232, 238, 248, 150],
                },
            },
            terrain: {
                sky: {
                    day: [18, 30, 56],
                },
                earth: {
                    base: [92, 74, 64],
                    edge: [88, 82, 82],
                },
                tree: {
                    trunk: [19, 48, 29],
                },
                foliage: {
                    primary: [56, 115, 68],
                    secondary: [38, 88, 52],
                    edge: [32, 77, 45],
                    highlightSoft: [70, 130, 78, 160],
                    blade: [26, 64, 38],
                },
                ground: {
                    base: [45, 104, 62],
                },
                moss: {
                    primary: [42, 97, 58],
                },
                rock: {
                    primary: [112, 108, 112],
                    mutedSoft: [86, 95, 82, 180],
                },
                water: {
                    shallow: [32, 73, 118],
                    deep: [22, 54, 92],
                    ripple: [92, 142, 184, 170],
                },
                flagpole: {
                    flag: {
                        completed: [220, 185, 75],
                        default: [150, 30, 30],
                    },
                    fence: {
                        shadow: [42, 39, 44],
                    },
                    pole: {
                        body: [78, 88, 108],
                        highlight: [85, 90, 105],
                        base: [44, 50, 63],
                    },
                },
            },
            collectable: {
                body: [210, 120, 50],
                shade: [184, 100, 38],
                highlight: [225, 178, 130, 140],
                ridge: [200, 100, 45, 150],
                leaf: [58, 122, 74],
            },
            enemy: {
                fur: {
                    dark: [44, 50, 63],
                    mid: [78, 88, 108],
                    light: [112, 122, 145],
                },
                snout: [130, 138, 160],
                nose: [20, 24, 33],
                eye: {
                    idle: [255, 190, 90],
                    alert: [215, 92, 65],
                },
            },
            butterfly: {
                life: {
                    body: [44, 50, 63],
                    wing: {
                        primary: [220, 185, 75],
                        secondary: [255, 190, 90],
                    },
                },
                time: {
                    body: [42, 39, 44],
                    wing: {
                        primary: [172, 102, 138, 200],
                        secondary: [186, 132, 166, 200],
                    },
                },
            },
            character: {
                skin: {
                    base: [220, 188, 166],
                },
                shadow: {
                    medium: [0, 0, 0, 60],
                    deep: [0, 0, 0, 220],
                },
                feature: {
                    line: [160, 138, 122],
                },
                eye: {
                    pupil: [85],
                },
            },
        };
        return {
            light,
            dark,
        };
    }
}
