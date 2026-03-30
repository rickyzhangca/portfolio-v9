import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const tw = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
