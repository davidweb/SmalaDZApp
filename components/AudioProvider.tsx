
import { Howl } from 'howler';

const sounds = {
  ding: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'] }), // Correct answer
  buzzer: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'] }), // Wrong answer / X
  timer: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3'] }), // Timer ticking
  win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2002/2002-preview.mp3'] }), // Round win
};

export const playSound = (name: keyof typeof sounds) => {
  sounds[name].play();
};
