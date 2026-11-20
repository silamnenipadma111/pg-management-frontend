import { environment } from '../../environments/environment';
import { Booking, OwnerDashboard, Payment } from './models';

/**
 * Help assistant (replaces the FAQ page). A small, deterministic question matcher over a knowledge base of the
 * customer and owner journeys - no external service, so it works offline and never sends a question anywhere.
 * A few topics are answered with the visitor's own live data (next rent, bookings, owner summary).
 */

export type AssistantRole = 'GUEST' | 'CUSTOMER' | 'OWNER' | 'SUPPORT';
export type LiveTopic = 'NEXT_RENT' | 'MY_BOOKINGS' | 'OWNER_SUMMARY';

export interface AssistantAction {
  label: string;
  /** Page of this website to open. */
  route?: string;
  queryParams?: Record<string, string>;
  /** External link such as mailto: or tel:. */
  href?: string;
}

export interface AssistantReply {
  text: string;
  /** Numbered steps, used when explaining a flow. */
  steps?: string[];
  actions?: AssistantAction[];
  /** Questions offered as one-tap follow-ups. */
  followUps?: string[];
  /** The widget appends live account data for this topic. */
  live?: LiveTopic;
}

interface Topic {
  /** Shown as a one-tap question. */
  question: string;
  /** Who the topic is written for; live topics are only offered to these roles. */
  audience: AssistantRole[];
  /** Lower-case words and phrases that point to this topic. */
  keywords: string[];
  reply: AssistantReply;
}

const SUPPORT_EMAIL = environment.supportEmail;
const EVERYONE: AssistantRole[] = ['GUEST', 'CUSTOMER', 'OWNER', 'SUPPORT'];
const RENTERS: AssistantRole[] = ['GUEST', 'CUSTOMER'];
const OWNERS: AssistantRole[] = ['OWNER'];
const MY_RENTS = '/my-rents';
const OWNER_DASHBOARD = '/owner/dashboard';
const CUSTOMER_CARE = '/customer-care';
const PHRASE_WEIGHT = 3;
const AUDIENCE_BONUS = 0.5;

const Q_BOOK = 'How do I book a bed?';
const Q_AFTER_REQUEST = 'What happens after I send a booking request?';
const Q_PAY = 'How do I pay my rent?';
const Q_NEXT_RENT = 'When is my next rent due?';
const Q_MY_BOOKINGS = 'What is the status of my bookings?';
const Q_CANCEL = 'Can I cancel a booking?';
const Q_LIST_PG = 'How do I list my PG?';
const Q_APPROVE = 'How do I approve booking requests?';
const Q_CASH = 'How do I confirm a cash payment?';
const Q_TODAY = 'What needs my attention today?';
const Q_UPI = 'How do I receive rent by UPI?';
const Q_REMIND = 'How do I remind a tenant about rent?';
const Q_ACCOUNT = 'I cannot sign in or verify my email';
const Q_CONTACT = 'How do I contact support?';

const CONTACT_ACTIONS: AssistantAction[] = [
  { label: `Email ${SUPPORT_EMAIL}`, href: `mailto:${SUPPORT_EMAIL}` },
  { label: 'Request a call back', route: CUSTOMER_CARE }
];

const TOPICS: Topic[] = [
  {
    question: Q_BOOK,
    audience: RENTERS,
    keywords: ['book', 'booking', 'reserve', 'bed', 'room', 'stay', 'how to book', 'book a bed', 'find a pg'],
    reply: {
      text: 'Booking a bed takes a minute:',
      steps: [
        'Sign in as a customer (or create a free account).',
        'Search PGs near you, open one and choose "Go for booking".',
        'Pick an available (green) bed on the floor plan.',
        'Choose daily, weekly, monthly or yearly, the duration and your start date.',
        'Send the request - the bed is held for you while the owner reviews it.',
        'When the owner approves, pay the first rent and the bed is booked.'
      ],
      actions: [{ label: 'Find a PG', route: '/' }],
      followUps: [Q_AFTER_REQUEST, Q_PAY]
    }
  },
  {
    question: Q_AFTER_REQUEST,
    audience: RENTERS,
    keywords: ['after', 'request', 'approval', 'approved', 'pending', 'waiting', 'held', 'blocked', 'confirm', 'confirmed', 'after i send'],
    reply: {
      text: 'The bed is blocked for you and the owner receives your request with your contact details. '
        + 'You get an email as soon as the owner approves or rejects it. After approval the first rent appears '
        + 'under "Upcoming rents" - once it is paid the bed status becomes Booked and your invoice is issued.',
      actions: [{ label: 'My bookings', route: MY_RENTS }],
      followUps: [Q_PAY, Q_CANCEL]
    }
  },
  {
    question: Q_PAY,
    audience: RENTERS,
    keywords: ['pay', 'payment', 'rent', 'upi', 'card', 'net banking', 'netbanking', 'cash', 'gpay', 'google pay', 'phonepe', 'paytm', 'pay rent'],
    reply: {
      text: 'Open "My Bookings & Rents" and choose "Pay now" on your next rent. You can pay by UPI '
        + '(Google Pay, PhonePe, Paytm, BHIM), debit / credit card, net banking or cash.\n'
        + 'Online payments are confirmed instantly. For cash, hand the rent to the owner and send the '
        + 'confirmation - the bed is booked when the owner accepts it. Only the last 4 digits of a card are ever stored.',
      actions: [{ label: 'Upcoming rents', route: MY_RENTS, queryParams: { tab: 'upcoming' } }],
      followUps: [Q_NEXT_RENT, 'Where is my invoice?']
    }
  },
  {
    question: Q_NEXT_RENT,
    audience: ['CUSTOMER'],
    keywords: ['next rent', 'due', 'upcoming', 'how much', 'when is my', 'my rent', 'rent due', 'overdue'],
    reply: {
      text: 'Here is your next rent:',
      live: 'NEXT_RENT',
      actions: [{ label: 'Pay rent', route: MY_RENTS, queryParams: { tab: 'upcoming' } }]
    }
  },
  {
    question: Q_MY_BOOKINGS,
    audience: ['CUSTOMER'],
    keywords: ['my booking', 'my bookings', 'my stay', 'my request', 'status of my', 'booking status'],
    reply: {
      text: 'Here are your bookings:',
      live: 'MY_BOOKINGS',
      actions: [{ label: 'Open my bookings', route: MY_RENTS }]
    }
  },
  {
    question: 'Where is my invoice?',
    audience: RENTERS,
    keywords: ['invoice', 'receipt', 'bill', 'download', 'pdf', 'print', 'payment history'],
    reply: {
      text: 'Every paid rent gets an invoice. Open "My Bookings & Rents", go to "Payment history" and choose '
        + '"Invoice" - you can print it or save it as a PDF.',
      actions: [{ label: 'Payment history', route: MY_RENTS, queryParams: { tab: 'history' } }]
    }
  },
  {
    question: Q_CANCEL,
    audience: RENTERS,
    keywords: ['cancel', 'cancellation', 'refund', 'withdraw', 'change my mind'],
    reply: {
      text: 'Yes. A request that is waiting for approval, or approved but not yet paid, can be cancelled from '
        + '"My bookings" - the bed is released immediately. After a payment has been made, please contact the '
        + 'PG owner (their phone number is on the PG page) or write to us.',
      actions: [{ label: 'My bookings', route: MY_RENTS }, CONTACT_ACTIONS[0]]
    }
  },
  {
    question: 'Will I get rent reminders?',
    audience: RENTERS,
    keywords: ['reminder', 'remind', 'notification', 'notifications', 'sms', 'whatsapp', 'alert', 'forget'],
    reply: {
      text: 'Yes. We remind you 3 days before, 1 day before and on the due date, and again while a rent is '
        + 'overdue - on this website (bell icon) and by email, plus SMS / WhatsApp where enabled. '
        + 'Booking and payment confirmations are emailed to you as well.'
    }
  },
  {
    question: 'Daily, weekly, monthly or yearly - what is the difference?',
    audience: RENTERS,
    keywords: ['daily', 'weekly', 'monthly', 'yearly', 'duration', 'plan', 'installment', 'installments', 'long term', 'short stay'],
    reply: {
      text: 'Daily and weekly stays are paid in one payment. Monthly stays are paid month by month. '
        + 'Yearly stays can be paid once per year or split into 12 monthly installments - you choose the plan '
        + 'while booking and only your next installment is shown as due.'
    }
  },
  {
    question: 'What do the bed colours mean?',
    audience: EVERYONE,
    keywords: ['colour', 'color', 'colours', 'colors', 'green', 'legend', 'unavailable', 'bed status'],
    reply: {
      text: 'Available beds can be booked. Blocked beds have a request waiting for the owner or for payment. '
        + 'Booked beds are occupied. Not available beds were switched off by the owner (for example for maintenance).'
    }
  },
  {
    question: 'How is the rent decided?',
    audience: RENTERS,
    keywords: ['price', 'cost', 'deposit', 'charges', 'fee', 'fees', 'expensive', 'cheap', 'rent amount'],
    reply: {
      text: 'Each owner sets the daily, weekly and monthly rent per room, and the total for your stay is shown '
        + 'before you send the request. For anything outside the rent - for example a deposit - please check '
        + 'with the PG owner; their phone number is on the PG page.'
    }
  },
  {
    question: 'Why do you ask for my location?',
    audience: EVERYONE,
    keywords: ['location', 'gps', 'near', 'nearby', 'near me', 'distance', 'permission', 'address', 'track'],
    reply: {
      text: 'Only to show PGs near you and the distance to each one. Your position stays in this browser '
        + 'session and you can switch it off any time from the menu under your name. You can always search by '
        + 'area, city or PG name instead.'
    }
  },
  {
    question: 'Can I book a PG I stayed at before?',
    audience: ['CUSTOMER'],
    keywords: ['again', 'previous', 'previously', 'stayed', 'rebook', 'same pg', 'suggestion', 'suggestions'],
    reply: {
      text: 'Yes - the PGs you have stayed at appear on your home page under "Your previous stays", '
        + 'with live availability so you can book again in two taps.',
      actions: [{ label: 'Go to home', route: '/' }]
    }
  },
  {
    question: Q_LIST_PG,
    audience: ['GUEST', 'OWNER'],
    keywords: ['list', 'listing', 'register', 'add', 'owner', 'onboard', 'my pg', 'list my pg', 'register pg', 'new pg', 'hostel'],
    reply: {
      text: 'Listing your PG takes a few minutes:',
      steps: [
        'Create a PG owner account and sign in.',
        'Open "Register PG" and enter the name and address - "Use my current location" fills the address for you, '
        + 'and typing the pincode fills city and state.',
        'Upload photos and videos; the first photo becomes the cover.',
        'Tick the facilities you offer.',
        'Add floors, rooms, beds and rent (the quick-add generates them in one go).',
        'Save - your PG is live and customers can send booking requests.'
      ],
      actions: [{ label: 'Register a PG', route: '/owner/register-pg' }],
      followUps: [Q_UPI, Q_APPROVE, 'Can your team register my PG for me?']
    }
  },
  {
    question: 'Can your team register my PG for me?',
    audience: ['GUEST', 'OWNER'],
    keywords: ['team', 'behalf', 'for me', 'assist', 'assisted', 'help me register', 'customer care register'],
    reply: {
      text: `Yes. Write to ${SUPPORT_EMAIL} with your PG details or request a call back and choose `
        + '"Register my PG". Our customer care team registers it for you and emails you a link to set your password.',
      actions: CONTACT_ACTIONS
    }
  },
  {
    question: Q_APPROVE,
    audience: OWNERS,
    keywords: ['approve', 'approval', 'approvals', 'reject', 'accept', 'decline', 'booking request', 'requests', 'new request'],
    reply: {
      text: 'New requests appear in Dashboard > Approvals with the customer\'s name, phone and email. '
        + 'Approve to let the customer pay the first rent, or reject to free the bed again. '
        + 'Both of you receive an email for every decision.',
      actions: [{ label: 'Open approvals', route: OWNER_DASHBOARD, queryParams: { tab: 'approvals' } }],
      followUps: [Q_CASH, Q_TODAY]
    }
  },
  {
    question: Q_CASH,
    audience: OWNERS,
    keywords: ['cash', 'accept cash', 'confirm payment', 'received', 'cash payment', 'not received'],
    reply: {
      text: 'When a customer reports a cash payment it appears in Dashboard > Approvals under '
        + '"Cash payments to accept". Accept it once you have the money - the invoice is issued and the bed is '
        + 'booked. If you did not receive it, choose Reject and the rent becomes due again.',
      actions: [{ label: 'Open approvals', route: OWNER_DASHBOARD, queryParams: { tab: 'approvals' } }]
    }
  },
  {
    question: Q_TODAY,
    audience: OWNERS,
    keywords: ['today', 'summary', 'attention', 'overview', 'how many', 'occupancy', 'vacancy', 'vacant', 'pending', 'available beds'],
    reply: {
      text: 'Here is where your PGs stand right now:',
      live: 'OWNER_SUMMARY',
      actions: [{ label: 'Open dashboard', route: OWNER_DASHBOARD }]
    }
  },
  {
    question: 'How do I mark a bed available or not available?',
    audience: OWNERS,
    keywords: ['mark', 'maintenance', 'switch off', 'bed available', 'not available', 'block a bed', 'close a bed'],
    reply: {
      text: 'Open Dashboard > Availability, choose the PG and click a bed to switch it between Available and '
        + 'Not available. Beds that are blocked or booked by a customer cannot be changed.',
      actions: [{ label: 'Open availability', route: OWNER_DASHBOARD, queryParams: { tab: 'availability' } }]
    }
  },
  {
    question: 'How do I edit my PG, rent or photos?',
    audience: OWNERS,
    keywords: ['edit', 'change', 'update', 'modify', 'photo', 'photos', 'rent change', 'details', 'facilities'],
    reply: {
      text: 'Your registered PGs are on your home page - choose "Edit" under the PG to change details, photos, '
        + 'facilities, rooms, beds and rent. Rooms and beds that already have bookings cannot be removed; '
        + 'mark those beds not available instead.',
      actions: [{ label: 'My PGs', route: '/' }]
    }
  },
  {
    question: Q_UPI,
    audience: OWNERS,
    keywords: ['upi id', 'receive', 'payout', 'settlement', 'bank', 'receive rent', 'get paid', 'my money'],
    reply: {
      text: 'Add your UPI ID (for example yourname@okhdfcbank) in the PG details. Customers who pay by UPI are '
        + 'sent to that ID from their UPI app with the amount filled in. Without a UPI ID they can still pay '
        + 'by card, net banking or cash.',
      actions: [{ label: 'My PGs', route: '/' }]
    }
  },
  {
    question: Q_REMIND,
    audience: OWNERS,
    keywords: ['remind', 'reminder', 'late', 'tenant', 'unpaid', 'collect', 'pending rent', 'overdue rent'],
    reply: {
      text: 'Customers are reminded automatically 3 days before, 1 day before and on the due date, and every '
        + 'few days while a rent is overdue. To nudge someone right now, open Dashboard > Pending rents and '
        + 'choose "Send reminder".',
      actions: [{ label: 'Pending rents', route: OWNER_DASHBOARD, queryParams: { tab: 'rents' } }]
    }
  },
  {
    question: 'How will I know about new bookings and payments?',
    audience: OWNERS,
    keywords: ['know', 'notify', 'notified', 'informed', 'email me', 'alert me'],
    reply: {
      text: 'Every booking request, cancellation and payment is emailed to you and shown under the bell icon, '
        + 'plus SMS / WhatsApp where enabled. You also get an email confirmation for each action you take.'
    }
  },
  {
    question: 'How do I register a PG for an owner?',
    audience: ['SUPPORT'],
    keywords: ['register for', 'owner called', 'behalf', 'support console', 'temporary password'],
    reply: {
      text: 'Open the Support Console, choose "Register PG for an owner", fill in the owner and PG details and '
        + 'save. A new owner receives an email with a link to set their password; the temporary password is '
        + 'shown to you once in case they are on the phone.',
      actions: [{ label: 'Support console', route: '/support' }]
    }
  },
  {
    question: Q_ACCOUNT,
    audience: EVERYONE,
    keywords: ['sign in', 'signin', 'login', 'log in', 'password', 'forgot', 'reset', 'verify', 'verification', 'locked', 'account', 'link expired', 'not received'],
    reply: {
      text: 'A few things to check:',
      steps: [
        'New account? Open the verification link we emailed you (valid 24 hours). From the sign-in page you can request a new one.',
        'Forgot the password? Use "Forgot password" - the reset link is valid for 30 minutes.',
        'After 5 wrong passwords the account is locked for 15 minutes to keep it safe.',
        'Choose the right tab - customer or PG owner - for your account.'
      ],
      actions: [{ label: 'Sign in', route: '/signin' }, { label: 'Reset password', route: '/forgot-password' }]
    }
  },
  {
    question: 'Is my account and payment information safe?',
    audience: EVERYONE,
    keywords: ['safe', 'secure', 'security', 'privacy', 'data', 'cvv', 'card details', 'hack'],
    reply: {
      text: 'Yes. You stay signed in through a secure, HttpOnly cookie that scripts cannot read, signing out '
        + 'ends the session on our servers, and repeated wrong passwords lock the account temporarily. '
        + 'Card numbers and CVV are never stored - only the last 4 digits appear on your invoice.'
    }
  },
  {
    question: Q_CONTACT,
    audience: EVERYONE,
    keywords: ['contact', 'support', 'help', 'call', 'phone', 'email', 'human', 'agent', 'customer care', 'talk', 'complaint', 'enquiry', 'inquiry'],
    reply: {
      text: `Write to ${SUPPORT_EMAIL} for any enquiry - bookings, payments, registering a PG or your account - `
        + 'or request a call back and our team will phone you.',
      actions: CONTACT_ACTIONS
    }
  }
];

const SUGGESTIONS: Record<AssistantRole, string[]> = {
  GUEST: [Q_BOOK, Q_PAY, Q_LIST_PG, Q_ACCOUNT, Q_CONTACT],
  CUSTOMER: [Q_NEXT_RENT, Q_MY_BOOKINGS, Q_BOOK, Q_PAY, Q_CANCEL],
  OWNER: [Q_TODAY, Q_APPROVE, Q_CASH, Q_REMIND, Q_LIST_PG],
  SUPPORT: ['How do I register a PG for an owner?', Q_LIST_PG, Q_BOOK, Q_CONTACT]
};

const GREETINGS = new Set(['hi', 'hello', 'hey', 'hii', 'namaste', 'good morning', 'good afternoon', 'good evening']);
const THANKS = ['thank', 'thanks', 'thank you', 'great', 'awesome'];

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function score(topic: Topic, question: string, words: Set<string>, role: AssistantRole): number {
  let total = 0;
  for (const keyword of topic.keywords) {
    if (keyword.includes(' ')) {
      total += question.includes(keyword) ? PHRASE_WEIGHT : 0;
    } else if (words.has(keyword)) {
      total += 1;
    }
  }
  return total > 0 && topic.audience.includes(role) ? total + AUDIENCE_BONUS : total;
}

/** One-tap questions offered to a visitor of this role. */
export function suggestionsFor(role: AssistantRole): string[] {
  return SUGGESTIONS[role];
}

export function greetingFor(role: AssistantRole, name?: string): AssistantReply {
  const who = name ? `, ${name.split(' ')[0]}` : '';
  const intro: Record<AssistantRole, string> = {
    GUEST: 'I can explain how booking a bed or listing your PG works.',
    CUSTOMER: 'I can check your next rent and bookings, or explain booking and payments.',
    OWNER: 'I can summarise what needs your attention, or explain approvals, cash payments and reminders.',
    SUPPORT: 'I can explain the customer and owner journeys and the support console.'
  };
  return { text: `Hello${who}! I am the PG-STAY assistant. ${intro[role]}`, followUps: SUGGESTIONS[role] };
}

/** Answers a free-text question for a visitor of the given role. */
export function answer(question: string, role: AssistantRole): AssistantReply {
  const text = normalise(question);
  if (!text) {
    return greetingFor(role);
  }
  if (GREETINGS.has(text)) {
    return greetingFor(role);
  }
  const exact = TOPICS.find(topic => normalise(topic.question) === text && isOffered(topic, role));
  if (exact) {
    return exact.reply;
  }
  const words = new Set(text.split(' '));
  let best: Topic | undefined;
  let bestScore = 0;
  for (const topic of TOPICS) {
    const value = isOffered(topic, role) ? score(topic, text, words, role) : 0;
    if (value > bestScore) {
      best = topic;
      bestScore = value;
    }
  }
  if (best) {
    return best.reply;
  }
  if (THANKS.some(word => text.includes(word))) {
    return { text: 'You are welcome! Anything else I can help with?', followUps: SUGGESTIONS[role].slice(0, 3) };
  }
  return {
    text: 'I do not have an answer for that yet. Try one of these, or write to our team and a person will help you.',
    followUps: SUGGESTIONS[role],
    actions: CONTACT_ACTIONS
  };
}

/** Topics answered from the visitor's own account are only offered to the matching role. */
function isOffered(topic: Topic, role: AssistantRole): boolean {
  return !topic.reply.live || topic.audience.includes(role);
}

// ---------------------------------------------------------------- live answers

const rupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function formatDate(isoDate: string): string {
  return dayMonth.format(new Date(`${isoDate}T00:00:00`));
}

export function describeNextRent(upcoming: Payment[]): string {
  if (!upcoming.length) {
    return 'You have no rent due right now.';
  }
  return upcoming.map(p => {
    const due = p.status === 'SUBMITTED' ? 'cash payment waiting for the owner to accept' : `due on ${formatDate(p.dueDate)}`;
    const late = p.overdue ? ' (overdue)' : '';
    return `Rs. ${rupees.format(p.amount)} for ${p.pgName}, room ${p.roomNumber}-${p.bedLabel} - ${due}${late}.`;
  }).join('\n');
}

const BOOKING_STATUS_TEXT: Record<string, string> = {
  REQUESTED: 'waiting for the owner to approve',
  APPROVED: 'approved - pay the first rent to confirm',
  BOOKED: 'booked',
  REJECTED: 'rejected by the owner',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

export function describeBookings(bookings: Booking[]): string {
  if (!bookings.length) {
    return 'You have not made a booking yet. Search for a PG and send your first request.';
  }
  return bookings.slice(0, 5).map(b =>
    `${b.pgName}, room ${b.roomNumber}-${b.bedLabel} from ${formatDate(b.startDate)}: ${BOOKING_STATUS_TEXT[b.status] ?? b.status}.`
  ).join('\n');
}

export function describeOwnerSummary(dashboard: OwnerDashboard): string {
  const t = dashboard.totals;
  if (!dashboard.pgs.length) {
    return 'You have not registered a PG yet. Open "Register PG" to list your first one.';
  }
  return [
    `${dashboard.pgs.length} PG(s), ${t.totalBeds} beds - ${t.occupancyPercent}% occupied, ${t.availableBeds} available.`,
    `${t.pendingApprovals} booking request(s) and ${t.pendingPaymentConfirmations} cash payment(s) are waiting for you.`,
    `Pending rent: Rs. ${rupees.format(t.pendingRentAmount)}${t.overdueCount ? `, ${t.overdueCount} overdue` : ''}.`
  ].join('\n');
}
