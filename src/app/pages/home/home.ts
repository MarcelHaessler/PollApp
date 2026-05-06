import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header';
import { HighlightCardComponent } from '../../shared/components/highlight-card/highlight-card';
import { SurveyListCardComponent } from '../../shared/components/survey-list-card/survey-list-card';
import { TabItem, TabsComponent } from '../../shared/components/tabs/tabs';
import { SurveyService } from '../../core/services/survey.service';
import { Survey } from '../../core/models/survey.model';

type Tab = 'active' | 'past';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    HeaderComponent,
    HighlightCardComponent,
    SurveyListCardComponent,
    TabsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {
  private surveyService = inject(SurveyService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly surveys = signal<Survey[]>([]);
  readonly activeTab = signal<Tab>('active');
  readonly selectedCategory = signal<string | null>(null);

  readonly tabs: TabItem<Tab>[] = [
    { id: 'active', label: 'Active survey' },
    { id: 'past', label: 'Past survey' },
  ];

  readonly active = computed(() =>
    this.surveys().filter((s) => !this.isEnded(s)).sort(this.sortByEndDate)
  );

  readonly past = computed(() =>
    this.surveys().filter((s) => this.isEnded(s)).sort(this.sortByEndDate)
  );

  readonly endingSoon = computed(() => this.active().slice(0, 3));

  readonly categories = computed(() => {
    const set = new Set<string>();
    for (const s of this.surveys()) {
      if (s.categoryName) set.add(s.categoryName);
    }
    return Array.from(set).sort();
  });

  readonly listSurveys = computed(() => {
    const base = this.activeTab() === 'active' ? this.active() : this.past();
    const cat = this.selectedCategory();
    return cat ? base.filter((s) => s.categoryName === cat) : base;
  });

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.surveyService.listSurveys();
      this.surveys.set(data);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      this.loading.set(false);
    }
  }

  onTabChange(tab: Tab) {
    this.activeTab.set(tab);
  }

  onCategoryChange(value: string) {
    this.selectedCategory.set(value || null);
  }

  highlightVariant(idx: number): 'cream' | 'cream-alt' {
    return idx % 2 === 0 ? 'cream' : 'cream-alt';
  }

  private isEnded(s: Survey): boolean {
    if (!s.endDate) return false;
    return new Date(s.endDate).getTime() <= Date.now();
  }

  private sortByEndDate = (a: Survey, b: Survey): number => {
    if (!a.endDate && !b.endDate) return 0;
    if (!a.endDate) return 1;
    if (!b.endDate) return -1;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  };
}
