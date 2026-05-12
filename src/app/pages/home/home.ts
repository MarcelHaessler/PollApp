import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header';
import { HighlightCardComponent } from '../../shared/components/highlight-card/highlight-card';
import { SurveyListCardComponent } from '../../shared/components/survey-list-card/survey-list-card';
import { TabItem, TabsComponent } from '../../shared/components/tabs/tabs';
import { CreateSurveyComponent } from '../create-survey/create-survey';
import { SurveyService } from '../../core/services/survey.service';
import { Survey } from '../../core/models/survey.model';

type Tab = 'active' | 'past';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeaderComponent,
    HighlightCardComponent,
    SurveyListCardComponent,
    TabsComponent,
    CreateSurveyComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {
  private surveyService = inject(SurveyService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly surveys = signal<Survey[]>([]);
  readonly activeTab = signal<Tab>('active');
  readonly selectedCategory = signal<string | null>(null);
  readonly showCreateModal = signal(false);

  readonly tabs: TabItem<Tab>[] = [
    { id: 'active', label: 'Active survey' },
    { id: 'past', label: 'Past survey' },
  ];

  readonly activeSurveys = computed(() =>
    this.surveys().filter((survey) => !this.isEnded(survey)).sort(this.sortByEndDate)
  );

  readonly pastSurveys = computed(() =>
    this.surveys().filter((survey) => this.isEnded(survey)).sort(this.sortByEndDate)
  );

  readonly endingSoon = computed(() => this.activeSurveys().slice(0, 3));

  readonly categories = computed(() => {
    const categoryNames = new Set<string>();
    for (const survey of this.surveys()) {
      if (survey.categoryName) categoryNames.add(survey.categoryName);
    }
    return Array.from(categoryNames).sort();
  });

  readonly listSurveys = computed(() => {
    const surveys = this.activeTab() === 'active' ? this.activeSurveys() : this.pastSurveys();
    const category = this.selectedCategory();
    return category ? surveys.filter((survey) => survey.categoryName === category) : surveys;
  });

  constructor() {
    this.loadSurveys();
  }

  async loadSurveys(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const surveys = await this.surveyService.listSurveys();
      this.surveys.set(surveys);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Failed to load surveys.');
    } finally {
      this.loading.set(false);
    }
  }

  openModal(): void {
    this.showCreateModal.set(true);
  }

  closeModal(): void {
    this.showCreateModal.set(false);
  }

  onSurveyCreated(surveyId: string): void {
    this.closeModal();
    this.router.navigate(['/survey', surveyId]);
  }

  onTabChange(tab: Tab): void {
    this.activeTab.set(tab);
  }

  onCategoryChange(value: string): void {
    this.selectedCategory.set(value || null);
  }

  highlightVariant(index: number): 'cream' | 'cream-alt' {
    return index % 2 === 0 ? 'cream' : 'cream-alt';
  }

  private isEnded(survey: Survey): boolean {
    if (!survey.endDate) return false;
    const endDate = new Date(survey.endDate);
    endDate.setHours(23, 59, 59, 999);
    return endDate.getTime() < Date.now();
  }

  private sortByEndDate = (a: Survey, b: Survey): number => {
    if (!a.endDate && !b.endDate) return 0;
    if (!a.endDate) return 1;
    if (!b.endDate) return -1;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  };
}
