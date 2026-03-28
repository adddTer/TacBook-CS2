import React, { useState } from "react";
import { Tournament, ContentGroup } from "../../types";

interface TournamentCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  writableGroups: ContentGroup[];
  onSave: (tournament: Tournament, groupId: string) => void;
}

export const TournamentCreatorModal: React.FC<TournamentCreatorModalProps> = ({
  isOpen,
  onClose,
  writableGroups,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(
    writableGroups[0]?.metadata.id || "",
  );

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim() || !startDate || !selectedGroup) return;

    const newTournament: Tournament = {
      id: Date.now().toString(),
      title: title.trim(),
      startDate,
      endDate: endDate || undefined,
      groupId: selectedGroup,
    };

    onSave(newTournament, selectedGroup);
    onClose();

    // Reset
    setTitle("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800">
        <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-6">
          创建新赛事
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
              赛事名称
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：IEM Cologne 2024"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                结束日期 (可选)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
              保存到战术包
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              {writableGroups.map((g) => (
                <option key={g.metadata.id} value={g.metadata.id}>
                  {g.metadata.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !startDate || !selectedGroup}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-transform active:scale-95"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
};
