
# TacBook Rating 5.0 (WPA Integrated) Algorithm

## Overview
Rating 5.0 represents a paradigm shift from pure statistical aggregation to impact-based evaluation. It integrates **Win Probability Added (WPA)** directly into the rating formula and introduces a **Kill Share** system to fairly distribute credit for kills based on damage contribution.

### Key Updates (v5.0)
1.  **WPA Integration**: Round WPA is now a direct component of the Rating. Winning critical rounds boosts rating significantly.
2.  **Kill Share System**: Replaces the old binary Kill/Assist logic.
    *   **Total Kill Value**: 1.0 Point per kill.
    *   **Fixed Share**: 50% (0.5 pts) goes directly to the killer.
    *   **Damage Share**: 50% (0.5 pts) is distributed among all contributors based on damage dealt.
    *   **Utility Assist**: Flash assists count as 30 damage weight in the distribution.
4.  **BOT Kill Handling**: Kills against BOTs (disconnected players) do not contribute to Rating (Kill Share, Impact, KAST). The WPA gain from killing a BOT is distributed evenly among the entire team.
5.  **Impact Adjustment**: Multi-kill bonuses are adjusted to account for the Kill Share system (preventing double counting).

## Components

| Component | Weight/Formula | Description |
| :--- | :--- | :--- |
| **Kill Share** | `Share * 0.50` | Combines Kill and Damage contribution. Killer gets min 0.5 + damage %. Assister gets damage %. |
| **WPA** | `WPA * 1.0` | Direct addition of Win Probability Added. +20% WPA = +0.20 Rating. |
| **Survival** | `+0.30` | Fixed bonus for surviving the round. |
| **Impact** | Dynamic | Bonus for 2K (+0.15), 3K+ (+0.36), Entry (+0.09). Scaled down as Kill Share covers base value. |
| **KAST** | `+0.20` | Consistency bonus (Kill, Assist, Survived, Traded). |
| **Economy** | Dynamic | Logarithmic ROI based on Equipment Value vs Kill Value. |
| **Trade Adj.** | Dynamic | +/- based on trade kill participation (Entry Bonus / Trade Penalty). |

## Calculation Logic

### 1. Kill Share Distribution
When Player A kills Player B (100 HP):
*   **Scenario 1: Solo Kill (100 dmg)**
    *   Killer: 0.5 (Fixed) + 0.5 (100% Dmg) = **1.0**
*   **Scenario 2: Assist (Player A 90 dmg, Player B 10 dmg kill)**
    *   Killer (B): 0.5 (Fixed) + 0.05 (10% Dmg) = **0.55**
    *   Assister (A): 0.45 (90% Dmg) = **0.45**
*   **Scenario 3: Flash Assist (Player A Flash, Player B 100 dmg kill)**
    *   Total Weight: 100 (Dmg) + 30 (Flash) = 130
    *   Killer (B): 0.5 + (100/130 * 0.5) = 0.5 + 0.38 = **0.88**
    *   Flasher (A): (30/130 * 0.5) = **0.12**

### 2. Round Rating Formula
`Rating = (KillShare * 0.5) + Survival + Impact + KAST + Econ + Trade + WPA`

*   **Baseline**: An average round (0.75 KPR, 0.0 WPA) yields ~1.0 Rating.
*   **High Impact**: A 1v2 Clutch (2 Kills, +40% WPA) -> ~2.0+ Rating.
*   **Empty Frags**: 2 Exit Kills in lost round (2 Kills, 0% WPA) -> ~1.2 Rating (lower than before).

## WPA vs Rating
*   **Rating 5.0** now bridges the gap. High stats still give good rating, but **winning plays** give *better* rating.
*   A player with high ADR but low impact (useless damage) will see a slight rating decrease compared to v4.0.
*   A clutch player will see a significant rating increase.

## Final Calculation
Match Rating = `(Sum of RoundRatings / Rounds) * 1.83 - 0.19`.
