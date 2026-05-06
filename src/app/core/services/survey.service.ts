import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Category,
  CreateSurveyInput,
  QuestionResult,
  QuestionResultRow,
  Survey,
  SurveyDetail,
  VoteInput,
} from '../models/survey.model';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private supabase = inject(SupabaseService).client;

  async listCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('id, name')
      .order('name');
    if (error) throw error;
    return data ?? [];
  }

  async listSurveys(): Promise<Survey[]> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('id, title, description, end_date, status, created_at, category_id, categories(name)')
      .eq('status', 'published')
      .order('end_date', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.categories?.name ?? null,
      endDate: row.end_date,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  async getSurveyDetail(surveyId: string): Promise<SurveyDetail | null> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select(
        `id, title, description, end_date, status, created_at, category_id,
         categories(name),
         questions(id, position, text, allow_multiple,
           answer_options(id, position, text))`
      )
      .eq('id', surveyId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as any;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.categories?.name ?? null,
      endDate: row.end_date,
      status: row.status,
      createdAt: row.created_at,
      questions: (row.questions ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position)
        .map((q: any) => ({
          id: q.id,
          surveyId: row.id,
          position: q.position,
          text: q.text,
          allowMultiple: q.allow_multiple,
          options: (q.answer_options ?? [])
            .slice()
            .sort((a: any, b: any) => a.position - b.position)
            .map((o: any) => ({
              id: o.id,
              questionId: q.id,
              position: o.position,
              text: o.text,
            })),
        })),
    };
  }

  async createSurvey(input: CreateSurveyInput): Promise<string> {
    const { data: surveyRow, error: surveyError } = await this.supabase
      .from('surveys')
      .insert({
        title: input.title,
        description: input.description,
        category_id: input.categoryId,
        end_date: input.endDate,
        status: 'published',
      })
      .select('id')
      .single();
    if (surveyError) throw surveyError;
    const surveyId = surveyRow.id as string;

    for (let qIdx = 0; qIdx < input.questions.length; qIdx++) {
      const q = input.questions[qIdx];
      const { data: questionRow, error: questionError } = await this.supabase
        .from('questions')
        .insert({
          survey_id: surveyId,
          position: qIdx + 1,
          text: q.text,
          allow_multiple: q.allowMultiple,
        })
        .select('id')
        .single();
      if (questionError) throw questionError;
      const questionId = questionRow.id as string;

      const optionRows = q.options.map((o, oIdx) => ({
        question_id: questionId,
        position: oIdx + 1,
        text: o.text,
      }));
      if (optionRows.length > 0) {
        const { error: optionsError } = await this.supabase
          .from('answer_options')
          .insert(optionRows);
        if (optionsError) throw optionsError;
      }
    }

    return surveyId;
  }

  async submitVote(input: VoteInput): Promise<void> {
    const { data: existing } = await this.supabase
      .from('submissions')
      .select('id')
      .eq('survey_id', input.surveyId)
      .eq('voter_token', input.voterToken)
      .maybeSingle();
    if (existing) {
      throw new Error('Du hast für diese Umfrage bereits abgestimmt.');
    }

    const { data: submissionRow, error: submissionError } = await this.supabase
      .from('submissions')
      .insert({ survey_id: input.surveyId, voter_token: input.voterToken })
      .select('id')
      .single();
    if (submissionError) throw submissionError;
    const submissionId = submissionRow.id as string;

    const voteRows = input.answers.flatMap((a) =>
      a.answerOptionIds.map((optionId) => ({
        submission_id: submissionId,
        question_id: a.questionId,
        answer_option_id: optionId,
      }))
    );
    if (voteRows.length === 0) return;

    const { error: votesError } = await this.supabase.from('votes').insert(voteRows);
    if (votesError) throw votesError;
  }

  async hasVoted(surveyId: string, voterToken: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('submissions')
      .select('id')
      .eq('survey_id', surveyId)
      .eq('voter_token', voterToken)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  async getResults(surveyId: string): Promise<Map<string, QuestionResult>> {
    const { data, error } = await this.supabase
      .from('question_results')
      .select('question_id, survey_id, answer_option_id, option_position, option_text, vote_count')
      .eq('survey_id', surveyId);
    if (error) throw error;
    return this.buildResults((data ?? []) as any[]);
  }

  private buildResults(rows: any[]): Map<string, QuestionResult> {
    const byQuestion = new Map<string, QuestionResultRow[]>();
    for (const r of rows) {
      const row: QuestionResultRow = {
        questionId: r.question_id,
        surveyId: r.survey_id,
        answerOptionId: r.answer_option_id,
        optionPosition: r.option_position,
        optionText: r.option_text,
        voteCount: Number(r.vote_count ?? 0),
      };
      if (!byQuestion.has(row.questionId)) byQuestion.set(row.questionId, []);
      byQuestion.get(row.questionId)!.push(row);
    }
    const result = new Map<string, QuestionResult>();
    for (const [questionId, options] of byQuestion) {
      options.sort((a, b) => a.optionPosition - b.optionPosition);
      const total = options.reduce((sum, o) => sum + o.voteCount, 0);
      result.set(questionId, {
        questionId,
        totalVotes: total,
        options: options.map((o) => ({
          answerOptionId: o.answerOptionId,
          optionPosition: o.optionPosition,
          optionText: o.optionText,
          voteCount: o.voteCount,
          percentage: total > 0 ? Math.round((o.voteCount / total) * 100) : 0,
        })),
      });
    }
    return result;
  }

  subscribeToResults(surveyId: string, onChange: () => void): () => void {
    const channel = this.supabase
      .channel(`survey-${surveyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        () => onChange()
      )
      .subscribe();
    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}
