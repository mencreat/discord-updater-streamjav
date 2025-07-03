const axios = require("axios");
const fs = require("fs");
const admin = require("firebase-admin");

const API_URL = "https://api-eight-xi-96.vercel.app/streamjav/api/all";
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_TOPIC_ID = 6;

// Decode base64 credentials
const firebaseCredentials = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS_B64, 'base64').toString('utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(firebaseCredentials),
});

const db = admin.firestore();
const sentCollection = db.collection("sentAnimes");

async function isSent(id) {
  const doc = await sentCollection.doc(id).get();
  return doc.exists;
}

async function markAsSent(id) {
  await sentCollection.doc(id).set({ sentAt: new Date().toISOString() });
}

async function main() {
  const { data } = await axios.get(API_URL);
  const sorted = data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  for (const anime of sorted) {
    const link = `https://streamjav.vercel.app/watch/${anime.type}/${anime.id}`;
    if (await isSent(anime.id)) continue;

    const capitalizeWord = anime.type.charAt(0).toUpperCase() + anime.type.slice(1);

    const payload = {
      content: `## 📢 ${capitalizeWord} Bokep Baru Rilis! <a:femboyturkey_owolickright:1387559668997685248>
-# gk ding udh lama.
|| <@&1387116137497624669> ||

🎬 **${anime.title}**
${link}`,
    };

    console.log("Mengirim:", anime.title);
    await axios.post(WEBHOOK_URL, payload).catch(err => {
      console.error("Gagal kirim:", err.response?.data || err.message);
    });

    const telegramPayload = {
      chat_id: TELEGRAM_CHAT_ID,
      message_thread_id: TELEGRAM_TOPIC_ID,
      text: `📢 *${capitalizeWord} Baru Rilis!*\n\n🎬 *${anime.title}*\nLink: ${link}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "🎬 Watch Now", url: link }]],
      },
    };

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, telegramPayload)
      .catch(err => {
        console.error("Gagal kirim ke Telegram:", err.response?.data || err.message);
      });

    await markAsSent(anime.id);
    break; // hanya kirim 1 item per run
  }
}

main();
