export interface User {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastSeen?: string;
}

export interface Chat {
  id: string;
  user: User;
  lastMessage: string;
  time: string;
  unread: number;
  isTyping?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  time: string;
  isOwn: boolean;
  type: "text" | "voice" | "image";
}

export interface Post {
  id: string;
  author: User;
  text: string;
  image?: string;
  likes: number;
  comments: number;
  reposts: number;
  liked: boolean;
  time: string;
}

export interface Story {
  id: string;
  user: User;
  viewed: boolean;
}

export const currentUser: User = {
  id: "me",
  name: "Алексей",
  avatar: "",
  status: "online",
};

export const users: User[] = [
  { id: "1", name: "Мария", avatar: "", status: "online" },
  { id: "2", name: "Дмитрий", avatar: "", status: "offline", lastSeen: "2ч назад" },
  { id: "3", name: "Екатерина", avatar: "", status: "online" },
  { id: "4", name: "Иван", avatar: "", status: "away" },
  { id: "5", name: "Анна", avatar: "", status: "online" },
  { id: "6", name: "Сергей", avatar: "", status: "offline", lastSeen: "5ч назад" },
];

export const chats: Chat[] = [
  { id: "c1", user: users[0], lastMessage: "Привет! Как дела? 😊", time: "12:45", unread: 3 },
  { id: "c2", user: users[1], lastMessage: "Завтра встретимся?", time: "11:30", unread: 0 },
  { id: "c3", user: users[2], lastMessage: "Отправила фото с поездки", time: "10:15", unread: 1 },
  { id: "c4", user: users[3], lastMessage: "Ок, договорились 👍", time: "Вчера", unread: 0 },
  { id: "c5", user: users[4], lastMessage: "Ты видел новый фильм?", time: "Вчера", unread: 5 },
  { id: "c6", user: users[5], lastMessage: "Спасибо за помощь!", time: "Пн", unread: 0 },
];

export const messages: Record<string, Message[]> = {
  c1: [
    { id: "m1", chatId: "c1", senderId: "1", text: "Привет!", time: "12:40", isOwn: false, type: "text" },
    { id: "m2", chatId: "c1", senderId: "me", text: "Привет, Мария! 👋", time: "12:41", isOwn: true, type: "text" },
    { id: "m3", chatId: "c1", senderId: "1", text: "Как твои выходные прошли?", time: "12:42", isOwn: false, type: "text" },
    { id: "m4", chatId: "c1", senderId: "me", text: "Отлично, ездили за город 🏕️", time: "12:43", isOwn: true, type: "text" },
    { id: "m5", chatId: "c1", senderId: "1", text: "Привет! Как дела? 😊", time: "12:45", isOwn: false, type: "text" },
  ],
  c2: [
    { id: "m6", chatId: "c2", senderId: "me", text: "Привет, давно не виделись", time: "11:20", isOwn: true, type: "text" },
    { id: "m7", chatId: "c2", senderId: "2", text: "Да, надо бы встретиться!", time: "11:25", isOwn: false, type: "text" },
    { id: "m8", chatId: "c2", senderId: "2", text: "Завтра встретимся?", time: "11:30", isOwn: false, type: "text" },
  ],
};

export const posts: Post[] = [
  {
    id: "p1",
    author: users[0],
    text: "Невероятный закат сегодня! 🌅 Природа — лучший художник.",
    image: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=600&h=400&fit=crop",
    likes: 42,
    comments: 8,
    reposts: 3,
    liked: false,
    time: "2ч назад",
  },
  {
    id: "p2",
    author: users[2],
    text: "Только что закончила новый проект! 🚀 Горжусь результатом. Делюсь с вами первыми скриншотами.",
    likes: 128,
    comments: 24,
    reposts: 15,
    liked: true,
    time: "4ч назад",
  },
  {
    id: "p3",
    author: users[3],
    text: "Кто-нибудь был на новой выставке в Третьяковке? Стоит ли идти?",
    likes: 15,
    comments: 32,
    reposts: 1,
    liked: false,
    time: "6ч назад",
  },
  {
    id: "p4",
    author: users[4],
    text: "Рецепт дня: паста карбонара за 15 минут 🍝 Секрет в правильном сыре!",
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&h=400&fit=crop",
    likes: 89,
    comments: 16,
    reposts: 22,
    liked: false,
    time: "8ч назад",
  },
];

export const stories: Story[] = [
  { id: "s0", user: currentUser, viewed: false },
  { id: "s1", user: users[0], viewed: false },
  { id: "s2", user: users[2], viewed: false },
  { id: "s3", user: users[4], viewed: true },
  { id: "s4", user: users[3], viewed: true },
  { id: "s5", user: users[5], viewed: true },
];

export const aiMessages = [
  { id: "ai1", role: "assistant" as const, content: "Привет! Я **Pulse AI** — ваш умный помощник. Чем могу помочь? 🤖\n\nЯ могу:\n- Ответить на вопросы\n- Помочь с текстом\n- Перевести сообщение\n- Подсказать идеи" },
];
