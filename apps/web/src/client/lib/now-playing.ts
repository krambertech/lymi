/** The clip the app is playing now, so a card's term and its example never speak over each other. */
let current: HTMLAudioElement | null = null;

/** Plays `audio` after pausing whichever other clip is playing. */
export function playAlone(audio: HTMLAudioElement): Promise<void> {
  if (current && current !== audio) current.pause();
  current = audio;
  return audio.play();
}
