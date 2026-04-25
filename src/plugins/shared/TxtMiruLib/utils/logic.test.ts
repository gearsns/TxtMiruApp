import { describe, it, expect } from 'vitest';
import { splitStr } from './logic';

describe('splitStr', () => {
    it('基本的な文字列の分割ができる（キャプチャグループなし）', () => {
        const result = splitStr('apple,orange,banana', /,/);
        expect(result).toEqual(['apple', 'orange', 'banana']);
    });

    it('キャプチャグループを含めて分割し、マッチした部分を配列として保持する', () => {
        const result = splitStr('a[tag1]b[tag2]c', /\[(.*?)\]/);
        // [ "a", ["tag1"], "b", ["tag2"], "c" ] という構造を期待
        expect(result).toEqual(['a', ['tag1'], 'b', ['tag2'], 'c']);
    });

    it('区切り文字が連続している場合、空文字を含まずにスキップする（ロジックの仕様確認）', () => {
        const result = splitStr('apple,,banana', /,/);
        // 現状のロジックでは if (lastLastIndex !== match.index) により
        // セパレータ間の空文字は push されない仕様
        expect(result).toEqual(['apple', 'banana']);
    });

    it('文字列の先頭や末尾にマッチする場合でも正しく動作する', () => {
        const result = splitStr('(start)mid(end)', /\((.*?)\)/);
        expect(result).toEqual([['start'], 'mid', ['end']]);
    });

    it('gフラグがない正規表現でも無限ループせずに動作する', () => {
        const result = splitStr('1a2b3', /[a-z]/); // フラグなし
        expect(result).toEqual(['1', '2', '3']);
    });

    it('全くマッチしない場合は、元の文字列を一つの要素として返す', () => {
        const result = splitStr('no-match', /[,]/);
        expect(result).toEqual(['no-match']);
    });

    it('空文字を入力した場合は、空の配列を返す（lastLastIndex !== str.length の判定）', () => {
        const result = splitStr('', /,/);
        expect(result).toEqual([]);
    });
});
