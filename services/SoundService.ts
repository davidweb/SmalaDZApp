
class SoundService {
  private sounds: { [key: string]: HTMLAudioElement } = {};

  constructor() {
    this.init();
  }

  private init() {
    // Utilisation de sons provenant d'un CDN stable (Open Source / Free Assets)
    const soundUrls: { [key: string]: string } = {
      ding: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
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
      // On ignore l'erreur si l'utilisateur n'a pas encore interagi avec la page
      sound.play().catch(() => {
        // Silencieux : comportement normal du navigateur si pas d'interaction
      });
    }
  }
}

export default new SoundService();
