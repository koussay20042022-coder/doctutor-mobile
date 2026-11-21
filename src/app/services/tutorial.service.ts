import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
//const baseUrl = environment.apiUrl;

// Remplacez par l'adresse IP de votre PC si vous testez sur un vrai téléphone, ou localhost pour le navigateur
//const baseUrl = 'http://localhost:8080/api/tutorials';

const baseUrl = environment.apiUrl;                          // .../api/tutorials
const apiRoot = environment.apiUrl.replace(/\/tutorials$/, ''); // .../api

@Injectable({
  providedIn: 'root'
})
export class TutorialService {

  constructor(private http: HttpClient) { }

  getAll(): Observable<any> {
    return this.http.get(baseUrl);
  }
  // >>> AJOUTEZ CETTE MÉTHODE POUR LA RECHERCHE <<<
  searchTutorials(query: string): Observable<any> {
    const params = new HttpParams().set('q', query);
    return this.http.get(`${baseUrl}/search`, { params });
  }

  get(id: any): Observable<any> {
    return this.http.get(`${baseUrl}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(baseUrl, data);
    //return this.http.post('http://localhost:8080/api/tutorials', data);
  }

  update(id: any, data: any): Observable<any> {
    return this.http.put(`${baseUrl}/${id}`, data);
  }

  delete(id: any): Observable<any> {
    return this.http.delete(`${baseUrl}/${id}`);
  }

  findByTitle(title: any): Observable<any> {
    return this.http.get(`${baseUrl}?title=${title}`);
  }

  // Récupérer la liste des favoris d'un utilisateur
  getFavorites(userId: any): Observable<any> {
    return this.http.get(`${apiRoot}/favorites?userId=${userId}`);
  }

  // Ajouter un tutoriel aux favoris
  addFavorite(userId: any, tutorialId: any): Observable<any> {
    return this.http.post(`${apiRoot}/favorites`, { userId, tutorialId });
  }

  // Supprimer un tutoriel des favoris
  removeFavorite(tutorialId: any): Observable<any> {
    return this.http.delete(`${apiRoot}/favorites/${tutorialId}`);
  }



  // Enregistrer un tutoriel dans l'historique
  addToHistory(userId: any, tutorialId: any): Observable<any> {
    return this.http.post(`${apiRoot}/history`, { userId, tutorialId });
  }

  // Récupérer l'historique des tutoriels
  getHistory(userId: any): Observable<any> {
    return this.http.get(`${apiRoot}/history?userId=${userId}`);
  }




  // Marquer un tutoriel comme terminé
  completeTutorial(userId: any, tutorialId: any): Observable<any> {
    return this.http.post(`${apiRoot}/completions`, { userId, tutorialId });
  }

  // Retirer le statut "terminé"
  uncompleteTutorial(tutorialId: any): Observable<any> {
    return this.http.delete(`${apiRoot}/completions/${tutorialId}`);
  }

  // Récupérer la liste des tutoriels terminés
  getCompletions(userId: any): Observable<any> {
    return this.http.get(`${apiRoot}/completions?userId=${userId}`);
  }



  // Noter ou modifier la note d'un tutoriel
  rateTutorial(userId: any, tutorialId: any, rating: number): Observable<any> {
    return this.http.post(`${apiRoot}/ratings`, { userId, tutorialId, rating });
  }

  // Récupérer la note d'un utilisateur pour un tutoriel
  getRating(userId: any, tutorialId: any): Observable<any> {
    return this.http.get(`${apiRoot}/ratings?userId=${userId}&tutorialId=${tutorialId}`);
  }


  // Récupérer le pourcentage de progression d'un cours
  getProgress(userId: any, courseId: any): Observable<any> {
    return this.http.get(`${apiRoot}/progression?userId=${userId}&courseId=${courseId}`);
  }



  // Ajouter un commentaire à un tutoriel
  addComment(userId: any, tutorialId: any, text: string): Observable<any> {
    return this.http.post(`${apiRoot}/comments`, { userId, tutorialId, text });
  }

  // Récupérer les commentaires d'un tutoriel
  getComments(tutorialId: any): Observable<any> {
    return this.http.get(`${apiRoot}/comments?tutorialId=${tutorialId}`);
  }





  // Récupérer toutes les notifications
  //getNotifications(): Observable<any> {
    //return this.http.get(`${baseUrl}/notifications`);
  //}


  getNotifications(): Observable<any> {
    return this.http.get(`${apiRoot}/notifications`);
  }

  // Créer une notification (ex: lors de l'ajout d'un cours)
  createNotification(title: string, message: string, type: string = 'update'): Observable<any> {
    return this.http.post(`${apiRoot}/notifications`, { title, message, type });
  }



  generateQuiz(data: any): Observable<any> {
    //return this.http.post(`${baseUrl}/ai/quiz`, data);
    return this.http.post(`${apiRoot}/ai/quiz`, data);
  }

  saveQuizResult(resultData: any): Observable<any> {
    //return this.http.post(`${baseUrl}/ai/quiz/result`, resultData);
    return this.http.post(`${apiRoot}/ai/quiz/result`, resultData);
  }



  summarizeText(data: any): Observable<any> {
    //return this.http.post(`${baseUrl}/ai/summarize`, data);
    return this.http.post(`${apiRoot}/ai/summarize`, data);
  }


  chatWithPdf(data: any): Observable<any> {
    return this.http.post(`${apiRoot}/ai/chat-pdf`, data);
  }

  generateMindMap(data: any): Observable<any> {
    return this.http.post(`${apiRoot}/ai/mindmap`, data);
  }




  // Ajouter un commentaire avec le nom de l'auteur
  addCommentWithAuthor(userId: any, tutorialId: any, text: string, authorName: string): Observable<any> {
    return this.http.post(`${apiRoot}/comments`, { userId, tutorialId, text, authorName });
  }

  // Supprimer un commentaire (admin)
  deleteComment(id: any, role: string): Observable<any> {
    return this.http.delete(`${apiRoot}/comments/${id}?role=${role}`);
  }



    // Enregistre / retrouve l'étudiant à partir de son e-mail
  registerStudent(name: string, email: string): Observable<any> {
    return this.http.post(`${apiRoot}/students`, { name, email });
  }

  // Statistiques admin
  getCourseStats(courseId: any): Observable<any> {
    return this.http.get(`${apiRoot}/stats/course?courseId=${courseId}&role=admin`);
  }

  getRatingStats(courseId: any): Observable<any> {
    return this.http.get(`${apiRoot}/stats/ratings?courseId=${courseId}&role=admin`);
  }




  getTutorialDoneStats(tutorialId: any): Observable<any> {
    return this.http.get(`${apiRoot}/stats/tutorial-completions?tutorialId=${tutorialId}&role=admin`);
  }

  getTutorialRatingStats(tutorialId: any): Observable<any> {
    return this.http.get(`${apiRoot}/stats/tutorial-ratings?tutorialId=${tutorialId}&role=admin`);
  }




}

