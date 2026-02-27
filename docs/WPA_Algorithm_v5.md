# WPA Algorithm v5.0 Specification

## 1. 核心理念 (Core Concepts)

WPA (Win Probability Added) v5.0 在 v4.0 的基础上，针对 CS2 的实际竞技节奏进行了精细化调整，特别是针对 **Post-Plant (下包后)** 阶段的胜率衰减模型进行了重构，并修复了特定场景下的统计偏差。

### 1.1 目标
*   **真实反映局势**: 胜率曲线应符合玩家对当前局势的直观感受。
*   **奖励关键行为**: 拆包者在极限时间内的拆包应获得巨大奖励，而安全拆包则奖励较少。
*   **消除垃圾数据**: 剔除换边回合后的无效数据，保证 Rating 的纯净性。

---

## 2. 胜率计算模型更新 (Probability Model Updates)

### 2.1 分段线性插值 (Piecewise Linear Interpolation)

v5.0 废弃了纯数学函数的衰减模型，转而使用基于专家经验数据的**分段线性插值**。这允许我们精确控制每个时间点的胜率系数。

#### 系数定义
*   $x(t)$: CT 胜率乘数，范围 $[0, 1]$。
*   $t$: C4 已安放时间 (Time Passed)，范围 $0 \to 40s$。
*   $P(CT)_{final} = P(CT)_{matrix} \times x(t)$

#### 场景区分 (Scenario Differentiation)
系统利用 Demo 的“未来视”能力，预先知道回合结果，从而选择不同的衰减曲线：

**Scenario 1: CT 最终拆包获胜 (Defuse Success)**
*   **逻辑**: 既然已知 CT 最终拆包成功，说明时间是足够的。因此胜率不应随时间流逝而过快归零，必须保留一定的胜率悬念，以便在拆包瞬间产生巨大的 WPA Swing（奖励拆包者）。
*   **数据点 (Time, Multiplier)**:
    *   0s: 1.00
    *   10s: 0.95
    *   20s: 0.82
    *   28s: 0.68
    *   35s: 0.40
    *   40s: 0.20 (外推点，防止归零)
*   **特点**: 缓慢衰减，无急剧加速。

**Scenario 2: 炸弹爆炸 / T 获胜 (Explosion / T Win)**
*   **逻辑**: 随着时间流逝，CT 获胜的可能性呈指数级下降，特别是在 30s 后的“不可拆除点”。
*   **数据点**:
    *   0-28s: 同 Scenario 1
    *   32s: 0.35
    *   35s: 0.08
    *   37s: 0.00 (理论极限，无钳子拆包需 10s，30s 后无钳必输；有钳需 5s，35s 后必输。取 37s 为绝对死线)
*   **特点**: 前段平缓，后段雪崩。

### 2.2 T 全灭判定 (T Elimination Logic)

*   **规则**: 当所有 T 阵营玩家阵亡 ($N_T = 0$) 时：
    *   **若处于 Scenario 1 (CT 最终赢)**: 立即锁定 $P(T) = 0.0$ (CT 胜率 100%)。
        *   *理由*: 既然 CT 赢了且 T 全死，说明 CT 肯定拆了包。此时不再进行时间衰减，直接判胜。
    *   **若处于 Scenario 2 (T 最终赢)**: **不锁定**。
        *   *理由*: 即使 T 全死，炸弹仍可能爆炸（CT 没有时间拆包或没有钳子）。此时胜率应继续遵循 Scenario 2 的时间衰减曲线归零。

---

## 3. 数据清洗与统计修正 (Data Cleaning & Fixes)

### 3.1 BOT 击杀处理 (BOT Kill Handling)
*   **逻辑**: 击杀 BOT（掉线替补）产生的 WPA 变化不再归属于击杀者个人。
*   **分配规则**:
    *   **收益 (Gain)**: 击杀 BOT 导致己方胜率提升的部分，由 **全队均分**。
    *   **惩罚 (Loss)**: BOT 死亡导致的胜率下降，由 BOT 自身承担（或其所在队伍分摊，具体视实现而定，目前记录在 BOT 身上）。
*   **目的**: 防止玩家通过“刷 BOT”来人为抬高个人 Rating 和 WPA 数据。

### 3.2 垃圾时间剔除 (Garbage Time Exclusion)
为了防止换边后的无效击杀/伤害影响 Rating 和 WPA：
*   **逻辑**: 在 **换边回合** (R12, R24, R27, R30...) 及 **整场比赛最后一回合** 结束后产生的所有 `Kill`, `Death`, `Damage` 事件，均被视为无效数据，不计入统计。
*   **实现**: 检查 `CurrentRound` 是否为换边回合/终局，且 `EventTick > RoundEndTick`。

### 3.2 经济系统重置 (Economy Reset)
修复了手枪局经济统计错误的 Bug。
*   **逻辑**: 在 **R1 (开局)**, **R13 (下半场)**, **OT Start/Switch (加时赛换边)** 的 `round_start` 时刻，强制重置所有玩家的库存价值记录。
*   **目的**: 防止上一半场的装备价值（如保下来的枪）错误地计入下手枪局的 `Equipment Value`，导致经济曲线异常。

---

## 4. UI 展示更新 (UI Updates)

### 4.1 计分板 (Scoreboard)
*   **列顺序**: WPA 列已移动至 RTG (Rating) 列的右侧，作为核心评价指标之一。
*   **默认排序**: 计分板默认按照 **WPA (Win Probability Added)** 从高到低排序，突显对胜负贡献最大的玩家。

---

## 5. 附录：WPA 计算公式摘要

$$
P(CT)_{base} = 1.0 - P(T)_{matrix}
$$

$$
x(t) = \text{Interpolate}(t, \text{ScenarioPoints})
$$

$$
P(CT)_{final} = \begin{cases} 
1.0 & \text{if } N_T=0 \text{ AND } \text{Scenario}=1 \\
P(CT)_{base} \times x(t) & \text{otherwise}
\end{cases}
$$

$$
P(T)_{final} = 1.0 - P(CT)_{final}
$$
