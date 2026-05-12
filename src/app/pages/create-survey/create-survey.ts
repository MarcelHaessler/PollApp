import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SurveyService } from '../../core/services/survey.service';
import { Category, CreateSurveyInput } from '../../core/models/survey.model';

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
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurveyComponent {
  private fb = inject(FormBuilder);
  private surveyService = inject(SurveyService);

  readonly created = output<string>();
  readonly cancelled = output();

  readonly categories = signal<Category[]>([]);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly today = new Date().toISOString().split('T')[0];

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    categoryId: [''],
    endDate: [''],
    description: [''],
    questions: this.fb.array<FormGroup<QuestionForm>>([this.buildQuestion()]),
  });

  constructor() {
    this.loadCategories();
  }

  get questions(): FormArray<FormGroup<QuestionForm>> {
    return this.form.controls.questions;
  }

  options(questionIndex: number): FormArray<FormGroup<OptionForm>> {
    return this.questions.at(questionIndex).controls.options;
  }

  letterFromIndex(index: number): string {
    return String.fromCharCode(65 + index);
  }

  addQuestion(): void {
    this.questions.push(this.buildQuestion());
  }

  removeQuestion(questionIndex: number): void {
    if (this.questions.length === 1) return;
    this.questions.removeAt(questionIndex);
  }

  clearQuestion(questionIndex: number): void {
    this.questions.at(questionIndex).controls.text.reset();
    this.options(questionIndex).controls.forEach((option) => option.controls.text.reset());
  }

  addOption(questionIndex: number): void {
    this.options(questionIndex).push(this.buildOption());
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    if (this.options(questionIndex).length <= 2) return;
    this.options(questionIndex).removeAt(optionIndex);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const validQuestions = this.getValidQuestions();
    if (validQuestions.length === 0) {
      this.error.set('Please add at least one question with two answers.');
      return;
    }
    await this.saveSurvey(validQuestions);
  }

  private getValidQuestions(): CreateSurveyInput['questions'] {
    return this.form.getRawValue().questions
      .map((question) => ({
        text: question.text.trim(),
        allowMultiple: question.allowMultiple,
        options: question.options
          .map((option) => ({ text: option.text.trim() }))
          .filter((option) => option.text.length > 0),
      }))
      .filter((question) => question.text.length > 0 && question.options.length >= 2);
  }

  private buildSurveyPayload(validQuestions: CreateSurveyInput['questions']): CreateSurveyInput {
    const value = this.form.getRawValue();
    return {
      title: value.title.trim(),
      description: value.description.trim() || null,
      categoryId: value.categoryId || null,
      endDate: value.endDate ? new Date(value.endDate).toISOString() : null,
      questions: validQuestions,
    };
  }

  private async saveSurvey(validQuestions: CreateSurveyInput['questions']): Promise<void> {
    this.submitting.set(true);
    this.error.set(null);
    try {
      const payload = this.buildSurveyPayload(validQuestions);
      const surveyId = await this.surveyService.createSurvey(payload);
      this.created.emit(surveyId);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Could not create survey.');
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const categories = await this.surveyService.listCategories();
      this.categories.set(categories);
    } catch (error: unknown) {
      console.error('Failed to load categories:', error);
    }
  }

  private buildQuestion(): FormGroup<QuestionForm> {
    return this.fb.nonNullable.group({
      text: this.fb.nonNullable.control('', Validators.required),
      allowMultiple: this.fb.nonNullable.control(false),
      options: this.fb.array<FormGroup<OptionForm>>([this.buildOption(), this.buildOption()]),
    });
  }

  private buildOption(): FormGroup<OptionForm> {
    return this.fb.nonNullable.group({
      text: this.fb.nonNullable.control('', Validators.required),
    });
  }
}
