import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../logo/logo';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  readonly showCreate = input(false);
  readonly logoVariant = input<'light' | 'dark'>('light');
}
