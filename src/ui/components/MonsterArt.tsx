/**
 * 敵のSVGアート(全15種+フォールバック)。
 * 外部画像を使わずコードで持つ(軽量・オフラインPWA対応・色調整が容易)。
 * 統一ルール: viewBox 64x64 / フラット塗り+濃色の影 / 発光する目 / 背景透過。
 * 小さく表示されても読めるよう、シルエット優先の単純な形にする。
 */
import type { ReactNode } from 'react';
import { getEnemyById } from '../../data/enemies';

function Slime(): ReactNode {
  return (
    <>
      <path d="M10 46 Q10 22 32 20 Q54 22 54 46 Q54 52 46 52 L18 52 Q10 52 10 46 Z" fill="#22c55e" />
      <ellipse cx="32" cy="49" rx="19" ry="5" fill="#15803d" opacity="0.55" />
      <ellipse cx="23" cy="30" rx="6" ry="4" fill="#86efac" opacity="0.8" />
      <circle cx="26" cy="38" r="2.6" fill="#052e16" />
      <circle cx="38" cy="38" r="2.6" fill="#052e16" />
      <path d="M28 44 Q32 47 36 44" stroke="#052e16" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}

function Goblin(): ReactNode {
  return (
    <>
      <polygon points="4,24 22,22 17,34" fill="#65a30d" />
      <polygon points="60,24 42,22 47,34" fill="#65a30d" />
      <ellipse cx="32" cy="32" rx="17" ry="15" fill="#84cc16" />
      <path d="M15 32 Q32 24 49 32 Q49 20 32 18 Q15 20 15 32 Z" fill="#65a30d" />
      <circle cx="25" cy="33" r="3.2" fill="#fde047" />
      <circle cx="39" cy="33" r="3.2" fill="#fde047" />
      <circle cx="25" cy="33" r="1.3" fill="#1a2e05" />
      <circle cx="39" cy="33" r="1.3" fill="#1a2e05" />
      <path d="M24 42 Q32 47 40 42" stroke="#365314" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <polygon points="27,43 29,47 31,43" fill="#fefce8" />
      <polygon points="37,43 35,47 33,43" fill="#fefce8" />
    </>
  );
}

function Wolf(): ReactNode {
  return (
    <>
      <polygon points="40,10 46,26 34,22" fill="#6b7280" />
      <polygon points="54,12 56,28 46,24" fill="#4b5563" />
      <path d="M6 36 L24 28 Q38 18 52 22 L58 30 Q56 38 46 40 L30 42 Q16 44 6 36 Z" fill="#9ca3af" />
      <path d="M6 36 L24 34 L44 38 L58 30 Q56 38 46 40 L30 42 Q16 44 6 36 Z" fill="#6b7280" />
      <path d="M6 36 L18 38 L14 44 Z" fill="#f9fafb" />
      <circle cx="44" cy="28" r="2.6" fill="#ef4444" />
      <circle cx="9" cy="34" r="2.2" fill="#111827" />
      <path d="M46 46 Q36 52 26 50" stroke="#4b5563" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  );
}

function Bat(): ReactNode {
  return (
    <>
      <path d="M3 26 Q12 10 30 18 L30 40 Q24 36 19 40 Q15 34 10 37 Q5 32 3 26 Z" fill="#5b21b6" />
      <path d="M61 26 Q52 10 34 18 L34 40 Q40 36 45 40 Q49 34 54 37 Q59 32 61 26 Z" fill="#5b21b6" />
      <ellipse cx="32" cy="31" rx="8" ry="11" fill="#3b0764" />
      <polygon points="27,18 29,24 24,23" fill="#3b0764" />
      <polygon points="37,18 35,24 40,23" fill="#3b0764" />
      <circle cx="29" cy="29" r="2" fill="#fbbf24" />
      <circle cx="35" cy="29" r="2" fill="#fbbf24" />
      <polygon points="29,36 30,40 32,36" fill="#fefce8" />
      <polygon points="35,36 34,40 32,36" fill="#fefce8" />
    </>
  );
}

function Skeleton(): ReactNode {
  return (
    <>
      <path d="M18 14 Q32 7 46 14 Q52 20 50 31 Q48 39 42 41 L42 45 L22 45 L22 41 Q16 39 14 31 Q12 20 18 14 Z" fill="#e7e5e4" />
      <circle cx="25" cy="29" r="4.6" fill="#1c1917" />
      <circle cx="39" cy="29" r="4.6" fill="#1c1917" />
      <circle cx="26" cy="28" r="1.2" fill="#f87171" />
      <circle cx="40" cy="28" r="1.2" fill="#f87171" />
      <polygon points="32,34 29.5,39 34.5,39" fill="#1c1917" />
      <rect x="24" y="45" width="16" height="8" rx="2" fill="#d6d3d1" />
      <path d="M28 45 L28 52 M32 45 L32 52 M36 45 L36 52" stroke="#78716c" strokeWidth="1.6" />
    </>
  );
}

function Zombie(): ReactNode {
  return (
    <g transform="rotate(-7 32 32)">
      <ellipse cx="32" cy="32" rx="16" ry="17" fill="#8f9e58" />
      <path d="M16 30 Q20 18 32 16 Q44 18 48 30 Q44 24 32 23 Q20 24 16 30 Z" fill="#5c6b34" />
      <path d="M22 30 L28 34 M28 30 L22 34" stroke="#2c331a" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="40" cy="34" r="4" fill="#f5f5f4" />
      <circle cx="40" cy="36" r="1.6" fill="#2c331a" />
      <path d="M24 43 L41 42" stroke="#2c331a" strokeWidth="2" strokeLinecap="round" />
      <path d="M27 40.5 L27 45 M31 40.5 L31 45 M35 40.5 L35 45" stroke="#2c331a" strokeWidth="1.4" />
      <path d="M45 26 L51 24" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Orc(): ReactNode {
  return (
    <>
      <path d="M14 26 Q14 12 32 12 Q50 12 50 26 L50 40 Q50 50 32 50 Q14 50 14 40 Z" fill="#4d7c0f" />
      <path d="M14 26 Q14 12 32 12 Q50 12 50 26 Q42 20 32 20 Q22 20 14 26 Z" fill="#365314" />
      <path d="M18 30 L28 33 M46 30 L36 33" stroke="#1a2e05" strokeWidth="3" strokeLinecap="round" />
      <circle cx="25" cy="36" r="2.4" fill="#fca5a5" />
      <circle cx="39" cy="36" r="2.4" fill="#fca5a5" />
      <path d="M22 45 Q32 42 42 45" stroke="#1a2e05" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <polygon points="24,45 26,38 29,45" fill="#fefce8" />
      <polygon points="40,45 38,38 35,45" fill="#fefce8" />
    </>
  );
}

function Imp(): ReactNode {
  return (
    <>
      <path d="M20 40 Q10 36 8 26 Q16 30 22 28 Z" fill="#7f1d1d" />
      <path d="M44 40 Q54 36 56 26 Q48 30 42 28 Z" fill="#7f1d1d" />
      <path d="M26 12 Q22 4 16 6 Q22 8 24 16 Z" fill="#fbbf24" />
      <path d="M38 12 Q42 4 48 6 Q42 8 40 16 Z" fill="#fbbf24" />
      <path d="M32 10 Q46 14 46 30 Q46 48 32 52 Q18 48 18 30 Q18 14 32 10 Z" fill="#ef4444" />
      <path d="M32 52 Q42 50 44 40 Q46 52 32 52 Z" fill="#b91c1c" />
      <circle cx="27" cy="27" r="2.6" fill="#fde047" />
      <circle cx="37" cy="27" r="2.6" fill="#fde047" />
      <path d="M26 37 Q32 42 38 37" stroke="#450a0a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M44 46 Q54 50 52 58 L56 54" stroke="#b91c1c" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function DarkMage(): ReactNode {
  return (
    <>
      <path d="M18 54 L23 22 Q32 10 41 22 L46 54 Z" fill="#312e81" />
      <path d="M23 22 Q32 10 41 22 Q42 30 32 31 Q22 30 23 22 Z" fill="#1e1b4b" />
      <ellipse cx="32" cy="27" rx="7" ry="8" fill="#09090b" />
      <circle cx="29" cy="27" r="1.7" fill="#c084fc" />
      <circle cx="35" cy="27" r="1.7" fill="#c084fc" />
      <line x1="52" y1="18" x2="52" y2="54" stroke="#57534e" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="52" cy="14" r="4.6" fill="#a855f7" />
      <circle cx="52" cy="14" r="7.5" fill="#a855f7" opacity="0.3" />
      <path d="M18 54 L46 54" stroke="#1e1b4b" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Golem(): ReactNode {
  return (
    <>
      <rect x="10" y="30" width="12" height="18" rx="4" fill="#57534e" />
      <rect x="42" y="30" width="12" height="18" rx="4" fill="#57534e" />
      <rect x="16" y="24" width="32" height="30" rx="7" fill="#78716c" />
      <rect x="21" y="10" width="22" height="15" rx="5" fill="#a8a29e" />
      <rect x="24" y="15" width="6" height="4" rx="1.6" fill="#f59e0b" />
      <rect x="34" y="15" width="6" height="4" rx="1.6" fill="#f59e0b" />
      <circle cx="32" cy="38" r="5" fill="#f59e0b" />
      <circle cx="32" cy="38" r="8.5" fill="#f59e0b" opacity="0.25" />
      <path d="M20 30 L26 34 M44 48 L38 44 M42 26 L38 30" stroke="#44403c" strokeWidth="1.8" strokeLinecap="round" />
    </>
  );
}

function Harpy(): ReactNode {
  return (
    <>
      {/* 高く広げた翼(羽先が上、下端は羽のスカラップ) */}
      <path d="M2 36 Q2 12 26 10 L28 28 Q22 24 18 30 Q14 26 10 32 Q6 30 2 36 Z" fill="#0d9488" />
      <path d="M62 36 Q62 12 38 10 L36 28 Q42 24 46 30 Q50 26 54 32 Q58 30 62 36 Z" fill="#0d9488" />
      <path d="M2 36 Q10 26 26 24 L26 28 Q14 30 2 36 Z" fill="#115e59" />
      <path d="M62 36 Q54 26 38 24 L38 28 Q50 30 62 36 Z" fill="#115e59" />
      {/* 胴(羽毛) */}
      <ellipse cx="32" cy="41" rx="10" ry="11" fill="#115e59" />
      <path d="M26 47 Q29 43 32 47 Q35 43 38 47" stroke="#0d9488" strokeWidth="1.6" fill="none" />
      {/* 顔と流れる髪 */}
      <circle cx="32" cy="24" r="9" fill="#f1c8a5" />
      <path d="M22 26 Q20 10 32 10 Q44 10 42 26 Q41 30 40 24 Q40 16 32 15 Q24 16 24 24 Q23 30 22 26 Z" fill="#134e4a" />
      <path d="M40 24 Q46 28 45 36 Q42 30 39 28 Z" fill="#134e4a" />
      <circle cx="28.5" cy="24" r="1.7" fill="#7c2d12" />
      <circle cx="35.5" cy="24" r="1.7" fill="#7c2d12" />
      <path d="M30 29 Q32 30.5 34 29" stroke="#9a3412" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* 鳥の脚と鉤爪 */}
      <path d="M28 51 L27 57 M27 57 L24 59 M27 57 L29 60 M36 51 L37 57 M37 57 L34 60 M37 57 L40 59" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Wraith(): ReactNode {
  return (
    <>
      <path d="M20 54 Q14 22 32 12 Q50 22 44 54 Q40 47 36 53 Q32 46 28 53 Q24 47 20 54 Z" fill="#475569" opacity="0.9" />
      <path d="M24 26 Q32 18 40 26 Q41 34 32 35 Q23 34 24 26 Z" fill="#0f172a" />
      <circle cx="28.5" cy="27" r="1.9" fill="#22d3ee" />
      <circle cx="35.5" cy="27" r="1.9" fill="#22d3ee" />
      <path d="M12 40 Q8 44 10 50" stroke="#64748b" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M52 38 Q56 42 54 48" stroke="#64748b" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
    </>
  );
}

function GoblinKing(): ReactNode {
  return (
    <>
      <polygon points="18,16 22,6 27,13 32,5 37,13 42,6 46,16" fill="#fbbf24" />
      <rect x="18" y="14" width="28" height="4" rx="2" fill="#f59e0b" />
      <polygon points="3,28 21,25 16,37" fill="#65a30d" />
      <polygon points="61,28 43,25 48,37" fill="#65a30d" />
      <ellipse cx="32" cy="36" rx="18" ry="16" fill="#84cc16" />
      <path d="M14 36 Q32 27 50 36 Q50 23 32 21 Q14 23 14 36 Z" fill="#65a30d" />
      <path d="M20 33 L28 36 M44 33 L36 36" stroke="#1a2e05" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="25" cy="38" r="2.8" fill="#fde047" />
      <circle cx="39" cy="38" r="2.8" fill="#fde047" />
      <path d="M23 47 Q32 52 41 47" stroke="#365314" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <polygon points="26,48 28,53 30,48" fill="#fefce8" />
      <polygon points="38,48 36,53 34,48" fill="#fefce8" />
      <path d="M43 28 L49 33" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function FrostDragon(): ReactNode {
  return (
    <>
      {/* 後方へ流れる角 */}
      <path d="M46 17 Q52 5 62 6 Q54 11 51 21 Z" fill="#e0f2fe" />
      <path d="M39 15 Q43 4 52 3 Q45 9 44 18 Z" fill="#e0f2fe" />
      {/* 上顎(左向きの頭部) */}
      <path d="M6 24 L32 15 Q47 10 55 20 L58 33 L38 35 L6 30 Z" fill="#38bdf8" />
      <path d="M32 15 Q47 10 55 20 L49 25 Q43 16 33 19 Z" fill="#0284c7" />
      {/* 上の牙 */}
      <polygon points="11,29 14,37 17,30" fill="#f0f9ff" />
      <polygon points="20,31 23,39 26,32" fill="#f0f9ff" />
      <polygon points="29,33 32,40 35,33" fill="#f0f9ff" />
      {/* 下顎 */}
      <path d="M9 45 L32 43 L52 38 L57 45 Q42 54 22 51 Q13 49 9 45 Z" fill="#0369a1" />
      <polygon points="16,44 18,38 21,44" fill="#f0f9ff" />
      <polygon points="26,43 28,37 31,43" fill="#f0f9ff" />
      {/* 目(縦スリット)と鼻孔 */}
      <ellipse cx="45" cy="24" rx="3.4" ry="2.8" fill="#e0f2fe" />
      <rect x="44.2" y="21" width="1.6" height="6" rx="0.8" fill="#0c4a6e" />
      <circle cx="12" cy="27" r="1.3" fill="#0c4a6e" />
      {/* 冷気のブレス */}
      <circle cx="6" cy="37" r="1.7" fill="#bae6fd" opacity="0.9" />
      <circle cx="3" cy="42" r="1.3" fill="#bae6fd" opacity="0.7" />
      <circle cx="7" cy="47" r="1" fill="#bae6fd" opacity="0.5" />
    </>
  );
}

function Lich(): ReactNode {
  return (
    <>
      <polygon points="19,15 23,5 28,12 32,4 36,12 41,5 45,15" fill="#3b0764" />
      <rect x="19" y="13" width="26" height="3.6" rx="1.8" fill="#581c87" />
      <path d="M19 18 Q32 12 45 18 Q50 24 48 33 Q46 40 41 42 L41 46 L23 46 L23 42 Q18 40 16 33 Q14 24 19 18 Z" fill="#d8d4dc" />
      <circle cx="26" cy="30" r="4.4" fill="#1e1b4b" />
      <circle cx="38" cy="30" r="4.4" fill="#1e1b4b" />
      <circle cx="26" cy="30" r="1.8" fill="#c084fc" />
      <circle cx="38" cy="30" r="1.8" fill="#c084fc" />
      <circle cx="26" cy="30" r="3.4" fill="#c084fc" opacity="0.35" />
      <circle cx="38" cy="30" r="3.4" fill="#c084fc" opacity="0.35" />
      <polygon points="32,35 30,39 34,39" fill="#1e1b4b" />
      <path d="M26 46 L26 51 M32 46 L32 52 M38 46 L38 51" stroke="#78716c" strokeWidth="1.6" />
      <path d="M14 54 L23 44 L32 54 L41 44 L50 54" fill="none" stroke="#3b0764" strokeWidth="4" strokeLinejoin="round" />
    </>
  );
}

/** 未定義IDのフォールバック(影+「?」)。 */
function Unknown(): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="34" rx="16" ry="18" fill="#27272a" />
      <text x="32" y="42" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#71717a">
        ?
      </text>
    </>
  );
}

const MONSTER_ART: Readonly<Record<string, () => ReactNode>> = {
  slime: Slime,
  goblin: Goblin,
  wolf: Wolf,
  bat: Bat,
  skeleton: Skeleton,
  zombie: Zombie,
  orc: Orc,
  imp: Imp,
  dark_mage: DarkMage,
  golem: Golem,
  harpy: Harpy,
  wraith: Wraith,
  goblin_king: GoblinKing,
  frost_dragon: FrostDragon,
  lich: Lich,
};

/** アート定義済みの敵ID一覧(データ整合性テスト用)。 */
export const MONSTER_ART_IDS: readonly string[] = Object.keys(MONSTER_ART);

export function MonsterArt({
  enemyDefId,
  className = '',
}: {
  enemyDefId: string | undefined;
  className?: string;
}) {
  const Art = (enemyDefId && MONSTER_ART[enemyDefId]) || Unknown;
  let label = enemyDefId ?? '不明な敵';
  try {
    if (enemyDefId) label = getEnemyById(enemyDefId).name;
  } catch {
    // 未登録IDはIDのまま表示
  }
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={label}>
      <Art />
    </svg>
  );
}
