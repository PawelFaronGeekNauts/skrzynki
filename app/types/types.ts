export type TextItem = {
    id: number;
    text: string;
    x: number;
    y: number;
    fontSize: number;
  };
  
  export type RectItem = {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  export type BoundsItem = {
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  export type NumericMmInputProps = {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
  };