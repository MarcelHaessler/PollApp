import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'survey/:id',
    loadComponent: () =>
      import('./pages/survey-detail/survey-detail').then((m) => m.SurveyDetailPage),
  },
  { path: '**', redirectTo: '' },
];
