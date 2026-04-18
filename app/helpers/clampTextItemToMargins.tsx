import { EDGE_MARGIN_MM, TOP_GUIDE_OFFSET_MM } from "../constans/constans";
import { TextItem } from "../types/types";
import { clamp, maxFontSizeForText, textFrameWidth } from "./helpers";

export function clampTextItemToMargins(
    item: TextItem,
    fieldWidth: number,
    fieldHeight: number,
  ): TextItem {
    const safeFontSize = clamp(
      item.fontSize,
      1,
      maxFontSizeForText(item.text, fieldWidth, fieldHeight),
    );
    const frameWidth = textFrameWidth(item.text, safeFontSize);
    const frameHeight = safeFontSize + 8;
    const maxX = Math.max(EDGE_MARGIN_MM, fieldWidth - EDGE_MARGIN_MM - frameWidth + 4);
    const minY = EDGE_MARGIN_MM + frameHeight / 2;
    const maxY = Math.max(minY, fieldHeight - TOP_GUIDE_OFFSET_MM - frameHeight / 2);
  
    return {
      ...item,
      fontSize: safeFontSize,
      x: clamp(item.x, EDGE_MARGIN_MM, maxX),
      y: clamp(item.y, minY, maxY),
    };
  }