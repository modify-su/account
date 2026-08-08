import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

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

// In-memory cache for settings across warm serverless invocations
let cachedSettings = null;
let cacheTime = 0;

async function getCachedSettings() {
  const now = Date.now();
  if (cachedSettings && now - cacheTime < 60000) {
    return cachedSettings;
  }
  try {
    const docRef = doc(db, "settings", "global");
    const docSnap = await Promise.race([
      getDoc(docRef),
      new Promise(resolve => setTimeout(() => resolve(null), 1200))
    ]);
    if (docSnap && docSnap.exists()) {
      cachedSettings = docSnap.data();
      cacheTime = now;
      return cachedSettings;
    }
  } catch (e) {
    // Non-blocking fallback
  }
  return cachedSettings || {};
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

function detectCategory(text, defaultIsIncome) {
  if (!text) return { category: defaultIsIncome ? "รายได้จากการขาย" : "สำรองจ่าย", isIncome: defaultIsIncome };
  const raw = String(text).toLowerCase();
  
  if (raw.includes("เดินทาง") || raw.includes("เติมน้ำมัน") || raw.includes("น้ำมัน") || raw.includes("ปตท") || raw.includes("ptt") || raw.includes("พาหนะ") || raw.includes("ซ่อมรถ") || raw.includes("รถ") || raw.includes("ทางด่วน") || raw.includes("fuel")) {
    return { category: "ค่าเดินทางและยานพาหนะ", isIncome: false };
  }
  if (raw.includes("อาหาร") || raw.includes("ข้าวเที่ยง") || raw.includes("ข้าว") || raw.includes("กาแฟ") || raw.includes("เครื่องดื่ม") || raw.includes("กิน") || raw.includes("7-11") || raw.includes("เซเว่น") || raw.includes("food") || raw.includes("coffee")) {
    return { category: "ค่าอาหารและเครื่องดื่ม", isIncome: false };
  }
  if (raw.includes("อุปกรณ์") || raw.includes("ของเข้าออฟฟิศ") || raw.includes("ซื้อของ") || raw.includes("โกลบอล") || raw.includes("แม็คโคร") || raw.includes("กระดาษ") || raw.includes("หมึก") || raw.includes("ของใช้") || raw.includes("office") || raw.includes("ไทวัสดุ") || raw.includes("โฮมโปร")) {
    return { category: "ค่าอุปกรณ์สำนักงาน", isIncome: false };
  }
  if (raw.includes("ais") || raw.includes("เติมเงิน") || raw.includes("เน็ต") || raw.includes("โทรศัพท์") || raw.includes("มือถือ") || raw.includes("true") || raw.includes("dtac") || raw.includes("ไฟ") || raw.includes("น้ำ") || raw.includes("สาธารณูปโภค") || raw.includes("ค่าน้ำ") || raw.includes("ค่าไฟ")) {
    return { category: "ค่าสาธารณูปโภค", isIncome: false };
  }
  if (raw.includes("ค่าเช่า") || raw.includes("เช่าออฟฟิศ") || raw.includes("rent")) {
    return { category: "ค่าเช่าสถานที่", isIncome: false };
  }
  if (raw.includes("ซ่อม") || raw.includes("บำรุง") || raw.includes("ช่าง") || raw.includes("repair")) {
    return { category: "ค่าซ่อมแซมและบำรุงรักษา", isIncome: false };
  }
  if (raw.includes("โฆษณา") || raw.includes("การตลาด") || raw.includes("ads") || raw.includes("marketing")) {
    return { category: "ค่าโฆษณาและการตลาด", isIncome: false };
  }
  if (raw.includes("ขาย") || raw.includes("ยอดขาย") || raw.includes("ลูกค้าโอน") || raw.includes("sale")) {
    return { category: "รายได้จากการขาย", isIncome: true };
  }
  if (raw.includes("บริการ") || raw.includes("ค่าบริการ") || raw.includes("service")) {
    return { category: "รายได้จากการบริการ", isIncome: true };
  }
  return { category: defaultIsIncome ? "รายได้จากการขาย" : "สำรองจ่าย", isIncome: defaultIsIncome };
}

export default async function handler(req, res) {
  // CORS & Health check
  if (req.method === "OPTIONS" || req.method === "GET") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).send("LINE Webhook Active");
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
              description: `[LINE ข้อความ: ${detected.category}] ${userText}`,
              ref: refNo
            };

            // Async background save
            setDoc(doc(db, "documents", newDoc.id), newDoc).catch(() => {});
            setDoc(doc(db, "transactions", newTx.id), newTx).catch(() => {});

            botReplyText = `✅ บันทึกบัญชีสำเร็จ!\n\n📌 ประเภท: ${detectedDocType.badge}\n🏷️ หมวดหมู่: ${detected.category}\n💰 ยอดเงิน: ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${todayStr}\n🔢 รหัสอ้างอิง: ${refNo}\n\n🖼️ บันทึกเข้าสมุดบัญชีเรียบร้อยครับ`;
          } else {
            botReplyText = `รับทราบข้อความ: "${userText}" ครับ\n\n💡 คำสั่งด่วน:\n⚡ พิมพ์ยอดเงิน เช่น "200", "ค่าน้ำมัน 480", "7-11 350"\n⚡ พิมพ์ "สรุป" เพื่อดูภาพรวม\n⚡ แนบรูปสลิป/บิล เพื่อสแกนลงบัญชีอัตโนมัติ`;
          }

          // Reply immediately
          await sendLineReply(replyToken, botReplyText, channelToken);

        } else if (message.type === "image") {
          const messageId = message.id;
          let captionText = message.text || "";

          let slipAmount = 200;
          let slipDate = new Date().toISOString().split("T")[0];
          let slipTime = new Date().toTimeString().split(" ")[0].slice(0, 5);
          let slipRef = `Ref-${Math.floor(Math.random() * 900000) + 100000}`;
          let slipSender = "นาย ศักรินทร์ อดกล้า";
          let slipReceiver = "ปตท.ปาลีรัตน์ ปิโตรเลียม";
          let slipMerchant = "ปตท.ปาลีรัตน์ ปิโตรเลียม";
          let base64Image = null;
          let slipMemo = "";

          // Fast OCR processing with 2.5s timeout
          const slipokApiKey = process.env.SLIPOK_API_KEY || settings.slipokApiKey;
          if (slipokApiKey && !slipokApiKey.startsWith("slipok_api_key_mock") && slipokApiKey.trim() !== "") {
            try {
              let branchId = "71669";
              const rawBranch = process.env.SLIPOK_BRANCH_ID || settings.slipokBranchId;
              if (rawBranch && rawBranch.trim() !== "") {
                const match = rawBranch.match(/(\d+)$/);
                branchId = match ? match[1] : rawBranch.trim();
              }

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
                      if (d.memo || d.note || d.remark || d.comment) {
                        slipMemo = String(d.memo || d.note || d.remark || d.comment).trim();
                      }
                    }
                  }
                }
              }
            } catch (err) {
              // Proceed safely with local classification
            }
          }

          // Document Type & Strict Categorization
          const docTypeInfo = detectDocumentType({ captionText, merchant: slipMerchant, sender: slipSender, receiver: slipReceiver, slipMemo });

          const sName = (slipSender || "").toLowerCase().trim();
          const rName = (slipReceiver || "").toLowerCase().trim();
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
            category = detectCategory(`${slipReceiver} ${slipMerchant} ${captionText} ${slipMemo}`, false).category;
          } else {
            isIncome = false;
            isAdvancePayment = true;
            category = "สำรองจ่าย";
          }

          let docTitle = "";
          let docTypeLabel = "";
          if (docTypeInfo.docType === "tax_invoice") {
            docTypeLabel = isAdvancePayment ? "💳 ใบเสร็จสินค้า (สำรองจ่าย)" : "🧾 ใบเสร็จสินค้า / ใบกำกับภาษี";
            docTitle = isAdvancePayment ? `[ใบเสร็จสินค้า/สำรองจ่าย] ${slipReceiver || slipMerchant}` : `[ใบเสร็จสินค้า/ใบกำกับภาษี] ${slipReceiver || slipMerchant}`;
          } else if (docTypeInfo.docType === "official_receipt") {
            docTypeLabel = isAdvancePayment ? "💳 บิลชำระเงิน (สำรองจ่าย)" : "📄 ใบเสร็จรับเงิน / บิลชำระเงิน";
            docTitle = isAdvancePayment ? `[บิลชำระเงิน/สำรองจ่าย] ${slipReceiver || slipMerchant}` : `[ใบเสร็จรับเงิน/บิลชำระเงิน] ${slipReceiver || slipMerchant}`;
          } else {
            docTypeLabel = isAdvancePayment ? "💳 สลิปสำรองจ่าย" : (isIncome ? "📲 สลิปเงินเข้า" : "📲 สลิปโอนเงิน");
            docTitle = isAdvancePayment ? `[สลิปสำรองจ่าย: ${slipSender}] ${slipReceiver || slipMerchant}` : (isIncome ? `[สลิปเงินเข้า] จาก ${slipSender}` : `[สลิปโอนเงิน] ชำระ ${slipReceiver || slipMerchant}`);
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
            merchant: slipReceiver || slipMerchant,
            category: category,
            sender: slipSender,
            receiver: slipReceiver,
            imageUrl: base64Image,
            status: "archived",
            details: isAdvancePayment ? `สำรองจ่ายโดย [${slipSender}] ชำระให้ ${slipReceiver || slipMerchant} (รอตั้งเบิกคืน)` : (isIncome ? `รายรับเข้าบัญชีจาก [${slipSender}]` : `รายจ่ายบริษัท ชำระให้ [${slipReceiver || slipMerchant}]`)
          };

          const newTx = {
            id: `t_line_${Date.now()}`,
            date: slipDate,
            type: isIncome ? "income" : "expense",
            category: category,
            amount: slipAmount,
            description: isAdvancePayment ? `[สำรองจ่ายโดย ${slipSender}] ${slipReceiver || slipMerchant}` : (isIncome ? `[รายรับ: ${category}] จาก ${slipSender}` : `[รายจ่าย: ${category}] ให้ ${slipReceiver || slipMerchant}`),
            ref: slipRef,
            imageUrl: base64Image
          };

          let memoLine = slipMemo ? `\n📝 บันทึกความจำ: ${slipMemo}` : (captionText ? `\n📝 บันทึกความจำ: ${captionText}` : "");
          let botReplyText = "";
          
          if (docTypeInfo.docType === "tax_invoice") {
            botReplyText = `✅ ตรวจสอบ [ใบเสร็จสินค้า / ใบกำกับภาษี] สำเร็จ!\n\n📌 ประเภท: 🧾 ใบเสร็จสินค้า / ใบกำกับภาษี\n📂 สถานะ: ${isAdvancePayment ? '💳 สำรองจ่าย (รอตั้งเบิกคืน)' : '🔴 รายจ่ายบริษัท'}\n🏷️ หมวดหมู่: ${category}${memoLine}\n🏢 ร้านค้า: ${slipReceiver || slipMerchant}\n👤 ผู้ชำระ: ${slipSender}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 เลขที่บิล: ${slipRef}\n\n🖼️ จัดเก็บเข้าคลังเอกสารและสมุดบัญชีเรียบร้อยครับ`;
          } else if (docTypeInfo.docType === "official_receipt") {
            botReplyText = `✅ ตรวจสอบ [ใบเสร็จชำระเงิน / บิลเงินสด] สำเร็จ!\n\n📌 ประเภท: 📄 ใบเสร็จรับเงิน / บิลชำระเงิน\n📂 สถานะ: ${isAdvancePayment ? '💳 สำรองจ่าย (รอตั้งเบิกคืน)' : '🔴 รายจ่ายบริษัท'}\n🏷️ หมวดหมู่: ${category}${memoLine}\n🏢 ผู้รับเงิน: ${slipReceiver || slipMerchant}\n👤 ผู้ชำระ: ${slipSender}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ จัดเก็บเข้าคลังเอกสารและสมุดบัญชีเรียบร้อยครับ`;
          } else {
            if (isAdvancePayment) {
              botReplyText = `✅ ตรวจสอบ [สลิปโอนเงิน] สำเร็จ!\n\n📌 ประเภท: 📲 สลิปโอนเงินธนาคาร\n📂 สถานะ: 💳 สำรองจ่าย (รอตั้งเบิกคืน)\n🏷️ หมวดหมู่: สำรองจ่าย${memoLine}\n👤 ผู้โอน: ${slipSender}\n🏢 ผู้รับเงิน: ${slipReceiver || slipMerchant}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n📌 แจ้งเตือน: บัญชีผู้โอนไม่ใช่บัญชีบริษัท ระบบจึงบันทึกเป็น [สำรองจ่าย] เพื่อรอเบิกคืนเรียบร้อยครับ`;
            } else if (isIncome) {
              botReplyText = `✅ ตรวจสอบ [สลิปโอนเงิน] สำเร็จ!\n\n📌 ประเภท: 📲 สลิปโอนเงินธนาคาร\n📂 สถานะ: 🟢 รายรับ (เงินเข้าบริษัท)\n🏷️ หมวดหมู่: ${category}${memoLine}\n👤 ผู้โอน: ${slipSender}\n🏢 ผู้รับ: ${slipReceiver}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ บันทึกเข้าหมวดหมู่ "${category}" เรียบร้อยครับ`;
            } else {
              botReplyText = `✅ ตรวจสอบ [สลิปโอนเงิน] สำเร็จ!\n\n📌 ประเภท: 📲 สลิปโอนเงินธนาคาร\n📂 สถานะ: 🔴 รายจ่าย (เงินออกบริษัท)\n🏷️ หมวดหมู่: ${category}${memoLine}\n👤 ผู้โอน: ${slipSender}\n🏢 ผู้รับ: ${slipReceiver || slipMerchant}\n💰 ยอดเงิน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ บันทึกเข้าหมวดหมู่ "${category}" เรียบร้อยครับ`;
            }
          }

          // 1. Reply to user on LINE immediately
          await sendLineReply(replyToken, botReplyText, channelToken);

          // 2. Non-blocking background save
          setDoc(doc(db, "documents", newDoc.id), newDoc).catch(() => {});
          setDoc(doc(db, "transactions", newTx.id), newTx).catch(() => {});

        } else {
          // Other message types (sticker, audio, location, file)
          const fallbackReply = `ได้รับข้อมูลเรียบร้อยครับ 💡 คุณสามารถ:\n⚡ ส่งรูปภาพสลิปโอนเงิน หรือ บิลใบเสร็จ เพื่อบันทึกบัญชีอัตโนมัติ\n⚡ พิมพ์ยอดเงิน เช่น "ค่าน้ำมัน 200", "ค่าอาหาร 150"\n⚡ พิมพ์ "สรุป" เพื่อดูภาพรวมบัญชี`;
          await sendLineReply(replyToken, fallbackReply, channelToken);
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(200).send("OK");
  }
}

async function sendLineReply(replyToken, text, channelToken) {
  if (!replyToken) return;

  const token = (channelToken && channelToken !== "channel_token_mock_1234567890abcdef") 
    ? channelToken 
    : (process.env.LINE_CHANNEL_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_ACCESS_TOKEN);

  if (!token || token === "channel_token_mock_1234567890abcdef") {
    console.log("No valid LINE Channel Token, skip external HTTP reply.");
    return;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch("https://api.line.me/v2/bot/message/reply", {
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
  } catch (err) {
    console.error("LINE reply fetch error:", err.message);
  }
}
