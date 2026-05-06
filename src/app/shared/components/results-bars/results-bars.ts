import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Question, QuestionResult } from '../../../core/models/survey.model';

@Component({
  selector: 'app-results-bars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './results-bars.html',
  styleUrl: './results-bars.scss',
})
export class ResultsBarsComponent {
  readonly questions = input.required<Question[]>();
  readonly results = input.required<Map<string, QuestionResult>>();

  letter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  totalVotes(): number {
    let sum = 0;
    for (const r of this.results().values()) sum += r.totalVotes;
    return sum;
  }
}
