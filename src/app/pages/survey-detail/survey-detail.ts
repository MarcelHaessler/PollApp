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
import {
  Question,
  QuestionResult,
  SurveyDetail,
} from '../../core/models/survey.model';

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

  readonly published = computed(() => {
    const s = this.survey();
    return s ? this.formatDate(s.endDate) : '';
  });

  readonly isEnded = computed(() => {
    const s = this.survey();
    if (!s?.endDate) return false;
    const end = new Date(s.endDate);
    end.setHours(23, 59, 59, 999);
    return end.getTime() < Date.now();
  });

  readonly canVote = computed(() => !this.hasVoted() && !this.isEnded());

  readonly totalVotes = computed(() => {
    let sum = 0;
    for (const r of this.results().values()) sum += r.totalVotes;
    return sum;
  });

  constructor() {
    const surveyId$ = this.route.paramMap;
    surveyId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async (params) => {
      const id = params.get('id');
      if (!id) return;
      await this.load(id);
    });

    this.destroyRef.onDestroy(() => {
      this.unsubscribe?.();
    });
  }

  isSelected(questionId: string, optionId: string): boolean {
    return this.selections().get(questionId)?.has(optionId) ?? false;
  }

  toggleOption(question: Question, optionId: string) {
    if (!this.canVote()) return;
    const map = new Map(this.selections());
    let set = map.get(question.id);
    if (!set) {
      set = new Set<string>();
      map.set(question.id, set);
    } else {
      set = new Set(set);
      map.set(question.id, set);
    }
    if (set.has(optionId)) {
      set.delete(optionId);
    } else {
      if (!question.allowMultiple) set.clear();
      set.add(optionId);
    }
    this.selections.set(map);
  }

  letter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  toggleMobileResults() {
    this.showResultsMobile.update((v) => !v);
  }

  async submitVote() {
    const survey = this.survey();
    if (!survey || !this.canVote()) return;
    const selections = this.selections();
    const answers = survey.questions
      .map((q) => ({
        questionId: q.id,
        answerOptionIds: Array.from(selections.get(q.id) ?? []),
      }))
      .filter((a) => a.answerOptionIds.length > 0);

    if (answers.length === 0) {
      this.error.set('Bitte mindestens eine Antwort wählen.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.surveyService.submitVote({
        surveyId: survey.id,
        voterToken: this.voterToken.token,
        answers,
      });
      this.hasVoted.set(true);
      await this.refreshResults();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Vote fehlgeschlagen.');
    } finally {
      this.submitting.set(false);
    }
  }

  private async load(surveyId: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [detail, voted] = await Promise.all([
        this.surveyService.getSurveyDetail(surveyId),
        this.surveyService.hasVoted(surveyId, this.voterToken.token),
      ]);
      if (!detail) {
        this.error.set('Umfrage nicht gefunden.');
        return;
      }
      this.survey.set(detail);
      this.hasVoted.set(voted);
      await this.refreshResults();
      this.unsubscribe?.();
      this.unsubscribe = this.surveyService.subscribeToResults(surveyId, () => {
        this.refreshResults();
      });
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Fehler beim Laden.');
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshResults() {
    const s = this.survey();
    if (!s) return;
    try {
      const r = await this.surveyService.getResults(s.id);
      this.results.set(r);
    } catch {
    }
  }

  private formatDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  }
}
