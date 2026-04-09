import { gaijiCodeTableText, gaijiNameTableText } from "../constants";

// 外字用変換テーブルの作成
const gaijiCodeTable: Record<string, string> = {}
for (const line of gaijiCodeTableText.split("\n")) {
    const items = line.split("\t")
    gaijiCodeTable[items[1]] = items[0]
}

export const getGaijiFromCode = (code: string) => gaijiCodeTable[code];

const gaijiNameTable: Record<string, string> = {}
for (const line of gaijiNameTableText.split("\n")) {
    const items = line.split("\t")
    gaijiNameTable[items[0]] = items[1]
}

export const getGaijiFromName = (name: string) => gaijiNameTable[name];
