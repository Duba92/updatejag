export const POST_CATEGORIES = [
  "First-Year Experience",
  "Academic Success",
  "GPA Improvement",
  "Department Selection",
  "Campus Life",
  "Accommodation",
  "Financial Challenges",
  "Personal Development",
  "Technology and Learning",
  "Career Experience",
  "Internship Experience",
  "Scholarship Experience",
  "Leadership",
  "Study Tips",
  "Other Experiences",
] as const;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/ogg",
  "audio/webm",
];
export const MAX_IMAGE_MB = 10;
export const MAX_AUDIO_MB = 50;
export const MAX_IMAGES = 8;

/** Validates a file against allowed types and a size limit. Returns an error message or null. */
export function validateFile(
  file: File,
  types: string[],
  maxMb: number,
): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const audioExt = ["mp3", "wav", "m4a", "ogg", "webm"];
  const imgExt = ["jpg", "jpeg", "png", "webp"];
  const typeOk =
    types.includes(file.type) ||
    (!file.type &&
      !!ext &&
      (types === AUDIO_TYPES ? audioExt : imgExt).includes(ext));
  if (!typeOk) return `${file.name}: this file type isn't supported.`;
  if (file.size > maxMb * 1024 * 1024)
    return `${file.name} is larger than ${maxMb} MB.`;
  return null;
}
