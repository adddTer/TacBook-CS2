# WPA Friendly Fire Logic

## Overview
The Win Probability Added (WPA) system has been updated to handle Friendly Fire (FF) events (damage and kills between teammates). The goal is to ensure that FF events negatively impact the attacker's WPA while rewarding the opposing team, maintaining the zero-sum nature of the WPA system.

## Friendly Damage Logic
1.  **Attacker Impact**: The attacker's damage contribution is calculated as usual, but the resulting WPA value is **subtracted** from the attacker's total, rather than added.
2.  **Victim Impact**: The victim (teammate) does **not** lose WPA.
3.  **Redistribution**: The WPA value subtracted from the attacker is **added equally** to all living members of the **opposing team**.

## Friendly Kill (Team Kill) Logic
1.  **Damage-based Portion**: Follows the Friendly Damage logic (subtracted from attacker, redistributed to opposing team).
2.  **Kill-based Portion**: The "killer-based" WPA portion (the credit for the kill) is **subtracted** from the team killer.
3.  **Victim Impact**: The victim (teammate) does **not** lose WPA.
4.  **Redistribution**: The WPA value subtracted from the team killer is **added equally** to all living members of the **opposing team**.
