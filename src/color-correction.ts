const IS_COLOR = /^#[A-F0-9]+$/i;
const NOT_COLOR = /[^A-F0-9]/gi;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  // Convert RGB to HSL, not ideal but it's faster than HCL or full YIQ conversion
  // based on http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = Math.min(Math.max(0, (max + min) / 2), 1);
  const d = Math.min(Math.max(0, max - min), 1);

  if (d === 0) {
    return [d, d, l];
  }

  let h: number;
  switch (max) {
    case r:
      h = Math.min(Math.max(0, (g - b) / d + (g < b ? 6 : 0)), 6);
      break;
    case g:
      h = Math.min(Math.max(0, (b - r) / d + 2), 6);
      break;
    default:
      h = Math.min(Math.max(0, (r - g) / d + 4), 6);
      break;
  }
  h /= 6;

  let s = l > 0.5 ? d / (2 * (1 - l)) : d / (2 * l);
  s = Math.min(Math.max(0, s), 1);

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hueToRgb = (pp: number, qq: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return pp + (qq - pp) * 6 * t;
    if (t < 1 / 2) return qq;
    if (t < 2 / 3) return pp + (qq - pp) * (2 / 3 - t) * 6;
    return pp;
  };

  if (s === 0) {
    const rgb = Math.round(Math.min(Math.max(0, 255 * l), 255)); // achromatic
    return [rgb, rgb, rgb];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(Math.min(Math.max(0, 255 * hueToRgb(p, q, h + 1 / 3)), 255)),
    Math.round(Math.min(Math.max(0, 255 * hueToRgb(p, q, h)), 255)),
    Math.round(Math.min(Math.max(0, 255 * hueToRgb(p, q, h - 1 / 3)), 255)),
  ];
}

export class ColorCorrection {
  private cache = new Map<string, string>();

  public calculate(color: string) {
    color = color.toLowerCase();
    if (this.cache.has(color)) {
      return this.cache.get(color)!;
    }

    if (!IS_COLOR.test(color)) return color;

    let newColor = color;
    for (let i = 0; i < 20; ++i) {
      if (!this.shouldConvertColor(newColor)) {
        break;
      }
      newColor = this.convertColor(newColor);
    }

    this.cache.set(color, newColor);

    this.cache.size > 1000 && this.cache.delete(this.cache.entries().next().value[0]);

    return newColor;
  }

  private convertColor(color: string) {
    const FACTOR = 0.1;
    color = color.replace(NOT_COLOR, "");

    if (color.length < 6) {
      color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
    }

    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);

    const hsl = rgbToHsl(r, g, b);
    let l = 1 - (1 - FACTOR) * (1 - hsl[2]);
    l = Math.min(Math.max(0, l), 1);

    const rgb = hslToRgb(hsl[0], hsl[1], l);

    let rStr = rgb[0].toString(16);
    let gStr = rgb[1].toString(16);
    let bStr = rgb[2].toString(16);

    rStr = ("00" + rStr).substr(rStr.length);
    gStr = ("00" + gStr).substr(gStr.length);
    bStr = ("00" + bStr).substr(bStr.length);

    return `#${rStr}${gStr}${bStr}`;
  }

  private shouldConvertColor(color: string) {
    color = color.replace(NOT_COLOR, "");
    if (color.length < 6) {
      color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
    }

    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 128;
  }
}
