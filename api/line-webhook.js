import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqLwYJ9m8VZxLHprterX_o-0AiAR9kSAM",
  authDomain: "smart-3c6d8.firebaseapp.com",
  projectId: "smart-3c6d8",
  storageBucket: "smart-3c6d8.firebasestorage.app",
  messagingSenderId: "314812614488",
  appId: "1:314812614488:web:79a2696302699414be472d"
};

// Initialize Firebase once
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// In-memory cache for settings
let cachedSettings = null;
let cacheTime = 0;

async function getCachedSettings() {
  const now = Date.now();
  if (cachedSettings && cachedSettings.lineChannelToken && now - cacheTime < 60000) {
    return cachedSettings;
  }
  let result = {};
  try {
    const docRef = doc(db, "settings", "global");
    const docSnap = await Promise.race([
      getDoc(docRef),
      new Promise(resolve => setTimeout(() => resolve(null), 1000))
    ]);
    if (docSnap && docSnap.exists()) {
      result = { ...result, ...docSnap.data() };
    }
  } catch (e) {}

  if (!result.lineChannelToken) {
    try {
      const q = query(collection(db, "settings"), limit(5));
      const snap = await Promise.race([
        getDocs(q),
        new Promise(resolve => setTimeout(() => resolve({ empty: true }), 1000))
      ]);
      if (snap && snap.docs) {
        snap.docs.forEach(d => {
          result = { ...result, ...d.data() };
        });
      }
    } catch (e) {}
  }

  cachedSettings = result;
  cacheTime = now;
  return result;
}

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

function detectDocumentType({ captionText, merchant, sender, receiver, slipMemo }) {
  const combined = `${captionText || ''} ${merchant || ''} ${sender || ''} ${receiver || ''} ${slipMemo || ''}`.toLowerCase();

  const isGoodsReceipt = combined.includes("ใบกำกับภาษี") || 
                         combined.includes("tax invoice") || 
                         combined.includes("ใบเสร็จอย่างย่อ") || 
                         combined.includes("ใบเสร็จสินค้า") || 
                         combined.includes("สินค้า") || 
                         combined.includes("7-eleven") || 
                         combined.includes("7-11") || 
                         combined.includes("เซเว่น") || 
                         combined.includes("แม็คโคร") || 
                         combined.includes("makro") || 
                         combined.includes("โลตัส") || 
                         combined.includes("lotus") || 
                         combined.includes("big c") || 
                         combined.includes("บิ๊กซี") || 
                         combined.includes("โกลบอล") || 
                         combined.includes("global") || 
                         combined.includes("ไทวัสดุ") || 
                         combined.includes("homepro") || 
                         combined.includes("โฮมโปร") || 
                         combined.includes("dohome") || 
                         combined.includes("ดูโฮม") || 
                         combined.includes("ปตท") || 
                         combined.includes("ptt") || 
                         combined.includes("น้ำมัน") || 
                         combined.includes("vat") || 
                         combined.includes("pos") ||
                         combined.includes("cashier") ||
                         combined.includes("ปั๊ม");

  const isPaymentBill = combined.includes("ใบเสร็จรับเงิน") || 
                        combined.includes("ใบเสร็จชำระ") || 
                        combined.includes("บิลเงินสด") || 
                        combined.includes("บิลชำระ") || 
                        combined.includes("receipt") || 
                        combined.includes("cash receipt") || 
                        combined.includes("ais") || 
                        combined.includes("true") || 
                        combined.includes("dtac") || 
                        combined.includes("tot") || 
                        combined.includes("nt") || 
                        combined.includes("ไฟฟ้า") || 
                        combined.includes("ประปา") || 
                        combined.includes("ค่าเช่า") || 
                        combined.includes("ค่าบริการ") || 
                        combined.includes("อินเทอร์เน็ต") || 
                        combined.includes("ค่าเน็ต") || 
                        combined.includes("บิลเขียนมือ") ||
                        combined.includes("ค่าโทรศัพท์");

  const isBankTransfer = combined.includes("สลิป") || 
                         combined.includes("slip") || 
                         combined.includes("โอนเงิน") || 
                         combined.includes("โอนสำเร็จ") || 
                         combined.includes("kplus") || 
                         combined.includes("kbank") || 
                         combined.includes("scb") || 
                         combined.includes("mymo") || 
                         combined.includes("gsb") || 
                         combined.includes("krungthai") || 
                         combined.includes("promptpay") || 
                         combined.includes("พร้อมเพย์");

  if (isGoodsReceipt && !isBankTransfer) {
    return { docType: "tax_invoice", name: "ใบเสร็จสินค้า / ใบกำกับภาษี", badge: "🧾 ใบเสร็จสินค้า/ใบกำกับภาษี" };
  }
  if (isPaymentBill && !isBankTransfer) {
    return { docType: "official_receipt", name: "ใบเสร็จชำระเงิน / บิลเงินสด", badge: "📄 ใบเสร็จรับเงิน/บิลชำระเงิน" };
  }
  if (isGoodsReceipt) {
    return { docType: "tax_invoice", name: "ใบเสร็จสินค้า / ใบกำกับภาษี", badge: "🧾 ใบเสร็จสินค้า/ใบกำกับภาษี" };
  }
  if (isPaymentBill) {
    return { docType: "official_receipt", name: "ใบเสร็จชำระเงิน / บิลเงินสด", badge: "📄 ใบเสร็จรับเงิน/บิลชำระเงิน" };
  }
  return { docType: "bank_slip", name: "สลิปโอนเงินธนาคาร", badge: "📲 สลิปโอนเงินธนาคาร" };
}

// Accurate category detection without defaulting to Travel/Fuel every time
function detectCategory(text, defaultIsIncome) {
  if (!text) return { category: defaultIsIncome ? "รายได้จากการขาย" : "สำรองจ่าย", isIncome: defaultIsIncome };
  const raw = String(text).toLowerCase();
  
  // 1. ค่าอาหารและเครื่องดื่ม
  if (raw.includes("อาหาร") || raw.includes("ข้าว") || raw.includes("กาแฟ") || raw.includes("เครื่องดื่ม") || raw.includes("กิน") || raw.includes("7-11") || raw.includes("เซเว่น") || raw.includes("food") || raw.includes("coffee") || raw.includes("ร้านอาหาร") || raw.includes("cafe") || raw.includes("คาเฟ่") || raw.includes("ชา")) {
    return { category: "ค่าอาหารและเครื่องดื่ม", isIncome: false };
  }

  // 2. ค่าอุปกรณ์สำนักงาน / เครื่องใช้
  if (raw.includes("อุปกรณ์") || raw.includes("ของเข้าออฟฟิศ") || raw.includes("ซื้อของ") || raw.includes("โกลบอล") || raw.includes("แม็คโคร") || raw.includes("กระดาษ") || raw.includes("หมึก") || raw.includes("ของใช้") || raw.includes("office") || raw.includes("ไทวัสดุ") || raw.includes("โฮมโปร") || raw.includes("เครื่องเขียน") || raw.includes("ของ") || raw.includes("เครื่องมือ")) {
    return { category: "ค่าอุปกรณ์สำนักงาน", isIncome: false };
  }

  // 3. ค่าสาธารณูปโภค (น้ำ, ไฟ, เน็ต, มือถือ)
  if (raw.includes("ais") || raw.includes("เติมเงิน") || raw.includes("เน็ต") || raw.includes("โทรศัพท์") || raw.includes("มือถือ") || raw.includes("true") || raw.includes("dtac") || raw.includes("ไฟฟ้า") || raw.includes("การไฟฟ้า") || raw.includes("ประปา") || raw.includes("การประปา") || raw.includes("สาธารณูปโภค") || raw.includes("ค่าน้ำ") || raw.includes("ค่าไฟ") || raw.includes("tot") || raw.includes("nt")) {
    return { category: "ค่าสาธารณูปโภค", isIncome: false };
  }

  // 4. ค่าเดินทางและยานพาหนะ (Only when specifically related to travel/fuel/vehicle)
  if (raw.includes("เติมน้ำมัน") || raw.includes("ค่าน้ำมัน") || raw.includes("ปั๊มน้ำมัน") || raw.includes("ทางด่วน") || raw.includes("ค่ารถ") || raw.includes("ซ่อมรถ") || raw.includes("แท็กซี่") || raw.includes("grab") || raw.includes("bolt") || raw.includes("ค่าเดินทาง") || raw.includes("น้ำมันรถ")) {
    return { category: "ค่าเดินทางและยานพาหนะ", isIncome: false };
  }

  // 5. ค่าเช่าสถานที่
  if (raw.includes("ค่าเช่า") || raw.includes("เช่าออฟฟิศ") || raw.includes("ค่าเช่าห้อง") || raw.includes("rent")) {
    return { category: "ค่าเช่าสถานที่", isIncome: false };
  }

  // 6. ค่าซ่อมแซมและบำรุงรักษา
  if (raw.includes("ซ่อม") || raw.includes("บำรุง") || raw.includes("ช่าง") || raw.includes("repair") || raw.includes("อะไหล่")) {
    return { category: "ค่าซ่อมแซมและบำรุงรักษา", isIncome: false };
  }

  // 7. ค่าโฆษณาและการตลาด
  if (raw.includes("โฆษณา") || raw.includes("การตลาด") || raw.includes("ads") || raw.includes("marketing") || raw.includes("ยิงแอด") || raw.includes("facebook") || raw.includes("google")) {
    return { category: "ค่าโฆษณาและการตลาด", isIncome: false };
  }

  // 8. รายได้จากการขาย / บริการ
  if (raw.includes("ขาย") || raw.includes("ยอดขาย") || raw.includes("ลูกค้าโอน") || raw.includes("sale") || raw.includes("เงินเข้า")) {
    return { category: "รายได้จากการขาย", isIncome: true };
  }
  if (raw.includes("บริการ") || raw.includes("ค่าบริการ") || raw.includes("service")) {
    return { category: "รายได้จากการบริการ", isIncome: true };
  }

  // Default: สำรองจ่าย (or general expense)
  return { category: defaultIsIncome ? "รายได้จากการขาย" : "สำรองจ่าย", isIncome: defaultIsIncome };
}

// Category switcher mapping
const CATEGORY_MAP = {
  "1": "ค่าอาหารและเครื่องดื่ม",
  "อาหาร": "ค่าอาหารและเครื่องดื่ม",
  "ค่าอาหาร": "ค่าอาหารและเครื่องดื่ม",
  "ข้าว": "ค่าอาหารและเครื่องดื่ม",
  "2": "ค่าอุปกรณ์สำนักงาน",
  "ของใช้": "ค่าอุปกรณ์สำนักงาน",
  "อุปกรณ์": "ค่าอุปกรณ์สำนักงาน",
  "เครื่องเขียน": "ค่าอุปกรณ์สำนักงาน",
  "ซื้อของ": "ค่าอุปกรณ์สำนักงาน",
  "3": "ค่าเดินทางและยานพาหนะ",
  "น้ำมัน": "ค่าเดินทางและยานพาหนะ",
  "ค่าน้ำมัน": "ค่าเดินทางและยานพาหนะ",
  "เดินทาง": "ค่าเดินทางและยานพาหนะ",
  "ค่ารถ": "ค่าเดินทางและยานพาหนะ",
  "4": "ค่าสาธารณูปโภค",
  "ค่าไฟ": "ค่าสาธารณูปโภค",
  "ค่าน้ำ": "ค่าสาธารณูปโภค",
  "สาธารณูปโภค": "ค่าสาธารณูปโภค",
  "เน็ต": "ค่าสาธารณูปโภค",
  "ค่าเน็ต": "ค่าสาธารณูปโภค",
  "โทรศัพท์": "ค่าสาธารณูปโภค",
  "5": "ค่าเช่าสถานที่",
  "ค่าเช่า": "ค่าเช่าสถานที่",
  "เช่า": "ค่าเช่าสถานที่",
  "6": "สำรองจ่าย",
  "สำรอง": "สำรองจ่าย",
  "เบิก": "สำรองจ่าย",
  "7": "ค่าซ่อมแซมและบำรุงรักษา",
  "ซ่อม": "ค่าซ่อมแซมและบำรุงรักษา",
  "8": "ค่าโฆษณาและการตลาด",
  "โฆษณา": "ค่าโฆษณาและการตลาด",
  "การตลาด": "ค่าโฆษณาและการตลาด",
  "9": "รายได้จากการขาย",
  "ขาย": "รายได้จากการขาย",
  "รายรับ": "รายได้จากการขาย"
};

const CATEGORY_GUIDE_MENU = `\n\n💡 ต้องการเปลี่ยนหมวดหมู่ง่ายๆ? พิมพ์ตัวเลขหรือชื่อหมวดได้ทันที:\n1️⃣ พิมพ์ "1" หรือ "อาหาร" 👉 ค่าอาหารและเครื่องดื่ม\n2️⃣ พิมพ์ "2" หรือ "ของใช้" 👉 ค่าอุปกรณ์สำนักงาน\n3️⃣ พิมพ์ "3" หรือ "น้ำมัน" 👉 ค่าเดินทางและยานพาหนะ\n4️⃣ พิมพ์ "4" หรือ "ค่าไฟ" 👉 ค่าสาธารณูปโภค\n5️⃣ พิมพ์ "5" หรือ "ค่าเช่า" 👉 ค่าเช่าสถานที่\n6️⃣ พิมพ์ "6" หรือ "สำรองจ่าย" 👉 สำรองจ่าย`;

export default async function handler(req, res) {
  // CORS & Health check
  if (req.method === "OPTIONS" || req.method === "GET") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).send("LINE Webhook Ready");
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
    if (!events || events.length === 0) {
      return res.status(200).send("OK");
    }

    // Fast settings load
    const settings = await getCachedSettings();
    const channelToken = process.env.LINE_CHANNEL_TOKEN || 
                         process.env.LINE_CHANNEL_ACCESS_TOKEN || 
                         settings.lineChannelToken || 
                         "channel_token_mock_1234567890abcdef";

    for (const event of events) {
      if (event.type === "message") {
        const replyToken = event.replyToken;
        const message = event.message || {};

        if (message.type === "text") {
          const userText = (message.text || "").trim();
          const lowerText = userText.toLowerCase();

          // 1. CHECK IF USER IS SENDING A CATEGORY SWITCH COMMAND (e.g. "1", "2", "อาหาร", "ของใช้", "น้ำมัน")
          const targetCategory = CATEGORY_MAP[userText] || CATEGORY_MAP[lowerText];

          if (targetCategory) {
            // Find latest document and transaction in Firestore
            let updatedDoc = null;
            let updatedTx = null;

            try {
              const docSnap = await getDocs(query(collection(db, "documents"), limit(10)));
              if (docSnap && docSnap.docs.length > 0) {
                // Find latest document
                const latestDocSnap = docSnap.docs[docSnap.docs.length - 1];
                const docData = latestDocSnap.data();
                updatedDoc = { ...docData, id: latestDocSnap.id, category: targetCategory };
                await setDoc(doc(db, "documents", latestDocSnap.id), updatedDoc);
              }

              const txSnap = await getDocs(query(collection(db, "transactions"), limit(10)));
              if (txSnap && txSnap.docs.length > 0) {
                const latestTxSnap = txSnap.docs[txSnap.docs.length - 1];
                const txData = latestTxSnap.data();
                updatedTx = { 
                  ...txData, 
                  id: latestTxSnap.id, 
                  category: targetCategory,
                  description: `[${targetCategory}] ${txData.description?.replace(/\[.*?\]\s*/, '') || ''}`
                };
                await setDoc(doc(db, "transactions", latestTxSnap.id), updatedTx);
              }
            } catch (e) {
              console.warn("Category switch update error:", e.message);
            }

            const confirmReply = `✅ ปรับเปลี่ยนหมวดหมู่สำเร็จ!\n\n🏷️ หมวดหมู่ใหม่: ${targetCategory}\n💰 ยอดเงิน: ${updatedDoc ? '฿' + Number(updatedDoc.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : 'บันทึกเรียบร้อย'}\n\n🖼️ ข้อมูลในคลังเอกสารและสมุดบัญชีได้รับการอัปเดตเรียบร้อยครับ ✨`;
            await sendLineReply(replyToken, confirmReply, channelToken);
            continue;
          }

          // 2. CHECK IF USER IS ASKING FOR SUMMARY OR RECORDING AN EXPENSE BY TEXT
          const numMatch = userText.match(/(\d+(\.\d+)?)/);
          let botReplyText = "";

          if (userText.includes("สรุป") || userText.toLowerCase().includes("summary")) {
            botReplyText = `📊 ตรวจสอบรายงานสรุปการเงิน และยอดรอเบิกสำรองจ่าย ได้ทางหน้าเว็บแดชบอร์ด Vercel นะครับ`;
          } else if (numMatch && (userText.length <= 40 || userText.includes("ค่า") || userText.includes("บิล") || userText.includes("ใบเสร็จ") || userText.includes("สลิป"))) {
            const amount = parseFloat(numMatch[1]);
            const detected = detectCategory(userText, false);
            const detectedDocType = detectDocumentType({ captionText: userText, merchant: userText });
            const todayStr = new Date().toISOString().split("T")[0];
            const refNo = `Txt-${Math.floor(Math.random() * 900000) + 100000}`;

            const newDoc = {
              id: `doc-${Date.now()}`,
              date: todayStr,
              time: new Date().toTimeString().split(" ")[0].slice(0, 5),
              type: detected.isIncome ? "receipt" : "tax_invoice",
              docType: detectedDocType.docType,
              docTypeLabel: detectedDocType.badge,
              title: `[${detectedDocType.name}] ${userText}`,
              ref: refNo,
              amount: amount,
              merchant: userText,
              category: detected.category,
              sender: "ผู้บันทึกผ่าน LINE",
              receiver: "บริษัท เอวาริณณ์ อินเตอร์กรุ๊ป จำกัด",
              status: "archived",
              details: `บันทึกรายการผ่านข้อความ LINE: ${userText}`
            };

            const newTx = {
              id: `t_line_${Date.now()}`,
              date: todayStr,
              type: detected.isIncome ? "income" : "expense",
              category: detected.category,
              amount: amount,
              description: `[${detected.category}] ${userText}`,
              ref: refNo
            };

            botReplyText = `✅ บันทึกบัญชีสำเร็จ!\n\n📌 ประเภท: ${detectedDocType.badge}\n🏷️ หมวดหมู่: ${detected.category}\n💰 ยอดเงิน: ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${todayStr}\n🔢 รหัสอ้างอิง: ${refNo}\n\n🖼️ บันทึกเข้าสมุดบัญชีเรียบร้อยครับ${CATEGORY_GUIDE_MENU}`;

            // Save to Firestore and send LINE reply in parallel
            await Promise.allSettled([
              setDoc(doc(db, "documents", newDoc.id), newDoc),
              setDoc(doc(db, "transactions", newTx.id), newTx),
              sendLineReply(replyToken, botReplyText, channelToken)
            ]);
          } else {
            botReplyText = `รับทราบข้อความ: "${userText}" ครับ\n\n💡 คำสั่งด่วน:\n⚡ พิมพ์ยอดเงิน เช่น "200", "ค่าอาหาร 350", "ของใช้ 480"\n⚡ พิมพ์ "สรุป" เพื่อดูภาพรวม\n⚡ แนบรูปสลิป/บิล เพื่อสแกนลงบัญชีอัตโนมัติ${CATEGORY_GUIDE_MENU}`;
            await sendLineReply(replyToken, botReplyText, channelToken);
          }

        } else if (message.type === "image" || message.type === "file") {
          // Handle both image and file uploads
          const messageId = message.id;
          let captionText = message.text || message.fileName || "";

          let slipAmount = 200;
          let slipDate = new Date().toISOString().split("T")[0];
          let slipTime = new Date().toTimeString().split(" ")[0].slice(0, 5);
          let slipRef = `Ref-${Math.floor(Math.random() * 900000) + 100000}`;
          let slipSender = "นาย ศักรินทร์ อดกล้า";
          let slipReceiver = "";
          let slipMerchant = "";
          let base64Image = null;
          let slipMemo = "";

          // Fast image OCR with aggressive 2.5s timeout
          const slipokApiKey = process.env.SLIPOK_API_KEY || settings.slipokApiKey;
          const hasSlipok = slipokApiKey && !slipokApiKey.startsWith("slipok_api_key_mock") && slipokApiKey.trim() !== "";
          const hasLineToken = channelToken && !channelToken.startsWith("channel_token_mock");

          if (hasLineToken) {
            try {
              const lineImgUrl = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
              const lineCtrl = new AbortController();
              const lineTid = setTimeout(() => lineCtrl.abort(), 2500);

              const lineRes = await fetch(lineImgUrl, {
                headers: { Authorization: `Bearer ${channelToken}` },
                signal: lineCtrl.signal
              });
              clearTimeout(lineTid);

              if (lineRes.ok) {
                const imageBuffer = await lineRes.arrayBuffer();
                if (imageBuffer && imageBuffer.byteLength > 0) {
                  base64Image = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString("base64")}`;

                  if (hasSlipok) {
                    let branchId = "71669";
                    const rawBranch = process.env.SLIPOK_BRANCH_ID || settings.slipokBranchId;
                    if (rawBranch && rawBranch.trim() !== "") {
                      const match = rawBranch.match(/(\d+)$/);
                      branchId = match ? match[1] : rawBranch.trim();
                    }

                    const formData = new FormData();
                    formData.append("files", new Blob([imageBuffer], { type: "image/jpeg" }), "slip.jpg");

                    const ocrCtrl = new AbortController();
                    const ocrTid = setTimeout(() => ocrCtrl.abort(), 2500);

                    const slipokRes = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
                      method: "POST",
                      headers: { "x-authorization": slipokApiKey },
                      body: formData,
                      signal: ocrCtrl.signal
                    });
                    clearTimeout(ocrTid);

                    if (slipokRes.ok) {
                      const ocrData = await slipokRes.json();
                      if (ocrData.success && ocrData.data) {
                        const d = ocrData.data;
                        slipAmount = parseFloat(d.amount) || slipAmount;
                        if (d.transDate) slipDate = formatSlipDate(d.transDate);
                        slipTime = d.transTime || slipTime;
                        slipRef = d.refNo || slipRef;
                        if (d.sender && (d.sender.displayName || d.sender.name)) {
                          slipSender = d.sender.displayName || d.sender.name;
                        }
                        if (d.receiver && (d.receiver.displayName || d.receiver.name)) {
                          slipReceiver = d.receiver.displayName || d.receiver.name;
                        }
                        if (d.merchant && (d.merchant.displayName || d.merchant.name)) {
                          slipMerchant = d.merchant.displayName || d.merchant.name;
                        }
                        if (d.memo || d.note || d.remark || d.comment) {
                          slipMemo = String(d.memo || d.note || d.remark || d.comment).trim();
                        }
                      }
                    }
                  }
                }
              }
            } catch (err) {
              console.warn("LINE image download / OCR error:", err.message);
            }
          }

          const displayMerchant = slipReceiver || slipMerchant || "ผู้รับเงิน / ร้านค้า";

          // Document Type & Accurate Categorization
          const docTypeInfo = detectDocumentType({ captionText, merchant: displayMerchant, sender: slipSender, receiver: slipReceiver, slipMemo });

          const sName = (slipSender || "").toLowerCase().trim();
          const rName = (displayMerchant || "").toLowerCase().trim();
          const isAwarinSender = sName.includes("เอวาริณณ์") || sName.includes("awarin");
          const isAwarinReceiver = rName.includes("เอวาริณณ์") || rName.includes("awarin");
          let isIncome = false;
          let isAdvancePayment = true;
          let category = "สำรองจ่าย";

          if (isAwarinReceiver) {
            isIncome = true;
            isAdvancePayment = false;
            category = "รายได้จากการขาย";
          } else if (isAwarinSender) {
            isIncome = false;
            isAdvancePayment = false;
            category = detectCategory(`${displayMerchant} ${captionText} ${slipMemo}`, false).category;
          } else {
            // Check if caption or memo specifies a category, otherwise default to "สำรองจ่าย" (NOT travel/fuel!)
            const detected = detectCategory(`${captionText} ${slipMemo} ${displayMerchant}`, false);
            category = detected.category;
            isIncome = false;
            isAdvancePayment = true;
          }

          let docTitle = "";
          let docTypeLabel = "";
          if (docTypeInfo.docType === "tax_invoice") {
            docTypeLabel = isAdvancePayment ? "💳 ใบเสร็จสินค้า (สำรองจ่าย)" : "🧾 ใบเสร็จสินค้า / ใบกำกับภาษี";
            docTitle = isAdvancePayment ? `[ใบเสร็จสินค้า/สำรองจ่าย] ${displayMerchant}` : `[ใบเสร็จสินค้า/ใบกำกับภาษี] ${displayMerchant}`;
          } else if (docTypeInfo.docType === "official_receipt") {
            docTypeLabel = isAdvancePayment ? "💳 บิลชำระเงิน (สำรองจ่าย)" : "📄 ใบเสร็จรับเงิน / บิลชำระเงิน";
            docTitle = isAdvancePayment ? `[บิลชำระเงิน/สำรองจ่าย] ${displayMerchant}` : `[ใบเสร็จรับเงิน/บิลชำระเงิน] ${displayMerchant}`;
          } else {
            docTypeLabel = isAdvancePayment ? "💳 สลิปสำรองจ่าย" : (isIncome ? "📲 สลิปเงินเข้า" : "📲 สลิปโอนเงิน");
            docTitle = isAdvancePayment ? `[สลิปสำรองจ่าย: ${slipSender}] ${displayMerchant}` : (isIncome ? `[สลิปเงินเข้า] จาก ${slipSender}` : `[สลิปโอนเงิน] ชำระ ${displayMerchant}`);
          }

          const docId = `doc-${Date.now()}`;
          const newDoc = {
            id: docId,
            date: slipDate,
            time: slipTime,
            type: isIncome ? "receipt" : "tax_invoice",
            docType: docTypeInfo.docType,
            docTypeLabel: docTypeLabel,
            title: docTitle,
            ref: slipRef,
            amount: slipAmount,
            merchant: displayMerchant,
            category: category,
            sender: slipSender,
            receiver: displayMerchant,
            imageUrl: base64Image,
            status: "archived",
            details: isAdvancePayment ? `สำรองจ่ายโดย [${slipSender}] ชำระให้ ${displayMerchant} (รอตั้งเบิกคืน)` : (isIncome ? `รายรับเข้าบัญชีจาก [${slipSender}]` : `รายจ่ายบริษัท ชำระให้ [${displayMerchant}]`)
          };

          const newTx = {
            id: `t_line_${Date.now()}`,
            date: slipDate,
            type: isIncome ? "income" : "expense",
            category: category,
            amount: slipAmount,
            description: isAdvancePayment ? `[${category}] สำรองจ่ายโดย ${slipSender} ให้ ${displayMerchant}` : (isIncome ? `[${category}] จาก ${slipSender}` : `[${category}] ให้ ${displayMerchant}`),
            ref: slipRef,
            imageUrl: base64Image
          };

          let memoLine = slipMemo ? `\n📝 บันทึกความจำ: ${slipMemo}` : (captionText ? `\n📝 บันทึกความจำ: ${captionText}` : "");
          let botReplyText = "";
          
          if (docTypeInfo.docType === "tax_invoice") {
            botReplyText = `✅ ตรวจสอบ [ใบเสร็จสินค้า / ใบกำกับภาษี] สำเร็จ!\n\n📌 ประเภท: 🧾 ใบเสร็จสินค้า / ใบกำกับภาษี\n📂 สถานะ: ${isAdvancePayment ? '💳 สำรองจ่าย (รอตั้งเบิกคืน)' : '🔴 รายจ่ายบริษัท'}\n🏷️ หมวดหมู่: ${category}${memoLine}\n🏢 ร้านค้า: ${displayMerchant}\n👤 ผู้ชำระ: ${slipSender}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 เลขที่บิล: ${slipRef}\n\n🖼️ จัดเก็บเข้าคลังเอกสารและสมุดบัญชีเรียบร้อยครับ${CATEGORY_GUIDE_MENU}`;
          } else if (docTypeInfo.docType === "official_receipt") {
            botReplyText = `✅ ตรวจสอบ [ใบเสร็จชำระเงิน / บิลเงินสด] สำเร็จ!\n\n📌 ประเภท: 📄 ใบเสร็จรับเงิน / บิลชำระเงิน\n📂 สถานะ: ${isAdvancePayment ? '💳 สำรองจ่าย (รอตั้งเบิกคืน)' : '🔴 รายจ่ายบริษัท'}\n🏷️ หมวดหมู่: ${category}${memoLine}\n🏢 ผู้รับเงิน: ${displayMerchant}\n👤 ผู้ชำระ: ${slipSender}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ จัดเก็บเข้าคลังเอกสารและสมุดบัญชีเรียบร้อยครับ${CATEGORY_GUIDE_MENU}`;
          } else {
            if (isAdvancePayment) {
              botReplyText = `✅ ตรวจสอบ [สลิปโอนเงิน] สำเร็จ!\n\n📌 ประเภท: 📲 สลิปโอนเงินธนาคาร\n📂 สถานะ: 💳 สำรองจ่าย (รอตั้งเบิกคืน)\n🏷️ หมวดหมู่: ${category}${memoLine}\n👤 ผู้โอน: ${slipSender}\n🏢 ผู้รับเงิน: ${displayMerchant}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n📌 แจ้งเตือน: บัญชีผู้โอนไม่ใช่บัญชีบริษัท ระบบจึงบันทึกเป็น [สำรองจ่าย] เพื่อรอเบิกคืนเรียบร้อยครับ${CATEGORY_GUIDE_MENU}`;
            } else if (isIncome) {
              botReplyText = `✅ ตรวจสอบ [สลิปโอนเงิน] สำเร็จ!\n\n📌 ประเภท: 📲 สลิปโอนเงินธนาคาร\n📂 สถานะ: 🟢 รายรับ (เงินเข้าบริษัท)\n🏷️ หมวดหมู่: ${category}${memoLine}\n👤 ผู้โอน: ${slipSender}\n🏢 ผู้รับ: ${displayMerchant}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ บันทึกเข้าหมวดหมู่ "${category}" เรียบร้อยครับ${CATEGORY_GUIDE_MENU}`;
            } else {
              botReplyText = `✅ ตรวจสอบ [สลิปโอนเงิน] สำเร็จ!\n\n📌 ประเภท: 📲 สลิปโอนเงินธนาคาร\n📂 สถานะ: 🔴 รายจ่าย (เงินออกบริษัท)\n🏷️ หมวดหมู่: ${category}${memoLine}\n👤 ผู้โอน: ${slipSender}\n🏢 ผู้รับ: ${displayMerchant}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ บันทึกเข้าหมวดหมู่ "${category}" เรียบร้อยครับ${CATEGORY_GUIDE_MENU}`;
            }
          }

          // Save to Firestore and send LINE reply concurrently
          await Promise.allSettled([
            setDoc(doc(db, "documents", newDoc.id), newDoc),
            setDoc(doc(db, "transactions", newTx.id), newTx),
            sendLineReply(replyToken, botReplyText, channelToken)
          ]);

        } else {
          // Other message types (sticker, audio, location, file)
          const fallbackReply = `ได้รับข้อมูลเรียบร้อยครับ 💡 คุณสามารถ:\n⚡ ส่งรูปภาพสลิปโอนเงิน หรือ บิลใบเสร็จ เพื่อบันทึกบัญชีอัตโนมัติ\n⚡ พิมพ์ยอดเงิน เช่น "ค่าอาหาร 200", "ของใช้ 150"\n⚡ พิมพ์ "สรุป" เพื่อดูภาพรวมบัญชี${CATEGORY_GUIDE_MENU}`;
          await sendLineReply(replyToken, fallbackReply, channelToken);
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Global Error:", error);
    return res.status(200).send("OK");
  }
}

async function sendLineReply(replyToken, text, channelToken) {
  if (!replyToken) return;

  const token = (channelToken && channelToken !== "channel_token_mock_1234567890abcdef") 
    ? channelToken 
    : (process.env.LINE_CHANNEL_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_ACCESS_TOKEN);

  if (!token || token === "channel_token_mock_1234567890abcdef") {
    console.log("No valid LINE Channel Token configured.");
    return;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: "text", text: text }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error("LINE reply API failed:", response.status, errText);
    }
  } catch (err) {
    console.error("LINE reply fetch error:", err.message);
  }
}
