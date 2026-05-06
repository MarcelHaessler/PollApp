import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Survey } from '../../../core/models/survey.model';
import { EndsInPipe } from '../../pipes/ends-in.pipe';

@Component({
  selector: 'app-highlight-card',
  standalone: true,
  imports: [RouterLink, EndsInPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './highlight-card.html',
  styleUrl: './highlight-card.scss',
})
export class HighlightCardComponent {
  readonly survey = input.required<Survey>();
  readonly variant = input<'cream' | 'cream-alt'>('cream');
}
