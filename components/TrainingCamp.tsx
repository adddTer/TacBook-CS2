import React, { useState, useMemo } from "react";
import { Tactic, Utility } from "../types";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Info,
} from "lucide-react";

interface ScheduleItem {
  id: string;
  type: "tactic" | "utility" | "text";
  refId?: string; // ID for tactic or utility
  description: string;
}

type PlanStatus =
  | "in_progress"
  | "not_started"
  | "completed"
  | "cancelled"
  | "postponed";

interface TrainingPlan {
  id: string;
  date: string; // YYYY-MM-DD
  originalDate?: string;
  title: string;
  schedule: ScheduleItem[];
  manualStatus?: "cancelled" | "postponed";
  postponementReason?: string;
}

const initialPlans: TrainingPlan[] = [
  {
    id: "1",
    date: "2026-03-28",
    originalDate: "2026-03-21",
    title: "Mirage 和 Nuke 战术讨论与跑图训练",
    schedule: [],
    manualStatus: "postponed",
    postponementReason: "需要额外时间分析3月18日更新中换弹系统重做对战术的影响",
  },
];

interface TrainingCampProps {
  allTactics: Tactic[];
  allUtilities: Utility[];
}

export const TrainingCamp: React.FC<TrainingCampProps> = ({
  allTactics,
  allUtilities,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);

  const getDayOfWeek = (dateString: string) => {
    const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  const today = new Date().toISOString().split("T")[0];

  const getPlanStatus = (plan: TrainingPlan): PlanStatus => {
    if (plan.manualStatus) return plan.manualStatus;
    if (plan.date < today) return "completed";
    if (plan.date === today) return "in_progress";
    return "not_started";
  };

  const getStatusConfig = (status: PlanStatus) => {
    switch (status) {
      case "in_progress":
        return {
          label: "进行中",
          color:
            "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
          icon: Clock,
          border: "border-blue-500",
        };
      case "not_started":
        return {
          label: "未开始",
          color:
            "text-neutral-600 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800",
          icon: Calendar,
          border: "border-transparent",
        };
      case "completed":
        return {
          label: "已结束",
          color:
            "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30",
          icon: CheckCircle2,
          border: "border-transparent",
        };
      case "cancelled":
        return {
          label: "已取消",
          color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
          icon: XCircle,
          border: "border-transparent",
        };
      case "postponed":
        return {
          label: "已推迟",
          color:
            "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
          icon: AlertCircle,
          border: "border-amber-500/50",
        };
    }
  };

  const sortedPlans = useMemo(() => {
    return [...initialPlans].sort((a, b) => {
      // Prioritize today's plan
      if (a.date === today && b.date !== today) return -1;
      if (b.date === today && a.date !== today) return 1;
      // Then sort by date ascending
      return a.date.localeCompare(b.date);
    });
  }, [today]);

  if (selectedPlan) {
    const status = getPlanStatus(selectedPlan);
    const config = getStatusConfig(status);
    const StatusIcon = config.icon;

    return (
      <div className="p-4 lg:p-8 max-w-[1920px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button
          onClick={() => setSelectedPlan(null)}
          className="group flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          返回集训列表
        </button>

        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm mb-8 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 w-2 h-full"
            style={{
              backgroundColor:
                config.color.match(/text-(\w+)-/)?.[0]?.replace("text-", "") ||
                "currentColor",
            }}
          ></div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${config.color}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {config.label}
                </span>
                <span className="text-sm font-medium text-neutral-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {selectedPlan.date} {getDayOfWeek(selectedPlan.date)}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight mb-4">
                {selectedPlan.title}
              </h1>

              {selectedPlan.manualStatus === "postponed" &&
                selectedPlan.postponementReason && (
                  <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 p-4 rounded-xl mt-6 max-w-2xl border border-amber-200 dark:border-amber-800/30">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm mb-1">推迟原因</h4>
                      <p className="text-sm opacity-90 leading-relaxed">
                        {selectedPlan.postponementReason}
                      </p>
                      {selectedPlan.originalDate && (
                        <p className="text-xs opacity-75 mt-2 font-mono">
                          原定日期: {selectedPlan.originalDate}
                        </p>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white px-2">
            训练内容
          </h3>
          {selectedPlan.schedule.length === 0 ? (
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-12 text-center border border-neutral-200 border-dashed dark:border-neutral-700">
              <p className="text-neutral-500 dark:text-neutral-400">
                暂无具体训练内容安排
              </p>
            </div>
          ) : (
            selectedPlan.schedule.map((item, index) => {
              const exists =
                item.type === "text" ||
                (item.type === "tactic" &&
                  allTactics.find((t) => t.id === item.refId)) ||
                (item.type === "utility" &&
                  allUtilities.find((u) => u.id === item.refId));

              return (
                <div
                  key={item.id}
                  className="group bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                    {index + 1}
                  </div>
                  <div className="flex-grow pt-1">
                    <div className="flex justify-between items-start gap-4">
                      <p className="font-medium text-neutral-900 dark:text-white text-lg">
                        {item.description}
                      </p>
                      {!exists && (
                        <span className="shrink-0 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800/30">
                          缺少资源
                        </span>
                      )}
                    </div>
                    {item.type !== "text" && (
                      <p className="text-xs text-neutral-400 font-mono mt-2 bg-neutral-50 dark:bg-neutral-800/50 inline-block px-2 py-1 rounded">
                        引用 ID: {item.refId}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1920px] mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight mb-3">
          集训中心
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-lg">
          规划和管理战队训练日程，同步战术与道具练习。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedPlans.map((plan) => {
          const status = getPlanStatus(plan);
          const config = getStatusConfig(status);
          const StatusIcon = config.icon;
          const isToday = plan.date === today;

          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`group relative bg-white dark:bg-neutral-900 p-6 md:p-8 rounded-3xl shadow-sm border text-left transition-all hover:shadow-md hover:-translate-y-1 overflow-hidden ${isToday ? "border-blue-500 dark:border-blue-500/50 ring-1 ring-blue-500/20" : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"}`}
            >
              {isToday && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              )}

              <div className="flex justify-between items-start mb-6">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${config.color}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {config.label}
                </span>
                <span className="text-sm font-medium text-neutral-400 font-mono">
                  {plan.date}
                </span>
              </div>

              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {plan.title}
              </h2>

              <div className="flex items-center justify-between mt-8">
                <p className="text-sm font-medium text-neutral-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {getDayOfWeek(plan.date)}
                </p>
                <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
