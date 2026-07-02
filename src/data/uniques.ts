import type { UniqueItemDefinition } from '../core/types';

/**
 * ユニーク装備30種(仕様 §5-5)。固定アフィックス(affixId+tier固定、値はロール)。
 * うち10種は specialEffectId 付きの「ビルドを定義する」もの。
 * specialEffectId の挙動は戦闘エンジンのエフェクトハンドラが解釈する。
 */
export const UNIQUE_ITEMS: readonly UniqueItemDefinition[] = [
  // ===== ビルド定義級(10種) =====
  {
    id: 'uniq_greed_ring', name: '貪欲の指輪', baseItemId: 'base_ring_10_0',
    fixedAffixes: [{ affixId: 'flat_phys_ring', tier: 5 }, { affixId: 'gold_find_ring', tier: 6 }],
    specialEffectId: 'greed_stack', // 敵撃破ごとに攻撃力+1%(最大50%、被弾でリセット)
    flavorText: '満たされることを知らぬ者に、力は際限なく流れ込む。',
  },
  {
    id: 'uniq_berserk_axe', name: '血染めの狂斧', baseItemId: 'base_weapon2h_1_1',
    fixedAffixes: [{ affixId: 'inc_phys_weapon2h', tier: 7 }, { affixId: 'atk_speed_weapon2h', tier: 6 }],
    specialEffectId: 'low_life_damage', // HP30%以下で与ダメージ2倍
    flavorText: '死の淵でこそ、刃は最も鋭くなる。',
  },
  {
    id: 'uniq_glass_cannon', name: '硝子の杖', baseItemId: 'base_weapon2h_3_1',
    fixedAffixes: [{ affixId: 'inc_magic_weapon2h', tier: 9 }, { affixId: 'cast_speed_weapon2h', tier: 7 }],
    specialEffectId: 'glass_cannon', // 与ダメ+80% / 防御0になる
    flavorText: '砕ける覚悟のある者だけが、この力を扱える。',
  },
  {
    id: 'uniq_thorn_mail', name: '茨の心臓', baseItemId: 'base_armor_6_1',
    fixedAffixes: [{ affixId: 'flat_life_armor', tier: 7 }, { affixId: 'flat_def_armor', tier: 6 }],
    specialEffectId: 'thorns_reflect', // 被ダメージの30%を反射
    flavorText: '抱きしめるほどに、敵は血を流す。',
  },
  {
    id: 'uniq_phoenix_amulet', name: '不死鳥の咽喉', baseItemId: 'base_amulet_9_1',
    fixedAffixes: [{ affixId: 'fire_res_amulet', tier: 8 }, { affixId: 'flat_life_amulet', tier: 6 }],
    specialEffectId: 'phoenix_revive', // 戦闘ごとに1度、致死ダメージでHP50%復活
    flavorText: '灰の中から、何度でも。',
  },
  {
    id: 'uniq_frost_heart', name: '凍てつく心核', baseItemId: 'base_weapon1h_2_1',
    fixedAffixes: [{ affixId: 'flat_ice_weapon1h', tier: 7 }, { affixId: 'inc_ice_weapon1h', tier: 6 }],
    specialEffectId: 'freeze_on_crit', // クリティカル時に凍結を確定付与
    flavorText: '心臓が止まるほどの冷気を、その手に。',
  },
  {
    id: 'uniq_vampire_blade', name: '血杯の刃', baseItemId: 'base_weapon1h_0_1',
    fixedAffixes: [{ affixId: 'flat_phys_weapon1h', tier: 7 }, { affixId: 'crit_chance_weapon1h', tier: 5 }],
    specialEffectId: 'life_leech', // 与ダメージの10%をHP回復
    flavorText: '飲み干すたび、刃は重く、腕は軽くなる。',
  },
  {
    id: 'uniq_gamblers_dice', name: '賭博師の骰子', baseItemId: 'base_ring_10_1',
    fixedAffixes: [{ affixId: 'magic_find_ring', tier: 8 }, { affixId: 'crit_dmg_ring', tier: 5 }],
    specialEffectId: 'all_or_nothing', // ダメージが50%で2倍、50%で半減
    flavorText: '勝つか、負けるか。それ以外に何が要る?',
  },
  {
    id: 'uniq_summoners_crown', name: '百鬼の王冠', baseItemId: 'base_helmet_5_1',
    fixedAffixes: [{ affixId: 'summon_power_helmet', tier: 8 }, { affixId: 'flat_mana_helmet', tier: 6 }],
    specialEffectId: 'extra_summon', // 召喚上限+1
    flavorText: '王冠は数の力を知っている。',
  },
  {
    id: 'uniq_chrono_boots', name: '刻渡りの靴', baseItemId: 'base_boots_8_1',
    fixedAffixes: [{ affixId: 'speed_boots', tier: 8 }, { affixId: 'evasion_boots', tier: 6 }],
    specialEffectId: 'double_turn_chance', // ターン開始時15%で2回行動
    flavorText: '一歩が、二歩になる。',
  },
  // ===== 通常ユニーク(20種) =====
  { id: 'uniq_iron_will', name: '鉄の意志', baseItemId: 'base_helmet_5_0', fixedAffixes: [{ affixId: 'flat_life_helmet', tier: 5 }, { affixId: 'paralysis_ail_res_helmet', tier: 6 }], flavorText: '心が折れねば、体も折れぬ。' },
  { id: 'uniq_storm_gauntlet', name: '嵐握の籠手', baseItemId: 'base_gloves_7_1', fixedAffixes: [{ affixId: 'flat_lightning_gloves', tier: 6 }, { affixId: 'atk_speed_gloves', tier: 5 }], flavorText: '雷を掴んだ者の手は、もう震えない。' },
  { id: 'uniq_serpent_belt', name: '蛇腹の帯', baseItemId: 'base_belt_11_1', fixedAffixes: [{ affixId: 'poison_apply_amulet', tier: 6 }, { affixId: 'flat_life_belt', tier: 5 }], flavorText: '巻きつくものは、やがて牙を剥く。' },
  { id: 'uniq_holy_aegis', name: '聖光の盾', baseItemId: 'base_shield_4_1', fixedAffixes: [{ affixId: 'block_shield', tier: 7 }, { affixId: 'light_res_shield', tier: 6 }], flavorText: '光は最も古い壁である。' },
  { id: 'uniq_night_cloak', name: '夜帳の外套', baseItemId: 'base_armor_6_0', fixedAffixes: [{ affixId: 'evasion_armor', tier: 6 }, { affixId: 'dark_res_armor', tier: 5 }], flavorText: '闇に紛れる者を、闇は撃たない。' },
  { id: 'uniq_scholars_loop', name: '学匠の指環', baseItemId: 'base_ring_10_0', fixedAffixes: [{ affixId: 'exp_gain_ring', tier: 6 }, { affixId: 'flat_mana_ring', tier: 4 }], flavorText: '知は最も利率の良い投資だ。' },
  { id: 'uniq_titan_grip', name: '巨人の握撃', baseItemId: 'base_gloves_7_2', fixedAffixes: [{ affixId: 'flat_phys_gloves', tier: 8 }, { affixId: 'flat_def_gloves', tier: 6 }], flavorText: '掴まれたら最後、潰されるだけだ。' },
  { id: 'uniq_mirage_helm', name: '蜃気楼の兜', baseItemId: 'base_helmet_5_2', fixedAffixes: [{ affixId: 'evasion_helmet', tier: 8 }, { affixId: 'speed_helmet', tier: 6 }], flavorText: '見えているものが、そこにいるとは限らない。' },
  { id: 'uniq_ember_band', name: '燻る指輪', baseItemId: 'base_ring_10_0', fixedAffixes: [{ affixId: 'flat_fire_ring', tier: 5 }, { affixId: 'burn_apply_ring', tier: 4 }], flavorText: '消えたように見えて、火は残っている。' },
  { id: 'uniq_deep_pendant', name: '深淵の首飾り', baseItemId: 'base_amulet_9_2', fixedAffixes: [{ affixId: 'flat_dark_amulet', tier: 8 }, { affixId: 'inc_dark_amulet', tier: 7 }], flavorText: '覗き込んだ分だけ、深淵は応える。' },
  { id: 'uniq_swift_quiver', name: '韋駄天の帯革', baseItemId: 'base_belt_11_0', fixedAffixes: [{ affixId: 'speed_belt', tier: 6 }, { affixId: 'atk_speed_belt', tier: 5 }], flavorText: '速さは時に、力を超える。' },
  { id: 'uniq_warding_charm', name: '結界の護符', baseItemId: 'base_amulet_9_0', fixedAffixes: [{ affixId: 'all_res_amulet', tier: 6 }], flavorText: '六色の災いを、一枚の札で。' },
  { id: 'uniq_colossus_plate', name: '山嶺の甲冑', baseItemId: 'base_armor_6_2', fixedAffixes: [{ affixId: 'flat_def_armor', tier: 9 }, { affixId: 'phys_red_armor', tier: 7 }], flavorText: '山は動かない。だから山なのだ。' },
  { id: 'uniq_arc_wand', name: '稲妻の小杖', baseItemId: 'base_weapon1h_2_0', fixedAffixes: [{ affixId: 'flat_lightning_weapon1h', tier: 6 }, { affixId: 'lightning_crit_chance_weapons', tier: 5 }], flavorText: '雷は二度、同じ場所に落ちる。狙えばな。' },
  { id: 'uniq_plague_staff', name: '疫病の杖', baseItemId: 'base_weapon2h_3_0', fixedAffixes: [{ affixId: 'flat_poison_weapon2h', tier: 6 }, { affixId: 'poison_effect_weapon2h', tier: 6 }], flavorText: '癒し手の杖と同じ木から作られた。' },
  { id: 'uniq_dawn_greaves', name: '黎明の脚甲', baseItemId: 'base_boots_8_2', fixedAffixes: [{ affixId: 'flat_light_ring', tier: 6 }, { affixId: 'move_speed_boots', tier: 7 }], flavorText: '夜明けは走ってくる。' },
  { id: 'uniq_miser_gloves', name: '守銭奴の手袋', baseItemId: 'base_gloves_7_0', fixedAffixes: [{ affixId: 'gold_find_gloves', tier: 7 }, { affixId: 'magic_find_gloves', tier: 5 }], flavorText: '拾った銅貨は、決して落とさない。' },
  { id: 'uniq_oracle_helm', name: '神託の額冠', baseItemId: 'base_helmet_5_1', fixedAffixes: [{ affixId: 'heal_power_helmet', tier: 7 }, { affixId: 'flat_mana_helmet', tier: 5 }], flavorText: '声は、聞こうとする者にだけ届く。' },
  { id: 'uniq_frozen_wall', name: '氷河の大盾', baseItemId: 'base_shield_4_2', fixedAffixes: [{ affixId: 'ice_res_shield', tier: 8 }, { affixId: 'freeze_apply_amulet', tier: 5 }], flavorText: '氷河は急がない。だが必ず削り取る。' },
  { id: 'uniq_void_edge', name: '虚ろの剣', baseItemId: 'base_weapon1h_0_2', fixedAffixes: [{ affixId: 'flat_dark_weapon1h', tier: 8 }, { affixId: 'dark_crit_dmg_weapons', tier: 6 }], flavorText: '斬られた者は、何も覚えていない。' },
];

export const UNIQUE_BY_ID: ReadonlyMap<string, UniqueItemDefinition> = new Map(
  UNIQUE_ITEMS.map((u) => [u.id, u]),
);
