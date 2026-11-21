import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'tutorials',
    loadComponent: () => import('./tutorials/tutorials.page').then((m) => m.TutorialsPage),
  },


  {
    path: 'chat-pdf/:id',
    loadComponent: () => import('./chat-pdf/chat-pdf.page').then((m) => m.ChatPdfPage),
  },


  {
    path: 'mindmap/:id',
    loadComponent: () => import('./mindmap/mindmap.page').then((m) => m.MindmapPage),
  },

  {
    path: 'tutorial-stats/:id/:kind',
    loadComponent: () => import('./tutorial-stats/tutorial-stats.page').then((m) => m.TutorialStatsPage),
  },

  //{
    //path: 'chat-pdf/:id',
    //loadComponent: () => import('./chat-pdf/chat-pdf.page').then((m) => m.ChatPdfPage),
  //},
];

