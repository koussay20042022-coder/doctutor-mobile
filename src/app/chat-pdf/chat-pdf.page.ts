import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/angular';
import { TutorialService } from '../services/tutorial.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  pages?: number[];
}

@Component({
  selector: 'app-chat-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="back()">← Retour</ion-button>
        </ion-buttons>
        <ion-title>Chat PDF : {{ tutorial?.title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [scrollY]="false">
      <div class="split">

        <!-- Gauche : le PDF -->
        <div class="pane">
          <iframe *ngIf="safeUrl" [src]="safeUrl" title="PDF"></iframe>
          <p class="info" *ngIf="!safeUrl && !error">Chargement du PDF...</p>
          <p class="info" *ngIf="error">{{ error }}</p>
        </div>

        <!-- Droite : le chat -->
        <div class="pane chat">
          <div class="messages" id="chatMessages">
            <p class="info" *ngIf="messages.length === 0">
              Posez une question sur ce document. Les réponses s'appuient uniquement sur son contenu.
            </p>

            <div *ngFor="let m of messages" class="bubble" [class.user]="m.role === 'user'">
              <div>{{ m.text }}</div>
              <div class="pages" *ngIf="m.pages && m.pages.length">
                <button *ngFor="let p of m.pages" (click)="goToPage(p)">Page {{ p }}</button>
              </div>
            </div>

            <div class="bubble" *ngIf="loading">Je lis le document...</div>
          </div>

          <div class="input-row">
            <input [(ngModel)]="question" (keyup.enter)="send()"
                   placeholder="Posez votre question..." [disabled]="loading || !!error">
            <ion-button (click)="send()" [disabled]="loading || !question.trim() || !!error">Envoyer</ion-button>
          </div>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .split { display: grid; grid-template-columns: 1fr 1fr; height: calc(100vh - 56px); }
    .pane { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid #ddd; }
    .pane iframe { flex: 1; width: 100%; border: 0; }
    .chat { border-right: 0; }
    .messages { flex: 1; overflow-y: auto; padding: 12px; }
    .bubble { background: #f1f3f5; padding: 10px 12px; border-radius: 10px; margin-bottom: 10px; max-width: 90%; white-space: pre-wrap; }
    .bubble.user { background: #3880ff; color: #fff; margin-left: auto; }
    .pages { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
    .pages button { border: 1px solid #3880ff; background: #fff; color: #3880ff; border-radius: 6px; padding: 2px 8px; cursor: pointer; }
    .input-row { display: flex; gap: 8px; padding: 8px; border-top: 1px solid #ddd; align-items: center; }
    .input-row input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 8px; }
    .info { color: #666; padding: 12px; }
    @media (max-width: 768px) {
      .split { grid-template-columns: 1fr; grid-template-rows: 45% 55%; }
      .pane { border-right: 0; border-bottom: 1px solid #ddd; }
    }
  `]
})
export class ChatPdfPage implements OnInit {
  tutorial: any = null;
  pdfUrl = '';
  safeUrl: SafeResourceUrl | null = null;
  messages: ChatMessage[] = [];
  question = '';
  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private tutorialService: TutorialService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.tutorialService.get(id).subscribe({
      next: (t: any) => {
        this.tutorial = t;
        if (!t.pdf_url) {
          this.error = "Ce tutoriel n'a pas de PDF.";
        } else {
          this.pdfUrl = t.pdf_url;
          this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(t.pdf_url);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger ce tutoriel.';
        this.cdr.detectChanges();
      }
    });
  }

  back(): void {
    this.router.navigate(['/tutorials']);
  }

  send(): void {
    const q = this.question.trim();
    if (!q || this.loading || !this.tutorial) { return; }

    const history = this.messages.slice(-6).map(m => ({ role: m.role, content: m.text }));
    this.messages.push({ role: 'user', text: q });
    this.question = '';
    this.loading = true;
    this.scrollDown();

    this.tutorialService.chatWithPdf({ tutorialId: this.tutorial.id, question: q, history }).subscribe({
      next: (res: any) => {
        const answer = res.answer || '';
        this.messages.push({ role: 'assistant', text: answer, pages: this.extractPages(answer) });
        this.loading = false;
        this.cdr.detectChanges();
        this.scrollDown();
      },
      error: (err) => {
        console.error('Erreur chat PDF :', err);
        this.messages.push({ role: 'assistant', text: "Erreur : impossible d'obtenir une réponse." });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Cherche "page 3" dans la réponse pour créer des boutons
  private extractPages(text: string): number[] {
    const found = new Set<number>();
    const re = /page\s+(\d+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) { found.add(Number(m[1])); }
    return Array.from(found);
  }

  goToPage(n: number): void {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.pdfUrl}#page=${n}`);
    this.cdr.detectChanges();
  }

  private scrollDown(): void {
    setTimeout(() => {
      const el = document.getElementById('chatMessages');
      if (el) { el.scrollTop = el.scrollHeight; }
    }, 50);
  }
}