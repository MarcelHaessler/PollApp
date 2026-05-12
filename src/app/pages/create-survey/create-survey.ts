import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LogoComponent } from '../../shared/components/logo/logo';
import { SurveyService } from '../../core/services/survey.service';
import { Category } from '../../core/models/survey.model';

interface OptionForm {
  text: FormControl<string>;
}
interface QuestionForm {
  text: FormControl<string>;
  allowMultiple: FormControl<boolean>;
  options: FormArray<FormGroup<OptionForm>>;
}

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurveyPage {
  private fb = inject(FormBuilder);
  private surveyService = inject(SurveyService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly categories = signal<Category[]>([]);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    categoryId: [''],
    endDate: [''],
    description: [''],
    questions: this.fb.array<FormGroup<QuestionForm>>([this.buildQuestion()]),
  });

  constructor() {
    const html = inject(DOCUMENT).documentElement;
    html.style.background = '#ffffff';
    this.destroyRef.onDestroy(() => (html.style.background = ''));
    this.loadCategories();
  }

  get questions(): FormArray<FormGroup<QuestionForm>> {
    return this.form.controls.questions;
  }

  options(qIdx: number): FormArray<FormGroup<OptionForm>> {
    return this.questions.at(qIdx).controls.options;
  }

  letter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  addQuestion() {
    this.questions.push(this.buildQuestion());
  }

  removeQuestion(idx: number) {
    if (this.questions.length === 1) return;
    this.questions.removeAt(idx);
  }

  addOption(qIdx: number) {
    this.options(qIdx).push(this.buildOption());
  }

  removeOption(qIdx: number, oIdx: number) {
    if (this.options(qIdx).length <= 2) return;
    this.options(qIdx).removeAt(oIdx);
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const validQuestions = value.questions
      .map((q) => ({
        text: q.text.trim(),
        allowMultiple: q.allowMultiple,
        options: q.options
          .map((o) => ({ text: o.text.trim() }))
          .filter((o) => o.text.length > 0),
      }))
      .filter((q) => q.text.length > 0 && q.options.length >= 2);

    if (validQuestions.length === 0) {
      this.error.set('Bitte mindestens eine Frage mit zwei Antworten anlegen.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    try {
      const surveyId = await this.surveyService.createSurvey({
        title: value.title.trim(),
        description: value.description.trim() || null,
        categoryId: value.categoryId || null,
        endDate: value.endDate ? new Date(value.endDate).toISOString() : null,
        questions: validQuestions,
      });
      this.router.navigate(['/survey', surveyId]);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Konnte Umfrage nicht erstellen.');
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadCategories() {
    try {
      const data = await this.surveyService.listCategories();
      this.categories.set(data);
    } catch {
      // Kategorien sind optional — Fehler hier blockiert das Formular nicht.
    }
  }

  private buildQuestion(): FormGroup<QuestionForm> {
    return this.fb.nonNullable.group({
      text: this.fb.nonNullable.control('', Validators.required),
      allowMultiple: this.fb.nonNullable.control(false),
      options: this.fb.array<FormGroup<OptionForm>>([
        this.buildOption(),
        this.buildOption(),
      ]),
    });
  }

  private buildOption(): FormGroup<OptionForm> {
    return this.fb.nonNullable.group({
      text: this.fb.nonNullable.control('', Validators.required),
    });
  }
}
