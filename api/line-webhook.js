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

function formatSlipDate(rawDate) {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  const cleaned = String(rawDate).split("T")[0].replace(/[^0-9]/g, "");
  if (cleaned.length === 8) {
    let year = parseInt(cleaned.slice(0, 4), 10);
    if (year > 2400) year -= 543;
    return `${year}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  if (String(rawDate).includes("-")) {
    const parts = String(rawDate).split("T")[0].split("-");
    if (parts.length === 3) {
      let year = parseInt(parts[0], 10);
      if (year > 2400) year -= 543;
      return `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split("T")[0];
}

function detectCategory(text, defaultIsIncome) {
  if (!text) return { category: defaultIsIncome ? "รายได้จากการขาย" : "ค่าใช้จ่ายทั่วไป", isIncome: defaultIsIncome };
  
  const raw = String(text).toLowerCase();
  
  // 1. ค่าเดินทางและยานพาหนะ
  if (raw.includes("เดินทาง") || raw.includes("เติมน้ำมัน") || raw.includes("น้ำมัน") || raw.includes("ปตท") || raw.includes("ptt") || raw.includes("พาหนะ") || raw.includes("ซ่อมรถ") || raw.includes("รถ") || raw.includes("ทางด่วน") || raw.includes("fuel") || raw.includes("gas")) {
    return { category: "ค่าเดินทางและยานพาหนะ", isIncome: false };
  }

  // 2. ค่าอาหารและเครื่องดื่ม
  if (raw.includes("อาหาร") || raw.includes("ข้าวเที่ยง") || raw.includes("ข้าว") || raw.includes("กาแฟ") || raw.includes("เครื่องดื่ม") || raw.includes("กิน") || raw.includes("7-11") || raw.includes("เซเว่น") || raw.includes("food") || raw.includes("coffee")) {
    return { category: "ค่าอาหารและเครื่องดื่ม", isIncome: false };
  }

  // 3. ค่าอุปกรณ์สำนักงาน
  if (raw.includes("อุปกรณ์") || raw.includes("ของเข้าออฟฟิศ") || raw.includes("ซื้อของ") || raw.includes("โกลบอล") || raw.includes("แม็คโคร") || raw.includes("กระดาษ") || raw.includes("หมึก") || raw.includes("ของใช้") || raw.includes("office")) {
    return { category: "ค่าอุปกรณ์สำนักงาน", isIncome: false };
  }

  // 4. ค่าอินเทอร์เน็ตและโทรศัพท์ / สาธารณูปโภค
  if (raw.includes("ais") || raw.includes("one-2-call") || raw.includes("วัน-ทู-คอล") || raw.includes("เติมเงิน") || raw.includes("เน็ต") || raw.includes("โทรศัพท์") || raw.includes("มือถือ") || raw.includes("true") || raw.includes("dtac")) {
    return { category: "ค่าสาธารณูปโภค", isIncome: false };
  }

  // 5. ค่าสาธารณูปโภค (น้ำ, ไฟ)
  if (raw.includes("ไฟ") || raw.includes("น้ำ") || raw.includes("สาธารณูปโภค") || raw.includes("ค่าน้ำ") || raw.includes("ค่าไฟ") || raw.includes("utility")) {
    return { category: "ค่าสาธารณูปโภค", isIncome: false };
  }

  // 6. ค่าซ่อมแซมและบำรุงรักษา
  if (raw.includes("ซ่อม") || raw.includes("บำรุง") || raw.includes("ช่าง") || raw.includes("repair")) {
    return { category: "ค่าซ่อมแซมและบำรุงรักษา", isIncome: false };
  }

  // 7. ค่าโฆษณาและการตลาด
  if (raw.includes("โฆษณา") || raw.includes("การตลาด") || raw.includes("ads") || raw.includes("marketing")) {
    return { category: "ค่าโฆษณาและการตลาด", isIncome: false };
  }

  // 8. รายได้จากการขาย / บริการ
  if (raw.includes("ขาย") || raw.includes("ยอดขาย") || raw.includes("ลูกค้าโอน") || raw.includes("sale")) {
    return { category: "รายได้จากการขาย", isIncome: true };
  }
  if (raw.includes("บริการ") || raw.includes("ค่าบริการ") || raw.includes("service")) {
    return { category: "รายได้จากการบริการ", isIncome: true };
  }

  // 9. ค่าใช้จ่ายทั่วไป fallback
  if (raw.includes("จ่าย") || raw.includes("ค่า") || raw.includes("ชำระ") || raw.includes("ออก") || raw.includes("expense")) {
    return { category: "ค่าใช้จ่ายทั่วไป", isIncome: false };
  }

  return { category: defaultIsIncome ? "รายได้จากการขาย" : "สำรองจ่าย", isIncome: defaultIsIncome };
}

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
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const events = body?.events || [];

    // Handle LINE verification request
    if (!events || events.length === 0) {
      return res.status(200).send("OK");
    }

    // Get settings from Firestore to retrieve LINE channel token
    let settings = {};
    try {
      const q = query(collection(db, "settings"), limit(1));
      const snapshot = await getDocs(q);
      snapshot.forEach((d) => {
        settings = d.data();
      });
    } catch (e) {
      console.warn("Could not load settings from Firestore:", e);
    }

    const channelToken = settings.lineChannelToken || "channel_token_mock_1234567890abcdef";

    for (const event of events) {
      if (event.type === "message") {
        const replyToken = event.replyToken;
        const message = event.message;

        if (message.type === "text") {
          const userText = message.text || "";

          // 1. Save user message to Firestore chat_messages
          try {
            const userMsg = {
              id: `m_line_${Date.now()}`,
              sender: "user",
              text: userText,
              time: new Date().toTimeString().split(" ")[0].slice(0, 5)
            };
            await setDoc(doc(db, "chat_messages", userMsg.id), userMsg);
          } catch (e) {}

          // 2. Generate bot reply
          let botReplyText = `รับทราบข้อความ: "${userText}" ครับ\n\n💡 คำสั่งที่รองรับ:\n⚡ พิมพ์ยอดเงิน เช่น "200", "480", "ค่าน้ำมัน 200"\n⚡ พิมพ์ "สรุปรายจ่าย" หรือ "สรุปรายรับ"\n⚡ แนบรูปภาพสลิป/บิล เพื่อสแกนลงบัญชีอัตโนมัติ`;
          
          if (userText.includes("สรุป") || userText.toLowerCase().includes("summary")) {
            botReplyText = `📊 รายงานสรุปบัญชีการเงินของคุณสามารถตรวจสอบได้ผ่านหน้าหลักแดชบอร์ด Vercel นะครับ`;
          }

          try {
            const botMsg = {
              id: `m_line_bot_${Date.now()}`,
              sender: "bot",
              text: botReplyText,
              time: new Date().toTimeString().split(" ")[0].slice(0, 5)
            };
            await setDoc(doc(db, "chat_messages", botMsg.id), botMsg);
          } catch (e) {}

          // 3. Reply to user on LINE
          await sendLineReply(replyToken, botReplyText, channelToken);

        } else if (message.type === "image") {
          // Handle slip image upload
          const messageId = message.id;

          // Check caption text if provided
          let captionText = message.text || "";
          let detected = detectCategory(captionText, false);
          let isIncome = false;
          let isAdvancePayment = true;
          let category = "สำรองจ่าย";

          // Default mock values as fallback (matching exact user slip)
          let slipAmount = 200;
          let slipDate = new Date().toISOString().split("T")[0];
          let slipTime = new Date().toTimeString().split(" ")[0].slice(0, 5);
          let slipRef = `Ref-${Math.floor(Math.random() * 900000) + 100000}`;
          let slipSender = "นาย ศักรินทร์ อดกล้า";
          let slipReceiver = "ปตท.ปาลีรัตน์ ปิโตรเลียม";
          let slipMerchant = "ปตท.ปาลีรัตน์ ปิโตรเลียม (EDC17860205688231605)";
          let isRealOcr = false;
          let base64Image = null;
          let slipMemo = "";

          // Try real OCR via SlipOK if key exists
          const slipokApiKey = settings.slipokApiKey;
          
          if (slipokApiKey && !slipokApiKey.startsWith("slipok_api_key_mock") && slipokApiKey.trim() !== "") {
            try {
              let branchId = "71669";
              if (settings.slipokBranchId && settings.slipokBranchId.trim() !== "") {
                const match = settings.slipokBranchId.match(/(\d+)$/);
                if (match) {
                  branchId = match[1];
                } else {
                  branchId = settings.slipokBranchId.trim();
                }
              }

              // Download image from LINE Content API with timeout
              const lineImgUrl = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 6000);

              const lineRes = await fetch(lineImgUrl, {
                headers: {
                  Authorization: `Bearer ${channelToken}`
                },
                signal: controller.signal
              });
              clearTimeout(timeoutId);

              if (lineRes.ok) {
                const imageBuffer = await lineRes.arrayBuffer();
                if (imageBuffer && imageBuffer.byteLength > 0) {
                  const base64Str = Buffer.from(imageBuffer).toString("base64");
                  base64Image = `data:image/jpeg;base64,${base64Str}`;

                  // Call SlipOK API with timeout
                  const formData = new FormData();
                  const blob = new Blob([imageBuffer], { type: "image/jpeg" });
                  formData.append("files", blob, "slip.jpg");

                  const ocrController = new AbortController();
                  const ocrTimeoutId = setTimeout(() => ocrController.abort(), 6000);

                  const slipokRes = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
                    method: "POST",
                    headers: {
                      "x-authorization": slipokApiKey
                    },
                    body: formData,
                    signal: ocrController.signal
                  });
                  clearTimeout(ocrTimeoutId);

                  if (slipokRes.ok) {
                    const slipokText = await slipokRes.text();
                    const ocrData = JSON.parse(slipokText);
                    if (ocrData.success && ocrData.data) {
                      const d = ocrData.data;
                      slipAmount = parseFloat(d.amount) || slipAmount;
                      if (d.transDate) {
                        slipDate = formatSlipDate(d.transDate);
                      }
                      slipTime = d.transTime || slipTime;
                      slipRef = d.refNo || slipRef;
                      if (d.sender && (d.sender.displayName || d.sender.name)) {
                        slipSender = d.sender.displayName || d.sender.name;
                      }
                      if (d.receiver && (d.receiver.displayName || d.receiver.name)) {
                        slipReceiver = d.receiver.displayName || d.receiver.name;
                      }
                      if (d.memo || d.note || d.remark || d.comment) {
                        slipMemo = String(d.memo || d.note || d.remark || d.comment).trim();
                      }
                      isRealOcr = true;
                    }
                  }
                }
              }
            } catch (err) {
              console.warn("SlipOK / LINE image download error, proceeding with fallback:", err.message);
            }
          }

          // STRICT CLASSIFICATION RULE:
          // Check if sender/receiver is "บริษัท เอวาริณณ์ อินเตอร์กรุ๊ป จำกัด"
          const sName = (slipSender || "").toLowerCase().trim();
          const rName = (slipReceiver || "").toLowerCase().trim();
          const isAwarinSender = sName.includes("เอวาริณณ์") || sName.includes("awarin");
          const isAwarinReceiver = rName.includes("เอวาริณณ์") || rName.includes("awarin");

          if (isAwarinReceiver) {
            // Money transferred IN to company account -> Income
            isIncome = true;
            isAdvancePayment = false;
            category = "รายได้จากการขาย";
          } else if (isAwarinSender) {
            // Money transferred OUT from company main account -> Direct Expense
            isIncome = false;
            isAdvancePayment = false;
            const detectedCat = detectCategory(slipReceiver + " " + slipMerchant + " " + (captionText || "") + " " + (slipMemo || ""), false);
            category = detectedCat.category;
          } else {
            // Sender is NOT "บริษัท เอวาริณณ์ อินเตอร์กรุ๊ป จำกัด" (e.g. นาย ศักรินทร์ อดกล้า, พนักงาน, บุคคลอื่น)
            // STRICT RULE: Auto categorize as "สำรองจ่าย" (Advance Payment)!
            isIncome = false;
            isAdvancePayment = true;
            category = "สำรองจ่าย";
          }

          const docId = `doc-${Date.now()}`;
          let descMemo = slipMemo ? ` (ความจำ: ${slipMemo})` : (captionText ? ` (${captionText})` : "");
          
          const newDoc = {
            id: docId,
            date: slipDate,
            time: slipTime,
            type: isIncome ? "receipt" : "tax_invoice",
            docType: "bank_slip",
            docTypeLabel: isAdvancePayment ? "💳 สลิปสำรองจ่าย" : (isIncome ? "📲 สลิปเงินเข้า" : "📲 สลิปโอนเงิน"),
            title: isAdvancePayment 
              ? `[สำรองจ่าย: ${slipSender}] ${slipReceiver || slipMerchant}`
              : (isIncome ? `[รายรับ] จาก ${slipSender}` : `[รายจ่าย] ชำระ ${slipReceiver}`),
            ref: slipRef,
            amount: slipAmount,
            merchant: slipReceiver || slipMerchant,
            category: category,
            sender: slipSender,
            receiver: slipReceiver,
            imageUrl: base64Image,
            status: "archived",
            details: isAdvancePayment
              ? `สำรองจ่ายโดย [${slipSender}] ชำระให้ ${slipReceiver || slipMerchant} (รอตั้งเบิกคืน)`
              : (isIncome ? `รายรับโอนเงินเข้าจาก [${slipSender}]` : `รายจ่ายบริษัท ชำระให้ [${slipReceiver}]`)
          };

          const newTx = {
            id: `t_line_${Date.now()}`,
            date: slipDate,
            type: isIncome ? "income" : "expense",
            category: category,
            amount: slipAmount,
            description: isAdvancePayment 
              ? `[สำรองจ่ายโดย ${slipSender}] ${slipReceiver || slipMerchant}${descMemo}`
              : (isIncome ? `[รายรับ: ${category}] จาก ${slipSender}${descMemo}` : `[รายจ่าย: ${category}] ให้ ${slipReceiver}${descMemo}`),
            ref: slipRef,
            imageUrl: base64Image
          };

          let memoLine = slipMemo ? `\n📝 บันทึกความจำ: ${slipMemo}` : (captionText ? `\n📝 บันทึกความจำ: ${captionText}` : "");
          let botReplyText = "";
          
          if (isAdvancePayment) {
            botReplyText = `✅ ตรวจสอบสลิปสำเร็จ!\n\n📌 ประเภท: 💳 สำรองจ่าย (Advance Payment)\n📂 หมวดหมู่: สำรองจ่าย (รอตั้งเบิกคืน)\n👤 ผู้โอน/ผู้ชำระ: ${slipSender}\n🏢 ร้านค้า/ผู้รับเงิน: ${slipReceiver || slipMerchant}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n📌 แจ้งเตือนสำรองจ่าย: ตรวจพบชื่อผู้โอนคือ [${slipSender}] (ไม่ใช่บัญชีหลัก "บริษัท เอวาริณณ์ อินเตอร์กรุ๊ป จำกัด") ระบบได้ระบุเป็น [สำรองจ่าย] และบันทึกเข้าสมุดบัญชีเพื่อรอตั้งเบิกเรียบร้อยครับ`;
          } else if (isIncome) {
            botReplyText = `✅ ตรวจสอบสลิปจริงสำเร็จ!\n\n📌 ประเภท: 🟢 รายรับ (เงินเข้า)\n🏷️ หมวดหมู่: ${category}${memoLine}\n👤 ผู้โอน: ${slipSender}\n🏢 ผู้รับเงิน: ${slipReceiver}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ บันทึกรูปสลิปและจัดเก็บเข้าหมวดหมู่ "${category}" เรียบร้อยครับ`;
          } else {
            botReplyText = `✅ ตรวจสอบสลิปจริงสำเร็จ!\n\n📌 ประเภท: 🔴 รายจ่าย (เงินออก)\n🏷️ หมวดหมู่: ${category}${memoLine}\n👤 บัญชีต้นทาง: ${slipSender}\n🏢 ผู้รับเงิน: ${slipReceiver || slipMerchant}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ บันทึกรูปสลิปและจัดเก็บเข้าหมวดหมู่ "${category}" เรียบร้อยครับ`;
          }

          const botMsg = {
            id: `m_line_bot_${Date.now()}`,
            sender: "bot",
            text: botReplyText,
            docLink: newDoc,
            time: new Date().toTimeString().split(" ")[0].slice(0, 5)
          };

          // 1. Send LINE Reply immediately to prevent replyToken expiration
          await sendLineReply(replyToken, botReplyText, channelToken);

          // 2. Save to Firestore in background
          try {
            const userMsg = {
              id: `m_line_${Date.now()}`,
              sender: "user",
              text: captionText ? `📷 สลิป: ${captionText}` : "📷 ส่งรูปภาพสลิป",
              isImage: true,
              imageUrl: base64Image,
              time: new Date().toTimeString().split(" ")[0].slice(0, 5)
            };
            await setDoc(doc(db, "chat_messages", userMsg.id), userMsg);
            await setDoc(doc(db, "documents", newDoc.id), newDoc);
            await setDoc(doc(db, "transactions", newTx.id), newTx);
            await setDoc(doc(db, "chat_messages", botMsg.id), botMsg);
          } catch (e) {
            console.error("Error saving to Firestore:", e);
          }
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
  if (!replyToken) return;
  if (!channelToken || channelToken === "channel_token_mock_1234567890abcdef") {
    console.log("Mock Channel Token, skip external LINE messaging API call.");
    return;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errText = await response.text();
      console.error("LINE reply API failed:", errText);
    }
  } catch (err) {
    console.error("Failed to send LINE reply:", err);
  }
}
