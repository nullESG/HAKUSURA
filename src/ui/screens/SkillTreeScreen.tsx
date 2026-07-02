import { useState } from 'react';
import { canLearnNode } from '../../core/progression/skillTree';
import type { SkillNode } from '../../core/types/skill';
import { getSkillById } from '../../data/skills';
import { getSkillTreeByClass } from '../../data/skillTrees';
import { useGameStore } from '../../store/gameStore';
import { STAT_LABELS } from '../labels';
import { Button, Panel, Sheet } from '../components/shared';
import type { StatId } from '../../core/types/enums';

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

export function SkillTreeScreen() {
  const party = useGameStore((s) => s.party);
  const learnSkillNode = useGameStore((s) => s.learnSkillNode);
  const [selectedId, setSelectedId] = useState(party[0]?.id);
  const [selectedNode, setSelectedNode] = useState<SkillNode>();

  const character = party.find((c) => c.id === selectedId) ?? party[0];
  if (!character) return null;
  const tree = getSkillTreeByClass(character.classId);
  const learned = new Set(character.learnedNodeIds);

  // y(深さ)ごとの行に並べる
  const rows = new Map<number, SkillNode[]>();
  for (const node of tree) {
    const row = rows.get(node.position.y) ?? [];
    row.push(node);
    rows.set(node.position.y, row);
  }
  const sortedRows = [...rows.entries()].sort((a, b) => a[0] - b[0]);

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

      <Panel title={`スキルツリー(残りポイント ${character.unspentSkillPoints})`}>
        <div className="flex flex-col gap-2">
          {sortedRows.map(([y, nodes]) => (
            <div key={y} className="flex justify-center gap-2">
              {nodes
                .sort((a, b) => a.position.x - b.position.x)
                .map((node) => {
                  const isLearned = learned.has(node.id);
                  const canLearn = canLearnNode(character, node.id, tree).ok;
                  return (
                    <button
                      type="button"
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`min-w-24 rounded-lg border px-2 py-2 text-[11px] font-semibold ${
                        isLearned
                          ? 'border-amber-500 bg-amber-600/20 text-amber-300'
                          : canLearn
                            ? 'border-sky-600 bg-sky-900/30 text-sky-300'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-600'
                      } ${node.nodeType === 'keystone' ? 'ring-1 ring-purple-500/50' : ''}`}
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
            </div>
          ))}
        </div>
      </Panel>

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
