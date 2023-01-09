export class BattleSummary {
	hash?: number;
    ship: string = '';
    hostile: string = '';
    hostileLevel: number = 0;
    captain: string = '';
    officerOne: string = '';
    officerTwo: string = '';

	success?: boolean;

    totalHull: number = 0;
    totalHullDamage: number = 0;

	rounds: number[] = [];

	numberOfLogs: number = 1;

	minRounds(): number {
		return Math.min(...this.rounds);
	}

	avgRounds(): number {
		return (this.rounds.reduce((a, b) => a + b, 0) / this.numberOfLogs);
	}

	maxRounds(): number {
		return Math.max(...this.rounds);
	}
}