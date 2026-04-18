import { EDGE_MARGIN_MM, TOP_GUIDE_OFFSET_MM } from "../constans/constans";
import { BoundsItem } from "../types/types";

export function textFrameWidth(text: string, fontSize: number) {
    return estimatedTextWidth(text, fontSize) + 8;
  }
  

export function estimatedTextWidth(text: string, fontSize: number) {
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (context) {
        context.font = `${fontSize}px Arial, sans-serif`;
        return Math.max(12, context.measureText(text || " ").width);
      }
    }
    return Math.max(12, text.length * fontSize * 0.52);
}

export function maxFontSizeForText(text: string, fieldWidth: number, fieldHeight: number) {
    const maxByHeight = Math.max(
      1,
      fieldHeight - EDGE_MARGIN_MM - TOP_GUIDE_OFFSET_MM - 8,
    );
    const maxTextWidth = Math.max(12, fieldWidth - EDGE_MARGIN_MM * 2 - 8);
    let low = 1;
    let high = maxByHeight;
  
    for (let i = 0; i < 16; i += 1) {
      const mid = (low + high) / 2;
      if (estimatedTextWidth(text, mid) <= maxTextWidth) {
        low = mid;
      } else {
        high = mid;
      }
    }
  
    return Math.max(1, Math.floor(low));
  }

  export function overlaps(a: BoundsItem, b: BoundsItem) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
  
  export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }