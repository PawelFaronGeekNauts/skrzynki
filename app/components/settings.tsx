"use client";

import { NumericMmInput } from "../components/numericInput";
import {
    CABINET_MIN_HEIGHT_MM,
  EDGE_MARGIN_MM,
  INLET_FIXED_HEIGHT_MM,
  INLET_MIN_WIDTH_MM,
  MIN_FIELD_HEIGHT_MM,
  MIN_FIELD_WIDTH_MM,
  TOP_GUIDE_OFFSET_MM,
} from "../constans/constans";
import {
  TextItem,
  RectItem
} from "../types/types";
import {
    clamp,
  estimatedTextWidth,
  maxFontSizeForText,
  textFrameWidth
} from "../helpers/helpers";
import { clampTextItemToMargins } from "../helpers/clampTextItemToMargins";

type Props = {
  fieldWidth: number;
  fieldHeight: number;

  setFieldWidth: (v: number) => void;
  setFieldHeight: (v: number) => void;

  enableTexts: boolean;
  enableInlets: boolean;
  enableCabinets: boolean;

  setEnableTexts: (v: boolean) => void;
  setEnableInlets: (v: boolean) => void;
  setEnableCabinets: (v: boolean) => void;

  texts: TextItem[];
  setTexts: React.Dispatch<React.SetStateAction<TextItem[]>>;

  inlets: RectItem[];
  setInlets: React.Dispatch<React.SetStateAction<RectItem[]>>;

  cabinets: RectItem[];
  setCabinets: React.Dispatch<React.SetStateAction<RectItem[]>>;

  overlapErrors: string[];

  canExport: boolean;

  exportDxf: (model: any) => void;
  model: any;
};

export default function Settings({
  fieldWidth,
  fieldHeight,
  setFieldWidth,
  setFieldHeight,

  enableTexts,
  enableInlets,
  enableCabinets,
  setEnableTexts,
  setEnableInlets,
  setEnableCabinets,

  texts,
  setTexts,
  inlets,
  setInlets,
  cabinets,
  setCabinets,

  overlapErrors,
  canExport,
  exportDxf,
  model,
}: Props) {
  const nextId = (items: { id: number }[]) =>
    items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  return (
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
      max={500}
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
              min={INLET_MIN_WIDTH_MM }
              max={Math.max(1, fieldWidth - (EDGE_MARGIN_MM * 2 + 10))}
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
                y: fieldHeight - TOP_GUIDE_OFFSET_MM - 100,
                width: INLET_MIN_WIDTH_MM,
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
              max={Math.max(1, fieldWidth - (EDGE_MARGIN_MM * 2 + 10))}
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
                y: fieldHeight - TOP_GUIDE_OFFSET_MM - 220,
                width: INLET_MIN_WIDTH_MM,
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
  );
}