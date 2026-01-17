
class SoundService {
  private sounds: { [key: string]: HTMLAudioElement } = {};

  constructor() {
    // In a real app, these URLs would point to actual mp3 files
    // Using placeholder logic as we cannot host assets directly in this XML
    this.init();
  }

  private init() {
    const soundUrls: { [key: string]: string } = {
      ding: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c36394336c.mp3', // Example ding
      buzzer: 'https://cdn.pixabay.com/audio/2022/03/24/audio_7315570216.mp3', // Example buzzer
      tada: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb361ed77c.mp3', // Example fanfare
      dice_roll: 'https://cdn.pixabay.com/audio/2022/03/15/audio_277f24097f.mp3', // Example dice
    };

    Object.entries(soundUrls).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.load();
      this.sounds[key] = audio;
    });
  }

  play(soundName: string) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.warn("Audio playback failed (interaction required):", e));
    }
  }
}

export default new SoundService();
