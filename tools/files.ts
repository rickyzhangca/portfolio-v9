import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

/** Atomic writes keep Vite from reading a partially regenerated manifest. */
export function writeChanged(file: string, contents: string | Uint8Array) {
  const buffer = Buffer.from(contents);
  if (existsSync(file) && readFileSync(file).equals(buffer)) {
    return;
  }
  const temporary = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temporary, buffer);
  renameSync(temporary, file);
}
