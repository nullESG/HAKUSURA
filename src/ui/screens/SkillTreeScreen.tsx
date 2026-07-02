import { useState } from 'react';
import { canLearnNode } from '../../core/progression/skillTree';
import type { StatId } from '../../core/types/enums';
import type { SkillNode } from '../../core/types/skill';
import { getSkillById } from '../../data/skills';
import { getSkillTreeByClass } from '../../data/skillTrees';
import { useGameStore } from '../../store/gameStore';
import { STAT_LABELS } from '../labels';
import { PanZoomCanvas } from '../components/PanZoomCanvas';
import { Button, Sheet } from '../components/shared';

function nodeSummary(node: SkillNode): string {
  if (node.skillId) {
    const skill = getSkillById(node.skillId);
    return `スキル習得: ${skill.name}(MP${skill.mpCost})`;
  }
  if (node.passiveStats) {
    return Object.entries(node.passiveStats)
      .map(([stat, value]) => `${STAT_LABELS[stat as StatId]} +${value}`)
      .join(' / ');
  }
  return 'キーストーン効果';
}

const KEYSTONE_DESCRIPTIONS: Record<string, string> = {
  berserker: 'HP50%以下のとき与ダメージ+50%',
  elemental_overload: '属性ダメージ+30%、ただし被ダメージ+15%',
  deadly_precision: 'クリティカル率+25%、攻撃が回避されなくなる',
  divine_guardian: '戦闘ごとに1回、致死ダメージをHP1で耐える',
  master_summoner: '召喚上限+1、召喚ユニットのステータス+50%',
};

/** 論理座標 → キャンバス座標(ピクセル)。 */
const CELL_W = 120;
const CELL_H = 96;
const NODE_W = 104;
const NODE_H = 60;
const PADDING = 24;

function nodeLeft(node: SkillNode, minX: number): number {
  return PADDING + (node.position.x - minX) * CELL_W;
}
function nodeTop(node: SkillNode, minY: number): number {
  return PADDING + (node.position.y - minY) * CELL_H;
}

export function SkillTreeScreen() {
  const party = useGameStore((s) => s.party);
  const learnSkillNode = useGameStore((s) => s.learnSkillNode);
  const [selectedId, setSelectedId] = useState(party[0]?.id);
  const [selectedNode, setSelectedNode] = useState<SkillNode>();

  const character = party.find((c) => c.id === selectedId) ?? party[0];
  if (!character) return null;
  const tree = getSkillTreeByClass(character.classId);
  const learned = new Set(character.learnedNodeIds);
  const nodeById = new Map(tree.map((n) => [n.id, n]));

  const minX = Math.min(...tree.map((n) => n.position.x));
  const minY = Math.min(...tree.map((n) => n.position.y));
  const maxX = Math.max(...tree.map((n) => n.position.x));
  const maxY = Math.max(...tree.map((n) => n.position.y));
  const contentWidth = (maxX - minX) * CELL_W + NODE_W + PADDING * 2;
  const contentHeight = (maxY - minY) * CELL_H + NODE_H + PADDING * 2;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-4 gap-1">
        {party.map((member) => (
          <button
            type="button"
            key={member.id}
            onClick={() => setSelectedId(member.id)}
            className={`rounded-lg px-1 py-2 text-xs font-bold ${
              member.id === character.id
                ? 'bg-amber-600 text-neutral-950'
                : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            {member.name}
          </button>
        ))}
      </div>

      <p className="text-xs font-bold tracking-wider text-neutral-400">
        スキルツリー(残りポイント {character.unspentSkillPoints})
      </p>

      <PanZoomCanvas
        contentWidth={contentWidth}
        contentHeight={contentHeight}
        initialView={{ x: 0, y: 8, scale: 1 }}
      >
        {/* 前提ノード間の接続線 */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={contentWidth}
          height={contentHeight}
        >
          {tree.flatMap((node) =>
            node.requiredNodeIds.map((reqId) => {
              const req = nodeById.get(reqId);
              if (!req) return null;
              const bothLearned = learned.has(node.id) && learned.has(reqId);
              return (
                <line
                  key={`${reqId}-${node.id}`}
                  x1={nodeLeft(req, minX) + NODE_W / 2}
                  y1={nodeTop(req, minY) + NODE_H}
                  x2={nodeLeft(node, minX) + NODE_W / 2}
                  y2={nodeTop(node, minY)}
                  stroke={bothLearned ? '#f59e0b' : '#3f3f46'}
                  strokeWidth={bothLearned ? 3 : 2}
                />
              );
            }),
          )}
        </svg>

        {tree.map((node) => {
          const isLearned = learned.has(node.id);
          const canLearn = canLearnNode(character, node.id, tree).ok;
          return (
            <button
              type="button"
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className={`absolute rounded-lg border px-1 py-1 text-[11px] font-semibold ${
                isLearned
                  ? 'border-amber-500 bg-amber-600/20 text-amber-300'
                  : canLearn
                    ? 'border-sky-600 bg-sky-900/40 text-sky-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-600'
              } ${node.nodeType === 'keystone' ? 'ring-1 ring-purple-500/60' : ''}`}
              style={{
                left: nodeLeft(node, minX),
                top: nodeTop(node, minY),
                width: NODE_W,
                height: NODE_H,
              }}
            >
              {node.name}
              <span className="block text-[9px] font-normal opacity-70">
                {node.nodeType === 'active'
                  ? 'アクティブ'
                  : node.nodeType === 'passive'
                    ? 'パッシブ'
                    : 'キーストーン'}{' '}
                / {node.cost}pt
              </span>
            </button>
          );
        })}
      </PanZoomCanvas>

      {selectedNode && (
        <Sheet onClose={() => setSelectedNode(undefined)}>
          <h3 className="text-lg font-bold text-amber-400">{selectedNode.name}</h3>
          <p className="mt-1 text-sm text-neutral-300">{nodeSummary(selectedNode)}</p>
          {selectedNode.keystoneEffectId && (
            <p className="mt-1 text-sm text-purple-300">
              {KEYSTONE_DESCRIPTIONS[selectedNode.keystoneEffectId]}
            </p>
          )}
          <p className="mt-2 text-xs text-neutral-500">消費スキルポイント: {selectedNode.cost}</p>
          <div className="mt-4">
            {learned.has(selectedNode.id) ? (
              <p className="text-center text-sm text-amber-400">取得済み</p>
            ) : (
              <Button
                className="w-full py-3"
                disabled={!canLearnNode(character, selectedNode.id, tree).ok}
                onClick={() => {
                  learnSkillNode(character.id, selectedNode.id);
                  setSelectedNode(undefined);
                }}
              >
                取得する
              </Button>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
