import type {
  AilmentType,
  ElementType,
  SkillKind,
  SkillNodeType,
  StatMap,
  TargetScope,
} from './enums';

/** 状態異常の付与パラメータ(付与確率・継続ターン数・効果値、仕様 §4)。 */
export interface AilmentApplication {
  readonly type: AilmentType;
  /** 付与率%。実判定は 付与率 - 敵の状態異常耐性(仕様 §4)。 */
  readonly chancePercent: number;
  readonly durationTurns: number;
  /** 効果値(毒なら毎ターンダメージ係数、凍結なら速度低下%等)。 */
  readonly value: number;
}

/** アクティブスキル定義(仕様 §3「スキル定義のデータ構造」)。静的マスタ。 */
export interface SkillDefinition {
  readonly id: string;
  readonly name: string;
  readonly kind: SkillKind;
  readonly mpCost: number;
  /** ダメージ式の skillMultiplier(仕様 §4)。回復スキルでは回復倍率。 */
  readonly multiplier: number;
  readonly element: ElementType;
  readonly scope: TargetScope;
  /** 付与する状態異常(複数可)。 */
  readonly ailments: readonly AilmentApplication[];
}

/** スキルツリーのノード(仕様 §3)。クラスごとのツリーを構成する静的マスタ。 */
export interface SkillNode {
  readonly id: string;
  /** 所属クラス(src/data/classes の ID)。 */
  readonly classId: string;
  readonly nodeType: SkillNodeType;
  readonly name: string;
  /** 取得に必要な前提ノード。 */
  readonly requiredNodeIds: readonly string[];
  /** 取得コスト(スキルポイント)。 */
  readonly cost: number;
  /** active ノード: 習得するスキル ID。 */
  readonly skillId?: string;
  /** passive ノード: stat → 加算値。 */
  readonly passiveStats?: StatMap;
  /**
   * keystone ノード: 「狂戦士」等の特殊効果は効果 ID で参照し、
   * 戦闘エンジン / statCalculator のエフェクトハンドラが解釈する(仕様 §3)。
   */
  readonly keystoneEffectId?: string;
  /** スキルツリーUI用の論理座標(ピンチズーム・パン表示、仕様 §3)。 */
  readonly position: { readonly x: number; readonly y: number };
}
