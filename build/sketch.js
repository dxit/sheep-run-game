/*
Sheep Run
p5.js platformer game
*/
let game;
function preload() {
    LoaderOverlay.show("Loading assets...");
    game = new GameManager(3);
    game.preload();
}
function setup() {
    createCanvas(1024, 576);
    game.setup();
    LoaderOverlay.hide();
}
function draw() {
    game.draw();
}
function keyPressed() {
    game.keyPressed();
}
function keyReleased() {
    game.keyReleased();
}
