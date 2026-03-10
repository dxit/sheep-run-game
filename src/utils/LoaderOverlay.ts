export default class LoaderOverlay {
    // Shows the loader overlay and optional status text
    static show(status?: string): void {
        const loader = this.#element();
        if (!loader) {
            return;
        }
        if (typeof status === "string" && status.length) {
            this.setStatus(status);
        }
        loader.classList.remove("hidden");
    }

    // Hides the loader overlay
    static hide(): void {
        const loader = this.#element();
        if (!loader) {
            return;
        }
        loader.classList.add("hidden");
    }

    // Updates loader status text
    static setStatus(status: string): void {
        const node = document.getElementById("loader-status");
        if (!node || typeof status !== "string") {
            return;
        }
        node.textContent = status;
    }

    // Gets loader element
    static #element(): HTMLElement | null {
        return document.getElementById("loader");
    }
}
