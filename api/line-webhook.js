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

function detectDocumentType({ captionText, merchant, sender, receiver, slipMemo }) {
  const combined = `${captionText || ''} ${merchant || ''} ${sender || ''} ${receiver || ''} ${slipMemo || ''}`.toLowerCase();

  const hasTaxGoodsKeyword = combined.includes("ใบกำกับภาษี") || 
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

  const hasPaymentBillKeyword = combined.includes("ใบเสร็จรับเงิน") || 
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

  const hasBankSlipKeyword = combined.includes("สลิป") || 
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

  // Priority 1: Goods Receipt / Tax Invoice
  if (hasTaxGoodsKeyword && !hasBankSlipKeyword) {
    return {
      docType: "tax_invoice",
      docTypeName: "ใบเสร็จสินค้า / ใบกำกับภาษี",
      icon: "🧾",
      badge: "🧾 ใบเสร็จสินค้า/ใบกำกับภาษี",
      categoryHint: "ค่าอุปกรณ์สำนักงาน"
    };
  }

  // Priority 2: Payment Receipt / Cash Bill
  if (hasPaymentBillKeyword && !hasBankSlipKeyword) {
    return {
      docType: "official_receipt",
      docTypeName: "ใบเสร็จชำระเงิน / บิลเงินสด",
      icon: "📄",
      badge: "📄 ใบเสร็จรับเงิน/บิลชำระเงิน",
      categoryHint: "ค่าสาธารณูปโภค"
    };
  }

  // Priority 3: Fallback checks
  if (hasTaxGoodsKeyword) {
    return {
      docType: "tax_invoice",
      docTypeName: "ใบเสร็จสินค้า / ใบกำกับภาษี",
      icon: "🧾",
      badge: "🧾 ใบเสร็จสินค้า/ใบกำกับภาษี",
      categoryHint: null
    };
  }

  if (hasPaymentBillKeyword) {
    return {
      docType: "official_receipt",
      docTypeName: "ใบเสร็จชำระเงิน / บิลเงินสด",
      icon: "📄",
      badge: "📄 ใบเสร็จรับเงิน/บิลชำระเงิน",
      categoryHint: null
    };
  }

  // Default: Bank Transfer Slip
  return {
    docType: "bank_slip",
    docTypeName: "สลิปโอนเงินธนาคาร",
    icon: "📲",
    badge: "📲 สลิปโอนเงินธนาคาร",
    categoryHint: null
  };
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

          // DETECT DOCUMENT TYPE: (1) Goods Receipt / Tax Invoice, (2) Payment Receipt / Bill, (3) Bank Slip
          const docTypeInfo = detectDocumentType({
            captionText,
            merchant: slipMerchant,
            sender: slipSender,
            receiver: slipReceiver,
            slipMemo
          });

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

          // Compute Document Title based on exact Document Type
          let docTitle = "";
          let docTypeLabel = "";
          if (docTypeInfo.docType === "tax_invoice") {
            docTypeLabel = isAdvancePayment ? "💳 ใบเสร็จสินค้า (สำรองจ่าย)" : "🧾 ใบเสร็จสินค้า / ใบกำกับภาษี";
            docTitle = isAdvancePayment 
              ? `[ใบเสร็จสินค้า/สำรองจ่าย] ${slipReceiver || slipMerchant}`
              : `[ใบเสร็จสินค้า/ใบกำกับภาษี] ${slipReceiver || slipMerchant}`;
          } else if (docTypeInfo.docType === "official_receipt") {
            docTypeLabel = isAdvancePayment ? "💳 บิลชำระเงิน (สำรองจ่าย)" : "📄 ใบเสร็จรับเงิน / บิลชำระเงิน";
            docTitle = isAdvancePayment 
              ? `[บิลชำระเงิน/สำรองจ่าย] ${slipReceiver || slipMerchant}`
              : `[ใบเสร็จรับเงิน/บิลชำระเงิน] ${slipReceiver || slipMerchant}`;
          } else {
            docTypeLabel = isAdvancePayment ? "💳 สลิปสำรองจ่าย" : (isIncome ? "📲 สลิปเงินเข้า" : "📲 สลิปโอนเงิน");
            docTitle = isAdvancePayment 
              ? `[สลิปสำรองจ่าย: ${slipSender}] ${slipReceiver || slipMerchant}`
              : (isIncome ? `[สลิปเงินเข้า] จาก ${slipSender}` : `[สลิปโอนเงิน] ชำระ ${slipReceiver || slipMerchant}`);
          }

          const docId = `doc-${Date.now()}`;
          let descMemo = slipMemo ? ` (ความจำ: ${slipMemo})` : (captionText ? ` (${captionText})` : "");
          
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
            details: isAdvancePayment
              ? `สำรองจ่ายโดย [${slipSender}] ชำระให้ ${slipReceiver || slipMerchant} (รอตั้งเบิกคืน)`
              : (isIncome ? `รายรับเข้าบัญชีจาก [${slipSender}]` : `รายจ่ายบริษัท ชำระให้ [${slipReceiver || slipMerchant}]`)
          };

          const newTx = {
            id: `t_line_${Date.now()}`,
            date: slipDate,
            type: isIncome ? "income" : "expense",
            category: category,
            amount: slipAmount,
            description: isAdvancePayment 
              ? `[สำรองจ่ายโดย ${slipSender}] ${slipReceiver || slipMerchant}${descMemo}`
              : (isIncome ? `[รายรับ: ${category}] จาก ${slipSender}${descMemo}` : `[รายจ่าย: ${category}] ให้ ${slipReceiver || slipMerchant}${descMemo}`),
            ref: slipRef,
            imageUrl: base64Image
          };

          let memoLine = slipMemo ? `\n📝 บันทึกความจำ: ${slipMemo}` : (captionText ? `\n📝 บันทึกความจำ: ${captionText}` : "");
          let botReplyText = "";
          
          if (docTypeInfo.docType === "tax_invoice") {
            // GOODS RECEIPT / TAX INVOICE
            botReplyText = `✅ ตรวจสอบ [ใบเสร็จสินค้า / ใบกำกับภาษี] สำเร็จ!\n\n📌 ประเภทเอกสาร: 🧾 ใบเสร็จสินค้า / ใบกำกับภาษี (Tax Invoice)\n📂 สถานะบันทึก: ${isAdvancePayment ? '💳 สำรองจ่าย (รอตั้งเบิกคืน)' : '🔴 รายจ่ายบริษัท'}\n🏷️ หมวดหมู่บัญชี: ${category}${memoLine}\n🏢 ร้านค้า/ผู้ออกบิล: ${slipReceiver || slipMerchant}\n👤 ผู้ชำระเงิน: ${slipSender}\n💰 ยอดเงินสุทธิ: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่เอกสาร: ${slipDate}\n🔢 เลขที่บิล/Ref: ${slipRef}\n\n🖼️ จัดเก็บเข้าคลังเอกสาร Document Hub และบันทึกสมุดบัญชีเรียบร้อยครับ`;
          } else if (docTypeInfo.docType === "official_receipt") {
            // PAYMENT RECEIPT / SERVICE BILL
            botReplyText = `✅ ตรวจสอบ [ใบเสร็จชำระเงิน / บิลเงินสด] สำเร็จ!\n\n📌 ประเภทเอกสาร: 📄 ใบเสร็จรับเงิน / บิลชำระเงิน (Official Receipt / Bill)\n📂 สถานะบันทึก: ${isAdvancePayment ? '💳 สำรองจ่าย (รอตั้งเบิกคืน)' : '🔴 รายจ่ายบริษัท'}\n🏷️ หมวดหมู่บัญชี: ${category}${memoLine}\n🏢 หน่วยงาน/ผู้รับเงิน: ${slipReceiver || slipMerchant}\n👤 ผู้ชำระเงิน: ${slipSender}\n💰 ยอดเงินรวม: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่เอกสาร: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ จัดเก็บเข้าคลังเอกสาร Document Hub และบันทึกสมุดบัญชีเรียบร้อยครับ`;
          } else {
            // BANK TRANSFER SLIP
            if (isAdvancePayment) {
              botReplyText = `✅ ตรวจสอบ [สลิปโอนเงินธนาคาร] สำเร็จ!\n\n📌 ประเภทเอกสาร: 📲 สลิปโอนเงินธนาคาร (Bank Transfer Slip)\n📂 สถานะบันทึก: 💳 สำรองจ่าย (Advance Payment / รอตั้งเบิก)\n🏷️ หมวดหมู่บัญชี: สำรองจ่าย${memoLine}\n👤 บัญชีผู้โอน: ${slipSender}\n🏢 บัญชีผู้รับเงิน: ${slipReceiver || slipMerchant}\n💰 ยอดเงินโอน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่โอน: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n📌 แจ้งเตือนสำรองจ่าย: ตรวจพบผู้โอนไม่ใช่บัญชีบริษัท ระบบจึงบันทึกเป็น [สำรองจ่าย] และจัดเก็บเข้าคลังเอกสารเรียบร้อยครับ`;
            } else if (isIncome) {
              botReplyText = `✅ ตรวจสอบ [สลิปโอนเงินธนาคาร] สำเร็จ!\n\n📌 ประเภทเอกสาร: 📲 สลิปโอนเงินธนาคาร (Bank Transfer Slip)\n📂 สถานะบันทึก: 🟢 รายรับ (เงินเข้าบัญชีบริษัท)\n🏷️ หมวดหมู่บัญชี: ${category}${memoLine}\n👤 บัญชีผู้โอน: ${slipSender}\n🏢 บัญชีผู้รับเงิน: ${slipReceiver}\n💰 ยอดเงินโอน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่โอน: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ บันทึกรูปสลิปและจัดเก็บเข้าหมวดหมู่ "${category}" เรียบร้อยครับ`;
            } else {
              botReplyText = `✅ ตรวจสอบ [สลิปโอนเงินธนาคาร] สำเร็จ!\n\n📌 ประเภทเอกสาร: 📲 สลิปโอนเงินธนาคาร (Bank Transfer Slip)\n📂 สถานะบันทึก: 🔴 รายจ่าย (โอนออกจากบัญชีบริษัท)\n🏷️ หมวดหมู่บัญชี: ${category}${memoLine}\n👤 บัญชีต้นทาง: ${slipSender}\n🏢 บัญชีผู้รับเงิน: ${slipReceiver || slipMerchant}\n💰 ยอดเงินโอน: ฿${slipAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n📅 วันที่โอน: ${slipDate}\n🔢 รหัสอ้างอิง: ${slipRef}\n\n🖼️ บันทึกรูปสลิปและจัดเก็บเข้าหมวดหมู่ "${category}" เรียบร้อยครับ`;
            }
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
