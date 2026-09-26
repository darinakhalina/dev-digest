export const ACCEPTED_EXTENSIONS = [".md", ".zip"] as const;

export function isAcceptedSkillFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}
