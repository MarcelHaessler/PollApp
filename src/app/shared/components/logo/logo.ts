import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
})
export class LogoComponent {
  readonly variant = input<'light' | 'dark'>('light');
}
