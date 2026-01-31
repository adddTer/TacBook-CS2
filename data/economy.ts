
import { EconomyRule } from '../types';

export const ECONOMY_RULES: EconomyRule[] = [
  {
    title: "战败补偿 (Loss Bonus)",
    values: [
      { label: "1连败", value: "$1400" },
      { label: "2连败", value: "$1900" },
      { label: "3连败", value: "$2400" },
      { label: "4连败", value: "$2900" },
      { label: "5连败 (最大)", value: "$3400" },
    ]
  },
  {
    title: "胜利奖励 (Round Win)",
    values: [
      { label: "全歼敌人", value: "$3250" },
      { label: "时间耗尽 (CT)", value: "$3250" },
      { label: "拆除C4 (CT)", value: "$3500" },
      { label: "C4爆炸 (T)", value: "$3500" },
    ]
  },
  {
    title: "目标奖励 (Objectives)",
    values: [
      { label: "安装C4 (全队)", value: "+$800 (输赢皆有)" },
      { label: "安装C4 (个人)", value: "+$300" },
      { label: "拆除C4 (个人)", value: "+$300" },
    ]
  },
  {
    title: "特殊惩罚与奖励",
    values: [
      { label: "CT全队奖励", value: "回合结束时每击杀1名T +$50" },
      { label: "时间耗尽存活 (T)", value: "$0 (无收入)" },
      { label: "自杀/TK", value: "-$300 (下局无收入)" },
    ]
  }
];
