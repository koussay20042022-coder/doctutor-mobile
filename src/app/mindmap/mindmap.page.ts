import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/angular';
import { TutorialService } from '../services/tutorial.service';

interface LNode { label: string[]; x: number; y: number; fill: string; color: string; textColor: string; }
interface LEdge { d: string; color: string; }

@Component({
  selector: 'app-mindmap',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="back()">← Retour</ion-button>
        </ion-buttons>
        <ion-title>Carte mentale : {{ tutorial?.title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="zoomOut()">−</ion-button>
          <ion-button (click)="zoomIn()">+</ion-button>
          <ion-button (click)="load(true)" [disabled]="loading">Régénérer</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [scrollX]="true" [scrollY]="true">
      <p class="info" *ngIf="loading">Génération de la carte mentale en cours... (10 à 30 secondes)</p>
      <p class="info error" *ngIf="error">{{ error }}</p>

      <div class="canvas" *ngIf="nodes.length && !loading">
        <svg [attr.width]="width * zoom" [attr.height]="height * zoom"
             [attr.viewBox]="'0 0 ' + width + ' ' + height">
          <path *ngFor="let e of edges" [attr.d]="e.d" [attr.stroke]="e.color" fill="none" stroke-width="2" />
          <g *ngFor="let n of nodes">
            <rect [attr.x]="n.x" [attr.y]="n.y - nodeH / 2" [attr.width]="nodeW" [attr.height]="nodeH"
                  rx="10" [attr.fill]="n.fill" [attr.stroke]="n.color" stroke-width="2" />
            <text *ngFor="let l of n.label; let i = index"
                  [attr.x]="n.x + nodeW / 2"
                  [attr.y]="n.y + (i - (n.label.length - 1) / 2) * 14 + 4"
                  text-anchor="middle" font-size="12" [attr.fill]="n.textColor">{{ l }}</text>
          </g>
        </svg>
      </div>
    </ion-content>
  `,
  styles: [`
    .info { padding: 16px; color: #555; }
    .error { color: #eb445a; }
    .canvas { padding: 12px; overflow: auto; }
  `]
})
export class MindmapPage implements OnInit {
  tutorial: any = null;
  nodes: LNode[] = [];
  edges: LEdge[] = [];
  width = 800;
  height = 400;
  zoom = 1;
  loading = false;
  error = '';

  readonly nodeW = 190;
  readonly nodeH = 44;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tutorialService: TutorialService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.tutorialService.get(id).subscribe({
      next: (t: any) => {
        this.tutorial = t;
        this.cdr.detectChanges();
        this.load(false);
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

  zoomIn(): void { this.zoom = Math.min(2, +(this.zoom + 0.2).toFixed(1)); }
  zoomOut(): void { this.zoom = Math.max(0.4, +(this.zoom - 0.2).toFixed(1)); }

  load(refresh: boolean): void {
    if (!this.tutorial) { return; }
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.tutorialService.generateMindMap({ tutorialId: this.tutorial.id, refresh }).subscribe({
      next: (res: any) => {
        this.buildLayout(res.mindmap);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur carte mentale :', err);
        this.error = err?.error?.message || 'Impossible de générer la carte mentale.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Calcule la position de chaque noeud (carte horizontale : racine à gauche)
  private buildLayout(root: any): void {
    const colW = 250;
    const rowH = 56;
    const palette = ['#3880ff', '#2dd36f', '#f59e0b', '#eb445a', '#7044ff', '#0cb7c9', '#f97316'];
    const nodes: LNode[] = [];
    const edges: LEdge[] = [];
    let leaf = 0;
    let maxDepth = 0;

    const walk = (n: any, depth: number, color: string): number => {
      maxDepth = Math.max(maxDepth, depth);
      const kids: any[] = Array.isArray(n.children) ? n.children : [];
      const x = 20 + depth * colW;
      let y: number;

      if (kids.length === 0) {
        y = 40 + leaf * rowH;
        leaf++;
      } else {
        const ys = kids.map((k, i) => walk(k, depth + 1, depth === 0 ? palette[i % palette.length] : color));
        y = (ys[0] + ys[ys.length - 1]) / 2;
        ys.forEach((cy, i) => {
          const kcolor = depth === 0 ? palette[i % palette.length] : color;
          const x1 = x + this.nodeW;
          const x2 = x + colW;
          const xm = (x1 + x2) / 2;
          edges.push({ d: `M ${x1} ${y} C ${xm} ${y}, ${xm} ${cy}, ${x2} ${cy}`, color: kcolor });
        });
      }

      let fill = '#fff';
      let stroke = color;
      let text = '#222';
      if (depth === 0) { fill = '#222'; stroke = '#222'; text = '#fff'; }
      else if (depth === 1) { fill = color; text = '#fff'; }

      nodes.push({ label: this.wrap(n.label), x, y, fill, color: stroke, textColor: text });
      return y;
    };

    walk(root, 0, '#222');

    this.nodes = nodes;
    this.edges = edges;
    this.width = 20 + maxDepth * colW + this.nodeW + 20;
    this.height = 40 + leaf * rowH;
  }

  // Coupe le texte en 2 lignes maximum
  private wrap(text: string, max = 24): string[] {
    const words = String(text || '').split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > max && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = (cur + ' ' + w).trim();
      }
    }
    if (cur) { lines.push(cur); }
    if (lines.length > 2) {
      lines.length = 2;
      lines[1] = lines[1].slice(0, max - 1) + '…';
    }
    return lines;
  }
}