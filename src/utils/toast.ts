import { en } from '../i18n';

const enErrors = en.errors;

// Toast message *keys*. Maps each name to itself (the i18n key in the
// `errors` namespace). Call sites use `ToastMessages.AREA_DELETED`; the value
// is the key `'AREA_DELETED'`, which `showSuccessToast`/`showErrorToast`
// resolve to the active language via i18n. Source of the key set is the EN
// `errors.json` so the two can never drift.
type ErrorKey = keyof typeof enErrors;

export const ToastMessages = Object.fromEntries((Object.keys(enErrors) as ErrorKey[]).map(key => [key, key])) as {
  [K in ErrorKey]: K;
};

/**
 * Toast interface for cross-platform compatibility. Any host (sonner on web,
 * a custom RN toast queue on mobile) implements this shape.
 */
export interface Toast {
  error: (message: string) => void | string | number;
  success: (message: string) => void | string | number;
  info: (message: string) => void | string | number;
  warning: (message: string) => void | string | number;
}

/**
 * Minimal i18next-shaped translator source. Both nicoflow-frontend and
 * nicoflow-mobile hand in their real `i18next` default-export instance —
 * this is typed narrowly to just the method used here so the shared package
 * never depends on `i18next` itself.
 */
export interface I18nLike {
  getFixedT: (lng: string | null, ns: string) => (key: string) => string;
}

type ErrorMessageKey = keyof typeof enErrors;

const isErrorMessageKey = (key: string): key is ErrorMessageKey => Object.prototype.hasOwnProperty.call(enErrors, key);

export function isFetchBaseQueryError(error: unknown): error is { status: unknown } {
  return typeof error === 'object' && error != null && 'status' in error;
}

export function isErrorWithMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error != null && 'message' in error && typeof error.message === 'string';
}

// Extracts the error code string from whatever shape arrives.
// Priority order:
// 1. Unwrapped backend envelope: { error: { code, message } }  — from transformErrorResponse: e => e.data
// 2. FetchBaseQueryError with data envelope: { status, data: { error: { code } } }
// 3. FetchBaseQueryError with string error field (network errors)
// 4. Plain string
// 5. { message: string }
export function getApiErrorCode(err: unknown): string | undefined {
  if (err === null || typeof err !== 'object') {
    return typeof err === 'string' ? err : undefined;
  }

  const obj = err as Record<string, unknown>;

  if (typeof obj['error'] === 'object' && obj['error'] !== null) {
    const inner = obj['error'] as Record<string, unknown>;
    if (typeof inner['code'] === 'string') return inner['code'];
  }

  if ('status' in obj && typeof obj['data'] === 'object' && obj['data'] !== null) {
    const data = obj['data'] as Record<string, unknown>;
    if (typeof data['error'] === 'object' && data['error'] !== null) {
      const inner = data['error'] as Record<string, unknown>;
      if (typeof inner['code'] === 'string') return inner['code'];
    }
    if (typeof data['error'] === 'string') return data['error'];
  }

  if ('status' in obj && typeof obj['error'] === 'string') return obj['error'];

  if (typeof obj['message'] === 'string') return obj['message'];

  return undefined;
}

/**
 * Builds the toast helpers bound to a given i18next instance. Each host app
 * calls this once with its own `i18n` default export and gets back
 * `showErrorToast`/`showSuccessToast`/etc. resolving through that instance's
 * active language.
 */
export function createToastHelpers(i18n: I18nLike) {
  const tErrors = i18n.getFixedT(null, 'errors');
  const resolveErrorMessage = (key: ErrorMessageKey): string => tErrors(key);
  const resolveToastMessage = (msg: string): string => (isErrorMessageKey(msg) ? resolveErrorMessage(msg) : msg);

  function showErrorToast(err: unknown, toast: Toast) {
    const code = getApiErrorCode(err);
    const text = code && isErrorMessageKey(code) ? resolveErrorMessage(code) : resolveErrorMessage('GENERAL_ERROR');
    toast.error(text);
  }

  function showSuccessToast(msg: string, toast: Toast) {
    return toast.success(resolveToastMessage(msg));
  }

  function showInfoToast(msg: string, toast: Toast) {
    return toast.info(resolveToastMessage(msg));
  }

  function showWarningToast(msg: string, toast: Toast) {
    return toast.warning(resolveToastMessage(msg));
  }

  return {
    showErrorToast,
    showSuccessToast,
    showInfoToast,
    showWarningToast,
    resolveErrorMessage,
    resolveToastMessage,
  };
}
