// Réglages globaux : tout ce qu'on veut ajuster est ici.
export const MQTT_URL = 'wss://broker.emqx.io:8084/mqtt';
export const TOPIC_ROOT = 'creator-quiz3d/v2/';
export const MAX_PLAYERS = 16;
export const QUESTION_MS = 15000;               // durée d'une question
export const POINTS = { base: 100, speed: 50 }; // bonne réponse + bonus de rapidité (max)
// Palette CREATOR (affiches) puis couleurs complémentaires : 1 couleur par joueur.
export const PALETTE = ['#0B35FE', '#00E472', '#FF4E20', '#FF7A00', '#2E85FF', '#FFC83D', '#B14CFF', '#00C2D1',
  '#FF5FA2', '#7BD500', '#5B6CFF', '#FF8F6B', '#19B5FE', '#E0457B', '#8D6BFF', '#2AD2A0'];
export const BRAND = { blue: '#0B35FE', navy: '#0C1A4B', green: '#00E472', coral: '#FF4E20' };
