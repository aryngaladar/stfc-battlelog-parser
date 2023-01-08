import { Component } from '@angular/core';
import { ViewChild } from '@angular/core';
import { NgxCsvParser } from 'ngx-csv-parser';
import { NgxCSVParserError } from 'ngx-csv-parser';
import { Observable, Observer } from 'rxjs';
import { ParseSummary } from './interfaces/parsing';
import { BattleSummary } from './interfaces/summary';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
	battleSummaries: BattleSummary[] = [];

    constructor(private ngxCsvParser: NgxCsvParser, private toastr: ToastrService) {}

    @ViewChild('fileImportInput') fileImportInput: any;

	discardLogs(): void {
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
				const battleSummary: BattleSummary = {
					ship: '',
					hostile: '',
					hostileLevel: 0,
					captainManeuver: '',
					officerOneAbility: '',
					officerTwoAbility: '',
					officerThreeAbility: '',
					totalHull: 0,
					totalHullDamage: 0,
					numberOfLogs: 1
				};

				const fileContent = reader.result as string;
				let prevBreak = 0;
				let nextBreak = fileContent.indexOf('\r\n\r\n', prevBreak);
				const firstTable = this.parse(fileContent.substring(prevBreak, nextBreak));
				if (firstTable.length == 1) {
					observer.error("Cannot parse armada logs yet");
					return;
				}
				
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
				battleSummary.captainManeuver = thirdTable[0]["Captain Maneuver"];
				battleSummary.officerOneAbility = thirdTable[0]["Officer One Ability"];
				battleSummary.officerTwoAbility = thirdTable[0]["Officer Two Ability"];
				battleSummary.officerThreeAbility = thirdTable[0]["Officer Three Ability"];

				prevBreak = nextBreak + 4;
				nextBreak = fileContent.indexOf('\r\n\r\n', prevBreak);
				const fourthTable = this.parse(fileContent.substring(prevBreak, nextBreak));

				battleSummary.hash = this.createSummaryHash(battleSummary);

				observer.next(battleSummary);
				observer.complete();
			}
		});
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
        const composite: string = `${bs.ship}${bs.hostile}${bs.hostileLevel}${bs.captainManeuver}${bs.officerOneAbility}${bs.officerTwoAbility}${bs.officerThreeAbility}`;
        for (let i = 0; i < composite.length; i++) {
          let chr = composite.charCodeAt(i);
          hash = ((hash << 5) - hash) + chr;
          hash |= 0; // Convert to 32bit integer
        }
      }
      return hash;
    }
}