import { Component, input, output } from '@angular/core';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
})
export class TabsComponent<T extends string = string> {
  readonly items = input.required<TabItem<T>[]>();
  readonly activeId = input.required<T>();
  readonly select = output<T>();

  onSelect(id: T): void {
    this.select.emit(id);
  }
}
