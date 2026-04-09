import { numberList } from "../constants"

// 全角の数字を半角に変換
const RE_NUMBER_LIST = new RegExp(`[${Object.keys(numberList).join("")}]`, 'g')
export const toHanNum = (number: string) => parseInt(number.replace(RE_NUMBER_LIST, all => numberList[all]))
