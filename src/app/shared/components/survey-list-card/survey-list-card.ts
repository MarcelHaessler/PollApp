import { Component, input, output } from '@angular/core';
import { Survey } from '../../../core/models/survey.model';
import { EndsInPipe } from '../../pipes/ends-in.pipe';

@Component({
  selector: 'app-survey-list-card',
  standalone: true,
  imports: [EndsInPipe],
  templateUrl: './survey-list-card.html',
  styleUrl: './survey-list-card.scss',
})
export class SurveyListCardComponent {
  readonly survey = input.required<Survey>();
  readonly disabled = input(false);
  readonly selected = output<string>();
}
