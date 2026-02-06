/**
 * Input sanitization utilities for security
 * Prevents XSS and other injection attacks
 */

/**
 * Sanitize text input by removing HTML tags and dangerous characters
 * Use for: campaign names, headlines, body text, ad names
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and their content (extra safety)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove potential javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove potential event handlers
    .replace(/on\w+\s*=/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize and validate URL
 * Returns the sanitized URL or null if invalid
 * Use for: link URLs, privacy policy URLs
 */
export function sanitizeUrl(input: string): string | null {
  if (!input) return null;

  let trimmed = input.trim();

  // Auto-add https:// if no protocol specified
  if (trimmed && !trimmed.match(/^https?:\/\//i)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const url = new URL(trimmed);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    // Block javascript: URLs that might slip through
    if (url.href.toLowerCase().includes('javascript:')) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize number input for budgets
 * Returns the number or null if invalid
 */
export function sanitizeBudget(input: string | number, minValue = 5): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input;

  if (isNaN(num) || num < minValue) {
    return null;
  }

  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}

/**
 * Validate file type and size
 * Returns validation result with error message if invalid
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 30 * 1024 * 1024; // 30MB
const MAX_VIDEO_SIZE = 4 * 1024 * 1024 * 1024; // 4GB

export function validateFile(file: File): FileValidationResult {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  // Check type
  if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Image type not supported. Use JPG, PNG, GIF, or WebP.' };
  }

  if (isVideo && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { valid: false, error: 'Video type not supported. Use MP4, MOV, or WebM.' };
  }

  if (!isImage && !isVideo) {
    return { valid: false, error: 'File type not supported. Use images or videos only.' };
  }

  // Check size
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const sizeLimit = isVideo ? '4GB' : '30MB';
    return { valid: false, error: `File too large. Maximum size is ${sizeLimit}.` };
  }

  return { valid: true };
}

/**
 * Validate multiple files for batch upload
 */
export function validateFiles(files: File[], maxCount = 5): FileValidationResult {
  if (files.length === 0) {
    return { valid: false, error: 'Please upload at least one file.' };
  }

  if (files.length > maxCount) {
    return { valid: false, error: `Maximum ${maxCount} files allowed.` };
  }

  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid) {
      return { valid: false, error: `${file.name}: ${result.error}` };
    }
  }

  return { valid: true };
}

/**
 * Escape HTML entities for safe display
 * Use when displaying user-generated content
 */
export function escapeHtml(input: string): string {
  if (!input) return '';

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return input.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}
