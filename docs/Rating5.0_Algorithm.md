
# TacBook Rating 5.0 (WPA Integrated) Algorithm

## Overview
Rating 5.0 represents a paradigm shift from pure statistical aggregation to impact-based evaluation. It integrates **Win Probability Added (WPA)** directly into the rating formula and introduces a **Kill Share** system to fairly distribute credit for kills based on damage contribution.

### Key Updates (v5.0)
1.  **WPA Integration**: Round WPA is now a direct component of the Rating. Winning critical rounds boosts rating significantly.
2.  **Kill Share System**: Replaces the old binary Kill/Assist logic.
    *   **Total Kill Value**: 1.0 Point per kill.
    *   **Fixed Share**: 60% (0.6 pts) goes directly to the killer.
    *   **Damage Share**: 40% (0.4 pts) is distributed among all contributors based on damage dealt.
    *   **Utility Assist**: Flash assists count as 30 damage weight in the distribution.
3.  **Economy Modifier**: Kills are scaled by the relative equipment value of the killer and victim.
4.  **Trade Compensation**: When a player is traded (avenged) within 8 seconds, they receive a portion of the kill value, compensating entry fraggers.
5.  **BOT Kill Handling**: Kills against BOTs (disconnected players) do not contribute to Rating (Kill Share, Impact, KAST).

## Components & Mathematical Model

The new Rating 5.0 formula is derived from expected values to ensure a natural baseline of 1.00 without arbitrary normalization multipliers.

| Component | Weight | Variable | Formula ($y = kx + b$) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Kill Share** | 40% | $K$ (Kill Value) | $1.0 \times K - 0.25$ | Combines Kill, Damage, Economy, and Trade Compensation. |
| **WPA** | 33% | $W$ (WPA Net) | $2.0 \times W + 0.33$ | Win Probability Added (-0.5 to +0.5). Base 0.33 for 0 WPA. |
| **Survival** | 15% | $S$ (1 or 0) | $0.588 \times S - 0.05$ | 1 if survived, 0 if died. |
| **KAST** | 8% | $A$ (1 or 0) | $0.178 \times A - 0.05$ | 1 if Kill, Assist, Survived, or Traded. |
| **Multi-Kill** | 4% | $M$ (Extra Kills) | $0.272 \times M - 0.02$ | $M = \max(0, \text{kills} - 1)$. |

**Total Expected Rating**: $0.40 + 0.33 + 0.15 + 0.08 + 0.04 = 1.00$

## Detailed Calculation Logic

### 1. Economy Modifier ($E$)
Calculated for every kill to scale its value based on investment.
$$E = \log_2\left(1 + \frac{\text{VictimValue}}{\text{KillerValue} + 500}\right)$$
*Bounded between 0.2 and 2.5 to prevent extreme outliers.*

### 2. Trade Compensation ($C_t$)
If a teammate is killed by the victim within the last 8 seconds ($t \le 8$), they receive compensation.
$$C(t) = 0.40 \times e^{-0.47t}$$
*   0s $\approx$ 40%
*   1s $\approx$ 25%
*   2s $\approx$ 15%
*   3s $\approx$ 10%
*   8s $\approx$ 0.9%

### 3. Kill Share Distribution
For a single kill, the value is distributed as follows:

1.  **Bait (Traded Teammate)**: Receives $C(t) \times E$.
2.  **Remaining Pool ($V_{rem}$)**: $1.0 - C(t)$.
3.  **Killer Base Share**: Receives $0.6 \times V_{rem} \times E$.
4.  **Assist Pool**: $0.4 \times V_{rem}$. Distributed by weight:
    *   1 Damage = 1 Weight
    *   1 Flash Assist = 30 Weight
    *   *Damage share is multiplied by $E$, Flash share is NOT.*

**Friendly Fire / Team Kill Penalty**:
If a player kills a teammate, the Kill Share mechanism is inverted to penalize the offending team and reward the opposing team and the victim, mirroring the WPA system:
*   The killer and any friendly assisters receive a **negative** Kill Share Rating based on their contribution.
*   The **victim** receives a positive Kill Share Rating exactly equal to the total penalty applied to the perpetrators.
*   The **surviving players on the opposing team** evenly split a positive Kill Share Rating exactly equal to the total penalty applied to the perpetrators.

### 4. Round Rating Formula
The final rating for a player in a single round is the sum of the five components, multiplied by a global normalization coefficient.
$$Rating = (Score_{kill} + Score_{wpa} + Score_{surv} + Score_{kast} + Score_{multi}) \times 1.16$$

*   **Global Normalization**: A coefficient of `1.16` is applied to align the average rating with the community standard of ~1.00.
*   **Baseline**: An average round yields ~1.0 Rating.
*   **High Impact**: A 1v2 Clutch (+40% WPA, 2 Kills) yields a massive rating boost.
*   **Empty Frags**: Exit kills in a lost round (0% WPA) yield significantly lower ratings than impactful kills.
*   **Entry Fragger Protection**: A player who dies but is immediately traded loses survival points (-0.05) but gains significant Kill Share (e.g., +0.40) and retains KAST, protecting their rating.
