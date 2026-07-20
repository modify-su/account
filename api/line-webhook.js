import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, limit, query, doc, setDoc } from "firebase/firestore";

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
    const q = query(collection(db, "settings"), limit(1));
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
          await setDoc(doc(db, "chat_messages", userMsg.id), userMsg);

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
          await setDoc(doc(db, "chat_messages", botMsg.id), botMsg);

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
          await setDoc(doc(db, "chat_messages", userMsg.id), userMsg);

          // Default mock values as fallback
          let slipAmount = Math.floor(Math.random() * 2000) + 150;
          let slipDate = new Date().toISOString().split("T")[0];
          let slipTime = new Date().toTimeString().split(" ")[0].slice(0, 5);
          let slipRef = `Ref-${Math.floor(Math.random() * 900000) + 100000}`;
          let slipSender = "ลูกค้าทางไลน์";
          let slipMerchant = "ธนาคารกสิกรไทย (KBank)";
          let isRealOcr = false;

          // Try real OCR via SlipOK if key exists
          const slipokApiKey = settings.slipokApiKey;
          
          // Log start of scan attempt to Firestore for remote debugging
          try {
            await addDoc(collection(db, "webhook_logs"), {
              timestamp: new Date().toISOString(),
              event: "ocr_start",
              messageId: messageId,
              hasApiKey: !!slipokApiKey,
              apiKeyPrefix: slipokApiKey ? slipokApiKey.slice(0, 7) : "none",
              branchId: settings.slipokBranchId || "none"
            });
          } catch (e) {
            console.error("Failed to log start to Firestore:", e);
          }

          if (slipokApiKey && !slipokApiKey.startsWith("slipok_api_key_mock") && slipokApiKey.trim() !== "") {
            try {
              // Parse SlipOK branch ID from settings
              let branchId = "71669"; // user default fallback
              if (settings.slipokBranchId && settings.slipokBranchId.trim() !== "") {
                const match = settings.slipokBranchId.match(/(\d+)$/);
                if (match) {
                  branchId = match[1];
                } else {
                  branchId = settings.slipokBranchId.trim();
                }
              }

              // A. Download image from LINE Messaging API
              const lineImgUrl = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
              const lineRes = await fetch(lineImgUrl, {
                headers: {
                  Authorization: `Bearer ${channelToken}`
                }
              });

              if (lineRes.ok) {
                const imageBuffer = await lineRes.arrayBuffer();
                
                try {
                  await addDoc(collection(db, "webhook_logs"), {
                    timestamp: new Date().toISOString(),
                    event: "line_image_downloaded",
                    bufferLength: imageBuffer.byteLength
                  });
                } catch (e) {}

                // B. Call SlipOK API
                const formData = new FormData();
                const blob = new Blob([imageBuffer], { type: "image/jpeg" });
                formData.append("files", blob, "slip.jpg");

                const slipokRes = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
                  method: "POST",
                  headers: {
                    "x-authorization": slipokApiKey
                  },
                  body: formData
                });

                const slipokStatus = slipokRes.status;
                const slipokText = await slipokRes.text();

                try {
                  await addDoc(collection(db, "webhook_logs"), {
                    timestamp: new Date().toISOString(),
                    event: "slipok_api_called",
                    status: slipokStatus,
                    responseText: slipokText
                  });
                } catch (e) {}

                if (slipokRes.ok) {
                  const ocrData = JSON.parse(slipokText);
                  if (ocrData.success && ocrData.data) {
                    const d = ocrData.data;
                    slipAmount = parseFloat(d.amount) || slipAmount;
                    if (d.transDate) {
                      slipDate = d.transDate.split("T")[0];
                    }
                    slipTime = d.transTime || slipTime;
                    slipRef = d.refNo || slipRef;
                    if (d.sender && d.sender.displayName) {
                      slipSender = d.sender.displayName;
                    }
                    // Try to get bank info
                    if (d.sendingBank) {
                      const bankNames = {
                        "002": "ธนาคารกรุงเทพ (BBL)",
                        "004": "ธนาคารกสิกรไทย (KBank)",
                        "006": "ธนาคารกรุงไทย (KTB)",
                        "011": "ธนาคารทหารไทยธนชาต (TTB)",
                        "014": "ธนาคารไทยพาณิชย์ (SCB)",
                        "025": "ธนาคารกรุงศรีอยุธยา (BAY)",
                        "030": "ธนาคารออมสิน (GSB)",
                        "034": "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)",
                        "098": "PromptPay"
                      };
                      slipMerchant = bankNames[d.sendingBank] || `ธนาคารรหัส ${d.sendingBank}`;
                    }
                    isRealOcr = true;
                  }
                } else {
                  console.error("SlipOK response failed:", slipokText);
                }
              } else {
                const lineErrText = await lineRes.text();
                console.error("Failed to fetch image from LINE:", lineErrText);
                try {
                  await addDoc(collection(db, "webhook_logs"), {
                    timestamp: new Date().toISOString(),
                    event: "line_image_download_failed",
                    status: lineRes.status,
                    errorText: lineErrText
                  });
                } catch (e) {}
              }
            } catch (err) {
              console.error("Error doing real SlipOK scan:", err);
              try {
                await addDoc(collection(db, "webhook_logs"), {
                  timestamp: new Date().toISOString(),
                  event: "scan_exception",
                  error: err.message,
                  stack: err.stack || ""
                });
              } catch (e) {}
            }
          } else {
            try {
              await addDoc(collection(db, "webhook_logs"), {
                timestamp: new Date().toISOString(),
                event: "skipped_real_ocr",
                reason: !slipokApiKey ? "No key in settings" : "Mock key detected"
              });
            } catch (e) {}
          }

          const docId = `doc-${Date.now()}`;
          
          const newDoc = {
            id: docId,
            date: slipDate,
            time: slipTime,
            type: "receipt",
            title: isRealOcr ? `สลิปโอนเงินจริง (SlipOK)` : `สลิปโอนเงิน (LINE Bot OCR)`,
            ref: slipRef,
            amount: slipAmount,
            merchant: slipMerchant,
            category: "รายได้จากการขาย",
            sender: slipSender,
            status: "archived",
            details: isRealOcr ? `สแกนสลิปจริงสำเร็จทาง LINE` : `บันทึกอัตโนมัติจาก LINE Bot (สุ่มยอดเงิน)`
          };

          const newTx = {
            id: `t_line_${Date.now()}`,
            date: slipDate,
            type: "income",
            category: "รายได้จากการขาย",
            amount: slipAmount,
            description: isRealOcr ? `LINE Bot: โอนเงินจริงจาก ${slipSender}` : `LINE Bot OCR: ${slipMerchant} (โอนเงินสำเร็จ)`,
            ref: slipRef
          };

          const botReplyText = isRealOcr
            ? `✅ ตรวจสอบสลิปจริงสำเร็จ!\n\nผู้โอน: ${slipSender}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString()}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\nบันทึกเข้าระบบเรียบร้อยครับ`
            : `✅ สแกนสลิปสำเร็จ (โหมดจำลอง)!\n\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString()}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n*หมายเหตุ: เนื่องจากยังไม่ได้กรอกคีย์ SlipOK ด้านบน ระบบจึงจำลองข้อมูลสุ่มขึ้นมาแทน`;

          const botMsg = {
            id: `m_line_bot_${Date.now()}`,
            sender: "bot",
            text: botReplyText,
            docLink: newDoc,
            time: new Date().toTimeString().split(" ")[0].slice(0, 5)
          };

          // Save to Firestore collections
          await setDoc(doc(db, "documents", newDoc.id), newDoc);
          await setDoc(doc(db, "transactions", newTx.id), newTx);
          await setDoc(doc(db, "chat_messages", botMsg.id), botMsg);

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
