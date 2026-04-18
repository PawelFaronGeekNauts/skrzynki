"use client";

import { useEffect, useMemo, useState } from "react";
import makerjs from "makerjs";
import { TextItem, RectItem, BoundsItem } from "./types/types";
import { EDGE_MARGIN_MM, TOP_GUIDE_OFFSET_MM, MIN_FIELD_WIDTH_MM, MIN_FIELD_HEIGHT_MM, INLET_FIXED_HEIGHT_MM, CABINET_MIN_HEIGHT_MM, INLET_MIN_WIDTH_MM } from "./constans/constans";
import {  estimatedTextWidth, overlaps, textFrameWidth } from "./helpers/helpers";
import { escapeXml } from "./helpers/escapeXml";
import { clampTextItemToMargins } from "./helpers/clampTextItemToMargins";
import Settings from "./components/settings";
import { exportDxf } from "./helpers/dxfExport";

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
    { id: 1, x: 30, y: fieldHeight - TOP_GUIDE_OFFSET_MM - 100, width: INLET_MIN_WIDTH_MM, height: INLET_FIXED_HEIGHT_MM },
  ]);
  const [cabinets, setCabinets] = useState<RectItem[]>([
    { id: 1, x: 30, y: fieldHeight - TOP_GUIDE_OFFSET_MM - 220, width: INLET_MIN_WIDTH_MM, height: CABINET_MIN_HEIGHT_MM },
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

    <Settings
      fieldWidth={fieldWidth}
      fieldHeight={fieldHeight}
      setFieldWidth={setFieldWidth}
      setFieldHeight={setFieldHeight}

      enableTexts={enableTexts}
      enableInlets={enableInlets}
      enableCabinets={enableCabinets}

      setEnableTexts={setEnableTexts}
      setEnableInlets={setEnableInlets}
      setEnableCabinets={setEnableCabinets}

      texts={texts}
      setTexts={setTexts}

      inlets={inlets}
      setInlets={setInlets}

      cabinets={cabinets}
      setCabinets={setCabinets}

      overlapErrors={overlapErrors}
      canExport={canExport}

      exportDxf={exportDxf}
      model={model}
    />
      </div>
    </main>
  );
}
