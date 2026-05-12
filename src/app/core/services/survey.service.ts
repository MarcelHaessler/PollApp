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
    return (data ?? []).map((row: any) => this.mapSurvey(row));
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
    return this.mapSurveyDetail(data as any);
  }

  async createSurvey(input: CreateSurveyInput): Promise<string> {
    const surveyId = await this.insertSurvey(input);
    for (let index = 0; index < input.questions.length; index++) {
      await this.insertQuestion(surveyId, input.questions[index], index);
    }
    return surveyId;
  }

  async submitVote(input: VoteInput): Promise<void> {
    await this.checkAlreadyVoted(input.surveyId, input.voterToken);
    const submissionId = await this.createSubmission(input.surveyId, input.voterToken);
    await this.insertVotes(submissionId, input.answers);
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

  subscribeToResults(surveyId: string, onChange: () => void): () => void {
    const channel = this.supabase
      .channel(`survey-${surveyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, () => onChange())
      .subscribe();
    return () => { this.supabase.removeChannel(channel); };
  }

  private mapSurvey(row: any): Survey {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.categories?.name ?? null,
      endDate: row.end_date,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  private mapSurveyDetail(row: any): SurveyDetail {
    return {
      ...this.mapSurvey(row),
      questions: this.mapQuestions(row.questions ?? [], row.id),
    };
  }

  private mapQuestions(questions: any[], surveyId: string) {
    return questions
      .slice()
      .sort((a: any, b: any) => a.position - b.position)
      .map((question: any) => ({
        id: question.id,
        surveyId,
        position: question.position,
        text: question.text,
        allowMultiple: question.allow_multiple,
        options: this.mapOptions(question.answer_options ?? [], question.id),
      }));
  }

  private mapOptions(options: any[], questionId: string) {
    return options
      .slice()
      .sort((a: any, b: any) => a.position - b.position)
      .map((option: any) => ({
        id: option.id,
        questionId,
        position: option.position,
        text: option.text,
      }));
  }

  private async insertSurvey(input: CreateSurveyInput): Promise<string> {
    const { data, error } = await this.supabase
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
    if (error) throw error;
    return data.id as string;
  }

  private async insertQuestion(
    surveyId: string,
    question: CreateSurveyInput['questions'][0],
    position: number
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from('questions')
      .insert({
        survey_id: surveyId,
        position: position + 1,
        text: question.text,
        allow_multiple: question.allowMultiple,
      })
      .select('id')
      .single();
    if (error) throw error;
    await this.insertOptions(data.id as string, question.options);
  }

  private async insertOptions(questionId: string, options: { text: string }[]): Promise<void> {
    if (options.length === 0) return;
    const rows = options.map((option, index) => ({
      question_id: questionId,
      position: index + 1,
      text: option.text,
    }));
    const { error } = await this.supabase.from('answer_options').insert(rows);
    if (error) throw error;
  }

  private async checkAlreadyVoted(surveyId: string, voterToken: string): Promise<void> {
    const { data } = await this.supabase
      .from('submissions')
      .select('id')
      .eq('survey_id', surveyId)
      .eq('voter_token', voterToken)
      .maybeSingle();
    if (data) throw new Error('You have already voted for this survey.');
  }

  private async createSubmission(surveyId: string, voterToken: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('submissions')
      .insert({ survey_id: surveyId, voter_token: voterToken })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }

  private async insertVotes(submissionId: string, answers: VoteInput['answers']): Promise<void> {
    const rows = answers.flatMap((answer) =>
      answer.answerOptionIds.map((optionId) => ({
        submission_id: submissionId,
        question_id: answer.questionId,
        answer_option_id: optionId,
      }))
    );
    if (rows.length === 0) return;
    const { error } = await this.supabase.from('votes').insert(rows);
    if (error) throw error;
  }

  private buildResults(rows: any[]): Map<string, QuestionResult> {
    const byQuestion = this.groupByQuestion(rows);
    const resultMap = new Map<string, QuestionResult>();
    for (const [questionId, options] of byQuestion) {
      resultMap.set(questionId, this.buildQuestionResult(questionId, options));
    }
    return resultMap;
  }

  private groupByQuestion(rows: any[]): Map<string, QuestionResultRow[]> {
    const map = new Map<string, QuestionResultRow[]>();
    for (const row of rows) {
      const item: QuestionResultRow = {
        questionId: row.question_id,
        surveyId: row.survey_id,
        answerOptionId: row.answer_option_id,
        optionPosition: row.option_position,
        optionText: row.option_text,
        voteCount: Number(row.vote_count ?? 0),
      };
      if (!map.has(item.questionId)) map.set(item.questionId, []);
      map.get(item.questionId)!.push(item);
    }
    return map;
  }

  private buildQuestionResult(questionId: string, options: QuestionResultRow[]): QuestionResult {
    options.sort((a, b) => a.optionPosition - b.optionPosition);
    const totalVotes = options.reduce((sum, option) => sum + option.voteCount, 0);
    return {
      questionId,
      totalVotes,
      options: options.map((option) => ({
        answerOptionId: option.answerOptionId,
        optionPosition: option.optionPosition,
        optionText: option.optionText,
        voteCount: option.voteCount,
        percentage: totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0,
      })),
    };
  }
}
