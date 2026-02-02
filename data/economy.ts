
import { EconomyRule } from '../types';

export const ECONOMY_RULES: EconomyRule[] = [
  {
    title: "战败补偿",
    values: [
      { label: "1连败", value: "$1400" },
      { label: "2连败", value: "$1900" },
      { label: "3连败", value: "$2400" },
      { label: "4连败", value: "$2900" },
      { label: "5连败 (最大)", value: "$3400" },
      { label: "注意", value: "胜利会使连败等级降低2级。" }
    ]
  },
  {
    title: "胜利奖励",
    values: [
      { label: "全歼敌人", value: "$3250" },
      { label: "时间耗尽 (CT)", value: "$3250" },
      { label: "拆除C4 (CT)", value: "$3500" },
      { label: "C4爆炸 (T)", value: "$3500" },
    ]
  },
  {
    title: "目标奖励",
    values: [
      { label: "安装C4 (全队)", value: "+$600 (输赢皆有)" },
      { label: "安装C4 (个人)", value: "+$300" },
      { label: "拆除C4 (个人)", value: "+$300" },
      { label: "刀杀奖励", value: "+$1500" },
    ]
  },
  {
    title: "特殊规则",
    values: [
      { label: "手枪局战败", value: "无论CT/T，手枪局输掉固定获得$1900" },
      { label: "CT全队奖励", value: "回合结束时每击杀1名T +$50" },
      { label: "自杀", value: "对手获得击杀补偿" },
      { label: "队友误杀 (TK)", value: "-$300" },
    ]
  }
];
