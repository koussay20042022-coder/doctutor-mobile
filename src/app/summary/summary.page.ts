import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/angular';
import { TutorialService } from '../services/tutorial.service';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="back()">← Retour</ion-button>
        </ion-buttons>
        <ion-title>Résumé IA : {{ tutorial?.title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Choix du type de résumé -->
      <div class="modes">
        <ion-button size="small" *ngFor="let m of modes"
                    [fill]="m.value === mode ? 'solid' : 'outline'"
                    [disabled]="loading"
                    (click)="changeMode(m.value)">
          {{ m.label }}
        </ion-button>
      </div>

      <div class="card">
        <h2>📄 {{ currentLabel }} : {{ tutorial?.title }}</h2>

        <p *ngIf="loading" class="info">Génération en cours... (quelques secondes)</p>
        <p *ngIf="error" class="info error">{{ error }}</p>

        <div *ngIf="!loading && !error" class="text">{{ summaryText }}</div>

        <div *ngIf="!loading && summaryText" class="actions">
          <ion-button size="small" fill="outline" (click)="copy()">{{ copied ? 'Copié ✓' : 'Copier' }}</ion-button>
          <ion-button size="small" fill="outline" (click)="generate()">Régénérer</ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .modes { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .card { padding: 20px; background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.1); }
    h2 { font-size: 18px; font-weight: bold; color: #3880ff; margin: 0 0 12px; }
    .text { white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #333; }
    .info { color: #666; }
    .error { color: #eb445a; }
    .actions { margin-top: 12px; display: flex; gap: 6px; }
  `]
})
export class SummaryPage implements OnInit {
  tutorial: any = null;
  mode = 'court';
  summaryText = '';
  loading = false;
  error = '';
  copied = false;

  modes = [
    { value: 'court', label: 'Résumé court' },
    { value: 'long', label: 'Résumé long' },
    { value: 'fiche', label: 'Fiche de révision' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tutorialService: TutorialService,
    private cdr: ChangeDetectorRef
  ) {}

  get currentLabel(): string {
    return this.modes.find(m => m.value === this.mode)?.label || 'Résumé';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.mode = this.route.snapshot.paramMap.get('mode') || 'court';

    this.tutorialService.get(id).subscribe({
      next: (t: any) => {
        this.tutorial = t;
        this.generate();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Tutoriel introuvable.';
        this.cdr.detectChanges();
      }
    });
  }

  changeMode(value: string) {
    this.mode = value;
    this.generate();
  }

  generate() {
    if (!this.tutorial) { return; }
    this.loading = true;
    this.error = '';
    this.summaryText = '';
    this.copied = false;
    this.cdr.detectChanges();

    this.tutorialService.summarizeText({
      tutorialId: this.tutorial.id,
      text: this.tutorial.description || ('Cours sur ' + this.tutorial.title),
      mode: this.mode
    }).subscribe({
      next: (res: any) => {
        this.summaryText = res.summary || '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur résumé :', err);
        this.error = "Erreur lors de la génération par l'IA. Réessayez dans un instant.";
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  copy() {
    if (!this.summaryText) { return; }
    navigator.clipboard.writeText(this.summaryText);
    this.copied = true;
    this.cdr.detectChanges();
  }

  back() {
    this.router.navigate(['/tutorials']);
  }
}
