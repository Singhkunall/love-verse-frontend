import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

class MobileService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.wakeLock = null;
    this.notificationsEnabled = false;
    this.initAppListeners();
  }

  // Initialize Capacitor App State Listeners (Background / Foreground)
  initAppListeners() {
    if (this.isNative) {
      App.addListener('appStateChange', ({ isActive }) => {
        console.log(`App state changed: active = ${isActive}`);
        if (!isActive) {
          console.log("App moved to background. Maintaining WebRTC audio tracks...");
        } else {
          console.log("App moved to foreground.");
        }
      });
    }

    // Web visibility change fallback
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log("Tab backgrounded");
      } else {
        console.log("Tab foregrounded");
      }
    });
  }

  // Request Notification Permissions (Native & Web)
  async requestNotificationPermission() {
    try {
      if (this.isNative) {
        const perm = await LocalNotifications.requestPermissions();
        this.notificationsEnabled = perm.display === 'granted';
        return this.notificationsEnabled;
      } else if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          this.notificationsEnabled = true;
          return true;
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          this.notificationsEnabled = perm === 'granted';
          return this.notificationsEnabled;
        }
      }
    } catch (err) {
      console.error("Notification permission error:", err);
    }
    return false;
  }

  // Send System Notification (Native Local Notification or Web Notification)
  async sendNotification(title, body, icon = '🍿') {
    try {
      if (!this.notificationsEnabled) {
        await this.requestNotificationPermission();
      }

      if (this.isNative) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 1000000),
              title: `${icon} ${title}`,
              body: body,
              schedule: { at: new Date(Date.now() + 100) },
              smallIcon: 'ic_launcher',
              iconColor: '#F43F5E'
            }
          ]
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${icon} ${title}`, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          silent: false
        });
      } else {
        toast(`${icon} ${title}: ${body}`, { duration: 4000 });
      }
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  }

  // Set Lockscreen Media Notification Controls (Media Session API)
  setupMediaSession({ title, artist, artwork, onPlay, onPause, onSeek }) {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title || 'Love-Verse Live Stream',
          artist: artist || 'Partner Watch Party',
          album: 'Love-Verse Cinema 🍿',
          artwork: [
            { src: artwork || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500', sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        if (onPlay) navigator.mediaSession.setActionHandler('play', onPlay);
        if (onPause) navigator.mediaSession.setActionHandler('pause', onPause);
        if (onSeek) navigator.mediaSession.setActionHandler('seekto', (details) => onSeek(details.seekTime));
      } catch (err) {
        console.error("MediaSession error:", err);
      }
    }
  }

  // Toggle Screen Wake Lock (prevents phone display from sleeping while watching movie)
  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log("Screen Wake Lock active 💡");
        this.wakeLock.addEventListener('release', () => {
          console.log("Screen Wake Lock released");
        });
        return true;
      }
    } catch (err) {
      // Quietly ignore if tab is hidden or backgrounded
    }
    return false;
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  // Toggle Picture-in-Picture for a video element
  async togglePictureInPicture(videoElement) {
    if (!videoElement) return false;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      } else if (document.pictureInPictureEnabled && !videoElement.disablePictureInPicture) {
        await videoElement.requestPictureInPicture();
        return true;
      } else {
        toast.error("Picture-in-Picture is not supported by your browser!");
        return false;
      }
    } catch (err) {
      console.error("Picture-in-Picture error:", err);
      toast.error("Could not enter Picture-in-Picture mode!");
      return false;
    }
  }
}

export const mobileService = new MobileService();
export default mobileService;
