// Couche réseau : MQTT (broker public) derrière une petite interface.
import { MQTT_URL, TOPIC_ROOT } from './config.js';
export const topics = (room) => ({ state: TOPIC_ROOT + room + '/state', toHost: TOPIC_ROOT + room + '/to-host' });

export class Net {
  constructor({ onMessage, onConnection }) { this.onMessage = onMessage; this.onConnection = onConnection; this.client = null; this.subs = []; }
  connect(will) {
    return new Promise((resolve, reject) => {
      if (typeof mqtt === 'undefined') return reject(new Error('Librairie réseau introuvable (vérifie ta connexion).'));
      const c = mqtt.connect(MQTT_URL, { clientId: 'cq3d_' + Math.random().toString(16).slice(2, 12),
        connectTimeout: 12000, reconnectPeriod: 3000, clean: true, will });
      this.client = c;
      const timer = setTimeout(() => { c.end(true); reject(new Error('Serveur injoignable.')); }, 13000);
      c.on('connect', () => { clearTimeout(timer); if (this.subs.length) c.subscribe(this.subs); this.onConnection?.(true); resolve(); });
      c.on('close', () => this.onConnection?.(false));
      c.on('message', (t, p) => { try { this.onMessage(t, JSON.parse(p.toString())); } catch (e) { /* vide/invalide */ } });
    });
  }
  subscribe(list) { this.subs = list; this.client?.subscribe(list); }
  publish(topic, obj, retain = false) { this.client?.publish(topic, JSON.stringify(obj), { qos: 0, retain }); }
  clear(topic) { this.client?.publish(topic, '', { qos: 0, retain: true }); }
  close() { const c = this.client; this.client = null; this.subs = []; setTimeout(() => { try { c?.end(true); } catch (e) {} }, 400); }
}
