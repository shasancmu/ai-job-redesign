// Photo Wall domain helpers. The room photographs something (a scene, an object,
// or handwritten text); a vision model turns each image into text, and only the
// text is ever stored.

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makePhotoCode(len = 5): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

export type PhotoEntry = {
  id: string;
  kind: "photo" | "text";
  title: string;
  description: string;
  transcript: string;
  image?: string | null; // data-URL thumbnail, gallery mode only
  caption?: string; // participant's caption, gallery mode only
};
