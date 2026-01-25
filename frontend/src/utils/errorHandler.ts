/**
 * Error Handler Utility
 * Centralizes error handling and provides user-friendly error messages
 */

import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  statusCode?: number;
}

export interface ErrorResponse {
  error?: string;
  message?: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  retryAfter?: number;
}

/**
 * Error messages mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'INVALID_CREDENTIALS': 'Les identifiants sont incorrects. Vérifiez votre nom d\'utilisateur/email et votre mot de passe',
  'USER_NOT_FOUND': 'Aucun compte trouvé avec ces identifiants',
  'USER_BLOCKED': 'Votre compte a été bloqué. Contactez le support.',
  'ACCOUNT_DISABLED': 'Votre compte a été désactivé',
  'EMAIL_ALREADY_EXISTS': 'Cet email est déjà utilisé',
  'USERNAME_ALREADY_EXISTS': 'Ce nom d\'utilisateur est déjà pris',
  'INVALID_TOKEN': 'Session expirée. Veuillez vous reconnecter.',
  'TOKEN_EXPIRED': 'Votre session a expiré. Veuillez vous reconnecter.',
  'ACCESS_TOKEN_EXPIRED': 'Session expirée. Reconnexion en cours...',
  'REFRESH_TOKEN_EXPIRED': 'Votre session a expiré. Veuillez vous reconnecter.',
  'REFRESH_TOKEN_REUSED': 'Activité suspecte détectée. Veuillez vous reconnecter.',
  'INVALID_REFRESH_TOKEN': 'Session invalide. Veuillez vous reconnecter.',
  
  // Validation errors
  'VALIDATION_ERROR': 'Veuillez vérifier les informations saisies',
  'INVALID_EMAIL': 'Adresse email invalide',
  'INVALID_PASSWORD': 'Le mot de passe doit contenir au moins 6 caractères',
  'PASSWORD_TOO_WEAK': 'Le mot de passe est trop faible',
  'PASSWORDS_DO_NOT_MATCH': 'Les mots de passe ne correspondent pas',
  'INVALID_AGE': 'L\'âge doit être entre 13 et 25 ans',
  'REQUIRED_FIELD': 'Ce champ est requis',
  
  // Rate limiting & Security
  'TOO_MANY_REQUESTS': 'Trop de tentatives. Veuillez réessayer plus tard.',
  'RATE_LIMIT_EXCEEDED': 'Limite de requêtes dépassée. Ralentissez un peu.',
  'BRUTE_FORCE_DETECTED': 'Trop de tentatives échouées. Compte temporairement bloqué.',
  'CSRF_INVALID': 'Erreur de sécurité. Veuillez rafraîchir la page.',
  
  // Network errors
  'NETWORK_ERROR': 'Erreur de connexion. Vérifiez votre connexion internet.',
  'TIMEOUT_ERROR': 'La requête a pris trop de temps. Veuillez réessayer.',
  'SERVER_ERROR': 'Erreur serveur. Veuillez réessayer plus tard.',
  'SERVICE_UNAVAILABLE': 'Service temporairement indisponible',
  
  // Generic
  'UNKNOWN_ERROR': 'Une erreur inattendue s\'est produite',
  'INTERNAL_ERROR': 'Erreur interne. Veuillez réessayer.',
};

/**
 * Extract error information from various error types
 */
export function extractErrorInfo(error: unknown): ApiError {
  // Axios error
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ErrorResponse>;
    
    const statusCode = axiosError.response?.status;
    const data = axiosError.response?.data;
    
    // Extract message first to check for specific error patterns
    const message = data?.error || data?.message || axiosError.message;
    
    // Extract error code - check message content for specific patterns
    let code = data?.code;
    
    if (!code) {
      // Check message content for specific error patterns (case insensitive)
      const messageLower = typeof message === 'string' ? message.toLowerCase() : '';
      
      if (messageLower.includes('identifiants invalides')) {
        code = 'INVALID_CREDENTIALS';
      } else if (messageLower.includes('bloqué') || messageLower.includes('bloque')) {
        code = 'USER_BLOCKED';
      } else if (statusCode === 401) {
        code = 'INVALID_CREDENTIALS';
      } else if (statusCode === 403) {
        code = messageLower.includes('bloqué') || messageLower.includes('bloque') 
          ? 'USER_BLOCKED' 
          : 'ACCESS_DENIED';
      } else if (statusCode === 404) {
        code = 'NOT_FOUND';
      } else if (statusCode === 429) {
        code = 'TOO_MANY_REQUESTS';
      } else if (statusCode === 500) {
        code = 'SERVER_ERROR';
      } else if (statusCode === 400) {
        // Pour les erreurs 400, on essaie de détecter le type
        if (messageLower.includes('identifiants')) {
          code = 'INVALID_CREDENTIALS';
        } else {
          code = 'VALIDATION_ERROR';
        }
      } else {
        code = 'UNKNOWN_ERROR';
      }
    }
    
    // Handle validation errors
    if (data?.errors && Array.isArray(data.errors)) {
      const firstError = data.errors[0];
      return {
        message: firstError.message,
        code: 'VALIDATION_ERROR',
        field: firstError.field,
        statusCode
      };
    }
    
    return {
      message,
      code,
      statusCode
    };
  }
  
  // Standard Error
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR'
    };
  }
  
  // String error
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'UNKNOWN_ERROR'
    };
  }
  
  // Unknown error type
  return {
    message: 'Une erreur inattendue s\'est produite',
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  const errorInfo = extractErrorInfo(error);
  
  // Use predefined message if available
  if (errorInfo.code && ERROR_MESSAGES[errorInfo.code]) {
    return ERROR_MESSAGES[errorInfo.code];
  }
  
  // Use error message from server
  if (errorInfo.message) {
    return errorInfo.message;
  }
  
  // Fallback
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Handle error and show toast notification
 */
export function handleError(error: unknown, customMessage?: string): ApiError {
  const errorInfo = extractErrorInfo(error);
  const message = customMessage || getUserFriendlyMessage(error);
  
  // Show toast notification
  toast.error(message, {
    duration: 5000,
    position: 'top-right',
  });
  
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Handler]', {
      error,
      errorInfo,
      message
    });
  }
  
  return errorInfo;
}

/**
 * Check if error is authentication related
 */
export function isAuthError(error: unknown): boolean {
  const errorInfo = extractErrorInfo(error);
  const authCodes = [
    'INVALID_TOKEN',
    'TOKEN_EXPIRED',
    'ACCESS_TOKEN_EXPIRED',
    'REFRESH_TOKEN_EXPIRED',
    'INVALID_REFRESH_TOKEN',
    'REFRESH_TOKEN_REUSED'
  ];
  
  return authCodes.includes(errorInfo.code || '');
}

/**
 * Check if error is rate limit related
 */
export function isRateLimitError(error: unknown): boolean {
  const errorInfo = extractErrorInfo(error);
  return errorInfo.code === 'TOO_MANY_REQUESTS' || 
         errorInfo.code === 'RATE_LIMIT_EXCEEDED' ||
         errorInfo.code === 'BRUTE_FORCE_DETECTED';
}

