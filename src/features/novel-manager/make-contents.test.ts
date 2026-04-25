import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initItem, buildEpisodeAnchor } from './make-contents';

// 1. 環境変数のモック設定
vi.stubGlobal('import', {
  meta: {
    env: {
      APP_FULL_TITLE: 'My App Title'
    }
  }
});

// 2. 必要な型定義のモック（実際のプロジェクトの定義に合わせて調整してください）
type TxtMiruItem = any; 

describe('initItem', () => {
  it('未定義のプロパティが空文字で初期化されること', () => {
    const item: TxtMiruItem = {
      className: "undefined",
      "prev-episode": null,
      html: "some-html"
    };

    initItem(item);

    expect(item.className).toBe("");
    expect(item["prev-episode"]).toBe("./index.html");
  });

  it('URLがある場合にデフォルトのテキストがセットされること', () => {
    const item: TxtMiruItem = {
      "next-episode": "page2.html",
      "next-episode-text": ""
    };

    initItem(item);

    // setEpisodeText("next-episode", "次へ") が実行される
    expect(item["next-episode-text"]).toBe("次へ");
  });

  it('データが不十分な場合に目次(index.html)へフォールバックすること', () => {
    const item: TxtMiruItem = {
      "next-episode": "",
      "episode-index-text": ""
    };

    initItem(item);

    expect(item["next-episode"]).toBe("./index.html");
    expect(item["next-episode-text"]).toBe(import.meta.env.APP_FULL_TITLE);
  });
});

describe('buildEpisodeAnchor', () => {
  it('適切なアンカータグが生成されること', () => {
    const item: TxtMiruItem = {
      "next-episode": "next.html",
      "next-episode-text": "NEXT",
      className: "btn"
    };

    const result = buildEpisodeAnchor("next", item);
    expect(result).toBe('<a href="next.html" class="btn">NEXT</a>');
  });

  it('エピソードがない場合、目次リンクを返すこと', () => {
    const item: TxtMiruItem = {
      "next-episode": "",
      "episode-index": "index.html",
      "episode-index-text": "HOME",
      className: "btn"
    };

    const result = buildEpisodeAnchor("next", item);
    expect(result).toBe('<a href="index.html" class="btn">HOME</a>');
  });

  it('どちらも存在しない場合は undefined を返すこと', () => {
    const item: TxtMiruItem = {};
    const result = buildEpisodeAnchor("prev", item);
    expect(result).toBeUndefined();
  });
});