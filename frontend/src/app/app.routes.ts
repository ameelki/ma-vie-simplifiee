import { Routes } from '@angular/router';
import { loggedIn } from './core/guards';

export const routes: Routes = [
  { path: 'bienvenue', loadComponent: () => import('./pages/welcome.page').then((m) => m.WelcomePage) },
  { path: 'connexion', loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage), data: { mode: 'login' } },
  { path: 'inscription', loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage), data: { mode: 'register' } },
  {
    path: '',
    canActivate: [loggedIn],
    loadComponent: () => import('./shared/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'accueil' },
      { path: 'accueil', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
      { path: 'budget', loadComponent: () => import('./pages/budget.page').then((m) => m.BudgetPage) },
      { path: 'factures', loadComponent: () => import('./pages/bills.page').then((m) => m.BillsPage) },
      { path: 'agenda', loadComponent: () => import('./pages/agenda.page').then((m) => m.AgendaPage) },
      { path: 'documents', loadComponent: () => import('./pages/documents.page').then((m) => m.DocumentsPage) },
      { path: 'courses', loadComponent: () => import('./pages/shopping.page').then((m) => m.ShoppingPage) },
      { path: 'prix', loadComponent: () => import('./pages/prices.page').then((m) => m.PricesPage) },
      { path: 'taches', loadComponent: () => import('./pages/tasks.page').then((m) => m.TasksPage) },
      { path: 'assistant', loadComponent: () => import('./pages/assistant.page').then((m) => m.AssistantPage) },
      { path: 'famille', loadComponent: () => import('./pages/family.page').then((m) => m.FamilyPage) },
      { path: 'premium', loadComponent: () => import('./pages/premium.page').then((m) => m.PremiumPage) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications.page').then((m) => m.NotificationsPage) },
      { path: 'profil', loadComponent: () => import('./pages/profile.page').then((m) => m.ProfilePage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
