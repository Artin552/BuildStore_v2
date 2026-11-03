// Проверка и чтение файлов перед отправкой. Сервер проверяет их ещё раз: это только
// быстрая подсказка пользователю, а не защита.

export const MB = 1024 * 1024;

export type FileKind = 'pdf' | 'jpg' | 'png' | 'webp';

export function formatFileSize(bytes: number): string {
  return `${(bytes / MB).toFixed(2)} МБ`;
}

// Определяем настоящий тип по первым байтам: переименованный .txt в .pdf так не пройдёт
async function detectKind(file: File): Promise<FileKind | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = String.fromCharCode(...bytes);
  if (text.startsWith('%PDF-')) return 'pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes[0] === 0x89 && text.slice(1, 4) === 'PNG') return 'png';
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return 'webp';
  return null;
}

const KIND_NAMES: Record<FileKind, string> = { pdf: 'PDF', jpg: 'JPG', png: 'PNG', webp: 'WEBP' };

// Вернёт текст ошибки или null, если файл подходит
export async function checkFile(file: File, kinds: FileKind[], maxBytes: number): Promise<string | null> {
  if (file.size === 0) return 'Файл пуст';
  if (file.size > maxBytes) return `Файл больше ${maxBytes / MB} МБ`;
  try {
    const kind = await detectKind(file);
    if (!kind || !kinds.includes(kind)) return `Допустимые форматы: ${kinds.map((item) => KIND_NAMES[item]).join(', ')}`;
  } catch {
    return 'Не удалось прочитать файл';
  }
  return null;
}

// Файл в виде текста «data:...;base64,...»: в таком формате его принимает сервер
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Не удалось прочитать файл ${file.name}`));
    reader.readAsDataURL(file);
  });
}
