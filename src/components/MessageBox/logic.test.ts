import { describe, it, expect } from 'vitest';
import { buildHtml } from './logic';

describe('buildHtml', () => {
  
  it('メッセージのみを渡したとき、デフォルトのOKボタンが生成されること', () => {
    const result = buildHtml('こんにちは');
    
    // 全体の構造をチェック
    expect(result).toContain('<div class="inner">こんにちは');
    // デフォルトのボタンをチェック
    expect(result).toContain('<button value="OK">OK</button>');
  });

  it('buttonsオプションに文字列の配列を渡したとき、正しくボタンが並ぶこと', () => {
    const options = { buttons: ['はい', 'いいえ'] };
    const result = buildHtml('保存しますか？', options);

    expect(result).toContain('<button value="はい">はい</button>');
    expect(result).toContain('<button value="いいえ">いいえ</button>');
  });

  it('buttonsオプションにオブジェクトの配列を渡したとき、classやvalueが正しく反映されること', () => {
    const options = {
      buttons: [
        { className: 'btn-primary', value: 'submit', text: '送信' }
      ]
    };
    const result = buildHtml('フォーム', options);

    // 期待されるHTML文字列の検証
    expect(result).toContain('<button class="btn-primary" value="submit">送信</button>');
  });

  it('文字列とオブジェクトが混在した配列でも正しく処理されること', () => {
    const options = {
      buttons: [
        'キャンセル',
        { className: 'btn-danger', value: 'delete', text: '削除' }
      ]
    };
    const result = buildHtml('警告', options);

    expect(result).toContain('<button value="キャンセル">キャンセル</button>');
    expect(result).toContain('<button class="btn-danger" value="delete">削除</button>');
  });

});
