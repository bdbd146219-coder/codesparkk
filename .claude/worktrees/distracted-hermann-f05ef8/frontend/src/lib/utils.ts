import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn-style class-name helper. Composes `clsx` with `tailwind-merge`
 * so duplicate / conflicting Tailwind classes are resolved.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
