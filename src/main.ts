import { Game } from './game.ts';

const game = new Game();
game.init().catch(console.error);
