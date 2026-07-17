import { Text, type TextStyleOptions } from 'pixi.js';

const PIXEL_FONT = '"Courier New", Courier, monospace';

export function pixelTextStyle(
  fontSize: number,
  fill: string | number = 0xf0e6d3,
  extra: Partial<TextStyleOptions> = {},
): TextStyleOptions {
  return {
    fontFamily: PIXEL_FONT,
    fontSize,
    fill,
    fontWeight: 'normal',
    letterSpacing: 0,
    ...extra,
  };
}

export function createPixelText(
  text: string,
  fontSize: number,
  fill: string | number = 0xf0e6d3,
  extra?: Partial<TextStyleOptions>,
): Text {
  return new Text({
    text,
    style: pixelTextStyle(fontSize, fill, extra),
    roundPixels: true,
  });
}

/** Arredonda posição de UI no mundo para evitar subpixel blur. */
export function snapContainer(container: { x: number; y: number }): void {
  container.x = Math.round(container.x);
  container.y = Math.round(container.y);
}
