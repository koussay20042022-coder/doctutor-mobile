import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { TutorialService } from '../services/tutorial.service';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="back()">← Retour</ion-button>
        </ion-buttons>
        <ion-title>Quiz IA : {{ tutorial?.title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p *ngIf="loading" class="info">Génération du quiz en cours... (quelques secondes)</p>
      <div *ngIf="error" class="info error">
        <p>{{ error }}</p>
        <ion-button size="small" (click)="start()">Réessayer</ion-button>
      </div>

      <div class="card" *ngIf="!loading && !error && quiz.length > 0">

        <!-- Questions -->
        <div *ngIf="!finished">
          <p class="count">Question {{ index + 1 }} sur {{ quiz.length }}</p>
          <h3>{{ quiz[index].question }}</h3>

          <div *ngFor="let option of quiz[index].options" style="margin-bottom: 10px;">
            <ion-button expand="block"
              [color]="checked ? (option.trim() === quiz[index].answer.trim() ? 'success' : (option === selected ? 'danger' : 'light')) : 'light'"
              (click)="select(option)"
              style="text-transform: none; text-align: left; font-weight: normal;">
              {{ option }}
            </ion-button>
          </div>

          <div *ngIf="checked" class="feedback">
            <p *ngIf="correct" style="color:#2dd36f;">Bonne réponse ! 🎉</p>
            <p *ngIf="!correct" style="color:#eb445a;">
              Mauvaise réponse. La bonne réponse était : <span style="color:#222;">{{ quiz[index].answer }}</span>
            </p>
            <ion-button expand="block" color="primary" (click)="next()">
              {{ index < quiz.length - 1 ? 'Question suivante ➡️' : 'Voir mon score final 🏆' }}
            </ion-button>
          </div>
        </div>

        <!-- Score final -->
        <div *ngIf="finished" class="final">
          <h2>Quiz Terminé ! 🎓</h2>
          <p>Votre score : <strong class="score">{{ score }} / {{ quiz.length }}</strong></p>
          <p class="small">Résultat enregistré avec l'e-mail : <strong>{{ studentEmail }}</strong></p>
          <ion-button expand="block" fill="outline" (click)="start()">Refaire un quiz</ion-button>
          <ion-button expand="block" color="primary" (click)="back()">Retourner au cours</ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .card { padding: 20px; background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.1); }
    .info { color: #666; }
    .error { color: #eb445a; }
    .count { font-size: 14px; color: #666; margin-bottom: 8px; }
    h3 { font-size: 16px; font-weight: bold; margin-bottom: 16px; color: #333; }
    .feedback { margin-top: 16px; text-align: center; font-weight: bold; }
    .final { text-align: center; padding: 20px; }
    .final h2 { font-size: 22px; font-weight: bold; color: #3880ff; }
    .score { font-size: 24px; color: #2dd36f; }
    .small { font-size: 13px; color: #666; margin-bottom: 20px; }
  `]
})
export class QuizPage implements OnInit {
  tutorial: any = null;
  numQuestions = 5;
  studentEmail = '';

  quiz: Array<any> = [];
  index = 0;
  score = 0;
  selected = '';
  checked = false;
  correct = false;
  finished = false;
  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tutorialService: TutorialService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.numQuestions = Number(this.route.snapshot.paramMap.get('count')) || 5;
    this.studentEmail = localStorage.getItem('student_email') || '';

    this.tutorialService.get(id).subscribe({
      next: (t: any) => {
        this.tutorial = t;
        this.start();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Tutoriel introuvable.';
        this.cdr.detectChanges();
      }
    });
  }

  async start() {
    if (!this.tutorial) { return; }
    this.loading = true;
    this.error = '';
    this.finished = false;
    this.index = 0;
    this.score = 0;
    this.checked = false;
    this.selected = '';
    this.quiz = [];
    this.cdr.detectChanges();

    try {
      const res: any = await firstValueFrom(
        this.tutorialService.generateQuiz({
          text: this.tutorial.description || ('Cours sur ' + this.tutorial.title),
          numQuestions: this.numQuestions
        })
      );
      this.quiz = res.quiz || [];
      if (this.quiz.length === 0) { this.error = 'Aucune question générée.'; }
    } catch (err) {
      console.error('Erreur génération quiz :', err);
      this.error = "Erreur lors de la génération du quiz par l'IA.";
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  select(option: string) {
    if (this.checked) { return; }
    this.selected = option;
    this.checked = true;
    this.correct = option.trim() === this.quiz[this.index].answer.trim();
    if (this.correct) { this.score++; }
  }

  next() {
    this.checked = false;
    this.selected = '';
    if (this.index < this.quiz.length - 1) {
      this.index++;
    } else {
      this.finished = true;
      this.saveResult();
    }
  }

  private async saveResult() {
    try {
      await firstValueFrom(this.tutorialService.saveQuizResult({
        studentEmail: this.studentEmail,
        tutorialId: this.tutorial.id,
        score: this.score,
        totalQuestions: this.quiz.length
      }));
    } catch (err) {
      console.error('Erreur enregistrement score :', err);
    }
  }

  back() {
    this.router.navigate(['/tutorials']);
  }
}
