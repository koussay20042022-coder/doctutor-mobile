import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/angular';
import { TutorialService } from '../services/tutorial.service';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="back()">← Retour</ion-button>
        </ion-buttons>
        <ion-title>Commentaires : {{ tutorial?.title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="wrap">

        <!-- Ajouter un commentaire -->
        <div class="new">
          <textarea [(ngModel)]="newComment" rows="3" placeholder="Écrire un commentaire..."></textarea>
          <ion-button (click)="send()" [disabled]="sending || !newComment.trim()">
            {{ sending ? 'Envoi...' : 'Publier' }}
          </ion-button>
        </div>

        <p class="info" *ngIf="loading">Chargement des commentaires...</p>
        <p class="info error" *ngIf="error">{{ error }}</p>
        <p class="info" *ngIf="!loading && !error && comments.length === 0">
          Aucun commentaire pour le moment. Soyez le premier !
        </p>

        <h3 *ngIf="comments.length > 0">{{ comments.length }} commentaire(s)</h3>

        <!-- Liste des commentaires de tous les étudiants -->
        <div class="comment" *ngFor="let c of comments">
          <div class="head">
            <strong>{{ c.authorName || 'Étudiant' }}</strong>
            <span class="date">{{ c.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div class="text">{{ c.text }}</div>
          <ion-button *ngIf="isAdmin" size="small" color="danger" fill="outline" (click)="remove(c)">
            Supprimer
          </ion-button>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .wrap { max-width: 800px; margin: 0 auto; }
    .new { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .new textarea { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-family: inherit; font-size: 14px; }
    .comment { background: #f4f6f8; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
    .head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; font-size: 13px; }
    .date { color: #888; font-size: 12px; }
    .text { white-space: pre-wrap; font-size: 14px; margin-bottom: 6px; }
    .info { color: #666; }
    .error { color: #eb445a; }
  `]
})
export class CommentsPage implements OnInit {
  tutorial: any = null;
  comments: any[] = [];
  newComment = '';
  loading = true;
  sending = false;
  error = '';
  isAdmin = false;
  authorName = 'Étudiant';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tutorialService: TutorialService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('userRole') || '').trim();
    this.isAdmin = role === 'admin';
    this.authorName = this.isAdmin
      ? 'Administrateur'
      : (localStorage.getItem('student_name') || 'Étudiant');

    const id = this.route.snapshot.paramMap.get('id');

    this.tutorialService.get(id).subscribe({
      next: (t: any) => {
        this.tutorial = t;
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.tutorialService.getComments(id).subscribe({
      next: (data: any) => {
        this.comments = Array.isArray(data) ? data : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur commentaires :', err);
        this.error = 'Impossible de charger les commentaires.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  back(): void {
    this.router.navigate(['/tutorials']);
  }

  send(): void {
    const text = this.newComment.trim();
    if (!text || this.sending || !this.tutorial) { return; }
    this.sending = true;

    const userId = 1; // même convention que le reste de l'application

    this.tutorialService.addCommentWithAuthor(userId, this.tutorial.id, text, this.authorName).subscribe({
      next: (res: any) => {
        this.comments.unshift(res.data);
        this.newComment = '';
        this.sending = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur ajout commentaire :', err);
        this.error = "Impossible d'ajouter le commentaire.";
        this.sending = false;
        this.cdr.detectChanges();
      }
    });
  }

  remove(c: any): void {
    if (!this.isAdmin) { return; }
    if (!confirm('Supprimer ce commentaire ?')) { return; }

    this.tutorialService.deleteComment(c.id, 'admin').subscribe({
      next: () => {
        this.comments = this.comments.filter(x => x.id !== c.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur suppression :', err);
        alert('Suppression impossible.');
      }
    });
  }
}