"use client";

import { useEffect, useMemo, useState } from "react";
import makerjs from "makerjs";
import { exportDxf } from "./helpers/dxfExport";
type TextItem = {
  id: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
};

type RectItem = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type BoundsItem = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type NumericMmInputProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

const EDGE_MARGIN_MM = 25;
const TOP_GUIDE_OFFSET_MM = 15;
const MIN_FIELD_WIDTH_MM = 400;
const MIN_FIELD_HEIGHT_MM = 1000;
const INLET_FIXED_HEIGHT_MM = 50;
const CABINET_MIN_HEIGHT_MM = 100;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function estimatedTextWidth(text: string, fontSize: number) {
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

function maxFontSizeForText(text: string, fieldWidth: number, fieldHeight: number) {
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

function textFrameWidth(text: string, fontSize: number) {
  return estimatedTextWidth(text, fontSize) + 8;
}

function clampTextItemToMargins(
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

function overlaps(a: BoundsItem, b: BoundsItem) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function NumericMmInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: NumericMmInputProps) {
  const safeValue = Number.isFinite(value) ? value : min;
  const [draftValue, setDraftValue] = useState(String(safeValue));

  useEffect(() => {
    setDraftValue(String(safeValue));
  }, [safeValue]);

  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span>
        {label}: {safeValue} mm
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: "100%" }}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draftValue}
        onChange={(event) => {
          const raw = event.target.value;
          setDraftValue(raw);
          if (raw === "") {
            return;
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          if (draftValue.trim() === "") {
            onChange(0);
          }
        }}
        style={{ width: "100%", padding: 6 }}
      />
    </label>
  );
}

export default function Home() {
  const [fieldWidth, setFieldWidth] = useState(MIN_FIELD_WIDTH_MM);
  const [fieldHeight, setFieldHeight] = useState(MIN_FIELD_HEIGHT_MM);

  const [enableTexts, setEnableTexts] = useState(true);
  const [enableInlets, setEnableInlets] = useState(true);
  const [enableCabinets, setEnableCabinets] = useState(true);

  const [texts, setTexts] = useState<TextItem[]>([
    { id: 1, text: "Here is your text", x: 50, y: fieldHeight - TOP_GUIDE_OFFSET_MM - 20, fontSize: 20 },
  ]);
  const [inlets, setInlets] = useState<RectItem[]>([
    { id: 1, x: 30, y: 30, width: 40, height: INLET_FIXED_HEIGHT_MM },
  ]);
  const [cabinets, setCabinets] = useState<RectItem[]>([
    { id: 1, x: 170, y: 50, width: 60, height: CABINET_MIN_HEIGHT_MM },
  ]);

  const clampedTexts = useMemo(
    () => texts.map((item) => clampTextItemToMargins(item, fieldWidth, fieldHeight)),
    [fieldHeight, fieldWidth, texts],
  );

  const model = useMemo(() => {
    const models: Record<string, makerjs.IModel> = {
      field: new makerjs.models.Rectangle(fieldWidth, fieldHeight),
    };
    const paths: Record<string, makerjs.IPath> = {
      centerX: new makerjs.paths.Line(
        [fieldWidth / 2, 0],
        [fieldWidth / 2, fieldHeight],
      ),
      centerY: new makerjs.paths.Line(
        [0, fieldHeight / 2],
        [fieldWidth, fieldHeight / 2],
      ),
      leftGuide: new makerjs.paths.Line(
        [EDGE_MARGIN_MM, 0],
        [EDGE_MARGIN_MM, fieldHeight],
      ),
      rightGuide: new makerjs.paths.Line(
        [fieldWidth - EDGE_MARGIN_MM, 0],
        [fieldWidth - EDGE_MARGIN_MM, fieldHeight],
      ),
      topGuide: new makerjs.paths.Line(
        [0, fieldHeight - TOP_GUIDE_OFFSET_MM],
        [fieldWidth, fieldHeight - TOP_GUIDE_OFFSET_MM],
      ),
    };

    if (enableTexts) {
      for (const item of clampedTexts) {
        const textWidth = estimatedTextWidth(item.text, item.fontSize);
        const frameHeight = item.fontSize + 8;
        const frame = new makerjs.models.Rectangle(textWidth + 8, frameHeight);
        makerjs.model.move(frame, [item.x - 4, item.y - frameHeight / 2]);
        models[`textFrame_${item.id}`] = frame;
        paths[`textBaseline_${item.id}`] = new makerjs.paths.Line(
          [item.x, item.y],
          [item.x + textWidth, item.y],
        );
      }
    }

    if (enableInlets) {
      for (const inlet of inlets) {
        const inletModel = new makerjs.models.Rectangle(inlet.width, inlet.height);
        makerjs.model.move(inletModel, [inlet.x, inlet.y]);
        models[`inlet_${inlet.id}`] = inletModel;
      }
    }

    if (enableCabinets) {
      for (const cabinet of cabinets) {
        const cabinetModel = new makerjs.models.Rectangle(
          cabinet.width,
          cabinet.height,
        );
        makerjs.model.move(cabinetModel, [cabinet.x, cabinet.y]);
        models[`cabinet_${cabinet.id}`] = cabinetModel;
      }
    }

    return { models, paths };
  }, [
    cabinets,
    enableCabinets,
    enableInlets,
    enableTexts,
    fieldHeight,
    fieldWidth,
    inlets,
    clampedTexts,
  ]);

  const svg = useMemo(() => {
    const baseSvg = makerjs.exporter.toSVG(model, {
      stroke: "#1f2937",
      strokeWidth: "1",
      fill: "none",
    });

    const marker = enableTexts
      ? clampedTexts
          .map((item) => {
            const safeText = escapeXml(item.text);
            const svgY = fieldHeight - item.y;
            // SVG text uses baseline coordinates; this offset centers glyphs in frame.
            const baselineOffset = item.fontSize * 0.34;
            return `<text x="${item.x}" y="${svgY + baselineOffset}" font-size="${item.fontSize}" fill="#2563eb" font-family="Arial, sans-serif">${safeText}</text>`;
          })
          .join("")
      : "";

    return baseSvg.replace("</svg>", `<g>${marker}</g></svg>`);
  }, [clampedTexts, enableTexts, fieldHeight, model]);


  const nextId = (items: { id: number }[]) =>
    items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  const overlapErrors = useMemo(() => {
    const bounds: BoundsItem[] = [];

    if (enableTexts) {
      for (const item of clampedTexts) {
        const width = textFrameWidth(item.text, item.fontSize);
        const height = item.fontSize + 8;
        bounds.push({
          key: `Napis #${item.id}`,
          x: item.x - 4,
          y: item.y - height / 2,
          width,
          height,
        });
      }
    }

    if (enableInlets) {
      for (const item of inlets) {
        bounds.push({
          key: `Wlot #${item.id}`,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        });
      }
    }

    if (enableCabinets) {
      for (const item of cabinets) {
        bounds.push({
          key: `Szafka #${item.id}`,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        });
      }
    }

    const collisions: string[] = [];
    for (let i = 0; i < bounds.length; i += 1) {
      for (let j = i + 1; j < bounds.length; j += 1) {
        if (overlaps(bounds[i], bounds[j])) {
          collisions.push(`${bounds[i].key} nachodzi na ${bounds[j].key}`);
        }
      }
    }

    return collisions;
  }, [cabinets, clampedTexts, enableCabinets, enableInlets, enableTexts, inlets]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  const canExport = overlapErrors.length === 0;

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 1100 }}>
      <h1 style={{ marginBottom: 8 }}>Pozycjonowanie elementow na skrzynce</h1>
      <p style={{ marginTop: 0, marginBottom: 16 }}>
        Wszystkie suwaki i wartosci sa w mm.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
        <div
          style={{ border: "1px solid #d1d5db", padding: 12, borderRadius: 8 }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            display: "grid",
            gap: 12,
            alignContent: "start",
          }}
        >
          <NumericMmInput
            label="Szerokosc prostokata"
            value={fieldWidth}
            min={MIN_FIELD_WIDTH_MM}
            max={2000}
            onChange={(value) => setFieldWidth(Math.max(value, MIN_FIELD_WIDTH_MM))}
          />
          <NumericMmInput
            label="Wysokosc prostokata"
            value={fieldHeight}
            min={MIN_FIELD_HEIGHT_MM}
            max={2000}
            onChange={(value) => setFieldHeight(Math.max(value, MIN_FIELD_HEIGHT_MM))}
          />

          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Sekcja: Napisy</summary>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={enableTexts}
                  onChange={(event) => setEnableTexts(event.target.checked)}
                />
                Napisy
              </label>
              {enableTexts &&
                texts.map((item) => (
              <div
                key={item.id}
                style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 8 }}
              >
                <details open>
                  <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>
                    Napis #{item.id}: {item.text || "(pusty)"}
                  </summary>
                  <div>
                <input
                  value={item.text}
                  onChange={(event) =>
                    setTexts((prev) =>
                      prev.map((x) =>
                        x.id === item.id
                          ? clampTextItemToMargins(
                              { ...x, text: event.target.value },
                              fieldWidth,
                              fieldHeight,
                            )
                          : x,
                      ),
                    )
                  }
                  placeholder="Tresc napisu"
                  style={{ width: "100%", marginBottom: 8, padding: 6 }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <NumericMmInput
                    label="X"
                    value={item.x}
                    min={EDGE_MARGIN_MM}
                    max={Math.max(
                      EDGE_MARGIN_MM,
                      fieldWidth -
                        EDGE_MARGIN_MM -
                        (estimatedTextWidth(item.text, item.fontSize) + 8) +
                        4,
                    )}
                    onChange={(value) =>
                      setTexts((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? clampTextItemToMargins(
                                { ...x, x: value },
                                fieldWidth,
                                fieldHeight,
                              )
                            : x,
                        ),
                      )
                    }
                  />
                  <NumericMmInput
                    label="Y"
                    value={item.y}
                    min={EDGE_MARGIN_MM + (item.fontSize + 8) / 2}
                    max={Math.max(
                      EDGE_MARGIN_MM + (item.fontSize + 8) / 2,
                      fieldHeight - TOP_GUIDE_OFFSET_MM - (item.fontSize + 8) / 2,
                    )}
                    onChange={(value) =>
                      setTexts((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? clampTextItemToMargins(
                                { ...x, y: value },
                                fieldWidth,
                                fieldHeight,
                              )
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <div style={{ marginTop: 8 }}>
                  <NumericMmInput
                    label="Wysokosc napisu (font)"
                    value={item.fontSize}
                    min={1}
                    max={maxFontSizeForText(item.text, fieldWidth, fieldHeight)}
                    onChange={(value) =>
                      setTexts((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? clampTextItemToMargins(
                                { ...x, fontSize: value },
                                fieldWidth,
                                fieldHeight,
                              )
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTexts((prev) =>
                      prev.map((x) => {
                        if (x.id !== item.id) {
                          return x;
                        }
                        const safeItem = clampTextItemToMargins(x, fieldWidth, fieldHeight);
                        const frameWidth = textFrameWidth(
                          safeItem.text,
                          safeItem.fontSize,
                        );
                        const centeredX = (fieldWidth - frameWidth) / 2 + 4;
                        return clampTextItemToMargins(
                          { ...safeItem, x: centeredX },
                          fieldWidth,
                          fieldHeight,
                        );
                      }),
                    )
                  }
                  style={{ marginTop: 8, padding: "6px 10px", marginRight: 8 }}
                >
                  Wysrodkuj poziomo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTexts((prev) => prev.filter((x) => x.id !== item.id))
                  }
                  style={{ marginTop: 8, padding: "6px 10px" }}
                >
                  Usun napis
                </button>
                  </div>
                </details>
              </div>
                ))}
              <button
                type="button"
                onClick={() =>
                  setTexts((prev) => [
                    ...prev,
                    { id: nextId(prev), text: "NOWY", x: 40, y: 40, fontSize: 14 },
                  ])
                }
                style={{ padding: "8px 10px" }}
              >
                Dodaj napis
              </button>
            </div>
          </details>

          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Sekcja: Wloty na listy
            </summary>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={enableInlets}
                  onChange={(event) => setEnableInlets(event.target.checked)}
                />
                Wlot na listy
              </label>
              {enableInlets &&
                inlets.map((item) => (
              <div
                key={item.id}
                style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 8 }}
              >
                <details open>
                  <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>
                    Wlot #{item.id}
                  </summary>
                  <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <NumericMmInput
                    label="X"
                    value={item.x}
                    min={EDGE_MARGIN_MM}
                    max={Math.max(
                      EDGE_MARGIN_MM,
                      fieldWidth - EDGE_MARGIN_MM - item.width,
                    )}
                    onChange={(value) =>
                      setInlets((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                height: INLET_FIXED_HEIGHT_MM,
                                x: clamp(
                                  value,
                                  EDGE_MARGIN_MM,
                                  Math.max(
                                    EDGE_MARGIN_MM,
                                    fieldWidth - EDGE_MARGIN_MM - x.width,
                                  ),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <NumericMmInput
                    label="Y"
                    value={item.y}
                    min={EDGE_MARGIN_MM}
                    max={Math.max(
                      EDGE_MARGIN_MM,
                      fieldHeight - TOP_GUIDE_OFFSET_MM - item.height,
                    )}
                    onChange={(value) =>
                      setInlets((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                height: INLET_FIXED_HEIGHT_MM,
                                y: clamp(
                                  value,
                                  EDGE_MARGIN_MM,
                                  Math.max(
                                    EDGE_MARGIN_MM,
                                    fieldHeight - TOP_GUIDE_OFFSET_MM - x.height,
                                  ),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <NumericMmInput
                    label="Szerokosc"
                    value={item.width}
                    min={1}
                    max={Math.max(1, fieldWidth - EDGE_MARGIN_MM * 2)}
                    onChange={(value) =>
                      setInlets((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                height: INLET_FIXED_HEIGHT_MM,
                                width: clamp(
                                  value,
                                  1,
                                  Math.max(1, fieldWidth - EDGE_MARGIN_MM * 2),
                                ),
                                x: clamp(
                                  x.x,
                                  EDGE_MARGIN_MM,
                                  Math.max(
                                    EDGE_MARGIN_MM,
                                    fieldWidth -
                                      EDGE_MARGIN_MM -
                                      clamp(
                                        value,
                                        1,
                                        Math.max(1, fieldWidth - EDGE_MARGIN_MM * 2),
                                      ),
                                  ),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setInlets((prev) =>
                      prev.map((x) =>
                        x.id === item.id
                          ? {
                              ...x,
                              height: INLET_FIXED_HEIGHT_MM,
                              x: clamp(
                                (fieldWidth - x.width) / 2,
                                EDGE_MARGIN_MM,
                                Math.max(
                                  EDGE_MARGIN_MM,
                                  fieldWidth - EDGE_MARGIN_MM - x.width,
                                ),
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                  style={{ marginTop: 8, padding: "6px 10px", marginRight: 8 }}
                >
                  Wysrodkuj poziomo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInlets((prev) => prev.filter((x) => x.id !== item.id))
                  }
                  style={{ marginTop: 8, padding: "6px 10px" }}
                >
                  Usun wlot
                </button>
                  </div>
                </details>
              </div>
                ))}
              <button
                type="button"
                onClick={() =>
                  setInlets((prev) => [
                    ...prev,
                    {
                      id: nextId(prev),
                      x: 30,
                      y: 30,
                      width: 30,
                      height: INLET_FIXED_HEIGHT_MM,
                    },
                  ])
                }
                style={{ padding: "8px 10px" }}
              >
                Dodaj wlot
              </button>
            </div>
          </details>

          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Sekcja: Szafki
            </summary>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={enableCabinets}
                  onChange={(event) => setEnableCabinets(event.target.checked)}
                />
                Szafka
              </label>
              {enableCabinets &&
                cabinets.map((item) => (
              <div
                key={item.id}
                style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 8 }}
              >
                <details open>
                  <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>
                    Szafka #{item.id}
                  </summary>
                  <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <NumericMmInput
                    label="X"
                    value={item.x}
                    min={EDGE_MARGIN_MM}
                    max={Math.max(
                      EDGE_MARGIN_MM,
                      fieldWidth - EDGE_MARGIN_MM - item.width,
                    )}
                    onChange={(value) =>
                      setCabinets((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                x: clamp(
                                  value,
                                  EDGE_MARGIN_MM,
                                  Math.max(
                                    EDGE_MARGIN_MM,
                                    fieldWidth - EDGE_MARGIN_MM - x.width,
                                  ),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <NumericMmInput
                    label="Y"
                    value={item.y}
                    min={EDGE_MARGIN_MM}
                    max={Math.max(
                      EDGE_MARGIN_MM,
                      fieldHeight - TOP_GUIDE_OFFSET_MM - item.height,
                    )}
                    onChange={(value) =>
                      setCabinets((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                y: clamp(
                                  value,
                                  EDGE_MARGIN_MM,
                                  Math.max(
                                    EDGE_MARGIN_MM,
                                    fieldHeight - TOP_GUIDE_OFFSET_MM - x.height,
                                  ),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <NumericMmInput
                    label="Szerokosc"
                    value={item.width}
                    min={1}
                    max={Math.max(1, fieldWidth - EDGE_MARGIN_MM * 2)}
                    onChange={(value) =>
                      setCabinets((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                width: clamp(
                                  value,
                                  1,
                                  Math.max(1, fieldWidth - EDGE_MARGIN_MM * 2),
                                ),
                                x: clamp(
                                  x.x,
                                  EDGE_MARGIN_MM,
                                  Math.max(
                                    EDGE_MARGIN_MM,
                                    fieldWidth -
                                      EDGE_MARGIN_MM -
                                      clamp(
                                        value,
                                        1,
                                        Math.max(1, fieldWidth - EDGE_MARGIN_MM * 2),
                                      ),
                                  ),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <NumericMmInput
                    label="Wysokosc"
                    value={item.height}
                    min={CABINET_MIN_HEIGHT_MM}
                    max={Math.max(
                      CABINET_MIN_HEIGHT_MM,
                      fieldHeight - EDGE_MARGIN_MM - TOP_GUIDE_OFFSET_MM,
                    )}
                    onChange={(value) =>
                      setCabinets((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                height: clamp(
                                  value,
                                  CABINET_MIN_HEIGHT_MM,
                                  Math.max(
                                    CABINET_MIN_HEIGHT_MM,
                                    fieldHeight - EDGE_MARGIN_MM - TOP_GUIDE_OFFSET_MM,
                                  ),
                                ),
                                y: clamp(
                                  x.y,
                                  EDGE_MARGIN_MM,
                                  Math.max(
                                    EDGE_MARGIN_MM,
                                    fieldHeight -
                                      EDGE_MARGIN_MM -
                                      clamp(
                                        value,
                                        CABINET_MIN_HEIGHT_MM,
                                        Math.max(
                                          CABINET_MIN_HEIGHT_MM,
                                          fieldHeight -
                                            EDGE_MARGIN_MM -
                                            TOP_GUIDE_OFFSET_MM,
                                        ),
                                      ),
                                  ),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCabinets((prev) =>
                      prev.map((x) =>
                        x.id === item.id
                          ? {
                              ...x,
                              x: clamp(
                                (fieldWidth - x.width) / 2,
                                EDGE_MARGIN_MM,
                                Math.max(
                                  EDGE_MARGIN_MM,
                                  fieldWidth - EDGE_MARGIN_MM - x.width,
                                ),
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                  style={{ marginTop: 8, padding: "6px 10px", marginRight: 8 }}
                >
                  Wysrodkuj poziomo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCabinets((prev) => prev.filter((x) => x.id !== item.id))
                  }
                  style={{ marginTop: 8, padding: "6px 10px" }}
                >
                  Usun szafke
                </button>
                  </div>
                </details>
              </div>
                ))}
              <button
                type="button"
                onClick={() =>
                  setCabinets((prev) => [
                    ...prev,
                    {
                      id: nextId(prev),
                      x: 30,
                      y: 30,
                      width: 50,
                      height: CABINET_MIN_HEIGHT_MM,
                    },
                  ])
                }
                style={{ padding: "8px 10px" }}
              >
                Dodaj szafke
              </button>
            </div>
          </details>

          <button
            type="button"
            onClick={() => exportDxf(model)}
            disabled={!canExport}
            style={{
              marginTop: 4,
              padding: "10px 12px",
              borderRadius: 6,
              border: canExport ? "1px solid #2563eb" : "1px solid #9ca3af",
              background: canExport ? "#2563eb" : "#9ca3af",
              color: "#fff",
              cursor: canExport ? "pointer" : "not-allowed",
            }}
          >
            Eksportuj DXF
          </button>
          {!canExport && (
            <div style={{ color: "#b91c1c", fontSize: 13 }}>
              Nie mozna eksportowac. Wykryto nachodzenie elementow:
              <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                {overlapErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
