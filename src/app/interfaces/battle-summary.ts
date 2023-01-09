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
	numberOfLogs: number = 1;

	// rounds
	rounds: number[] = [];

	minRounds(): number {
		return Math.min(...this.rounds);
	}

	avgRounds(): number {
		return this.avg(this.rounds);
	}

	maxRounds(): number {
		return Math.max(...this.rounds); 
	}
	// --


	// ship mitigation
	startMitigation: number[] = [];
	endMitigation: number[] = [];
	allMitigation: number[] = [];

	avgStartMitigation(): number {
		return this.avg(this.startMitigation);
	}
	// --

	avg(array: Array<number>): number {
		return (array.reduce((a, b) => a + b, 0) / array.length);
	}
}