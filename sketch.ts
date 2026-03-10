/*
Sheep Run
p5.js platformer game
*/

import GameManager from "./src/managers/GameManager";
import LoaderOverlay from "./src/utils/LoaderOverlay";

let game: GameManager;

function preload(): void {
    LoaderOverlay.show("Loading assets...");
    game = new GameManager(3);
    game.preload();
}

function setup(): void {
    createCanvas(1024, 576);
    game.setup();
    LoaderOverlay.hide();
}

function draw(): void {
    game.draw();
}

function keyPressed(): void {
    game.keyPressed();
}

function keyReleased(): void {
    game.keyReleased();
}

Object.assign(window, {
    preload,
    setup,
    draw,
    keyPressed,
    keyReleased,
});
