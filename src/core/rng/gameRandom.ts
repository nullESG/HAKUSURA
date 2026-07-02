/**
 * シード可能・状態シリアライズ可能な単一乱数生成器(開発原則)。
 *
 * `Math.random()` はシード不可・状態復元不可のため使用禁止。
 * ゲーム内の乱数(ドロップ・ダメージ変動・命中判定など)はすべて
 * このクラスのインスタンス経由で取得すること。
 *
 * アルゴリズムは sfc32(128bit 状態、32bit 演算のみで JS の number と相性が良い)。
 * 状態は 4 つの uint32 で、セーブデータにそのまま保存できる(仕様 §7)。
 */

/** セーブ可能な RNG 内部状態。 */
export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

export class GameRandom {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    // splitmix32 で任意の整数シードから質の良い初期状態を作る
    let s = seed >>> 0;
    const next = (): number => {
      s = (s + 0x9e3779b9) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
      return (t ^ (t >>> 15)) >>> 0;
    };
    this.a = next();
    this.b = next();
    this.c = next();
    this.d = next();
    // sfc32 の慣例に従い初期相関を捨てる
    for (let i = 0; i < 12; i++) this.nextUint32();
  }

  /** セーブデータから内部状態を復元する。 */
  static fromState(state: RngState): GameRandom {
    const rng = Object.create(GameRandom.prototype) as GameRandom;
    rng.a = state.a >>> 0;
    rng.b = state.b >>> 0;
    rng.c = state.c >>> 0;
    rng.d = state.d >>> 0;
    return rng;
  }

  /** セーブ用に内部状態を取り出す。 */
  get state(): RngState {
    return { a: this.a, b: this.b, c: this.c, d: this.d };
  }

  /** sfc32 本体。0〜2^32-1 の整数を返す。 */
  nextUint32(): number {
    const t0 = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) | 0;
    this.d = (this.d + 1) | 0;
    const t = (t0 + this.d) | 0;
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** 0.0 以上 1.0 未満の double。 */
  nextDouble(): number {
    return this.nextUint32() / 4294967296;
  }

  /** 0 以上 max 未満の整数。 */
  nextInt(max: number): number {
    if (max <= 0) throw new RangeError(`nextInt: max must be > 0, got ${max}`);
    return Math.floor(this.nextDouble() * max);
  }

  /** min 以上 max 以下(両端含む)の整数。 */
  nextIntInRange(min: number, max: number): number {
    if (min > max) throw new RangeError(`nextIntInRange: min(${min}) > max(${max})`);
    return min + this.nextInt(max - min + 1);
  }

  /** min 以上 max 未満の double。 */
  nextDoubleInRange(min: number, max: number): number {
    return min + this.nextDouble() * (max - min);
  }

  /** 百分率判定。chancePercent=25 なら 25% で true。 */
  roll(chancePercent: number): boolean {
    return this.nextDouble() * 100 < chancePercent;
  }

  /**
   * 重み付き抽選。weights[i] に比例した確率でインデックス i を返す。
   * レアリティ抽選・アフィックスプール抽選(仕様 §5-7)で使用する。
   */
  weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((acc, w) => acc + w, 0);
    if (!(total > 0)) throw new RangeError('weightedIndex: total weight must be > 0');
    let threshold = this.nextDouble() * total;
    for (let i = 0; i < weights.length; i++) {
      threshold -= weights[i] ?? 0;
      if (threshold < 0) return i;
    }
    return weights.length - 1;
  }
}
