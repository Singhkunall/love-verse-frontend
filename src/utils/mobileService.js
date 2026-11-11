import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import axios from 'axios';
import toast from 'react-hot-toast';

class MobileService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.wakeLock = null;
    this.notificationsEnabled = false;
    this.initAppListeners();
    this.initCallActionTypes();
  }

  // Register Android Notification Action Types (Answer & Decline buttons)
  async initCallActionTypes() {
    if (this.isNative) {
      try {
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: 'CALL_NOTIFICATION_ACTION',
              actions: [
                {
                  id: 'answer_call',
                  title: 'Answer 📞',
                  foreground: true
                },
                {
                  id: 'decline_call',
                  title: 'Decline ❌',
                  destructive: true
                }
              ]
            }
          ]
        });

        LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          if (notificationAction.actionId === 'answer_call') {
            window.dispatchEvent(new CustomEvent('love_verse_answer_call'));
          } else if (notificationAction.actionId === 'decline_call') {
            window.dispatchEvent(new CustomEvent('love_verse_decline_call'));
          }
        });
      } catch (e) {
        console.warn("Could not register local notification actions:", e);
      }
    }
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
          this.syncStoredPushToken();
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

  // Synchronize locally stored FCM device token with MongoDB
  async syncStoredPushToken(userId) {
    let targetUserId = userId;
    if (!targetUserId || targetUserId === 'guest') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        targetUserId = u._id || u.id;
      } catch (e) {}
    }
    if (!targetUserId || targetUserId === 'guest') return;

    try {
      const storedToken = localStorage.getItem('love_verse_fcm_token');
      if (storedToken) {
        const API_URL = import.meta.env.VITE_API_URL || 'https://love-verse-backend.onrender.com';
        await axios.post(`${API_URL}/api/auth/save-push-token`, {
          userId: targetUserId,
          token: storedToken
        });
        console.log('Synchronized stored FCM token with backend for user:', targetUserId);
      }
    } catch (err) {
      console.warn('Could not sync stored FCM token:', err.message);
    }
  }

  // Initialize Firebase Cloud Messaging (FCM) Push Notifications
  async initPushNotifications(userId) {
    if (!this.isNative) return;
    try {
      // 1. Create Android Notification Channel for high-importance alerts
      await PushNotifications.createChannel({
        id: 'love_verse_channel',
        name: 'Love-Verse Messages & Calls',
        description: 'Instant notifications for partner messages and calls',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#F43F5E'
      });

      // 2. Attach listeners BEFORE registering (Capacitor requirement)
      PushNotifications.addListener('registration', async (token) => {
        console.log('FCM Device Token registered successfully:', token.value);
        if (token?.value) {
          localStorage.setItem('love_verse_fcm_token', token.value);
          let targetUserId = userId;
          if (!targetUserId || targetUserId === 'guest') {
            try {
              const u = JSON.parse(localStorage.getItem('user') || '{}');
              targetUserId = u._id || u.id;
            } catch (e) {}
          }
          if (targetUserId && targetUserId !== 'guest') {
            try {
              const API_URL = import.meta.env.VITE_API_URL || 'https://love-verse-backend.onrender.com';
              await axios.post(`${API_URL}/api/auth/save-push-token`, {
                userId: targetUserId,
                token: token.value
              });
              console.log('Push token saved to backend for user:', targetUserId);
            } catch (tokenErr) {
              console.error('Failed to save push token to backend:', tokenErr);
            }
          }
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('FCM Registration error:', error);
      });

      // When push notification arrives while app is in foreground
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received in foreground:', notification);
        this.playMessageNotificationSound();
      });

      // When user clicks push notification (wakes up phone from closed/background state)
      PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
        console.log('Push notification clicked by user:', notificationAction);
        const data = notificationAction.notification?.data;
        if (data?.type === 'call') {
          window.dispatchEvent(new CustomEvent('love_verse_navigate', { detail: { tab: 'chat', openCall: true } }));
        } else {
          window.dispatchEvent(new CustomEvent('love_verse_navigate', { detail: { tab: 'chat' } }));
        }
      });

      // 3. Request Push Notification Permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission not granted:', permStatus.receive);
        return;
      }

      // 4. Register device with FCM
      await PushNotifications.register();

      // 5. If we already had a token saved, sync it immediately
      if (userId) {
        this.syncStoredPushToken(userId);
      }
    } catch (err) {
      console.error('Push notification initialization error:', err);
    }
  }

  // Lock Device Screen to Landscape Orientation (Native Capacitor & Web fallback)
  async lockOrientationLandscape() {
    try {
      if (this.isNative) {
        await ScreenOrientation.lock({ orientation: 'landscape' });
        console.log("Capacitor Native ScreenOrientation locked to landscape 📱🔄");
        return true;
      } else if (window.screen?.orientation?.lock) {
        const res = window.screen.orientation.lock('landscape');
        if (res && typeof res.catch === 'function') res.catch(() => {});
        return true;
      }
    } catch (err) {
      console.warn("lockOrientationLandscape warning:", err);
    }
    return false;
  }

  // Unlock Device Screen Orientation
  async unlockOrientation() {
    try {
      if (this.isNative) {
        await ScreenOrientation.unlock();
        console.log("Capacitor Native ScreenOrientation unlocked 📱");
        return true;
      } else if (window.screen?.orientation?.unlock) {
        const res = window.screen.orientation.unlock();
        if (res && typeof res.catch === 'function') res.catch(() => {});
        return true;
      }
    } catch (err) {
      console.warn("unlockOrientation warning:", err);
    }
    return false;
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

  // Soft, pleasant two-tone synthesized chime for message notifications (Zero external audio asset needed)
  playMessageNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      // D5 (587.33Hz) -> A5 (880Hz) gentle notification chime
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      // AudioContext may be blocked before user gesture; gracefully ignore
    }
  }

  // Send High-Priority Incoming Call Notification with Action Buttons (Android & Web)
  async sendCallNotification({ partnerName, callType }) {
    try {
      if (!this.notificationsEnabled) {
        await this.requestNotificationPermission();
      }

      if (this.isNative) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 99999,
              title: `Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call 📞`,
              body: `${partnerName} is calling you! Tap Answer or Decline.`,
              schedule: { at: new Date(Date.now() + 50) },
              smallIcon: 'ic_launcher',
              iconColor: '#10B981',
              actionTypeId: 'CALL_NOTIFICATION_ACTION',
              ongoing: true
            }
          ]
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call 📞`, {
          body: `${partnerName} is calling you! Tap to answer.`,
          icon: '/favicon.ico',
          requireInteraction: true
        });
      }
    } catch (err) {
      console.warn("sendCallNotification error:", err);
    }
  }

  // Cancel Ongoing Call Notification
  async cancelCallNotification() {
    try {
      if (this.isNative) {
        await LocalNotifications.cancel({
          notifications: [{ id: 99999 }]
        });
      }
    } catch (err) {
      console.warn("cancelCallNotification error:", err);
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

  async releaseWakeLock() {
    try {
      if (this.wakeLock) {
        const lock = this.wakeLock;
        this.wakeLock = null;
        if (typeof lock?.release === 'function') {
          const res = lock.release();
          if (res && typeof res.catch === 'function') {
            await res.catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn("Wake lock release error:", err);
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
