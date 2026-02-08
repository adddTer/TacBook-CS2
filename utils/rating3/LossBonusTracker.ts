
export class LossBonusTracker {
    // Current consecutive losses for each side
    private losses: { T: number, CT: number } = { T: 0, CT: 0 };

    // Minimum loss count according to CS2 rules (usually 1, representing $1400)
    // 0 = $1400, 1 = $1900, 2 = $2400, 3 = $2900, 4 = $3400
    private readonly MIN_LOSS_COUNT = 0;
    private readonly MAX_LOSS_COUNT = 4;

    public reset() {
        this.losses = { T: 0, CT: 0 };
    }

    public update(winnerSide: 'T' | 'CT') {
        const loserSide = winnerSide === 'T' ? 'CT' : 'T';

        // Winner: Loss count decreases by 1 (down to min)
        if (this.losses[winnerSide] > this.MIN_LOSS_COUNT) {
            this.losses[winnerSide]--;
        } else {
            this.losses[winnerSide] = this.MIN_LOSS_COUNT;
        }

        // Loser: Loss count increases by 1 (up to max)
        if (this.losses[loserSide] < this.MAX_LOSS_COUNT) {
            this.losses[loserSide]++;
        }
    }

    // Get the cash bonus the side received *this round* (based on previous round result)
    // Note: In actual engine, we might want to know what they WILL get if they lose current round.
    public getLossBonusValue(side: 'T' | 'CT'): number {
        const count = this.losses[side];
        // 0 -> 1400, 1 -> 1900 ...
        return 1400 + (count * 500);
    }
    
    // For "Tragedy" calculation: If they lose NOW, what would they have gotten?
    // This assumes the counter has already been updated for the current loss.
    public getProjectedLossBonus(side: 'T' | 'CT'): number {
        // If we are calculating "Tragedy", it means they JUST lost.
        // So the counter presumably just incremented. 
        // We use the current counter state.
        return this.getLossBonusValue(side);
    }
}
