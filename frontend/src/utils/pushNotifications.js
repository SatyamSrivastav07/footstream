const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export const pushSupport = () => ({
  supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  permission: 'Notification' in window ? Notification.permission : 'unsupported',
});

export const subscribeBrowserPush = async () => {
  const support = pushSupport();
  if (!support.supported) throw new Error('Browser notifications are not supported in this browser.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');
  const registration = await navigator.serviceWorker.register('/sw.js');
  const response = await fetch(`${apiBase}/public/push/config`, { credentials: 'include' });
  const config = await response.json();
  const vapidPublicKey = config?.data?.vapidPublicKey || import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) throw new Error('Push notifications are not configured yet.');
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
};
