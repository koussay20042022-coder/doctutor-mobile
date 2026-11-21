import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/angular';
import { TutorialService } from '../services/tutorial.service';

@Component({
  selector: 'app-tutorial-stats',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="back()">← Retour</ion-button>
        </ion-buttons>
        <ion-title>
          {{ kind === 'done' ? 'Étudiants ayant terminé' : 'Notes des étudiants' }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="wrap">
        <h2 class="title">{{ kind === 'done' ? '📊' : '⭐' }} {{ tutorialTitle }}</h2>

        <p class="info" *ngIf="loading">Chargement...</p>
        <p class="error" *ngIf="error">{{ error }}</p>

        <!-- Liste des étudiants qui ont terminé -->
        <div *ngIf="!loading && !error && kind === 'done'">
          <p class="count">{{ doneRows.length }} étudiant(s) ont terminé ce cours.</p>
          <p class="info" *ngIf="doneRows.length === 0">Personne n'a encore terminé ce cours.</p>

          <table *ngIf="doneRows.length > 0">
            <thead>
              <tr><th>Nom</th><th>E-mail</th><th>Date</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of doneRows">
                <td>{{ r.name }}</td>
                <td>{{ r.email }}</td>
                <td>{{ r.date | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Liste des étudiants qui ont noté -->
        <div *ngIf="!loading && !error && kind === 'rating'">
          <p class="count">
            {{ ratingRows.length }} note(s)
            <span *ngIf="average !== null"> · moyenne : <strong>{{ average }} / 5</strong></span>
          </p>
          <p class="info" *ngIf="ratingRows.length === 0">Personne n'a encore noté ce cours.</p>

          <table *ngIf="ratingRows.length > 0">
            <thead>
              <tr><th>Nom</th><th>E-mail</th><th>Étoiles</th><th>Date</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of ratingRows">
                <td>{{ r.name }}</td>
                <td>{{ r.email }}</td>
                <td>
                  <span class="stars">{{ stars(r.rating) }}</span>
                  ({{ r.rating }}/5)
                </td>
                <td>{{ r.date | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .wrap { padding: 16px; max-width: 900px; margin: 0 auto; }
    .title { font-size: 20px; font-weight: bold; color: #3880ff; margin: 8px 0 16px; }
    .count { font-size: 15px; margin-bottom: 12px; }
    .info { color: #666; }
    .error { color: #eb445a; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #f4f6f8; text-align: left; padding: 10px; }
    td { padding: 10px; border-top: 1px solid #eee; }
    .stars { color: #f5a623; letter-spacing: 2px; font-size: 16px; }
  `]
})
export class TutorialStatsPage implements OnInit {
  kind: 'done' | 'rating' = 'done';
  tutorialId: any = null;
  tutorialTitle = '';
  loading = true;
  error = '';

  doneRows: any[] = [];
  ratingRows: any[] = [];
  average: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tutorialService: TutorialService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Réservé à l'administrateur
    const role = (localStorage.getItem('userRole') || '').trim();
    if (role !== 'admin') {
      this.router.navigate(['/tutorials']);
      return;
    }

    this.tutorialId = this.route.snapshot.paramMap.get('id');
    this.kind = this.route.snapshot.paramMap.get('kind') === 'rating' ? 'rating' : 'done';

    // Titre du cours
    this.tutorialService.get(this.tutorialId).subscribe({
      next: (t: any) => { this.tutorialTitle = t?.title || ''; this.cdr.detectChanges(); },
      error: () => {}
    });

    if (this.kind === 'done') {
      this.tutorialService.getTutorialDoneStats(this.tutorialId).subscribe({
        next: (res: any) => {
          this.doneRows = res.students || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => this.fail(err)
      });
    } else {
      this.tutorialService.getTutorialRatingStats(this.tutorialId).subscribe({
        next: (res: any) => {
          this.ratingRows = res.ratings || [];
          this.average = res.average ?? null;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => this.fail(err)
      });
    }
  }

  stars(n: number): string {
    const v = Math.max(0, Math.min(5, Number(n) || 0));
    return '★'.repeat(v) + '☆'.repeat(5 - v);
  }

  private fail(err: any): void {
    console.error('Erreur statistiques :', err);
    this.error = 'Impossible de charger les statistiques.';
    this.loading = false;
    this.cdr.detectChanges();
  }

  back(): void {
    this.router.navigate(['/tutorials']);
  }
}
