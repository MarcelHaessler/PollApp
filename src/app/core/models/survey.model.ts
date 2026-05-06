export interface Category {
  id: string;
  name: string;
}

export type SurveyStatus = 'draft' | 'published';

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  endDate: string | null;
  status: SurveyStatus;
  createdAt: string;
}

export interface AnswerOption {
  id: string;
  questionId: string;
  position: number;
  text: string;
}

export interface Question {
  id: string;
  surveyId: string;
  position: number;
  text: string;
  allowMultiple: boolean;
  options: AnswerOption[];
}

export interface SurveyDetail extends Survey {
  questions: Question[];
}

export interface QuestionResultRow {
  questionId: string;
  surveyId: string;
  answerOptionId: string;
  optionPosition: number;
  optionText: string;
  voteCount: number;
}

export interface OptionResult {
  answerOptionId: string;
  optionPosition: number;
  optionText: string;
  voteCount: number;
  percentage: number;
}

export interface QuestionResult {
  questionId: string;
  totalVotes: number;
  options: OptionResult[];
}

export interface CreateSurveyInput {
  title: string;
  description: string | null;
  categoryId: string | null;
  endDate: string | null;
  questions: {
    text: string;
    allowMultiple: boolean;
    options: { text: string }[];
  }[];
}

export interface VoteInput {
  surveyId: string;
  voterToken: string;
  answers: { questionId: string; answerOptionIds: string[] }[];
}
