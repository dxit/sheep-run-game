class LoaderOverlay {
    // Shows the loader overlay and optional status text
    static show(status = undefined) {
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
    static hide() {
        const loader = this.#element();
        if (!loader) {
            return;
        }
        loader.classList.add("hidden");
    }

    // Updates loader status text
    static setStatus(status) {
        const node = document.getElementById("loader-status");
        if (!node || typeof status !== "string") {
            return;
        }
        node.textContent = status;
    }

    // Gets loader element
    static #element() {
        return document.getElementById("loader");
    }
}
