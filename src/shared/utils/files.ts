export const arrayBufferToUnicodeString = async (arraybuffer: ArrayBuffer): Promise<string> => {
    const { default: Encoding } = await import('encoding-japanese') as any;
    const array = new Uint8Array(arraybuffer);
    return Encoding.codeToString(Encoding.convert(array, "UNICODE"));
};

export const arrayBufferUnZip = async (arraybuffer: ArrayBuffer) => {
    // JSZip と Encoding-Japanese を同時に読み込む
    const [{ default: JSZip }, { default: Encoding }] = await Promise.all([
        import('jszip'),
        import('encoding-japanese')
    ]);
    const newZip = new JSZip();
    // loadAsync の中で Encoding を使用
    const zip = await newZip.loadAsync(arraybuffer, {
        decodeFileName: (fileNameBinary) =>
            Encoding.codeToString(Encoding.convert(fileNameBinary as Uint8Array, "UNICODE"))
    });

    const ret: any[] = [];
    zip.forEach((_relativePath, zipEntry) => {
        ret.push(zipEntry);
    });

    return ret;
}
