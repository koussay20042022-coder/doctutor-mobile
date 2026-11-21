import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent]
})
export class HomePage {
  constructor(private router: Router) {}

  // Entrée étudiant
  selectRole(role: string) {
    if (role === 'student') {
      localStorage.setItem('userRole', 'student');
      this.router.navigate(['/tutorials']);
    }
  }

  // Connexion administrateur avec le code saisi dans le champ
  loginAdmin(code: string) {
    if ((code || '').trim() === 'admindoc') {
      localStorage.setItem('userRole', 'admin');
      this.router.navigate(['/tutorials']);
    } else {
      alert('Code incorrect !');
    }
  }
}
