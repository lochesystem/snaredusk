import { GAME_HEIGHT, GAME_WIDTH } from './constants.ts';

/** Converte coordenadas do cliente para o espaço lógico do jogo (0..GAME_WIDTH). */
export function clientToGameScreen(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  gameWidth = GAME_WIDTH,
  gameHeight = GAME_HEIGHT,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: ((clientX - rect.left) / rect.width) * gameWidth,
    y: ((clientY - rect.top) / rect.height) * gameHeight,
  };
}
