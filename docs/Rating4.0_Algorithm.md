
# TacBook Rating 4.0 (Balanced) Algorithm

## Overview
Rating 4.0 uses a round-by-round evaluation system to determine player performance, integrating economy, survival, damage, and teamwork (trades).

### Key Updates (v4.1)
1.  **Negative Rating Floor Removed**: Bad rounds (expensive death, no impact) can now yield negative scores, pulling down the average to penalize inconsistency.
2.  **Dynamic Trade Logic**:
    *   **Entry Bonus**: Players who die first but deal damage and are traded quickly receive a bonus.
        *   `Bonus = (Damage / 100) * 0.20 * (1 - TimeDelta/4s)`
    *   **Trade Penalty**: Players who trade kills receive a penalty proportional to the damage already dealt by teammates.
        *   `Penalty = (TeammateDamage / 100) * 0.15`

## Components

| Component | Weight | Description |
| :--- | :--- | :--- |
| **Kill Rating** | 25% | Based on KPR (Baseline 0.75). |
| **Survival** | Fixed | +0.30 for surviving the round. |
| **Damage** | 15% | Based on ADR (Baseline 80). |
| **Impact** | 25% | Multi-kills scale non-linearly (1K=1.0, 2K=2.2, 3K=3.5). Entry kills +0.5. |
| **KAST** | Fixed | +0.20 if Kill, Assist, Survived, or Traded. |
| **Economy** | Dynamic | Logarithmic ROI based on Equipment Value vs Kill Value. |
| **Trade Adj.** | Dynamic | +/- based on trade kill participation. |

## Calculation
1.  Events are processed sequentially.
2.  Damage is tracked in a graph (Attacker -> Victim) per round.
3.  On death, the system checks `recentDeaths` to identify trades.
4.  At round end, components are summed up for the `RoundRating`.
5.  Match Rating = `(Sum of RoundRatings / Rounds) * 1.30`.
