import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './timer';

describe('debounce', () => {
  beforeEach(() => {
    // タイマーをフェイク（仮想）のものに置き換える
    vi.useFakeTimers();
  });

  afterEach(() => {
    // テストごとにタイマーをリセット
    vi.restoreAllMocks();
  });

  it('指定した時間が経過した後にのみ実行されること', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    // まだ実行されていないはず
    expect(fn).not.toBeCalled();

    // 100ms進める
    vi.advanceTimersByTime(100);

    // 最後に呼ばれた1回だけ実行されているはず
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('delayOrGetter が関数の場合、実行時に最新の値を参照すること', () => {
    const fn = vi.fn();
    let dynamicDelay = 100;
    
    // 数値を返す関数を渡す
    const debounced = debounce(fn, () => dynamicDelay);

    debounced();
    
    // 50ms時点では未実行
    vi.advanceTimersByTime(50);
    expect(fn).not.toBeCalled();

    // 途中でディレイ時間を書き換える（本来はあまりないケースですが、ロジックの検証として）
    // ※ 既にセットされたsetTimeoutには影響しませんが、
    // 次の呼び出しで新しい値が使われるかをチェックします。
    
    vi.advanceTimersByTime(50); 
    expect(fn).toHaveBeenCalledTimes(1);

    // 次の実行でディレイを200msに変更
    dynamicDelay = 200;
    debounced();

    vi.advanceTimersByTime(150); // まだ150ms
    expect(fn).toHaveBeenCalledTimes(1); // 2回目はまだ

    vi.advanceTimersByTime(50); // 合計200ms経過
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('引数が正しく渡されること', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('hello', 123);
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('hello', 123);
  });
});
