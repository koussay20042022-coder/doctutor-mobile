import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
//import { RouterLink } from '@angular/router';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';


import { Router } from '@angular/router';

import { FormsModule } from '@angular/forms';
//import { IonicModule } from '@ionic/angular';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonInput,
  IonSearchbar,
  IonProgressBar,
  IonIcon,
  IonListHeader
} from '@ionic/angular';
import { TutorialService } from '../services/tutorial.service';

import { addIcons } from 'ionicons';
import {
  heart,
  heartOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  star,
  starOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-tutorials',
  templateUrl: './tutorials.page.html',
  styleUrls: ['./tutorials.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    //RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge, 
    FormsModule ,

    IonInput,
    IonSearchbar,
    IonProgressBar,
    IonIcon,
    IonListHeader
    //IonicModule
  ]
})
export class TutorialsPage implements OnInit {
  // Tous les enregistrements reçus du backend (cours + tutoriels)
  private allItems: any[] = [];

  // Les cours principaux : courseId est null ou absent
  courses: any[] = [];

  // Tutoriels du cours actuellement sélectionné
  tutorials: any[] = [];

  selectedCourse: any = null;
  userRole = 'student';
  loading = false;


  searchResults: any[] = [];

  showAddForm = false;
  newPdfFile: File | null = null;


  selectedTutorial: any = null;
  historyList: any[] = [];
  courseProgress: number = 0;
  notificationsList: any[] = [];

  studentEmail: string = '';
  studentName: string = '';
  isLoggedIn: boolean = false;



  //showSummaryPanel = false;
  //summaryLoading = false;
  //summaryTitle = '';
  //summaryText = '';


  showFavorites = false;
  favoritesList: any[] = [];
  private favoriteIds = new Set<number>();


  private supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);

  //constructor(private tutorialService: TutorialService,
  //private alertCtrl: AlertController,
  //private cdr: ChangeDetectorRef) {}


    constructor(private tutorialService: TutorialService,
  private alertCtrl: AlertController,
  private cdr: ChangeDetectorRef,
  private router: Router) {
    addIcons({
      heart,
      heartOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      star,
      starOutline
    });
  }


  ngOnInit(): void {
    const role = localStorage.getItem('userRole');
    this.userRole = role ? role.trim() : 'student';

    // --- AJOUTEZ CETTE VÉRIFICATION ---
    if (this.userRole === 'admin') {
      this.isLoggedIn = true; // L'admin a accès directement
    } else {
      const savedEmail = localStorage.getItem('student_email');
      if (savedEmail) {
        this.studentEmail = savedEmail;
        this.studentName = localStorage.getItem('student_name') || '';
        this.isLoggedIn = true;

        // Compte créé avant l'ajout des identifiants : on l'enregistre maintenant
        if (!localStorage.getItem('student_id')) {
          this.tutorialService.registerStudent(this.studentName, this.studentEmail).subscribe({
            next: (s: any) => {
              localStorage.setItem('student_id', String(s.id));
              this.retrieveTutorials();
            },
            error: (err) => console.error('Enregistrement étudiant :', err)
          });
        }
      }
    }
    // ----------------------------------

    this.retrieveTutorials();
    this.loadHistory();
    this.loadNotifications(); // Si vous avez ajouté les notifications
  }


  // Fonction pour connecter l'étudiant
    loginStudent(nameInput: any, emailInput: any) {
    const name = String(nameInput ?? '').trim();
    const email = String(emailInput ?? '').trim().toLowerCase();

    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      alert('Veuillez entrer un nom valide et un e-mail correct (ex : nom@domaine.com).');
      return;
    }

    // On enregistre l'étudiant côté serveur pour obtenir son identifiant
    this.tutorialService.registerStudent(name, email).subscribe({
      next: (student: any) => {
        this.studentName = student.name;
        this.studentEmail = student.email;
        this.isLoggedIn = true;

        localStorage.setItem('student_email', student.email);
        localStorage.setItem('student_name', student.name);
        localStorage.setItem('student_id', String(student.id));

        // On recharge les données propres à cet étudiant
        this.retrieveTutorials();
        this.loadHistory();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur connexion étudiant :', err);
        // 409 : cet e-mail existe déjà avec un autre nom
        if (err && err.status === 409) {
          alert('Vérifiez votre nom ou votre email.');
          //alert((err.error && err.error.message) || 'Cet e-mail est déjà enregistré avec un autre nom. Utilisez le même nom que lors de votre première connexion.');
          return;
        }
        alert('Connexion impossible pour le moment. Réessayez dans quelques secondes (le serveur peut être en train de démarrer).');
      }
    });
  }






    // ----- Statistiques d'un tutoriel (admin) -----
  showTStats = false;
  tStatsKind: 'done' | 'rating' = 'done';
  tStatsLoading = false;
  tStatsError = '';
  tStatsTitle = '';
  tDoneRows: any[] = [];
  tRatingRows: any[] = [];
  tRatingAverage: number | null = null;

  openTutorialDoneStats(tutorial: any) {
    if (!this.isAdmin) { return; }
    this.router.navigate(['/tutorial-stats', tutorial.id, 'done']);
  }

  openTutorialRatingStats(tutorial: any) {
    if (!this.isAdmin) { return; }
    this.router.navigate(['/tutorial-stats', tutorial.id, 'rating']);
  }

  private scrollToTStats() {
    setTimeout(() => {
      const el = document.getElementById('tutorialStatsPanel');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, 150);
  }






    // ----- Statistiques admin -----
  showStatsPanel = false;
  statsKind: 'course' | 'ratings' = 'course';
  statsLoading = false;
  statsError = '';
  courseStatsTotal = 0;
  courseStatsRows: any[] = [];
  ratingAverage: number | null = null;
  ratingRows: any[] = [];

  openCourseStats() {
    if (!this.isAdmin || !this.selectedCourse) { return; }
    this.statsKind = 'course';
    this.statsLoading = true;
    this.statsError = '';
    this.showStatsPanel = true;
    this.cdr.detectChanges();
    this.scrollToStats();

    this.tutorialService.getCourseStats(this.selectedCourse.id).subscribe({
      next: (res: any) => {
        this.courseStatsTotal = res.total || 0;
        this.courseStatsRows = res.students || [];
        this.statsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur statistiques cours :', err);
        this.statsError = 'Impossible de charger les statistiques.';
        this.statsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openRatingStats() {
    if (!this.isAdmin || !this.selectedCourse) { return; }
    this.statsKind = 'ratings';
    this.statsLoading = true;
    this.statsError = '';
    this.showStatsPanel = true;
    this.cdr.detectChanges();
    this.scrollToStats();

    this.tutorialService.getRatingStats(this.selectedCourse.id).subscribe({
      next: (res: any) => {
        this.ratingAverage = res.average;
        this.ratingRows = res.ratings || [];
        this.statsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur statistiques notes :', err);
        this.statsError = 'Impossible de charger les statistiques.';
        this.statsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private scrollToStats() {
    setTimeout(() => {
      const el = document.getElementById('statsPanel');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, 150);
  }

  get finishedCount(): number {
    return this.courseStatsRows.filter(r => r.finished).length;
  }










  // --- Variables et méthodes pour le Quiz IA ---
  currentQuiz: Array<any> = [];
  currentQuestionIndex: number = 0;
  userScore: number = 0;
  showQuizModal: boolean = false;
  selectedAnswer: string = '';
  isAnswerChecked: boolean = false;
  isCorrectAnswer: boolean = false;
  quizFinished: boolean = false;
  activeTutorialForQuiz: any = null;



  showSummaryPanel = false;
  summaryLoading = false;
  summaryTitle = '';
  summaryText = '';

  // 1. Choisir entre 5 ou 10 questions
  async openQuizOptions(tutorial: any) {
    this.activeTutorialForQuiz = tutorial;
    const alert = await this.alertCtrl.create({
      header: 'Générer un Quiz IA 🧠',
      message: 'Choisissez le nombre de questions :',
      buttons: [
        {
          text: '5 Questions',
          handler: () => { this.fetchAndStartQuiz(tutorial, 5); }
        },
        {
          text: '10 Questions',
          handler: () => { this.fetchAndStartQuiz(tutorial, 10); }
        },
        {
          text: 'Annuler',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  // 2. Appel du Backend pour générer le quiz
  async fetchAndStartQuiz(tutorial: any, numQuestions: number) {
    const textContent = tutorial.description || "Cours sur " + tutorial.title;

    try {
      const res: any = await firstValueFrom(
        this.tutorialService.generateQuiz({ text: textContent, numQuestions: numQuestions })
      );
      this.currentQuiz = res.quiz;
      this.currentQuestionIndex = 0;
      this.userScore = 0;
      this.quizFinished = false;
      this.showQuizModal = true;
    } catch (err) {
      console.error('Erreur génération quiz :', err);
      alert("Erreur lors de la génération du quiz par l'IA.");
    }
  }
  // 3. Vérifier la réponse en direct
  selectAnswer(option: string) {
    if (this.isAnswerChecked) return;
    this.selectedAnswer = option;
    this.isAnswerChecked = true;

    const currentQ = this.currentQuiz[this.currentQuestionIndex];
    if (option.trim() === currentQ.answer.trim()) {
      this.isCorrectAnswer = true;
      this.userScore++;
    } else {
      this.isCorrectAnswer = false;
    }
  }

  // 4. Question suivante ou fin du quiz
  nextQuestion() {
    this.isAnswerChecked = false;
    this.selectedAnswer = '';
    
    if (this.currentQuestionIndex < this.currentQuiz.length - 1) {
      this.currentQuestionIndex++;
    } else {
      this.quizFinished = true;
      this.saveQuizResultToBackend();
    }
  }

  // 5. Enregistrer le score avec l'e-mail de l'étudiant
 async saveQuizResultToBackend(): Promise<void> {
    const resultData = {
      studentEmail: this.studentEmail,
      tutorialId: this.activeTutorialForQuiz.id,
      score: this.userScore,
      totalQuestions: this.currentQuiz.length
    };

    try {
      const res: any = await firstValueFrom(
        this.tutorialService.saveQuizResult(resultData)
      );
      console.log('Résultat de quiz enregistré avec succès !', res);
    } catch (err) {
      console.error('Erreur lors de l’enregistrement du score :', err);
    }
  }




  //ngOnInit(): void {
    //const role = localStorage.getItem('userRole');
    //this.userRole = role ? role.trim() : 'student';
    //this.retrieveTutorials();

    //this.loadHistory();

  //}


    // Étape 1 : le choix du type de résumé
  async openSummaryOptions(tutorial: any) {
    const choice = await this.alertCtrl.create({
      header: 'Résumé IA 📄',
      message: 'Quel type de résumé souhaitez-vous ?',
      inputs: [
        { type: 'radio', label: 'Résumé court', value: 'court', checked: true },
        { type: 'radio', label: 'Résumé long (détaillé)', value: 'long' },
        { type: 'radio', label: 'Fiche de révision', value: 'fiche' }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Générer',
          handler: (value: string) => {
            this.generateSummary(tutorial, value || 'court');
          }
        }
      ]
    });
    await choice.present();
  }

  // Étape 2 : l'appel au backend et l'affichage dans le panneau
  generateSummary(tutorial: any, mode: string) {
    const labels: any = {
      court: 'Résumé court',
      long: 'Résumé long',
      fiche: 'Fiche de révision'
    };

    this.summaryTitle = `${labels[mode] || 'Résumé'} : ${tutorial.title}`;
    this.summaryText = '';
    this.summaryLoading = true;
    this.showSummaryPanel = true;
    this.cdr.detectChanges();
    this.scrollToSummary();

    this.tutorialService.summarizeText({
      tutorialId: tutorial.id,
      text: tutorial.description || ('Cours sur ' + tutorial.title),
      mode
    }).subscribe({
      next: (res: any) => {
        this.summaryText = res.summary || '';
        this.summaryLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur résumé :', err);
        this.summaryText = "Erreur lors de la génération par l'IA. Réessayez dans un instant.";
        this.summaryLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private scrollToSummary() {
    setTimeout(() => {
      const el = document.getElementById('summaryPanel');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, 150);
  }

  copySummary() {
    if (this.summaryText) {
      navigator.clipboard.writeText(this.summaryText);
    }
  }


   


  // Ouvrir les options de résumé IA
  //async openSummaryOptions(tutorial: any) {
    //const alert = await this.alertCtrl.create({
      //header: 'Résumé IA 📄',
      //message: 'Choisissez le format du résumé :',
      //buttons: [
        //{
          //text: 'Résumé Long',
          //handler: () => { this.generateSummary(tutorial, 'long'); }
        //},
        //{
          //text: 'Résumé Court',
          //handler: () => { this.generateSummary(tutorial, 'court'); }
        //},
        //{
          //text: 'Fiche de révision',
          //handler: () => { this.generateSummary(tutorial, 'revision'); }
        //},
        //{
          //text: 'Annuler',
          //role: 'cancel'
        //}
      //]
    //});
    //await alert.present();
  //

  //// Appeler le backend pour générer le résumé selon le type choisi
  //async generateSummary(tutorial: any, type: string) {
    //const textContent = tutorial.description || "Cours sur " + tutorial.title;
    
    //try {
      //const res: any = await firstValueFrom(
        //this.tutorialService.summarizeText({ text: textContent, type: type })
      //);
      
      //// Afficher le résultat dans une alerte ou un modal dédié
      //const alert = await this.alertCtrl.create({
        //header: `Résumé (${type.toUpperCase()})`,
        //message: res.summary || res.result || "Voici le résumé généré.",
        //buttons: ['Fermer']
      //});
      //await alert.present();
    //} catch (err) {
      //console.error('Erreur génération résumé :', err);
      //alert("Erreur lors de la génération du résumé par l'IA.");
    //}
  //}






  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }

    // Identifiant de l'étudiant connecté (1 par défaut, pour l'admin ou avant connexion)
  get currentUserId(): number {
    return Number(localStorage.getItem('student_id')) || 1;
  }


  // >>> MÉTHODE DE RECHERCHE À AJOUTER <<<
  onSearch(event: any) {
    const query = event.target.value;

    if (!query || query.trim() === '') {
      this.searchResults = [];
      return;
    }

    this.tutorialService.searchTutorials(query).subscribe({
      next: (data) => {
        this.searchResults = data;
      },
      error: (err) => {
        console.error('Erreur lors de la recherche :', err);
      }
    });
  }



  retrieveTutorials(): void {
    this.loading = true;

    this.tutorialService.getAll().subscribe({
      next: (data: any) => {
        this.allItems = Array.isArray(data) ? data : [];

        // Le catalogue mobile affiche uniquement les cours principaux.
        this.courses = this.allItems.filter((item: any) =>
          item.courseId === null || item.courseId === undefined
        );

        // Si un cours est déjà ouvert, actualiser sa liste de tutoriels.
        if (this.selectedCourse) {
          const refreshedCourse = this.courses.find(
            (course: any) => Number(course.id) === Number(this.selectedCourse.id)
          );

          if (refreshedCourse) {
            this.selectedCourse = refreshedCourse;
            this.loadCourseTutorials(refreshedCourse);
          } else {
            this.selectedCourse = null;
            this.tutorials = [];
          }
        }

        this.loadFavorites();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur de récupération des cours :', error);
        this.loading = false;
        this.cdr.detectChanges();
        alert('Impossible de charger les cours. Vérifiez la connexion au serveur.');
      }
    });
  }
  
  
  selectCourse(course: any): void {
    this.selectedCourse = course;
    this.loadCourseTutorials(course);
    this.loadCompletedState();

    this.loadProgress(course.id);
  }

  loadCourseTutorials(course: any): void {
    this.tutorials = this.allItems.filter((item: any) => {
      const belongsToCourse =
        Number(item.courseId) === Number(course.id);

      const isPublished =
        item.published === true || item.published === 1;

      return belongsToCourse && (this.isAdmin || isPublished);
    });

    // cette boucle pour charger les commentaires de chaque tutoriel affiché
    this.tutorials.forEach((tutorial: any) => {
      this.loadTutorialComments(tutorial);
    });
  }

  backToCourses(): void {
    this.selectedCourse = null;
    this.tutorials = [];
  }

  addTutorial(): void {
    if (!this.selectedCourse || !this.selectedCourse.id) {
      alert('Veuillez d’abord sélectionner un cours.');
      return;
    }

    const title = prompt('Titre du tutoriel :');
    if (!title || !title.trim()) {
      return;
    }

    const description = prompt('Description du tutoriel :');
    if (!description || !description.trim()) {
      return;
    }

    // Le tutoriel est obligatoirement rattaché au cours sélectionné.
    const data = {
      title: title.trim(),
      description: description.trim(),
      published: false,
      courseId: Number(this.selectedCourse.id)
    };

    console.log('Tutoriel envoyé au backend :', data);

    this.tutorialService.create(data).subscribe({
      next: (response) => {
        console.log('Tutoriel ajouté :', response);
        alert('Tutoriel ajouté au cours avec succès !');
        this.retrieveTutorials();
      },
      error: (error) => {
        console.error('Erreur lors de l’ajout du tutoriel :', error);
        alert('Impossible d’ajouter le tutoriel. Vérifiez la console.');
      }
    });
  }

  updateTutorial(tutorial: any): void {
    const newTitle = prompt('Nouveau titre :', tutorial.title);
    if (!newTitle || !newTitle.trim()) {
      return;
    }

    const newDescription = prompt(
      'Nouvelle description :',
      tutorial.description
    );

    if (!newDescription || !newDescription.trim()) {
      return;
    }

    const data = {
      title: newTitle.trim(),
      description: newDescription.trim(),
      published: tutorial.published,
      courseId: Number(this.selectedCourse.id)
    };

    this.tutorialService.update(tutorial.id, data).subscribe({
      next: (response) => {
        console.log('Modification réussie :', response);
        alert('Tutoriel modifié avec succès !');
        this.retrieveTutorials();
      },
      error: (error) => {
        console.error('Erreur lors de la modification :', error);
        alert('Impossible de modifier le tutoriel.');
      }
    });
  }

  togglePublication(tutorial: any): void {
    const data = {
      title: tutorial.title,
      description: tutorial.description,
      published: !(tutorial.published === true || tutorial.published === 1),
      courseId: Number(this.selectedCourse.id)
    };

    this.tutorialService.update(tutorial.id, data).subscribe({
      next: () => {
        alert(data.published ? 'Tutoriel publié.' : 'Tutoriel dépublié.');
        this.retrieveTutorials();
      },
      error: (error) => {
        console.error('Erreur de publication :', error);
        alert('Impossible de modifier le statut du tutoriel.');
      }
    });
  }




    // ---------- Déconnexion ----------
  logout() {
    localStorage.removeItem('student_email');
    localStorage.removeItem('student_name');
    localStorage.removeItem('student_id');
    window.location.href = '/home';
  }

  // ---------- Ouvrir un cours ----------
  openCourse(course: any) {
    this.selectedCourse = course;
    this.retrieveTutorials();
  }

  // ---------- Ajouter un cours (admin) ----------
  async addCourse() {
    if (!this.isAdmin) { return; }
    const alert = await this.alertCtrl.create({
      header: 'Nouveau cours',
      inputs: [
        { name: 'title', type: 'text', placeholder: 'Titre du cours' },
        { name: 'teacher', type: 'text', placeholder: 'Enseignant (facultatif)' }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Ajouter',
          handler: (v) => {
            if (!v.title || !v.title.trim()) { return false; }
            this.tutorialService.create({
              title: v.title.trim(),
              description: v.teacher && v.teacher.trim() ? 'Enseignant: ' + v.teacher.trim() : '',
              published: false
            }).subscribe({
              next: () => { this.toast('Cours ajouté'); this.retrieveTutorials();

                // <--- AJOUTEZ LA NOTIFICATION ICI --->
                this.tutorialService.createNotification(
                  "Nouvelle formation !",
                  `Le cours "${v.title.trim()}" vient d'être publié.`,
                  "course"
                ).subscribe();

              //},
               },
              error: (e) => { console.error(e); this.toast("Erreur : le cours n'a pas été ajouté"); }
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // ---------- Publier / dépublier (admin) ----------
  togglePublish(t: any) {
    if (!this.isAdmin) { return; }
    const published = !t.published;
    this.tutorialService.update(t.id, { published }).subscribe({
      next: () => {
        t.published = published;
        this.toast(published ? 'Tutoriel publié' : 'Tutoriel dépublié');
        this.retrieveTutorials();
      },
      error: (e) => { console.error(e); this.toast('Erreur : changement non enregistré'); }
    });
  }





    // ---------- Modifier titre + description (admin) ----------
  async editTutorial(t: any) {
    if (!this.isAdmin) { return; }
    const alert = await this.alertCtrl.create({
      header: 'Modifier le tutoriel',
      inputs: [
        { name: 'title', type: 'text', value: t.title, placeholder: 'Titre' },
        { name: 'description', type: 'text', value: t.description, placeholder: 'Description' }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Enregistrer',
          handler: (v) => {
            if (!v.title || !v.title.trim()) { return false; }
            this.tutorialService.update(t.id, {
              title: v.title.trim(),
              description: (v.description || '').trim()
            }).subscribe({
              next: () => { this.toast('Tutoriel modifié'); this.retrieveTutorials(); },
              error: (e) => { console.error(e); this.toast('Erreur : modification non enregistrée'); }
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // ---------- Ajouter / remplacer le PDF (admin) ----------
  async changePdf(event: any, t: any) {
    if (!this.isAdmin) { return; }
    const file: File = event.target.files[0];
    if (!file) { return; }
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await this.supabase.storage.from('tutorials-pdf').upload(fileName, file);
      if (error) { throw error; }
      const { data } = this.supabase.storage.from('tutorials-pdf').getPublicUrl(fileName);
      const oldUrl = t.pdf_url;
      this.tutorialService.update(t.id, { pdf_url: data.publicUrl }).subscribe({
        next: () => { this.toast('PDF enregistré'); this.retrieveTutorials();
             this.removePdfFromStorage(oldUrl);
         },
        error: (e) => { console.error(e); this.toast('Erreur : PDF non enregistré'); }
      });
    } catch (e) {
      console.error(e);
      this.toast("Erreur lors de l'envoi du PDF");
    }
    event.target.value = '';
  }


    private async toast(message: string) {
    const a = await this.alertCtrl.create({ message, buttons: ['OK'] });
    await a.present();
  }



  deleteTutorial(id: number): void {
    if (!confirm('Voulez-vous vraiment supprimer ce tutoriel ?')) {
      return;
    }

    this.tutorialService.delete(id).subscribe({
      next: () => {
        alert('Tutoriel supprimé avec succès !');
        this.retrieveTutorials();
      },
      error: (error) => {
        console.error('Erreur lors de la suppression :', error);
        alert('Impossible de supprimer le tutoriel.');
      }
    });
  }



    // ---------- Formulaire d'ajout avec PDF (admin) ----------
  onNewPdf(event: any) {
    this.newPdfFile = event.target.files[0] || null;
  }

  async saveNewTutorial(title: string, description: string) {
    if (!this.isAdmin || !this.selectedCourse) { return; }
    if (!title || !title.trim()) {
      alert('Veuillez saisir un titre.');
      return;
    }
    try {
      let pdfUrl = '';
      if (this.newPdfFile) {
        const cleanName = this.newPdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}_${cleanName}`;
        const { error } = await this.supabase.storage
          .from('tutorials-pdf')
          .upload(fileName, this.newPdfFile);
        if (error) { throw error; }
        pdfUrl = this.supabase.storage.from('tutorials-pdf').getPublicUrl(fileName).data.publicUrl;
      }

      this.tutorialService.create({
        title: title.trim(),
        description: (description || '').trim(),
        published: false,
        pdf_url: pdfUrl,
        courseId: Number(this.selectedCourse.id)
      }).subscribe({
        next: () => {
          this.showAddForm = false;
          this.newPdfFile = null;
          this.retrieveTutorials();
        },
        error: (e) => { console.error(e); alert("Erreur : le tutoriel n'a pas été ajouté."); }
      });
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'envoi du PDF.");
    }
  }



    // ---------- Utilitaires ----------
  private async confirmAction(message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const a = await this.alertCtrl.create({
        header: 'Confirmation',
        message,
        buttons: [
          { text: 'Annuler', role: 'cancel', handler: () => resolve(false) },
          { text: 'Supprimer', role: 'destructive', handler: () => resolve(true) }
        ]
      });
      a.onDidDismiss().then(() => resolve(false));
      await a.present();
    });
  }

  private async removePdfFromStorage(url: string | null): Promise<void> {
    if (!url) { return; }
    try {
      const marker = '/tutorials-pdf/';
      const idx = url.indexOf(marker);
      if (idx === -1) { return; }
      const fileName = decodeURIComponent(url.substring(idx + marker.length));
      await this.supabase.storage.from('tutorials-pdf').remove([fileName]);
    } catch (e) {
      console.error('Suppression du PDF ignorée :', e);
    }
  }

  // ---------- Supprimer un tutoriel (admin) ----------
    async removeTutorial(t: any) {
    if (!this.isAdmin) { return; }
    if (!(await this.confirmAction(`Supprimer le tutoriel « ${t.title} » ?`))) { return; }
    try {
      await firstValueFrom(this.tutorialService.delete(t.id));
      await this.removePdfFromStorage(t.pdf_url);
      this.retrieveTutorials();
    } catch (e) {
      console.error(e);
      alert('Erreur : suppression impossible.');
    }
  }

  // ---------- Modifier le cours ouvert (admin) ----------
  async editCourse() {
    if (!this.isAdmin || !this.selectedCourse) { return; }
    const a = await this.alertCtrl.create({
      header: 'Modifier le cours',
      inputs: [
        { name: 'title', type: 'text', value: this.selectedCourse.title, placeholder: 'Titre du cours' },
        { name: 'description', type: 'text', value: this.selectedCourse.description, placeholder: 'Description / enseignant' }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Enregistrer',
          handler: (v) => {
            if (!v.title || !v.title.trim()) { return false; }
            this.tutorialService.update(this.selectedCourse.id, {
              title: v.title.trim(),
              description: (v.description || '').trim()
            }).subscribe({
              next: () => this.retrieveTutorials(),
              error: (e) => { console.error(e); alert('Erreur : modification non enregistrée.'); }
            });
            return true;
          }
        }
      ]
    });
    await a.present();
  }

  // ---------- Supprimer le cours ouvert et ses tutoriels (admin) ----------
  async deleteCourse() {
    if (!this.isAdmin || !this.selectedCourse) { return; }
    const course = this.selectedCourse;
    const children = this.allItems.filter((i: any) => Number(i.courseId) === Number(course.id));
    const msg = `Supprimer le cours « ${course.title} » et ses ${children.length} tutoriel(s) ?`;
    if (!(await this.confirmAction(msg))) { return; }
    try {
      for (const child of children) {
        await firstValueFrom(this.tutorialService.delete(child.id));
        await this.removePdfFromStorage(child.pdf_url);
      }
      await firstValueFrom(this.tutorialService.delete(course.id));
      this.selectedCourse = null;
      this.tutorials = [];
      this.retrieveTutorials();
    } catch (e) {
      console.error(e);
      alert('Erreur : suppression du cours impossible.');
    }
  }







  loadFavorites(): void {
  const userId = 1; // même id que celui utilisé ailleurs dans la page
  this.tutorialService.getFavorites(userId).subscribe({
    next: (data: any) => {
      console.log('Favoris reçus :', data);
      const rows = Array.isArray(data) ? data : [];
      this.favoriteIds = new Set(
        rows
          .map((f: any) => Number(f.tutorial_id ?? f.tutorialId ?? f.tutorial?.id))
          .filter((id: number) => !isNaN(id))
      );
      this.refreshFavorites();
    },
    error: (err) => console.error('Erreur chargement favoris :', err)
  });
}

refreshFavorites(): void {
  this.allItems.forEach((i: any) => (i.isFavorite = this.favoriteIds.has(Number(i.id))));
  this.favoritesList = this.allItems.filter((i: any) => i.isFavorite);
  this.cdr.detectChanges();
}

openFavorites(): void {
  this.selectedCourse = null;
  this.tutorials = [];
  this.showFavorites = true;
  this.loadFavorites();
}

closeFavorites(): void {
  this.showFavorites = false;
}

getCourseTitle(t: any): string {
  const c = this.courses.find((c: any) => Number(c.id) === Number(t.courseId));
  return c ? c.title : '';
}

openFavorite(t: any): void {
  const c = this.courses.find((c: any) => Number(c.id) === Number(t.courseId));
  if (c) {
    this.showFavorites = false;
    this.selectCourse(c);
  }
}







toggleFavorite(tutorial: any) {
  const userId = 1;
  const id = Number(tutorial.id);

  if (tutorial.isFavorite) {
    this.tutorialService.removeFavorite(tutorial.id).subscribe({
      next: () => { this.favoriteIds.delete(id); this.refreshFavorites(); },
      error: (err) => console.error('Erreur :', err)
    });
  } else {
    this.tutorialService.addFavorite(userId, tutorial.id).subscribe({
      next: () => { this.favoriteIds.add(id); this.refreshFavorites(); },
      error: (err) => console.error('Erreur :', err)
    });
  }
}



  
//toggleFavorite(tutorial: any) {
    //// Remplacez '1' par l'ID de l'utilisateur connecté dynamiquement si vous l'avez
    //const userId = 1; 

    //if (tutorial.isFavorite) {
      //this.tutorialService.removeFavorite(tutorial.id).subscribe({
        //next: () => {
          //tutorial.isFavorite = false;
          //console.log('Retiré des favoris');
        //},
        //error: (err) => console.error('Erreur :', err)
      //});
    //} else {
      //this.tutorialService.addFavorite(userId, tutorial.id).subscribe({
        //next: () => {
          //tutorial.isFavorite = true;
          //console.log('Ajouté aux favoris');
        //},
       // error: (err) => console.error('Erreur :', err)
      //});
    //}
  //}





  selectTutorial(tutorial: any) {
    this.selectedTutorial = tutorial;
    
    // Enregistrement dans l'historique
    const userId = 1; // Remplacez par l'ID de l'utilisateur connecté
    this.tutorialService.addToHistory(userId, tutorial.id).subscribe({
      next: () => console.log('Tutoriel ajouté à l\'historique'),
      error: (err) => console.error('Erreur historique :', err)
    });
  }


  loadHistory() {
    // Désactivation temporaire de l'appel backend pour éviter l'erreur 500
    this.historyList = [];
    console.log('Historique ignoré temporairement pour éviter l\'erreur 500.');
  }





  //loadHistory() {
   // //const userId = 1; // Remplacez par l'ID de l'utilisateur connecté
    //const userIdentifier = 1;
    //this.tutorialService.getHistory(userIdentifier).subscribe({
      //next: (data: any) => {
        //this.historyList = data;
        //console.log('Historique chargé :', this.historyList);
      //},
     // error: (err) => {
       // console.error('Erreur lors du chargement de l\'historique :', err);
     // }
   // });
 // }



   // Clic sur "Voir le PDF" : le tutoriel est compté comme consulté
  markPdfViewed(tutorial: any) {
    if (tutorial.isCompleted) { return; } // déjà compté : on ne recompte pas
    const userId = 1; // ID de l'utilisateur connecté

    this.tutorialService.completeTutorial(userId, tutorial.id).subscribe({
      next: () => {
        tutorial.isCompleted = true;
        if (this.selectedCourse) {
          this.loadProgress(this.selectedCourse.id);
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur :', err)
    });
  }

  // Au chargement d'un cours : retrouver les tutoriels déjà consultés
  loadCompletedState() {
    const userId = 1;
    this.tutorialService.getCompletions(userId).subscribe({
      next: (data: any) => {
        const ids = new Set((Array.isArray(data) ? data : []).map((c: any) => Number(c.tutorialId)));
        this.tutorials.forEach((t: any) => {
          t.isCompleted = ids.has(Number(t.id));
        });
        this.updateProgress();
      },
      error: (err) => console.error('Erreur complétions :', err)
    });
  }







    toggleCompletion(tutorial: any) {
    const userId = 1; // ID de l'utilisateur connecté

    const refresh = () => {
      if (this.selectedCourse) { this.loadProgress(this.selectedCourse.id); }
      this.cdr.detectChanges();
    };

    if (tutorial.isCompleted) {
      this.tutorialService.uncompleteTutorial(tutorial.id).subscribe({
        next: () => { tutorial.isCompleted = false; refresh(); },
        error: (err) => console.error('Erreur :', err)
      });
    } else {
      this.tutorialService.completeTutorial(userId, tutorial.id).subscribe({
        next: () => { tutorial.isCompleted = true; refresh(); },
        error: (err) => console.error('Erreur :', err)
      });
    }
  }









  //toggleCompletion(tutorial: any) {
    //const userId = 1; // ID de l'utilisateur connecté

    //if (tutorial.isCompleted) {
      //this.tutorialService.uncompleteTutorial(tutorial.id).subscribe({
        //next: () => {
          //tutorial.isCompleted = false;
          //console.log('Marqué comme non terminé');
        //},
       // error: (err) => console.error('Erreur :', err)
     // });
    //} else {
     // this.tutorialService.completeTutorial(userId, tutorial.id).subscribe({
        //next: () => {
          //tutorial.isCompleted = true;
          //console.log('Marqué comme terminé');
        //},
       // error: (err) => console.error('Erreur :', err)
      //});
   // }
 // }




  rate(tutorial: any, ratingValue: number) {
    const userId = 1; // ID de l'utilisateur connecté

    this.tutorialService.rateTutorial(userId, tutorial.id, ratingValue).subscribe({
      next: () => {
        tutorial.rating = ratingValue;
        console.log('Note enregistrée avec succès !');
      },
      error: (err) => {
        console.error('Erreur lors de la notation :', err);
      }
    });
  }
  
  
  
  
  
    // Calcul local : tutoriels terminés / tutoriels affichés (maximum 100 %)
  updateProgress() {
    const total = this.tutorials.length;
    const done = this.tutorials.filter((t: any) => t.isCompleted).length;
    this.courseProgress = total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
    this.cdr.detectChanges();
  }

  // On garde ce nom pour ne pas modifier les autres appels
  loadProgress(_courseId?: any) {
    this.updateProgress();
  }






  // Poster un commentaire
    postComment(tutorial: any) {
    if (!tutorial.newCommentText || tutorial.newCommentText.trim() === '') return;
    const userId = this.currentUserId;
    const authorName = this.isAdmin ? 'Administrateur' : (this.studentName || 'Étudiant');

    this.tutorialService.addCommentWithAuthor(userId, tutorial.id, tutorial.newCommentText.trim(), authorName).subscribe({
      next: (res: any) => {
        if (!tutorial.comments) tutorial.comments = [];
        tutorial.comments.unshift(res.data);
        tutorial.newCommentText = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur lors de l’ajout du commentaire :', err);
      }
    });
  }

  // Suppression d'un commentaire (admin uniquement)
  removeComment(tutorial: any, comment: any) {
    if (!this.isAdmin) { return; }
    if (!confirm('Supprimer ce commentaire ?')) { return; }

    this.tutorialService.deleteComment(comment.id, 'admin').subscribe({
      next: () => {
        tutorial.comments = (tutorial.comments || []).filter((c: any) => c.id !== comment.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur suppression commentaire :', err);
        alert('Suppression impossible.');
      }
    });
  }


  loadTutorialComments(tutorial: any) {
    this.tutorialService.getComments(tutorial.id).subscribe({
      next: (data: any) => {
        tutorial.comments = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des commentaires :', err);
      }
    });
  }
  
  
  
  
  
  loadNotifications() {
    this.tutorialService.getNotifications().subscribe({
      next: (data: any) => {
        this.notificationsList = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des notifications :', err);
      }
    });
  }


  openChatPdf(tutorial: any): void {
    this.router.navigate(['/chat-pdf', tutorial.id]);
  }


  openMindMap(tutorial: any): void {
    this.router.navigate(['/mindmap', tutorial.id]);
  }



  openComments(tutorial: any): void {
    this.router.navigate(['/comments', tutorial.id]);
  }



}
