import { Component, input } from '@angular/core';
import { Question, QuestionResult } from '../../../core/models/survey.model';

const ASCII_A = 65;

@Component({
  selector: 'app-results-bars',
  standalone: true,
  templateUrl: './results-bars.html',
  styleUrl: './results-bars.scss',
})
export class ResultsBarsComponent {
  readonly questions = input.required<Question[]>();
  readonly results = input.required<Map<string, QuestionResult>>();

  letter(idx: number): string {
    return String.fromCharCode(ASCII_A + idx);
  }

  totalVotes(): number {
    let sum = 0;
    for (const r of this.results().values()) sum += r.totalVotes;
    return sum;
  }
}
