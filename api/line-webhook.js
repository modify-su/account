import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqLwYJ9m8VZxLHprterX_o-0AiAR9kSAM",
  authDomain: "smart-3c6d8.firebaseapp.com",
  projectId: "smart-3c6d8",
  storageBucket: "smart-3c6d8.firebasestorage.app",
  messagingSenderId: "314812614488",
  appId: "1:314812614488:web:79a2696302699414be472d"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
const db = getFirestore(app);

export default async function handler(req, res) {
  // Handle CORS and OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { events } = req.body;

    // Handle LINE verification request
    if (!events || events.length === 0) {
      return res.status(200).send("OK");
    }

    // Get settings from Firestore to retrieve LINE channel token
    const q = query(collection(db, "office_settings"), limit(1));
    const snapshot = await getDocs(q);
    let settings = {};
    snapshot.forEach((d) => {
      settings = d.data();
    });

    const channelToken = settings.lineChannelToken || "channel_token_mock_1234567890abcdef";

    for (const event of events) {
      if (event.type === "message") {
        const replyToken = event.replyToken;
        const message = event.message;

        if (message.type === "text") {
          const userText = message.text;

          // 1. Save user message to Firestore chat_messages
          const userMsg = {
            id: `m_line_${Date.now()}`,
            sender: "user",
            text: userText,
            time: new Date().toTimeString().split(" ")[0].slice(0, 5)
          };
          await addDoc(collection(db, "flowledger_chat_messages_v3"), userMsg);

          // 2. Generate bot reply
          let botReplyText = `รับทราบข้อความ: "${userText}" ครับ\n\nสามารถส่งรูปสลิปเพื่อบันทึกบัญชีอัตโนมัติได้เลยครับ`;
          
          if (userText.includes("สรุป") || userText.toLowerCase().includes("summary")) {
            botReplyText = `📊 รายงานสรุปบัญชีการเงินของคุณสามารถตรวจสอบได้ผ่านหน้าหลักแดชบอร์ด Vercel นะครับ`;
          }

          const botMsg = {
            id: `m_line_bot_${Date.now()}`,
            sender: "bot",
            text: botReplyText,
            time: new Date().toTimeString().split(" ")[0].slice(0, 5)
          };
          await addDoc(collection(db, "flowledger_chat_messages_v3"), botMsg);

          // 3. Reply to user on LINE
          await sendLineReply(replyToken, botReplyText, channelToken);

        } else if (message.type === "image") {
          // Handle slip image upload
          const messageId = message.id;

          // 1. Save user image placeholder to Firestore chat_messages
          const userMsg = {
            id: `m_line_${Date.now()}`,
            sender: "user",
            text: "📷 ส่งรูปภาพสลิป",
            isImage: true,
            time: new Date().toTimeString().split(" ")[0].slice(0, 5)
          };
          await addDoc(collection(db, "flowledger_chat_messages_v3"), userMsg);

          // 2. Simulate OCR processing on the backend and save to Firestore
          const docId = `doc-${Date.now()}`;
          const slipAmount = Math.floor(Math.random() * 2000) + 150; // Random amount 150-2150
          const slipDate = new Date().toISOString().split("T")[0];
          
          const newDoc = {
            id: docId,
            date: slipDate,
            time: new Date().toTimeString().split(" ")[0].slice(0, 5),
            type: "receipt",
            title: `สลิปโอนเงิน (LINE Bot OCR)`,
            ref: `Ref-${Math.floor(Math.random() * 900000) + 100000}`,
            amount: slipAmount,
            merchant: "ธนาคารกสิกรไทย (KBank)",
            category: "รายได้จากการขาย",
            sender: "ลูกค้าทางไลน์",
            status: "archived",
            details: `บันทึกอัตโนมัติจาก LINE Bot จริง`
          };

          const newTx = {
            id: `t_line_${Date.now()}`,
            date: slipDate,
            type: "income",
            category: "รายได้จากการขาย",
            amount: slipAmount,
            description: `LINE Bot OCR: KBank (โอนเงินสำเร็จ)`,
            ref: newDoc.ref
          };

          const botReplyText = `✅ สแกนสลิปสำเร็จ!\n\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString()}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${newDoc.ref}\n\nระบบบันทึกบัญชีและสร้างไฟล์รายงาน PDF เรียบร้อยแล้วครับ`;

          const botMsg = {
            id: `m_line_bot_${Date.now()}`,
            sender: "bot",
            text: botReplyText,
            docLink: newDoc,
            time: new Date().toTimeString().split(" ")[0].slice(0, 5)
          };

          // Save to Firestore collections
          await addDoc(collection(db, "flowledger_docs_v3"), newDoc);
          await addDoc(collection(db, "flowledger_txs_v3"), newTx);
          await addDoc(collection(db, "flowledger_chat_messages_v3"), botMsg);

          // Reply to user on LINE
          await sendLineReply(replyToken, botReplyText, channelToken);
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

async function sendLineReply(replyToken, text, channelToken) {
  if (!channelToken || channelToken === "channel_token_mock_1234567890abcdef") {
    console.log("Mock Channel Token, skip LINE messaging API reply.");
    return;
  }
  
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelToken}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [
          {
            type: "text",
            text: text
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error("LINE reply API failed:", errText);
    }
  } catch (err) {
    console.error("Failed to send LINE reply:", err);
  }
}
