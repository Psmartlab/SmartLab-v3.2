import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind CSS classes using clsx and tailwind-merge.
 * Recommended by the senior-frontend skill for clean component styling.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
