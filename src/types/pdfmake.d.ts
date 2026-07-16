declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    createPdf: (docDefinition: Record<string, unknown>) => {
      download: (filename?: string) => void;
      getBlob: (cb: (blob: Blob) => void) => void;
      getBuffer: (cb: (buffer: ArrayBuffer) => void) => void;
      getDataUrl: (cb: (dataUrl: string) => void) => void;
    };
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {}
