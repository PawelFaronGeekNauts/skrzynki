import { useEffect, useState } from "react";
import { NumericMmInputProps } from "../types/types";

export function NumericMmInput({
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