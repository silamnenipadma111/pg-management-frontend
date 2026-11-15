import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n.service';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <h1>{{ 'faq.title' | t }}</h1>
    @for (f of faqs; track f.q) {
      <details class="card pad faq"><summary>{{ f.q }}</summary><p>{{ f.a }}</p></details>
    }
  `
})
export class FaqComponent {
  faqs = [
    { q: 'How do I book a bed?', a: 'Sign in as a customer, open a PG, tap "Go for booking", choose an available (green) bed, pick daily / weekly / monthly / yearly and send the request.' },
    { q: 'What happens after I send a booking request?', a: 'The bed is blocked for you and the owner gets your request with your contact details. Once the owner approves, you can pay the rent from "My Bookings & Rents".' },
    { q: 'When is my bed confirmed?', a: 'After you pay and the owner accepts the payment, the bed status changes to Booked and an invoice is generated.' },
    { q: 'Can I pay a yearly booking every month?', a: 'Yes. For yearly bookings choose "Pay monthly" - every month appears under Upcoming rents.' },
    { q: 'Where can I see my upcoming rents and invoices?', a: 'Open "My Bookings & Rents": Upcoming rents lists the dues and Payment history has all paid rents with downloadable invoices.' },
    { q: 'Can I cancel a request?', a: 'Yes, requests waiting for approval or payment can be cancelled. The bed is released immediately.' },
    { q: 'I am a PG owner. How do I list my PG?', a: "Sign up as an owner and use 'Register PG's' to add photos, videos, facilities, floors, rooms, beds and rent. You can also call customer care and our team will register it for you." },
    { q: 'How do owners approve bookings and payments?', a: 'Owners see booking requests and submitted payments in Dashboards → Approvals, and pending / overdue rents in Pending rents.' },
    { q: 'Why do you ask for my location?', a: 'Only to show PGs near you. Location is used in your browser session and you can always search by area or city instead.' }
  ];
}
