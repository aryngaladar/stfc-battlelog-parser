export interface BattleSummary {
	hash?: number;
    ship: string;
    hostile: string;
    hostileLevel: number;
    captainManeuver: string;
    officerOneAbility: string;
    officerTwoAbility: string;
    officerThreeAbility: string;

	success?: boolean;

    totalHull: number;
    totalHullDamage: number;

	numberOfLogs: number;
}