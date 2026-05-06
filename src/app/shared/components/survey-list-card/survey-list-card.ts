import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Survey } from '../../../core/models/survey.model';
import { EndsInPipe } from '../../pipes/ends-in.pipe';

@Component({
  selector: 'app-survey-list-card',
  standalone: true,
  imports: [RouterLink, EndsInPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './survey-list-card.html',
  styleUrl: './survey-list-card.scss',
})
export class SurveyListCardComponent {
  readonly survey = input.required<Survey>();
  readonly disabled = input(false);
}
