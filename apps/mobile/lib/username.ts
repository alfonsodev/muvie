const ADJECTIVES = [
  "Cosmic", "Fuzzy", "Speedy", "Brave", "Clever", "Mighty", "Silent",
  "Golden", "Silver", "Tiny", "Giant", "Wild", "Swift", "Calm", "Bold",
  "Bright", "Dark", "Happy", "Lucky", "Magic", "Noble", "Rapid", "Shy",
  "Silly", "Sneaky", "Sly", "Funky", "Groovy", "Hyper", "Lazy",
];

const NOUNS = [
  "Penguin", "Panda", "Koala", "Otter", "Fox", "Tiger", "Wolf", "Bear",
  "Eagle", "Falcon", "Hawk", "Owl", "Parrot", "Raccoon", "Hedgehog",
  "Capybara", "Axolotl", "Narwhal", "Platypus", "Wombat", "Quokka",
  "Lemur", "Sloth", "Tapir", "Meerkat", "Pangolin", "Chameleon",
];

export function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}${noun}${num}`;
}

export function generateAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Deterministic color from a seed string
const AVATAR_COLORS = [
  "#6c63ff", "#ff6584", "#43b89c", "#f5a623", "#4a90d9",
  "#9b59b6", "#e67e22", "#27ae60", "#e74c3c", "#1abc9c",
];

export function avatarColorFromSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
