# WPA Algorithm v4.0 Specification

## 1. 核心理念 (Core Concepts)

WPA (Win Probability Added) v4.0 旨在解决 v3.3 在特定场景下（如下包/拆包/回防）分配不公的问题，建立一个更符合 CS2 竞技逻辑的“公平公正”数学模型。

### 1.1 终局状态一致性 (Terminal State Consistency)
无论通过何种方式获胜（全歼、拆包、爆炸、时间耗尽），获胜方的胜率必须在回合结束瞬间收敛至 **100%**，失败方收敛至 **0%**。

### 1.2 贡献分配原则 (Contribution Distribution)
*   **团队行为个人化**: 下包是团队掩护的结果，不仅仅是下包者的功劳。
*   **关键行为高回报**: 在 1vX 残局拆包应获得巨额奖励。
*   **常规行为低回报**: 在 5v0 安全拆包应只获得微量奖励（因为胜局已定）。

---

## 2. 胜率计算模型更新 (Probability Model Updates)

### 2.1 状态定义
胜率 $P(T_{win})$ 由以下状态决定：
*   **阶段**: Pre-Plant (未下包) / Post-Plant (已下包)
*   **存活人数**: $N_T, N_{CT}$
*   **时间**: $t_{remaining}$ (剩余时间) / $t_{c4}$ (C4 倒计时)
*   **C4 状态**: $IsPlanted, IsDefusing$

### 2.2 终局判定逻辑 (Terminal Logic)
在任何计算前，优先检查终局条件：

1.  **C4 爆炸**: $P(T) = 1.0$
2.  **C4 被拆除**: $P(T) = 0.0$
3.  **时间耗尽 (未下包)**: $P(T) = 0.0$
4.  **全歼 (Elimination)**:
    *   **未下包**: 若 $N_T = 0$, $P(T) = 0.0$ (CT 胜)。
    *   **已下包**: 若 $N_{CT} = 0$, $P(T) = 1.0$ (T 胜)。
    *   **特殊情况**: 若已下包且 $N_T = 0$ 但 $N_{CT} > 0$，此时 $P(T) \neq 0$。CT 仍需拆包。
        *   此时 $P(T)$ 取决于：是否有拆包钳、距离 C4 远近（简化为剩余时间是否足够）。
        *   若 $t_{c4} < 5s$ 且无人拆包 $\to P(T) \approx 1.0$。
        *   若 $t_{c4} > 10s$ 且有钳子 $\to P(T) \approx 0.01$ (CT 极大优)。

---

## 3. 事件处理与 WPA 分配 (Event Processing & Distribution)

### 3.1 下包事件 (Bomb Plant)
下包不仅是下包者的动作，也是队友掩护的结果。

*   **计算 $\Delta P$**:
    $$ \Delta P_{plant} = P_{Post}(N_T, N_{CT}) - P_{Pre}(N_T, N_{CT}) $$
    通常 $\Delta P > 0$ (T 胜率上升)。

*   **分配逻辑 (Distribution)**:
    *   **下包者 (Planter)**: 获得 **60%** 的 $\Delta P$。
    *   **存活队友 (Support)**: 平分剩余 **40%** 的 $\Delta P$。
    *   **理由**: 队友的存活和架枪使得下包成为可能。若无队友，下包者独享 100%（即 60% + 40%）。

### 3.2 拆包事件 (Bomb Defuse)
拆包的 WPA 取决于拆包发生的**时机**和**局势**。

*   **计算 $\Delta P$**:
    $$ \Delta P_{defuse} = P_{current\_state} - 0.0 $$
    (拆包成功后 T 胜率变为 0，CT 胜率变为 1)

*   **场景分析**:
    *   **场景 A: 5v0 安全拆包**:
        *   在最后一个 T 被击杀时，模型应已将 $P(T)$ 降至极低 (e.g., 1%)。
        *   此时拆包，$\Delta P = 0.01 - 0.0 = 0.01$。
        *   **结果**: 拆包者获得微量分数。大头分数已在击杀 T 的过程中分配给了击杀者。
    *   **场景 B: 1v1 极限强拆 (Ninja Defuse)**:
        *   此时 $P(T)$ 可能高达 80% (因为 T 活着且 C4 时间流逝)。
        *   拆包成功，$\Delta P = 0.80 - 0.0 = 0.80$。
        *   **结果**: 拆包者获得巨额分数（挽救了败局）。

*   **分配逻辑**:
    *   **拆包者**: 获得 100% 的 $\Delta P$。

### 3.3 击杀事件 (Kills) - 回防修正
在 Post-Plant (回防) 阶段，击杀 T 阵营玩家会导致 $P(T)$ 下降。

*   **修正**: 当 $N_T$ 降为 0 时，如果 $N_{CT} > 0$ 且有足够时间拆包，模型必须将 $P(T)$ 降至接近 0 (e.g., 5%)，而不是维持在 Post-Plant 矩阵的胜率。
*   **公式**:
    $$ P_{Post}(0, N_{CT}) = \text{Time\_Factor} \times 0.05 $$
    这确保了“击杀最后一名 T”的 CT 玩家获得巨大的 WPA（因为他实际上确保了拆包的机会），而不是把功劳留给拆包者。

---

## 4. 详细算法流程 (Detailed Algorithm)

### 4.1 实时胜率计算函数 `getWinProb()`
```typescript
function getWinProb(state): number {
    // 1. 终局判定
    if (state.bombExploded) return 1.0;
    if (state.bombDefused) return 0.0;
    if (state.timeOut && !state.bombPlanted) return 0.0;
    
    // 2. 全歼判定
    if (state.aliveT == 0 && !state.bombPlanted) return 0.0;
    if (state.aliveCT == 0 && state.bombPlanted) return 1.0;
    
    // 3. 回防特殊判定 (C4已安放，T全灭，CT存活)
    if (state.bombPlanted && state.aliveT == 0 && state.aliveCT > 0) {
        // 检查是否有时间拆包
        const timeToDefuse = state.hasKit ? 5 : 10;
        if (state.c4TimeLeft >= timeToDefuse) {
            return 0.05; // CT 极大优，留 5% 给"找不到包/被火烧死"等意外
        } else {
            return 1.0; // CT 存活但没时间了，T 胜
        }
    }

    // 4. 矩阵查询
    let prob = state.bombPlanted 
        ? MATRIX_POST[state.aliveT][state.aliveCT]
        : MATRIX_PRE[state.aliveT][state.aliveCT];
        
    // 5. 修正 (经济、血量、时间)
    prob = applyModifiers(prob, state);
    
    return prob;
}
```

### 4.2 WPA 分配表

| 事件 | 触发条件 | WPA 来源 | 分配对象 | 比例 |
| :--- | :--- | :--- | :--- | :--- |
| **Kill** | 任意击杀 | $P_{old} - P_{new}$ | 击杀者 | 100% (或含助攻分配) |
| **Plant** | C4 安放 | $P_{Post} - P_{Pre}$ | 下包者 | **60%** |
| | | | 存活 T 队友 | **40%** (平分) |
| **Defuse** | C4 拆除 | $P_{current} - 0$ | 拆包者 | 100% |
| **Explode**| C4 爆炸 | $P_{current} - 1$ | (通常 $P \approx 1$) | 无 (或给存活 T) |

---

## 5. 回溯式回防修正 (Retrospective Retake Correction)

由于缺乏坐标数据，无法实时判断“能否拆包”（距离/掩体）。因此，引入**基于结果的回溯修正机制**。

### 5.1 机制核心
在回合结束（C4拆除或爆炸）后，根据最终结果重新评估 Post-Plant 阶段的 WPA 分配。

### 5.2 场景 A：拆包成功 (Defuse Success) —— "有效回防"
*   **判定**: CT 成功拆除 C4。
*   **修正逻辑**: 认定回防过程中的每一个 CT 击杀都是“通向胜利的阶梯”。
*   **模拟曲线**:
    *   随着 T 阵营人数减少，T 胜率 $P(T)$ 加速下跌至 0。
    *   **全歼奖励**: 若 $N_T \to 0$，则 $P(T)$ 强制修正为 **0.05** (留 5% 给拆包动作)。
    *   **分配**:
        *   **回防击杀者**: 获得绝大部分 WPA (因为他们清空了包点)。
        *   **拆包者**: 获得最后 **5%** 的 WPA (完成“盖棺定论”的动作)。
        *   **例外**: 若是 1vX 偷包 (Ninja Defuse)，击杀数为 0，则拆包者获得 **100%** WPA。

### 5.3 场景 B：拆包失败 (Bomb Exploded) —— "无效回防/保枪"
*   **判定**: C4 爆炸（无论 T 是否全灭）。
*   **修正逻辑**: 认定回防过程中的 CT 击杀未能改变战局结果（可能是保枪杀人，或时间不足的无效击杀）。
*   **模拟曲线**:
    *   即使 $N_T$ 减少，T 胜率 $P(T)$ **不**大幅下降，而是维持在高位 (e.g., >80%)。
    *   **全歼惩罚**: 即使 $N_T \to 0$，若最终爆炸，说明时间不够。此时 $P(T)$ 仍锁定在 **1.0**。
*   **WPA 修正**:
    *   **回防击杀 WPA**: 受到 **0.2x** 的衰减系数 (Dampening Factor)。
    *   **理由**: 这些击杀没有贡献“胜率”（Round Win），只贡献了“经济差”（Economy）。
    *   **T 阵营**: 存活的 T 玩家（或拖延时间的 T）获得防守成功的 WPA。

---

## 6. 总结 (Summary)

v4.0 的核心改进在于**更精确地界定“胜势”的归属**：
1.  **下包是团队功劳**：不再让下包者独吞分数。
2.  **回防击杀重于拆包动作**：如果 CT 把 T 杀光了，胜率在击杀瞬间就已经大幅向 CT 倾斜，击杀者拿走大部分 WPA。拆包者只是完成了最后一步（除非是偷包）。
3.  **回溯修正**：通过结果反推过程，解决了“无距离数据”导致的胜率误判问题。
4.  **逻辑闭环**：消除了“人杀完了胜率还不是 100%”和“拆了包胜率才跳变”的滞后感。
