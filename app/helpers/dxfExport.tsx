import makerjs from "makerjs";


export const exportDxf = (model: any) => {
    const dxf = makerjs.exporter.toDXF(model);
    const blob = new Blob([dxf], { type: "application/dxf" });
    const fileUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = "skrzynka_model.dxf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(fileUrl);
  };