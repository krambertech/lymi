/**
 * Lower case with the accents gone, so "cafe" finds "Café" and "zurich" finds "Zürich". Kana voicing
 * marks stay, since が and か are different sounds.
 */
export function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/(?![\u3099\u309a])\p{M}/gu, "")
    .normalize("NFC")
    .toLocaleLowerCase();
}
