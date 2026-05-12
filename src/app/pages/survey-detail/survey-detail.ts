import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeaderComponent } from '../../shared/components/header/header';
import { ResultsBarsComponent } from '../../shared/components/results-bars/results-bars';
import { SurveyService } from '../../core/services/survey.service';
import { VoterTokenService } from '../../core/services/voter-token.service';
import { Question, QuestionResult, SurveyDetail, VoteInput } from '../../core/models/survey.model';

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [HeaderComponent, ResultsBarsComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetailPage {
  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);
  private voterToken = inject(VoterTokenService);
  private destroyRef = inject(DestroyRef);
  private unsubscribe?: () => void;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly survey = signal<SurveyDetail | null>(null);
  readonly results = signal<Map<string, QuestionResult>>(new Map());
  readonly hasVoted = signal(false);
  readonly submitting = signal(false);
  readonly showResultsMobile = signal(false);

  private selections = signal<Map<string, Set<string>>>(new Map());

  readonly formattedEndDate = computed(() => this.formatDate(this.survey()?.endDate ?? null));

  readonly isEnded = computed(() => {
    const survey = this.survey();
    if (!survey?.endDate) return false;
    const endDate = new Date(survey.endDate);
    endDate.setHours(23, 59, 59, 999);
    return endDate.getTime() < Date.now();
  });

  readonly canVote = computed(() => !this.hasVoted() && !this.isEnded());

  readonly totalVotes = computed(() => {
    let total = 0;
    for (const result of this.results().values()) total += result.totalVotes;
    return total;
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (params) => {
        const id = params.get('id');
        if (id) await this.load(id);
      });
    this.destroyRef.onDestroy(() => this.unsubscribe?.());
  }

  isSelected(questionId: string, optionId: string): boolean {
    return this.selections().get(questionId)?.has(optionId) ?? false;
  }

  toggleOption(question: Question, optionId: string): void {
    if (!this.canVote()) return;
    const updatedMap = new Map(this.selections());
    const updatedSet = new Set(updatedMap.get(question.id) ?? []);
    if (updatedSet.has(optionId)) {
      updatedSet.delete(optionId);
    } else {
      if (!question.allowMultiple) updatedSet.clear();
      updatedSet.add(optionId);
    }
    updatedMap.set(question.id, updatedSet);
    this.selections.set(updatedMap);
  }

  letterFromIndex(index: number): string {
    return String.fromCharCode(65 + index);
  }

  toggleMobileResults(): void {
    this.showResultsMobile.update((isOpen) => !isOpen);
  }

  async submitVote(): Promise<void> {
    const survey = this.survey();
    if (!survey || !this.canVote()) return;
    const answers = this.buildAnswers(survey);
    if (answers.length === 0) {
      this.error.set('Please select at least one answer.');
      return;
    }
    await this.sendVote(survey.id, answers);
  }

  private buildAnswers(survey: SurveyDetail): VoteInput['answers'] {
    const selections = this.selections();
    return survey.questions
      .map((question) => ({
        questionId: question.id,
        answerOptionIds: Array.from(selections.get(question.id) ?? []),
      }))
      .filter((answer) => answer.answerOptionIds.length > 0);
  }

  private async sendVote(surveyId: string, answers: VoteInput['answers']): Promise<void> {
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.surveyService.submitVote({ surveyId, voterToken: this.voterToken.token, answers });
      this.hasVoted.set(true);
      await this.refreshResults();
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Vote failed.');
    } finally {
      this.submitting.set(false);
    }
  }

  private async load(surveyId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.loadSurveyData(surveyId);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Failed to load survey.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSurveyData(surveyId: string): Promise<void> {
    const [detail, voted] = await Promise.all([
      this.surveyService.getSurveyDetail(surveyId),
      this.surveyService.hasVoted(surveyId, this.voterToken.token),
    ]);
    if (!detail) {
      this.error.set('Survey not found.');
      return;
    }
    this.survey.set(detail);
    this.hasVoted.set(voted);
    await this.refreshResults();
    this.subscribeToLiveResults(surveyId);
  }

  private subscribeToLiveResults(surveyId: string): void {
    this.unsubscribe?.();
    this.unsubscribe = this.surveyService.subscribeToResults(surveyId, () => {
      this.refreshResults();
    });
  }

  private async refreshResults(): Promise<void> {
    const survey = this.survey();
    if (!survey) return;
    try {
      const results = await this.surveyService.getResults(survey.id);
      this.results.set(results);
    } catch (error: unknown) {
      console.error('Failed to refresh results:', error);
    }
  }

  private formatDate(isoString: string | null): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${date.getFullYear()}`;
  }
}
