
class SoundService {
  private sounds: { [key: string]: HTMLAudioElement } = {};

  constructor() {
    this.init();
  }

  private init() {
    const soundUrls: { [key: string]: string } = {
      ding: 'https://cdn.pixabay.com/audio/2022/03/15/audio_277f24097f.mp3', // Note: If 403, we use fallback
      buzzer: 'https://actions.google.com/sounds/v1/cartoon/boing.ogg',
      tada: 'https://actions.google.com/sounds/v1/ambiences/fanfare.ogg',
      dice_roll: 'https://actions.google.com/sounds/v1/foley/rattle_keys.ogg',
    };

    Object.entries(soundUrls).forEach(([key, url]) => {
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.sounds[key] = audio;
      } catch (e) {
        console.error(`Failed to init sound: ${key}`, e);
      }
    });
  }

  play(soundName: string) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }
}

export default new SoundService();
