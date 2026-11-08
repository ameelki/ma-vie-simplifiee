import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

/** Pré-rendu des pages publiques (accueil, connexion, inscription) au moment du build : du vrai HTML pour Google. */
export const config: ApplicationConfig = mergeApplicationConfig(appConfig, { providers: [provideServerRendering()] });
