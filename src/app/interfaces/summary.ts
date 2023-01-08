export interface BattleSummary {
	hash?: number;
    ship: string;
    hostile: string;
    hostileLevel: number;
    captain: string;
    officerOne: string;
    officerTwo: string;

	success?: boolean;

    totalHull: number;
    totalHullDamage: number;

	numberOfLogs: number;
}