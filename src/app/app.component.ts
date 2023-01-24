import { Component } from '@angular/core';
import { ViewChild } from '@angular/core';
import { NgxCsvParser } from 'ngx-csv-parser';
import { Observable, Observer } from 'rxjs';
import { ParseSummary } from './interfaces/parsing';
import { BattleSummary } from './interfaces/battle-summary';
import { ToastrService } from 'ngx-toastr';
import { OfficerLookup } from './officer-lookup';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
	Math: Math = Math;
	battleSummaries: BattleSummary[] = [];

    constructor(private ngxCsvParser: NgxCsvParser, private toastr: ToastrService) {

	}

    @ViewChild('fileImportInput') fileImportInput: any;

	discardLogs(index: number): void {
		this.battleSummaries.splice(index, 1);
	}

	discardAllLogs(): void {
		this.battleSummaries = [];
	}

    fileChangeListener($event: any): void {
        const files = $event.srcElement.files as Array<Blob>;

		this.parseLogs(files).subscribe({
			next: (summary: ParseSummary) => {
				this.toastr.info(`Parsed ${summary.totalFilesParsed} files.<br/>${summary.filesSucceeded} files added.<br/>${summary.filesDiscarded} files discarded.`, 'Parsing complete');
				$event.srcElement.value = "";
			}
		});
    }

	parseLogs(files: any): Observable<ParseSummary> {
		return new Observable((observer: Observer<ParseSummary>) => {
			const summary: ParseSummary = {
				totalFilesParsed: 0,
				filesSucceeded: 0,
				filesDiscarded: 0
			};
			for (const file of files) {
				this.parseLog(file).pipe().subscribe({
					next: (battleSummary: BattleSummary) => {
						if (battleSummary.success) {
							let existingSummary = this.battleSummaries.find(item => battleSummary.hash == item.hash);
							if (existingSummary) {
								existingSummary.totalHullDamage += battleSummary.totalHullDamage;
								existingSummary.rounds.push(battleSummary.rounds[0]);
								existingSummary.numberOfLogs++;
							} else {
								this.battleSummaries.push(battleSummary);
							}
							summary.filesSucceeded++;
						} else {
							summary.filesDiscarded++;
						}						
						if (++summary.totalFilesParsed == files.length) {
							observer.next(summary);
							observer.complete();
						}
					},
					error: (err) => {
						summary.filesDiscarded++;
						if (++summary.totalFilesParsed == files.length) {
							observer.next(summary);
							observer.complete();
						}
					},
				})
			}
		});		
	}

	parseLog(blob: Blob): Observable<BattleSummary> {
		const reader = new FileReader();
		reader.readAsText(blob, 'utf8');
		return new Observable((observer: Observer<BattleSummary>) => {
			reader.onload = () => {
				const battleSummary: BattleSummary = new BattleSummary();

				const fileContent = reader.result as string;
				let prevBreak = 0;
				let nextBreak = fileContent.indexOf('\r\n\r\n', prevBreak);
				const firstTable = this.parse(fileContent.substring(prevBreak, nextBreak));
				if (firstTable.length == 1) {
					observer.error("Cannot parse armada logs yet");
					return;
				}
				let playerName = firstTable[0]["Player Name"];
				let startHull = firstTable[0]["Hull Health"] as number;
				let endHull = firstTable[0]["Hull Health Remaining"] as number;
				battleSummary.totalHullDamage = startHull - endHull;
				battleSummary.ship = firstTable[0]["Ship Name"];
				battleSummary.hostile = firstTable[1]["Player Name"];
				battleSummary.hostileLevel = firstTable[1]["Player Level"];
				battleSummary.success = (firstTable[0]["Outcome"] == "VICTORY");


				prevBreak = nextBreak + 4;
				nextBreak = fileContent.indexOf('\r\n\r\n', prevBreak);
				const secondTable = this.parse(fileContent.substring(prevBreak, nextBreak));

				prevBreak = nextBreak + 4;
				nextBreak = fileContent.indexOf('\r\n\r\n', prevBreak);
				const thirdTable = this.parse(fileContent.substring(prevBreak, nextBreak));

				battleSummary.totalHull = thirdTable[0]["Hull Health"];


				prevBreak = nextBreak + 4;
				nextBreak = fileContent.indexOf('\r\n\r\n', prevBreak);
				const fourthTable = this.parse(fileContent.substring(prevBreak, nextBreak));
				battleSummary.rounds.push(Number(fourthTable[fourthTable.length-1]["Round"]));

				battleSummary.captain = this.findOfficer(thirdTable[0]["Officer One Ability"], playerName, fourthTable);
				battleSummary.officerOne = this.findOfficer(thirdTable[0]["Officer Two Ability"], playerName, fourthTable);
				battleSummary.officerTwo = this.findOfficer(thirdTable[0]["Officer Three Ability"], playerName, fourthTable);

				const incomingAttacks = fourthTable.filter(row => row["Type"] == "Attack" && row["Target Name"] == playerName);
				if (incomingAttacks.length > 0) {
					battleSummary.allMitigation.push(...incomingAttacks.map((attack) => Number(attack["Mitigated Damage"]) / Number(attack["Total Damage"])));
					battleSummary.startMitigation.push(battleSummary.allMitigation[0]);
					battleSummary.endMitigation.push(battleSummary.allMitigation[battleSummary.allMitigation.length-1]);
				}

				battleSummary.hash = this.createSummaryHash(battleSummary);

				observer.next(battleSummary);
				observer.complete();
			}
		});
	}

	findOfficer(ability: string, playerName: string, roundLog?: any[]): string {
		const officerLookup = OfficerLookup.abilities.get(ability);
		let officer: string = `[A] ${ability}`;
		if (officerLookup != undefined) {
			if (Array.isArray(officerLookup)) {
				if (roundLog) {
					const officersInLog = roundLog
						.filter(row => row["Type"] == "Officer Ability" && row["Attacker Name"] == playerName && row["Ability Name"] == ability)
						.map(row => row["Ability Owner Name"] as string);
					if (officersInLog.length == 1) {
						officer = `${officersInLog[0]}?`;
					} else {
						officer = `${officerLookup.join("? ")}?`;
					}
				}
			} else {
				officer = officerLookup;
			}
		}
		return officer;
	}

	parse(battlelogTable: string): Array<any> {
		let records = [];
		if (battlelogTable) {
			const csvRecordsArray = this.ngxCsvParser.csvStringToArray(battlelogTable, '\t');

			const headersRow = this.ngxCsvParser.getHeaderArray(csvRecordsArray);

			records = this.ngxCsvParser.getDataRecordsArrayFromCSVFile(
					csvRecordsArray,
					headersRow.length,
					{ header: true, delimiter: '\t', encoding: 'utf8' }
				);		
		}
		return records;
	}

    createSummaryHash(battleSummary: BattleSummary): number {
      var hash = 0;
      if (battleSummary) {
        const bs = battleSummary;
        const composite: string = `${bs.ship}${bs.hostile}${bs.hostileLevel}${bs.captain}${bs.officerOne}${bs.officerTwo}`;
        for (let i = 0; i < composite.length; i++) {
          let chr = composite.charCodeAt(i);
          hash = ((hash << 5) - hash) + chr;
          hash |= 0; // Convert to 32bit integer
        }
      }
      return hash;
    }
}