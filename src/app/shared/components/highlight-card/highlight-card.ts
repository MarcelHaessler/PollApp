import { Component, input, output } from '@angular/core';
import { Survey } from '../../../core/models/survey.model';
import { EndsInPipe } from '../../pipes/ends-in.pipe';

@Component({
  selector: 'app-highlight-card',
  standalone: true,
  imports: [EndsInPipe],
  templateUrl: './highlight-card.html',
  styleUrl: './highlight-card.scss',
})
export class HighlightCardComponent {
  readonly survey = input.required<Survey>();
  readonly variant = input<'cream' | 'cream-alt'>('cream');
  readonly selected = output<string>();
}
