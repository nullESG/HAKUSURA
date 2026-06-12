/**
 * 二次ステータス導出(仕様 §2)。
 *
 * ステータス計算の唯一の入口。装備・バフ・パッシブが増えても
 * 「StatMap に集約 → ここで導出」の流れを崩さないこと。
 * このモジュールは React にも DOM にも依存しない純粋関数のみ。
 */
import { GAME_CONSTANTS } from '../constants';
import type { ClassBaseStats, PrimaryStats } from '../types/character';
import type { ElementType, StatId, StatMap } from '../types/enums';

/** StatMap から値を取得(未定義は 0)。 */
export function statOf(map: StatMap, id: StatId): number {
  return map[id] ?? 0;
}

/** 複数の StatMap(装備・パッシブ・セットボーナス等)を加算合成する。 */
export function mergeStatMaps(...maps: readonly StatMap[]): StatMap {
  const merged: Partial<Record<StatId, number>> = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map) as [StatId, number][]) {
      merged[key] = (merged[key] ?? 0) + value;
    }
  }
  return merged;
}

/** ステータス導出への入力。 */
export interface StatCalcInput {
  readonly level: number;
  /** 一次ステータス(クラス初期値+割り振り+装備の一次ステ補正があれば合算済み)。 */
  readonly primary: PrimaryStats;
  readonly classBase: ClassBaseStats;
  /** 装備中武器の基礎攻撃(weaponATK / weaponMATK、仕様 §2)。 */
  readonly weaponAtk: number;
  readonly weaponMatk: number;
  /** 装備防具の基礎防御合計(armorDEF、仕様 §2)。 */
  readonly armorDef: number;
  /** 装備アフィックス+パッシブ+セットボーナスを合算した StatMap。 */
  readonly mods: StatMap;
}

/** 導出された二次ステータス(仕様 §2)。 */
export interface DerivedStats {
  readonly maxHP: number;
  readonly maxMP: number;
  readonly physATK: number;
  readonly magicATK: number;
  readonly defense: number;
  readonly speed: number;
  /** クリティカル率%(上限 75)。 */
  readonly critChancePct: number;
  /** クリティカルダメージ倍率(1.5 + LUK*0.005 + 装備補正)。 */
  readonly critMultiplier: number;
  /** 基礎命中率%(敵回避の減算は戦闘時に行う)。 */
  readonly baseHitChancePct: number;
  /** 回避率%(上限 60)。 */
  readonly evasionPct: number;
  /** 属性別フラット攻撃(戦闘エンジンが属性ダメージ計算で使用)。 */
  readonly elementAtkFlat: Readonly<Record<ElementType, number>>;
  /** 属性別耐性%。 */
  readonly elementResPct: Readonly<Record<ElementType, number>>;
  /** ブロック率%(盾装備時のみ有効。判定は戦闘エンジン側)。 */
  readonly blockPct: number;
  /** ユーティリティ系(ドロップ・経験値・ゴールド)。 */
  readonly magicFindPct: number;
  readonly expGainPct: number;
  readonly goldGainPct: number;
}

const C = GAME_CONSTANTS;

/** 二次ステータスを導出する(仕様 §2 の式に厳密準拠)。 */
export function calculateDerivedStats(input: StatCalcInput): DerivedStats {
  const { level, primary, classBase, mods } = input;

  // 最大HP = baseHP + VIT*8 + level*5 (+フラット補正)
  const maxHP = classBase.baseHP + primary.vit * 8 + level * 5 + statOf(mods, 'maxHP_flat');
  // 最大MP = baseMP + INT*4 + level*2 (+フラット補正)
  const maxMP = classBase.baseMP + primary.int * 4 + level * 2 + statOf(mods, 'maxMP_flat');

  // 物理攻撃力 = (STR*1.5 + weaponATK) * (1 + 物理ダメージ%)
  // ※アフィックスのフラット物理攻撃は weaponATK 側に合算する(仮定)
  const dmgPct = statOf(mods, 'dmg_pct');
  const physATK =
    (primary.str * 1.5 + input.weaponAtk + statOf(mods, 'physATK_flat')) * (1 + dmgPct / 100);
  // 魔法攻撃力 = (INT*1.5 + weaponMATK) * (1 + 魔法ダメージ%)
  const magicATK =
    (primary.int * 1.5 + input.weaponMatk + statOf(mods, 'magicATK_flat')) * (1 + dmgPct / 100);

  // 物理防御 = armorDEF + VIT*0.5 (+フラット補正)
  const defense = input.armorDef + primary.vit * 0.5 + statOf(mods, 'armorDEF_flat');

  // 行動速度 = (baseSpeed + DEX*0.3) に速度%補正を乗算(仮定: %は乗算適用)
  const speed = (classBase.baseSpeed + primary.dex * 0.3) * (1 + statOf(mods, 'speed_pct') / 100);

  // クリティカル率 = 5 + DEX*0.1 + 装備補正(上限75%)
  const critChancePct = Math.min(
    C.critChanceCapPct,
    5 + primary.dex * 0.1 + statOf(mods, 'critChance_pct'),
  );
  // クリティカルダメージ倍率 = 1.5 + LUK*0.005 + 装備補正(%は倍率に換算)
  const critMultiplier =
    C.baseCritMultiplier + primary.luk * 0.005 + statOf(mods, 'critDmg_pct') / 100;

  // 命中率 = 90 + DEX*0.2(敵回避の減算は戦闘時)
  const baseHitChancePct = C.baseHitChancePct + primary.dex * 0.2;
  // 回避率 = DEX*0.15 + 装備補正(上限60%)
  const evasionPct = Math.min(C.evasionCapPct, primary.dex * 0.15 + statOf(mods, 'evasion_pct'));

  const elementAtkFlat: Record<ElementType, number> = {
    physical: statOf(mods, 'physATK_flat'),
    fire: statOf(mods, 'fireATK_flat'),
    ice: statOf(mods, 'iceATK_flat'),
    lightning: statOf(mods, 'lightningATK_flat'),
    poison: statOf(mods, 'poisonATK_flat'),
    light: statOf(mods, 'lightATK_flat'),
    dark: statOf(mods, 'darkATK_flat'),
  };
  const elementResPct: Record<ElementType, number> = {
    physical: 0, // 物理は防御で軽減するため耐性%は持たない
    fire: statOf(mods, 'fireRes_pct'),
    ice: statOf(mods, 'iceRes_pct'),
    lightning: statOf(mods, 'lightningRes_pct'),
    poison: statOf(mods, 'poisonRes_pct'),
    light: statOf(mods, 'lightRes_pct'),
    dark: statOf(mods, 'darkRes_pct'),
  };

  return {
    maxHP: Math.floor(maxHP),
    maxMP: Math.floor(maxMP),
    physATK,
    magicATK,
    defense,
    speed,
    critChancePct,
    critMultiplier,
    baseHitChancePct,
    evasionPct,
    elementAtkFlat,
    elementResPct,
    blockPct: statOf(mods, 'block_pct'),
    magicFindPct: statOf(mods, 'rarity_pct'),
    expGainPct: statOf(mods, 'exp_pct'),
    goldGainPct: statOf(mods, 'gold_pct'),
  };
}

/** 必要経験値 = floor(100 * level^2.2)(仕様 §2)。level→level+1 に必要な量。 */
export function expRequiredForLevel(level: number): number {
  if (level < 1) throw new RangeError(`expRequiredForLevel: level must be >= 1, got ${level}`);
  return Math.floor(C.expBase * Math.pow(level, C.expExponent));
}
