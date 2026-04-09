import { it, describe, expect } from "vitest";
import { narou2html } from "./narou";

const removeRpTags = (str: string) => str.replaceAll(/<rp>.*?<\/rp>/g, "").replaceAll(/<\/*p>/g, "");

describe('なろう', () => {
    const ruby_checkes = [
        ["　青山(あおやま)高音《たかね》", "　<ruby>青山<rp>(</rp><rt>あおやま</rt><rp>)</rp></ruby><ruby>高音<rp>《</rp><rt>たかね</rt><rp>》</rp></ruby>"],
        ["　万年|無職《ニート》", "　万年<ruby>無職<rp>(</rp><rt>ニート</rt><rp>)</rp></ruby>"],
        ["　|強(・)|調(・)|文(・)|字(・)", "　<ruby>強<rp>(</rp><rt>・</rt><rp>)</rp></ruby><ruby>調<rp>(</rp><rt>・</rt><rp>)</rp></ruby><ruby>文<rp>(</rp><rt>・</rt><rp>)</rp></ruby><ruby>字<rp>(</rp><rt>・</rt><rp>)</rp></ruby>"],
        ["　回復|(ヒール)の魔法", "　回復(ヒール)の魔法"],
        ["　範囲回復魔法(エリア・ヒール)", "　<ruby>範囲回復魔法<rp>(</rp><rt>エリア・ヒール</rt><rp>)</rp></ruby>"],
        ["　再構築再起動(リビルド　スタート)", "　<ruby>再構築再起動<rp>(</rp><rt>リビルド　スタート</rt><rp>)</rp></ruby>"],
        ["　三〇二(サンマルニ)飛行中隊", "　三〇<ruby>二<rp>(</rp><rt>サンマルニ</rt><rp>)</rp></ruby>飛行中隊"],
        ["　黒々(くろぐろ)", "　黒々(くろぐろ)"],
        ["　仝(おなじ)", "　<ruby>仝<rp>(</rp><rt>おなじ</rt><rp>)</rp></ruby>"],
        ["　〆切(しめき)り", "　〆<ruby>切<rp>(</rp><rt>しめき</rt><rp>)</rp></ruby>り"],
        ["　SSS等級(クラス)", "　<ruby>SSS等級<rp>(</rp><rt>クラス</rt><rp>)</rp></ruby>"],
        ["　濁点(あ゛)　半濁点長崎(なか゜さき)　狒狒(ひゝ)", "　濁点(あ゛)　半濁点長崎(なか゜さき)　狒狒(ひゝ)"],
        ["　|あのハゲ《僧侶様》", "　<ruby>あのハゲ<rp>(</rp><rt>僧侶様</rt><rp>)</rp></ruby>"],
        ["　自動漢字試験《振仮名》", "　自動漢字試験《振仮名》"],
        ["　試験(あいうえおかきくけこさしすせそたちつてと)です", "　<ruby>試験<rp>(</rp><rt>あいうえおかきくけこさしすせそたちつてと</rt><rp>)</rp></ruby>です"],
        ["　試験(アイウエオかきくけこさしすせそたちつてと)です", "　<ruby>試験<rp>(</rp><rt>アイウエオかきくけこさしすせそたちつてと</rt><rp>)</rp></ruby>です"],
        ["　試験(あいうえおかきくけこさしすせそたちつてとな)です", "　試験(あいうえおかきくけこさしすせそたちつてとな)です"],
        ["　試験(アイウエオかきくけこさしすせそたちつてとな)です", "　試験(アイウエオかきくけこさしすせそたちつてとな)です"],
        ["　ひらがな特殊 漢(ゎ)漢(ゐ)漢(ゑ)", "　ひらがな特殊 <ruby>漢<rp>(</rp><rt>ゎ</rt><rp>)</rp></ruby><ruby>漢<rp>(</rp><rt>ゐ</rt><rp>)</rp></ruby><ruby>漢<rp>(</rp><rt>ゑ</rt><rp>)</rp></ruby>"],
        ["　　漢|(ゔ)、漢|(ゕ)|漢(ゖ)", "　　漢(ゔ)、漢(ゕ)漢(ゖ)"],
        ["　カタカナ特殊 漢(ヮ)漢(ヰ)漢(ヱ)漢(ヴ)漢(ヵ)漢(ヶ)", "　カタカナ特殊 <ruby>漢<rp>(</rp><rt>ヮ</rt><rp>)</rp></ruby><ruby>漢<rp>(</rp><rt>ヰ</rt><rp>)</rp></ruby><ruby>漢<rp>(</rp><rt>ヱ</rt><rp>)</rp></ruby><ruby>漢<rp>(</rp><rt>ヴ</rt><rp>)</rp></ruby><ruby>漢<rp>(</rp><rt>ヵ</rt><rp>)</rp></ruby><ruby>漢<rp>(</rp><rt>ヶ</rt><rp>)</rp></ruby>"],
        ["　　漢|(ヷ)漢|(ヸ)漢|(ヹ)漢|(ヺ)", "　　漢(ヷ)漢(ヸ)漢(ヹ)漢(ヺ)"],
        ["　|試験《一二三四五六七八九十》", "　<ruby>試験<rp>(</rp><rt>一二三四五六七八九十</rt><rp>)</rp></ruby>"],
        ["　|試験《一二三四五六七八九十一》", "　|試験《一二三四五六七八九十一》"],
        ["　試験(あいう……)", "　<ruby>試験<rp>(</rp><rt>あいう……</rt><rp>)</rp></ruby>"],
        ["　|二重表示《特殊(ルビ)》", "　<ruby>二重表示<rp>(</rp><rt><ruby>特殊<rp>(</rp><rt>ルビ</rt><rp>)</rp></ruby></rt><rp>)</rp></ruby>"],
        ["　[\]^_`(へんなきごう)", "　<ruby>[\]^_`<rp>(</rp><rt>へんなきごう</rt><rp>)</rp></ruby>"],
        ["　|試験《<》、|試験《<テスト>》、|試験《&12345》、|試験《&123456》", "　<ruby>試験<rp>(</rp><rt>&lt;</rt><rp>)</rp></ruby>、|試験《&lt;テスト&gt;》、<ruby>試験<rp>(</rp><rt>&amp;12345</rt><rp>)</rp></ruby>、|試験《&amp;123456》"],
        ["　|親文字《（丸括弧）》", "　<ruby>親文字<rp>(</rp><rt>（丸括弧）</rt><rp>)</rp></ruby>"],
        ["　|縦棒|縦棒《たてぼう》", "　|縦棒<ruby>縦棒<rp>(</rp><rt>たてぼう</rt><rp>)</rp></ruby>"],
    ];
    it.each(ruby_checkes)('ルビ', (src, dst) => {
        const ret = narou2html(src);
        expect(removeRpTags(ret)).toBe(removeRpTags(dst));
    });
})
