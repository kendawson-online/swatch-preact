export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result; // 'granted', 'denied', or 'default'
  } catch (e) {
    return 'denied';
  }
}

export async function showNotification(title, options = {}) {
  if (!('Notification' in window)) return false;

  // prefer service worker notifications if available
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.showNotification) {
      reg.showNotification(title, options);
      return true;
    }
  } catch (e) {
    // fallthrough
  }

  // fallback to Window Notification API
  if (Notification.permission === 'granted') {
    new Notification(title, options);
    return true;
  }

  return false;
}
