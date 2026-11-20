/** Validation rules shared by the forms. They mirror the server (ValidationRules / StrongPasswordValidator). */

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;
/** Indian mobile number, optionally prefixed with +91. */
export const MOBILE_PATTERN = /^(?:\+91[ -]?)?[6-9]\d{9}$/;
/** Any phone number: mobile, landline or toll-free. */
export const PHONE_PATTERN = /^[0-9+ -]{10,15}$/;
export const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,99}$/u;
export const PINCODE_PATTERN = /^\d{6}$/;
export const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9.]{2,64}$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
/** BCrypt only uses the first 72 bytes of a password. */
const PASSWORD_MAX_BYTES = 72;
const MIN_IDENTITY_FRAGMENT = 4;

/** Passwords that pass the character rules but are the first ones an attacker tries. */
const COMMON_PASSWORDS = new Set([
  'password@123', 'password@1', 'password1!', 'password123!', 'passw0rd!', 'p@ssw0rd', 'p@ssword1', 'p@ssw0rd1',
  'admin@123', 'admin@1234', 'welcome@123', 'welcome@1', 'qwerty@123', 'qwerty123!', 'abc@1234', 'abcd@1234',
  'test@1234', 'test@123', 'pass@1234', 'pass@123', 'india@123', 'iloveyou@1', 'changeme@1', 'letmein@1',
  'monkey@123', 'dragon@123', 'hello@123', 'user@1234'
]);

export interface PasswordRule {
  /** Translation key of the rule shown in the checklist. */
  key: string;
  ok: boolean;
}

export interface PasswordCheck {
  rules: PasswordRule[];
  valid: boolean;
  /** 0 (empty) to 4 (strong), for the strength meter. */
  score: number;
}

function hasIdentityFragment(password: string, identity: string[]): boolean {
  const lower = password.toLowerCase();
  return identity
    .flatMap(value => value.toLowerCase().split(/[\s@]+/))
    .some(part => part.length >= MIN_IDENTITY_FRAGMENT && lower.includes(part));
}

/**
 * Checks a password against the policy.
 * @param identity the user's name and email; the password must not contain them
 */
export function checkPassword(password: string, identity: string[] = []): PasswordCheck {
  const value = password ?? '';
  const bytes = new TextEncoder().encode(value).length;
  const rules: PasswordRule[] = [
    { key: 'pwd.length', ok: value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX && bytes <= PASSWORD_MAX_BYTES },
    { key: 'pwd.upper', ok: /\p{Lu}/u.test(value) },
    { key: 'pwd.lower', ok: /\p{Ll}/u.test(value) },
    { key: 'pwd.digit', ok: /\d/.test(value) },
    { key: 'pwd.special', ok: /[^\p{L}\p{N}\s]/u.test(value) },
    { key: 'pwd.noSpaces', ok: value.length > 0 && !/\s/.test(value) },
    { key: 'pwd.notCommon', ok: value.length > 0 && !COMMON_PASSWORDS.has(value.toLowerCase()) && !hasIdentityFragment(value, identity) }
  ];
  const passed = rules.filter(rule => rule.ok).length;
  const valid = passed === rules.length;
  let score = 0;
  if (value.length > 0) {
    score = Math.max(1, Math.min(3, Math.floor((passed * 3) / rules.length)));
    if (valid) {
      score = value.length >= 12 ? 4 : 3;
    }
  }
  return { rules, valid, score };
}
