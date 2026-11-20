import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { ApiService } from '../core/api.service';
import {
  AssistantAction, AssistantReply, AssistantRole, LiveTopic, answer, describeBookings, describeNextRent,
  describeOwnerSummary, greetingFor, suggestionsFor
} from '../core/assistant';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n.service';
import { UiService } from '../core/ui.service';
import { IconComponent } from './icon.component';

interface ChatMessage {
  id: number;
  from: 'assistant' | 'user';
  text: string;
  steps?: string[];
  actions?: AssistantAction[];
}

const MAX_QUESTION_LENGTH = 300;

/**
 * Help assistant: a chat widget that explains the customer and owner journeys and answers basic enquiries
 * (it replaces the FAQ page). Signed-in visitors can also ask about their own rent, bookings and PGs.
 */
@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [FormsModule, TranslatePipe, IconComponent],
  host: { '(document:keydown.escape)': 'ui.assistantOpen.set(false)' },
  template: `
    <button type="button" class="assistant-fab no-print" (click)="ui.assistantOpen.set(!ui.assistantOpen())"
            [attr.aria-label]="(ui.assistantOpen() ? 'common.close' : 'assistant.open') | t" [attr.aria-expanded]="ui.assistantOpen()">
      <app-icon [name]="ui.assistantOpen() ? 'x' : 'chat'" [size]="24" />
    </button>

    @if (ui.assistantOpen()) {
      <section class="assistant-panel no-print" role="dialog" [attr.aria-label]="'assistant.title' | t">
        <header class="assistant-head">
          <span class="medallion"><app-icon name="lotus" [size]="20" /></span>
          <div>
            <p class="eyebrow">{{ 'assistant.eyebrow' | t }}</p>
            <h3 class="display">{{ 'assistant.title' | t }}</h3>
          </div>
          <button type="button" class="icon-btn" (click)="ui.assistantOpen.set(false)" [attr.aria-label]="'common.close' | t">
            <app-icon name="x" [size]="18" />
          </button>
        </header>

        <div class="assistant-log" #log aria-live="polite">
          @for (m of messages(); track m.id) {
            <div class="bubble" [class.mine]="m.from === 'user'">
              <p class="pre">{{ m.text }}</p>
              @if (m.steps) {
                <ol>
                  @for (step of m.steps; track step) { <li>{{ step }}</li> }
                </ol>
              }
              @if (m.actions) {
                <div class="bubble-actions">
                  @for (action of m.actions; track action.label) {
                    @if (action.href) {
                      <a class="btn btn-outline btn-sm" [href]="action.href">{{ action.label }}</a>
                    } @else {
                      <button type="button" class="btn btn-outline btn-sm" (click)="open(action)">{{ action.label }}</button>
                    }
                  }
                </div>
              }
            </div>
          }
          @if (loading()) {
            <div class="bubble typing" [attr.aria-label]="'common.loading' | t"><span></span><span></span><span></span></div>
          }
        </div>

        <div class="assistant-chips">
          @for (question of chips(); track question) {
            <button type="button" class="chip" (click)="ask(question)">{{ question }}</button>
          }
        </div>

        <form class="assistant-input" (ngSubmit)="submit()">
          <label class="sr-only" for="assistant-question">{{ 'assistant.placeholder' | t }}</label>
          <input id="assistant-question" name="question" [(ngModel)]="draft" [maxlength]="maxLength" autocomplete="off"
                 [placeholder]="'assistant.placeholder' | t" />
          <button type="submit" class="icon-btn solid" [disabled]="!draft.trim()" [attr.aria-label]="'assistant.send' | t">
            <app-icon name="send" [size]="18" />
          </button>
        </form>
      </section>
    }
  `
})
export class AssistantComponent {
  readonly ui = inject(UiService);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');

  readonly maxLength = MAX_QUESTION_LENGTH;
  readonly messages = signal<ChatMessage[]>([]);
  readonly chips = signal<string[]>([]);
  readonly loading = signal(false);
  draft = '';

  private readonly role = computed<AssistantRole>(() => this.auth.role() ?? 'GUEST');
  private greetedAs: AssistantRole | null = null;
  private nextId = 1;

  constructor() {
    // greet when the panel opens, and again when the visitor signs in / out (the answers depend on the role)
    effect(() => {
      const role = this.role();
      if (this.ui.assistantOpen() && this.greetedAs !== role) {
        this.greetedAs = role;
        this.messages.set([]);
        this.reply(greetingFor(role, this.auth.user()?.name));
      }
    });
    effect(() => {
      this.messages();
      this.loading();
      const element = this.log()?.nativeElement;
      if (element) {
        queueMicrotask(() => (element.scrollTop = element.scrollHeight));
      }
    });
  }

  submit(): void {
    const question = this.draft.trim();
    if (question) {
      this.draft = '';
      this.ask(question);
    }
  }

  ask(question: string): void {
    this.push({ from: 'user', text: question });
    this.reply(answer(question, this.role()));
  }

  open(action: AssistantAction): void {
    if (action.route) {
      void this.router.navigate([action.route], { queryParams: action.queryParams });
      this.ui.assistantOpen.set(false);
    }
  }

  private reply(reply: AssistantReply): void {
    this.push({ from: 'assistant', text: reply.text, steps: reply.steps, actions: reply.live ? undefined : reply.actions });
    this.chips.set(reply.followUps ?? suggestionsFor(this.role()));
    if (reply.live) {
      this.answerLive(reply.live, reply.actions);
    }
  }

  /** Answers from the visitor's own account data. */
  private answerLive(topic: LiveTopic, actions?: AssistantAction[]): void {
    this.loading.set(true);
    this.liveText(topic).subscribe({
      next: text => {
        this.loading.set(false);
        this.push({ from: 'assistant', text, actions });
      },
      error: () => {
        this.loading.set(false);
        this.push({ from: 'assistant', text: 'I could not load that right now. Please try again in a moment.', actions });
      }
    });
  }

  private liveText(topic: LiveTopic): Observable<string> {
    switch (topic) {
      case 'NEXT_RENT':
        return this.api.myPayments('upcoming').pipe(map(describeNextRent));
      case 'MY_BOOKINGS':
        return this.api.myBookings().pipe(map(describeBookings));
      default:
        return this.api.dashboard().pipe(map(describeOwnerSummary));
    }
  }

  private push(message: Omit<ChatMessage, 'id'>): void {
    this.messages.update(list => [...list, { ...message, id: this.nextId++ }]);
  }
}
