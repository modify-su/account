import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Sun, 
  Moon, 
  Check,
  TrendingUp, 
  Printer, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Settings,
  ShoppingCart,
  MessageSquare,
  Archive,
  Send,
  Image,
  ChevronRight,
  Lock,
  LogOut,
  UserPlus,
  ShieldAlert,
  Eye,
  EyeOff,
  Edit
} from 'lucide-react';

import { 
  isFirebaseConfigured, 
  subscribeToCollection, 
  saveDocToCloud, 
  deleteDocFromCloud 
} from './firebase';



// Default mock data to populate the app on first load
const INITIAL_TRANSACTIONS = [];
const INITIAL_INVOICES = [];

const DEFAULT_SALARY_PROFILES = [
  { id: 'sal_u1', employeeName: 'ผู้ดูแลระบบสูงสุด', employeeRole: 'Admin / Manager', baseSalary: 50000, allowance: 0, deductionSocial: 750, deductionTax: 1500, bankAccount: '123-4-56789-0', bankName: 'กสิกรไทย (KBank)' },
  { id: 'sal_u2', employeeName: 'พนักงานทั่วไป', employeeRole: 'Staff / Operator', baseSalary: 15000, allowance: 1000, deductionSocial: 750, deductionTax: 0, bankAccount: '987-6-54321-0', bankName: 'ไทยพาณิชย์ (SCB)' }
];

const MOCK_SLIPS = [
  {
    id: 'slip-kbank',
    name: 'สลิปโอนเงิน KBank (รายได้)',
    type: 'income',
    merchant: 'ธนาคารกสิกรไทย (KBank)',
    date: '2026-07-18',
    time: '10:15:30',
    amount: 2500,
    ref: 'KB98471049283',
    sender: 'นายสมชาย ยอดดี',
    receiver: 'บริษัท โโฟลว์เล็ดเจอร์ ซอฟต์แวร์ จำกัด',
    category: 'รายได้จากการขาย',
    description: 'โอนค่าสินค้าไอที',
    style: { color: '#00A859', logo: 'KB' }
  },
  {
    id: 'slip-scb',
    name: 'สลิปโอนเงิน SCB (รายได้)',
    type: 'income',
    merchant: 'ธนาคารไทยพาณิชย์ (SCB)',
    date: '2026-07-17',
    time: '14:45:00',
    amount: 1500,
    ref: 'SCB2849104829',
    sender: 'นางสาวสมศรี มีสุข',
    receiver: 'บริษัท โโฟลว์เล็ดเจอร์ ซอฟต์แวร์ จำกัด',
    category: 'รายได้อื่น ๆ',
    description: 'โอนค่าบริการที่ปรึกษา',
    style: { color: '#4E2A84', logo: 'SCB' }
  },
  {
    id: 'bill-office-depot',
    name: 'ใบเสร็จ Office Depot (รายจ่าย)',
    type: 'expense',
    merchant: 'ออฟฟิศ ดีโป้ (Office Depot)',
    date: '2026-07-16',
    time: '11:20:00',
    amount: 3210,
    ref: 'OD-2026-9812',
    sender: '-',
    receiver: 'บริษัท โโฟลว์เล็ดเจอร์ ซอฟต์แวร์ จำกัด',
    category: 'ค่าอุปกรณ์สำนักงาน',
    description: 'ซื้อกระดาษดับเบิ้ลเอ และหมึกพิมพ์เลเซอร์',
    style: { color: '#D21312', logo: 'OD' }
  },
  {
    id: 'bill-7eleven',
    name: 'สลิป 7-Eleven (รายจ่าย)',
    type: 'expense',
    merchant: 'เซเว่น อีเลฟเว่น (7-Eleven)',
    date: '2026-07-15',
    time: '08:30:15',
    amount: 185,
    ref: 'SV-4829104',
    sender: '-',
    receiver: 'ผู้ยื่นบิล',
    category: 'ค่าอาหารและเครื่องดื่ม',
    description: 'อาหารเช้าและกาแฟประชุมทีม',
    style: { color: '#F05A28', logo: '7-11' }
  }
];

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // --- USER AUTHENTICATION & DATABASE STATES ---
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : [
      { id: 'u1', name: 'ผู้ดูแลระบบสูงสุด', username: 'admin', password: 'password123', role: 'admin' },
      { id: 'u2', name: 'พนักงานทั่วไป', username: 'staff', password: 'password123', role: 'staff' }
    ];
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loginTab, setLoginTab] = useState('login'); // login, register
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Login form inputs
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form inputs
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('staff'); // staff, admin

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState(null);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState(() => {
    const saved = localStorage.getItem("flowledger_firebase_config");
    return saved ? JSON.stringify(JSON.parse(saved), null, 2) : "";
  });

  // Settings Sub-Tab
  const [settingsSubTab, setSettingsSubTab] = useState('general'); // general, users

  // --- MENU NAME CUSTOMIZATION STATES ---
  const [menuNames, setMenuNames] = useState(() => {
    const saved = localStorage.getItem('menu_names');
    const defaults = {
      dashboard: 'หน้าหลัก & แดชบอร์ด',
      transactions: 'บัญชีรายรับ-รายจ่าย',
      pos: 'ใบซื้อขายหน้าร้าน POS',
      invoices: 'ออกใบกำกับภาษี',
      linebot: 'ระบบ LINE Bot',
      dochub: 'คลังเอกสารจัดเก็บ',
      salary: 'เงินเดือนพนักงาน',
      settings: 'ตั้งค่าระบบ'
    };
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch {
        return defaults;
      }
    }
    return defaults;
  });
  const [showMenuEditModal, setShowMenuEditModal] = useState(false);
  const [menuForm, setMenuForm] = useState({
    dashboard: menuNames.dashboard,
    transactions: menuNames.transactions,
    pos: menuNames.pos,
    invoices: menuNames.invoices,
    linebot: menuNames.linebot,
    dochub: menuNames.dochub,
    salary: menuNames.salary || 'เงินเดือนพนักงาน',
    settings: menuNames.settings
  });

  // User CRUD Modal Form States
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'staff'
  });
  const [showPasswordMap, setShowPasswordMap] = useState({}); // {userId: boolean}

  // Product CRUD Modal Form States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    sku: '',
    stock: '',
    icon: '📦'
  });

  // Ledger and Invoice states
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('flowledger_txs_v3');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });
  
  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem('flowledger_invs_v3');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('office_settings');
    const defaults = {
      companyName: 'บริษัท โโฟลว์เล็ดเจอร์ ซอฟต์แวร์ จำกัด',
      companyTaxId: '0105566000123',
      companyAddress: '123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
      companyPhone: '02-123-4567',
      lineBotName: 'FlowLedger OCR Bot',
      lineChannelToken: 'channel_token_mock_1234567890abcdef',
      lineWebhookUrl: 'https://api.flowledger.pro/v1/webhook',
      slipokApiKey: '',
      slipokBranchId: '',
      lineBotActive: true,
      appName: 'FlowLedger Pro',
      appLogo: '✨'
    };
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch {
        return defaults;
      }
    }
    return defaults;
  });

  // POS Product Catalog State
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('pos_products');
    return saved ? JSON.parse(saved) : [];
  });

  // POS Cart State
  const [cart, setCart] = useState([]);
  const [posReceipt, setPosReceipt] = useState(null);
  const [showPOSReceiptModal, setShowPOSReceiptModal] = useState(false);
  const [posPaymentMethod, setPosPaymentMethod] = useState('cash'); // cash, transfer
  const [posCashReceived, setPosCashReceived] = useState('');

  // LINE Bot Simulator State
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('flowledger_chat_messages_v3');
    return saved ? JSON.parse(saved) : [
      {
        id: 'm1',
        sender: 'bot',
        text: 'สวัสดีครับ! ยินดีต้อนรับสู่ระบบ FlowLedger OCR Bot 🤖\n\nท่านสามารถถ่ายรูปภาพหรือส่งรูปภาพสลิปโอนเงิน หรือใบเสร็จสินค้า เพื่อให้ระบบช่วยสแกนและบันทึกบัญชีออฟฟิศย้อนหลังได้ทันทีครับ\n\nคำสั่งที่แนะนำ:\n👉 พิมพ์ "/summary" เพื่อดูสรุปรายรับรายจ่ายล่าสุด\n👉 พิมพ์ "/list" เพื่อเรียกดูรายการคลังเอกสารล่าสุด',
        time: '12:00:00'
      }
    ];
  });
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [activeLineSlip, setActiveLineSlip] = useState(null);
  const [lineScanProgress, setLineScanProgress] = useState(0);
  const [isLineScanning, setIsLineScanning] = useState(false);
  const [lineOCRCoords, setLineOCRCoords] = useState([]); // Visual Bounding Boxes [{x, y, w, h, label, active}]

  // Document Hub Archive State
  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem('flowledger_docs_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docFilterType, setDocFilterType] = useState('all');
  const [editingDoc, setEditingDoc] = useState(null);
  const [docForm, setDocForm] = useState({
    title: '',
    category: 'ค่าใช้จ่ายทั่วไป',
    amount: 0,
    sender: '',
    details: '',
    type: 'expense'
  });

  // Employee Salary (Payroll) State
  const [salaries, setSalaries] = useState(() => {
    const saved = localStorage.getItem('flowledger_salaries_v3');
    return saved ? JSON.parse(saved) : DEFAULT_SALARY_PROFILES;
  });

  const [payrollHistory, setPayrollHistory] = useState(() => {
    const saved = localStorage.getItem('flowledger_payroll_history_v3');
    return saved ? JSON.parse(saved) : [];
  });

  const [salarySubTab, setSalarySubTab] = useState('overview'); // overview, history, profiles
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [salaryForm, setSalaryForm] = useState({
    employeeName: '',
    employeeRole: '',
    baseSalary: '',
    allowance: '',
    deductionSocial: 750,
    deductionTax: '',
    bankAccount: '',
    bankName: 'ธนาคารกสิกรไทย (KBank)'
  });

  const [showProcessPayrollModal, setShowProcessPayrollModal] = useState(false);
  const [processingSalaryProfile, setProcessingSalaryProfile] = useState(null);
  const [payrollForm, setPayrollForm] = useState({
    monthYear: new Date().toISOString().slice(0, 7), // "YYYY-MM"
    datePaid: new Date().toISOString().split('T')[0],
    bonus: 0,
    note: '',
    payDay: new Date().getDate().toString(),
    payMonth: (new Date().getMonth() + 1).toString()
  });

  // Salary History Filtering State
  const [salaryFilterType, setSalaryFilterType] = useState('all'); // all, month, year, custom
  const [salaryFilterMonth, setSalaryFilterMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [salaryFilterYear, setSalaryFilterYear] = useState(() => new Date().getFullYear().toString()); // YYYY
  const [salaryFilterStart, setSalaryFilterStart] = useState('');
  const [salaryFilterEnd, setSalaryFilterEnd] = useState('');

  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // Transaction Forms State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [txForm, setTxForm] = useState({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'ค่าอาหารและเครื่องดื่ม',
    description: '',
    ref: ''
  });

  // Filtering general ledger state
  const [filterType, setFilterType] = useState('all');
  const [filterTime, setFilterTime] = useState('week'); // week, month, year, all, custom
  const [filterSearch, setFilterSearch] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Invoice Builder state
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    sellerName: '',
    sellerTaxId: '',
    sellerAddress: '',
    buyerName: '',
    buyerTaxId: '',
    buyerAddress: '',
    items: [{ name: '', qty: 1, price: '' }],
    vatRate: 7
  });
  const [printInvoiceData, setPrintInvoiceData] = useState(null);

  // Sync state settings dynamically to form
  useEffect(() => {
    setInvoiceForm(prev => ({
      ...prev,
      sellerName: settings.companyName,
      sellerTaxId: settings.companyTaxId,
      sellerAddress: settings.companyAddress
    }));
  }, [settings]);

  // Auto-generate invoice number
  useEffect(() => {
    if (!invoiceForm.invoiceNumber) {
      const year = new Date().getFullYear();
      const num = String(invoices.length + 1).padStart(3, '0');
      setInvoiceForm(prev => ({ ...prev, invoiceNumber: `INV-${year}-${num}` }));
    }
  }, [invoices, invoiceForm.invoiceNumber]);

  // Real-time synchronization with Firestore (or LocalStorage fallback)
  useEffect(() => {
    const unsubTxs = subscribeToCollection('transactions', setTransactions, INITIAL_TRANSACTIONS);
    const unsubInvs = subscribeToCollection('invoices', setInvoices, INITIAL_INVOICES);
    const unsubProducts = subscribeToCollection('pos_products', setProducts, []);
    const unsubUsers = subscribeToCollection('users', setUsers, [
      { id: 'u1', name: 'ผู้ดูแลระบบสูงสุด', username: 'admin', password: 'password123', role: 'admin' },
      { id: 'u2', name: 'พนักงานทั่วไป', username: 'staff', password: 'password123', role: 'staff' }
    ]);
    const unsubDocs = subscribeToCollection('documents', setDocuments, []);
    const unsubChat = subscribeToCollection('chat_messages', setChatMessages, [
      {
        id: 'm1',
        sender: 'bot',
        text: 'สวัสดีครับ! ยินดีต้อนรับสู่ระบบ FlowLedger OCR Bot 🤖\n\nท่านสามารถถ่ายรูปภาพหรือส่งรูปภาพสลิปโอนเงิน หรือใบเสร็จสินค้า เพื่อให้ระบบช่วยสแกนและบันทึกบัญชีออฟฟิศย้อนหลังได้ทันทีครับ\n\nคำสั่งที่แนะนำ:\n👉 พิมพ์ "/summary" เพื่อดูสรุปรายรับรายจ่ายล่าสุด\n👉 พิมพ์ "/list" เพื่อเรียกดูรายการคลังเอกสารล่าสุด',
        time: '12:00:00'
      }
    ]);

    const unsubSettings = subscribeToCollection('settings', (data) => {
      const globalSettings = Array.isArray(data) ? data.find(s => s.id === 'global') : data;
      if (globalSettings) {
        const clean = { ...globalSettings };
        delete clean.id;
        setSettings(clean);
      }
    }, {
      companyName: 'บริษัท โโฟลว์เล็ดเจอร์ ซอฟต์แวร์ จำกัด',
      companyTaxId: '0105566000123',
      companyAddress: '123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมาชานคร 10110',
      companyPhone: '02-123-4567',
      lineBotName: 'FlowLedger OCR Bot',
      lineChannelToken: 'channel_token_mock_1234567890abcdef',
      lineWebhookUrl: 'https://api.flowledger.pro/v1/webhook',
      slipokApiKey: '',
      slipokBranchId: '',
      lineBotActive: true,
      appName: 'FlowLedger Pro',
      appLogo: '✨'
    });

    const unsubSalaries = subscribeToCollection('salaries', setSalaries, DEFAULT_SALARY_PROFILES);
    const unsubPayrollHistory = subscribeToCollection('payroll_history', setPayrollHistory, []);

    return () => {
      unsubTxs();
      unsubInvs();
      unsubProducts();
      unsubUsers();
      unsubDocs();
      unsubChat();
      unsubSettings();
      unsubSalaries();
      unsubPayrollHistory();
    };
  }, []);

  // Handle Quick Connect via QR code/link query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedConfig = params.get('fb_config');
    if (encodedConfig) {
      try {
        const decoded = atob(encodedConfig);
        const parsed = JSON.parse(decoded);
        if (parsed.apiKey && parsed.projectId) {
          localStorage.setItem("flowledger_firebase_config", decoded);
          // Remove the query parameter from the URL bar to clean up
          window.history.replaceState({}, document.title, window.location.pathname);
          alert("✨ เชื่อมต่อฐานข้อมูลคลาวด์จากลิงก์แชร์อัตโนมัติสำเร็จ!");
          window.location.reload();
        }
      } catch (e) {
        console.error("Failed to parse quick connect config:", e);
      }
    }
  }, []);

  // Sync session and settings to localStorage
  useEffect(() => {
    localStorage.setItem('current_user', currentUser ? JSON.stringify(currentUser) : '');
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('office_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('menu_names', JSON.stringify(menuNames));
  }, [menuNames]);

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('flowledger_txs_v3', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('flowledger_invs_v3', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('pos_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('flowledger_chat_messages_v3', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem('flowledger_docs_v3', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('flowledger_salaries_v3', JSON.stringify(salaries));
  }, [salaries]);

  useEffect(() => {
    localStorage.setItem('flowledger_payroll_history_v3', JSON.stringify(payrollHistory));
  }, [payrollHistory]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (isFirebaseConfigured()) {
      await saveDocToCloud('settings', { id: 'global', ...settings });
    }
    alert('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert('ขนาดไฟล์โลโก้ต้องไม่เกิน 500KB เพื่อประสิทธิภาพสูงสุดของระบบ');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings(prev => ({ ...prev, appLogo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFirebaseConfig = (e) => {
    e.preventDefault();
    const cleanInput = firebaseConfigInput.trim();
    if (!cleanInput) {
      alert('กรุณากรอกข้อมูล Firebase Config');
      return;
    }

    try {
      let config = null;
      
      // 1. Try standard JSON parse
      try {
        config = JSON.parse(cleanInput);
      } catch {
        // 2. Extract keys using regex if they pasted the whole JS block
        const extracted = {};
        const keys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId", "measurementId"];
        
        keys.forEach(key => {
          const regex = new RegExp(`(?:['"]?${key}['"]?\\s*:\\s*['"\`]([^'"\`]+)['"\`])`);
          const match = cleanInput.match(regex);
          if (match && match[1]) {
            extracted[key] = match[1];
          }
        });

        if (extracted.apiKey && extracted.projectId) {
          config = extracted;
        } else {
          throw new Error('ไม่พบข้อมูล Firebase Config หรือรูปแบบ JSON/JS ไม่ถูกต้อง');
        }
      }

      if (!config || !config.apiKey || !config.projectId) {
        throw new Error('ข้อมูล apiKey หรือ projectId หายไป');
      }

      localStorage.setItem("flowledger_firebase_config", JSON.stringify(config));
      alert('เชื่อมต่อฐานข้อมูลคลาวด์ Firebase สำเร็จ! กำลังโหลดหน้าเว็บใหม่...');
      window.location.reload();
    } catch (err) {
      alert(`การตั้งค่าไม่ถูกต้อง: ${err.message || 'กรุณาตรวจสอบรูปแบบข้อความที่นำมาวาง'}`);
    }
  };

  const handleDisconnectFirebase = () => {
    if (confirm('คุณต้องการตัดการเชื่อมต่อกับคลาวด์ Firebase และสลับกลับไปใช้เครื่องเดียว (Local Mode) ใช่หรือไม่?')) {
      localStorage.removeItem("flowledger_firebase_config");
      alert('ตัดการเชื่อมต่อแล้ว กำลังโหลดหน้าเว็บใหม่...');
      window.location.reload();
    }
  };

  const handleSaveMenuNames = (e) => {
    e.preventDefault();
    setMenuNames(menuForm);
    setShowMenuEditModal(false);
  };

  const handleResetMenuNames = () => {
    const defaults = {
      dashboard: 'หน้าหลัก & แดชบอร์ด',
      transactions: 'บัญชีรายรับ-รายจ่าย',
      pos: 'ใบซื้อขายหน้าร้าน POS',
      invoices: 'ออกใบกำกับภาษี',
      linebot: 'ระบบ LINE Bot',
      dochub: 'คลังเอกสารจัดเก็บ',
      salary: 'เงินเดือนพนักงาน',
      settings: 'ตั้งค่าระบบ'
    };
    setMenuForm(defaults);
  };

  // --- USER AUTH HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const found = users.find(u => u.username.toLowerCase() === loginUsername.trim().toLowerCase());
    if (!found) {
      setAuthError('ไม่พบชื่อผู้ใช้งานนี้ในระบบ');
      return;
    }
    if (found.password !== loginPassword) {
      setAuthError('รหัสผ่านไม่ถูกต้อง');
      return;
    }

    setCurrentUser(found);
    setLoginUsername('');
    setLoginPassword('');
    setActiveTab('dashboard');
  };

  const handleGoogleLoginSelect = (account) => {
    setSelectedGoogleAccount(account);
    setGoogleAuthLoading(true);

    setTimeout(() => {
      setGoogleAuthLoading(false);
      setShowGoogleModal(false);

      // Check if user exists in database by username (email prefix or email)
      const username = account.email.split('@')[0];
      let found = users.find(u => u.username === username);

      if (!found) {
        // Create new user if not exists
        const newUser = {
          id: `u_${Date.now()}`,
          name: account.name,
          username: username,
          password: 'google_linked_account_oauth',
          role: account.role,
          avatar: account.avatar
        };
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser);
      } else {
        // Link avatar if not set
        if (!found.avatar) {
          setUsers(prev => prev.map(u => u.id === found.id ? { ...u, avatar: account.avatar } : u));
          found = { ...found, avatar: account.avatar };
        }
        setCurrentUser(found);
      }
      setSelectedGoogleAccount(null);
      setActiveTab('dashboard');
    }, 1500);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!regName.trim() || !regUsername.trim() || !regPassword) {
      setAuthError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const exists = users.some(u => u.username.toLowerCase() === regUsername.trim().toLowerCase());
    if (exists) {
      setAuthError('ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว');
      return;
    }

    const newUser = {
      id: `u_${Date.now()}`,
      name: regName.trim(),
      username: regUsername.trim().toLowerCase(),
      password: regPassword,
      role: regRole
    };

    if (isFirebaseConfigured()) {
      saveDocToCloud('users', newUser);
    } else {
      setUsers(prev => [...prev, newUser]);
    }
    setAuthSuccess('สมัครใช้งานสำเร็จ! กำลังสลับไปยังหน้าล็อกอิน...');
    
    // Clear inputs
    setRegName('');
    setRegUsername('');
    setRegPassword('');
    setRegRole('staff');

    setTimeout(() => {
      setLoginTab('login');
      setAuthSuccess('');
    }, 1500);
  };

  const handleLogout = () => {
    if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      setCurrentUser(null);
      setActiveTab('dashboard');
    }
  };

  // --- USER CRUD PANEL HANDLERS (ADMIN ONLY) ---
  const openUserCRUDModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        name: user.name,
        username: user.username,
        password: user.password,
        role: user.role
      });
    } else {
      setEditingUser(null);
      setUserForm({
        name: '',
        username: '',
        password: '',
        role: 'staff'
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.username.trim() || !userForm.password) {
      alert('กรุณากรอกข้อมูลผู้ใช้งานให้ครบถ้วน');
      return;
    }

    const usernameLower = userForm.username.trim().toLowerCase();

    if (editingUser) {
      // Check duplicate usernames ignoring own user
      const duplicate = users.some(u => u.id !== editingUser.id && u.username.toLowerCase() === usernameLower);
      if (duplicate) {
        alert('ชื่อผู้ใช้งานนี้ถูกใช้งานแล้ว');
        return;
      }

      const updatedUser = { ...editingUser, ...userForm, username: usernameLower };
      if (isFirebaseConfigured()) {
        saveDocToCloud('users', updatedUser);
      } else {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
      }
      
      // If editing self, update currentUser as well
      if (editingUser.id === currentUser.id) {
        setCurrentUser({ ...currentUser, ...userForm, username: usernameLower });
      }

      setEditingUser(null);
    } else {
      // Check duplicate usernames
      const duplicate = users.some(u => u.username.toLowerCase() === usernameLower);
      if (duplicate) {
        alert('ชื่อผู้ใช้งานนี้ถูกใช้งานแล้ว');
        return;
      }

      const newUser = {
        id: `u_${Date.now()}`,
        name: userForm.name.trim(),
        username: usernameLower,
        password: userForm.password,
        role: userForm.role
      };
      if (isFirebaseConfigured()) {
        saveDocToCloud('users', newUser);
      } else {
        setUsers(prev => [...prev, newUser]);
      }
    }

    setShowUserModal(false);
  };

  const handleDeleteUser = (userId) => {
    if (userId === currentUser.id) {
      alert('คุณไม่สามารถลบชื่อผู้ใช้งานที่คุณกำลังล็อกอินอยู่ได้');
      return;
    }

    if (confirm('คุณต้องการลบชื่อผู้ใช้และสิทธิ์การเข้าถึงนี้อย่างถาวรใช่หรือไม่?')) {
      if (isFirebaseConfigured()) {
        deleteDocFromCloud('users', userId);
      } else {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    }
  };

  // --- PRODUCT CRUD PANEL HANDLERS (ADMIN ONLY) ---
  const openProductCRUDModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        price: product.price,
        sku: product.sku,
        stock: product.stock,
        icon: product.icon || '📦'
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        price: '',
        sku: '',
        stock: '',
        icon: '📦'
      });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    const cleanPrice = parseFloat(productForm.price);
    const cleanStock = parseInt(productForm.stock);
    if (!productForm.name.trim() || !productForm.sku.trim() || isNaN(cleanPrice) || isNaN(cleanStock)) {
      alert('กรุณากรอกข้อมูลสินค้าให้ถูกต้องและครบถ้วน');
      return;
    }

    if (editingProduct) {
      const updatedProduct = { ...editingProduct, ...productForm, price: cleanPrice, stock: cleanStock };
      if (isFirebaseConfigured()) {
        saveDocToCloud('pos_products', updatedProduct);
      } else {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p));
      }
      setEditingProduct(null);
    } else {
      const duplicate = products.some(p => p.sku.toLowerCase() === productForm.sku.trim().toLowerCase());
      if (duplicate) {
        alert('รหัสสินค้า (SKU) นี้มีอยู่ในระบบแล้ว');
        return;
      }

      const newProduct = {
        id: `p_${Date.now()}`,
        name: productForm.name.trim(),
        price: cleanPrice,
        sku: productForm.sku.trim().toUpperCase(),
        stock: cleanStock,
        icon: productForm.icon || '📦'
      };
      if (isFirebaseConfigured()) {
        saveDocToCloud('pos_products', newProduct);
      } else {
        setProducts(prev => [...prev, newProduct]);
      }
    }

    setShowProductModal(false);
  };

  const handleDeleteProduct = (productId) => {
    if (confirm('คุณต้องการลบสินค้านี้ออกจากระบบขายหน้าร้านอย่างถาวรใช่หรือไม่?')) {
      if (isFirebaseConfigured()) {
        deleteDocFromCloud('pos_products', productId);
      } else {
        setProducts(prev => prev.filter(p => p.id !== productId));
      }
      setCart(prev => prev.filter(item => item.id !== productId));
    }
  };

  // --- EMPLOYEE SALARY (PAYROLL) HANDLERS ---
  const openSalaryCRUDModal = (profile = null) => {
    if (profile) {
      setEditingSalary(profile);
      setSalaryForm({
        employeeName: profile.employeeName,
        employeeRole: profile.employeeRole,
        baseSalary: profile.baseSalary,
        allowances: profile.allowances || [
          { id: 'allow_1', label: 'ค่าเบี้ยเลี้ยง / สวัสดิการสม่ำเสมอ', amount: profile.allowance || 0 }
        ],
        deductionSocial: profile.deductionSocial,
        deductionTax: profile.deductionTax,
        bankAccount: profile.bankAccount,
        bankName: profile.bankName
      });
    } else {
      setEditingSalary(null);
      setSalaryForm({
        employeeName: '',
        employeeRole: '',
        baseSalary: '',
        allowances: [
          { id: 'allow_1', label: 'ค่าเบี้ยเลี้ยง / สวัสดิการสม่ำเสมอ', amount: 0 }
        ],
        deductionSocial: 750,
        deductionTax: 0,
        bankAccount: '',
        bankName: 'ธนาคารกสิกรไทย (KBank)'
      });
    }
    setShowSalaryModal(true);
  };

  const addAllowanceRow = () => {
    setSalaryForm(prev => ({
      ...prev,
      allowances: [
        ...(prev.allowances || []),
        { id: `allow_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: 'ค่าล่วงเวลา (OT)', amount: 0 }
      ]
    }));
  };

  const removeAllowanceRow = (id) => {
    setSalaryForm(prev => ({
      ...prev,
      allowances: (prev.allowances || []).filter(item => item.id !== id)
    }));
  };

  const updateAllowanceRow = (id, field, value) => {
    setSalaryForm(prev => ({
      ...prev,
      allowances: (prev.allowances || []).map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const handleSaveSalaryProfile = (e) => {
    e.preventDefault();
    const base = parseFloat(salaryForm.baseSalary);
    const allowancesList = salaryForm.allowances || [];
    const totalAllow = allowancesList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const soc = parseFloat(salaryForm.deductionSocial) || 0;
    const tax = parseFloat(salaryForm.deductionTax) || 0;

    if (!salaryForm.employeeName.trim() || isNaN(base) || base < 0) {
      alert('กรุณากรอกชื่อและฐานเงินเดือนให้ถูกต้อง');
      return;
    }

    if (editingSalary) {
      const updated = {
        ...editingSalary,
        ...salaryForm,
        baseSalary: base,
        allowance: totalAllow,
        allowances: allowancesList,
        deductionSocial: soc,
        deductionTax: tax
      };
      if (isFirebaseConfigured()) {
        saveDocToCloud('salaries', updated);
      } else {
        setSalaries(prev => prev.map(s => s.id === editingSalary.id ? updated : s));
      }
      setEditingSalary(null);
    } else {
      const newProfile = {
        id: `sal_${Date.now()}`,
        employeeName: salaryForm.employeeName.trim(),
        employeeRole: salaryForm.employeeRole.trim() || 'พนักงาน',
        baseSalary: base,
        allowance: totalAllow,
        allowances: allowancesList,
        deductionSocial: soc,
        deductionTax: tax,
        bankAccount: salaryForm.bankAccount.trim(),
        bankName: salaryForm.bankName
      };
      if (isFirebaseConfigured()) {
        saveDocToCloud('salaries', newProfile);
      } else {
        setSalaries(prev => [...prev, newProfile]);
      }
    }
    setShowSalaryModal(false);
  };

  const handleDeleteSalaryProfile = (id) => {
    if (confirm('คุณต้องการลบข้อมูลเงินเดือนของพนักงานคนนี้ใช่หรือไม่?')) {
      if (isFirebaseConfigured()) {
        deleteDocFromCloud('salaries', id);
      } else {
        setSalaries(prev => prev.filter(s => s.id !== id));
      }
    }
  };

  const handleDeleteDocument = (id) => {
    if (currentUser.role !== 'admin') {
      alert('ขออภัย คุณไม่มีสิทธิ์ในการลบเอกสารนี้');
      return;
    }
    if (confirm('คุณต้องการลบเอกสารนี้ออกจากระบบใช่หรือไม่?')) {
      if (isFirebaseConfigured()) {
        deleteDocFromCloud('documents', id);
      } else {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
      }
    }
  };

  const openEditDocModal = (docItem) => {
    setEditingDoc(docItem);
    setDocForm({
      title: docItem.title || '',
      category: docItem.category || 'ค่าใช้จ่ายทั่วไป',
      amount: docItem.amount || 0,
      sender: docItem.sender || '',
      details: docItem.details || '',
      type: docItem.type || 'expense'
    });
  };

  const handleSaveEditedDoc = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;

    const updatedDoc = {
      ...editingDoc,
      title: docForm.title,
      category: docForm.category,
      amount: parseFloat(docForm.amount) || 0,
      sender: docForm.sender,
      details: docForm.details,
      type: docForm.type
    };

    // 1. Update documents state
    setDocuments(prev => prev.map(d => d.id === editingDoc.id ? updatedDoc : d));

    // 2. Sync with transactions list
    setTransactions(prev => prev.map(t => {
      if (t.ref === editingDoc.ref || t.id.includes(editingDoc.id)) {
        return {
          ...t,
          category: docForm.category,
          amount: parseFloat(docForm.amount) || t.amount,
          description: `LINE Bot [${docForm.category}]: ${docForm.details || docForm.title}`
        };
      }
      return t;
    }));

    // 3. Save to cloud if Firebase is enabled
    if (isFirebaseConfigured()) {
      try {
        await saveDocToCloud("documents", updatedDoc);
      } catch (err) {
        console.error("Cloud doc update failed:", err);
      }
    }

    setEditingDoc(null);
    if (selectedDoc && selectedDoc.id === editingDoc.id) {
      setSelectedDoc(updatedDoc);
    }
    alert("✅ อัปเดตข้อมูลเอกสารและหมวดหมู่เรียบร้อยแล้ว!");
  };

  const handleClearAllDocuments = () => {
    if (currentUser.role !== 'admin') {
      alert('ขออภัย คุณไม่มีสิทธิ์ในการล้างคลังเอกสาร');
      return;
    }
    if (confirm('⚠️ คำเตือน: คุณต้องการล้างคลังเอกสารทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้!')) {
      if (isFirebaseConfigured()) {
        documents.forEach(doc => deleteDocFromCloud('documents', doc.id));
      } else {
        setDocuments([]);
      }
    }
  };

  const handleDatePaidChange = (newDateVal) => {
    if (!newDateVal) return;
    const parts = newDateVal.split('-');
    if (parts.length === 3) {
      setPayrollForm(prev => ({
        ...prev,
        datePaid: newDateVal,
        payDay: parseInt(parts[2]).toString(),
        payMonth: parseInt(parts[1]).toString()
      }));
    }
  };

  const handleDayMonthChange = (field, val) => {
    setPayrollForm(prev => {
      const parts = prev.datePaid.split('-');
      let y = parts[0] || new Date().getFullYear().toString();
      let m = field === 'payMonth' ? val : (parts[1] || '01');
      let d = field === 'payDay' ? val : (parts[2] || '01');
      const datePaid = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        ...prev,
        [field]: val,
        datePaid
      };
    });
  };

  const openProcessPayrollModal = (profile) => {
    const today = new Date();
    setProcessingSalaryProfile(profile);
    setPayrollForm({
      monthYear: today.toISOString().slice(0, 7),
      datePaid: today.toISOString().split('T')[0],
      bonus: 0,
      note: '',
      payDay: today.getDate().toString(),
      payMonth: (today.getMonth() + 1).toString()
    });
    setShowProcessPayrollModal(true);
  };

  const handleProcessPayroll = (e) => {
    e.preventDefault();
    if (!processingSalaryProfile) return;

    const bonus = parseFloat(payrollForm.bonus) || 0;
    const base = processingSalaryProfile.baseSalary;
    const allowance = processingSalaryProfile.allowance;
    const soc = processingSalaryProfile.deductionSocial;
    const tax = processingSalaryProfile.deductionTax;
    const netPaid = base + allowance + bonus - soc - tax;

    const payrollId = `pay_${Date.now()}`;
    const txId = `t_payroll_${Date.now()}`;

    const newHistory = {
      id: payrollId,
      employeeId: processingSalaryProfile.id,
      employeeName: processingSalaryProfile.employeeName,
      employeeRole: processingSalaryProfile.employeeRole,
      bankAccount: processingSalaryProfile.bankAccount,
      bankName: processingSalaryProfile.bankName,
      monthYear: payrollForm.monthYear,
      datePaid: payrollForm.datePaid,
      payDay: payrollForm.payDay,
      payMonth: payrollForm.payMonth,
      baseSalary: base,
      allowance: allowance,
      allowances: processingSalaryProfile.allowances || [],
      bonus: bonus,
      deductionSocial: soc,
      deductionTax: tax,
      netPaid: netPaid,
      status: 'paid',
      note: payrollForm.note,
      transactionId: txId
    };

    // Auto Ledger record
    const newTx = {
      id: txId,
      date: payrollForm.datePaid,
      type: 'expense',
      category: 'เงินเดือนพนักงาน',
      amount: netPaid,
      description: `จ่ายเงินเดือน ${processingSalaryProfile.employeeName} - รอบเดือน ${payrollForm.monthYear} (${processingSalaryProfile.employeeRole})`,
      ref: `PAY-${Date.now().toString().slice(-6)}`
    };

    if (isFirebaseConfigured()) {
      saveDocToCloud('payroll_history', newHistory);
      saveDocToCloud('transactions', newTx);
    } else {
      setPayrollHistory(prev => [newHistory, ...prev]);
      setTransactions(prev => [newTx, ...prev]);
    }

    alert(`จ่ายเงินเดือนพนักงาน ${processingSalaryProfile.employeeName} เรียบร้อยแล้ว ยอดสุทธิ ฿${netPaid.toLocaleString()}`);
    setShowProcessPayrollModal(false);
    setProcessingSalaryProfile(null);
  };

  const handleDeletePayrollHistory = (id, transactionId) => {
    if (confirm('คุณต้องการยกเลิกและลบประวัติการจ่ายเงินเดือนรายการนี้? (ระบบจะลบรายการจ่ายเงินเดือนในบัญชีรายจ่ายออกด้วยอัตโนมัติ)')) {
      if (isFirebaseConfigured()) {
        deleteDocFromCloud('payroll_history', id);
        if (transactionId) {
          deleteDocFromCloud('transactions', transactionId);
        }
      } else {
        setPayrollHistory(prev => prev.filter(p => p.id !== id));
        if (transactionId) {
          setTransactions(prev => prev.filter(t => t.id !== transactionId));
        }
      }
    }
  };

  const handlePrintPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setShowPayslipModal(true);
    setTimeout(() => {
      const printEl = document.querySelector('.printable-payslip-container');
      if (printEl) {
        printEl.classList.add('active-print');
        window.print();
        printEl.classList.remove('active-print');
      }
    }, 100);
  };

  const togglePasswordVisibility = (userId) => {
    setShowPasswordMap(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // --- DATA IMPORT & EXPORT HANDLERS ---
  const exportToCSV = (dataType) => {
    let csvContent = "";
    let filename = "";
    if (dataType === 'transactions') {
      const headers = ["วันที่", "ประเภท", "หมวดหมู่", "คำอธิบาย", "จำนวนเงิน", "เลขที่อ้างอิง"];
      const rows = transactions.map(t => [
        t.date,
        t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
        t.category,
        t.description,
        t.amount,
        t.ref || ''
      ]);
      csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      filename = "transactions_export.csv";
    } else if (dataType === 'products') {
      const headers = ["รหัสสินค้า", "ชื่อสินค้า", "หมวดหมู่", "ราคาขาย", "ราคาต้นทุน", "จำนวนคงเหลือ"];
      const rows = products.map(p => [
        p.sku || p.id,
        p.name,
        p.category,
        p.price,
        p.cost || 0,
        p.stock
      ]);
      csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      filename = "products_export.csv";
    } else if (dataType === 'salary') {
      const headers = ["ชื่อพนักงาน", "ตำแหน่งงาน", "ฐานเงินเดือน", "รายได้พิเศษทั้งหมด", "หักประกันสังคม", "หักภาษี ณ ที่จ่าย", "เลขบัญชีธนาคาร", "ธนาคาร"];
      const rows = salaries.map(s => [
        s.employeeName,
        s.employeeRole,
        s.baseSalary,
        s.allowance || 0,
        s.deductionSocial,
        s.deductionTax,
        s.bankAccount,
        s.bankName
      ]);
      csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      filename = "salaries_export.csv";
    }
    
    if (csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportFullBackup = () => {
    try {
      const fullBackupObj = {
        backupDate: new Date().toISOString(),
        version: "1.0",
        appName: "FlowLedger Financial System",
        settings: settings,
        users: users,
        transactions: transactions,
        documents: documents, // contains doc.imageUrl base64 slip images!
        products: products,
        salaries: salaries,
        payrollHistory: payrollHistory,
        chatMessages: chatMessages
      };

      const jsonStr = JSON.stringify(fullBackupObj, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `flowledger_full_backup_with_images_${dateStr}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`✅ สำรองข้อมูลทั้งระบบพร้อมรูปภาพสลิปทั้งหมดเรียบร้อยแล้ว!\n(บันทึกเอกสาร ${documents.length} รายการ, ธุรกรรม ${transactions.length} รายการ)`);
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาดในการสำรองข้อมูล: " + err.message);
    }
  };

  const handleImportFullBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const backupData = JSON.parse(text);

        if (!backupData || typeof backupData !== 'object') {
          throw new Error("โครงสร้างไฟล์ JSON ไม่ถูกต้อง");
        }

        const dateFormatted = backupData.backupDate ? new Date(backupData.backupDate).toLocaleString('th-TH') : 'ไม่ระบุ';
        const docCount = backupData.documents ? backupData.documents.length : 0;
        const txCount = backupData.transactions ? backupData.transactions.length : 0;

        if (window.confirm(`📥 พบไฟล์สำรองข้อมูลลงวันที่ ${dateFormatted}\n\n• รายการเดินบัญชี: ${txCount} รายการ\n• คลังเอกสาร & สลิป: ${docCount} ไฟล์\n\nต้องการนำเข้าข้อมูลและคืนค่าระบบทั้งหมด (รวมถึงรูปภาพสลิป) หรือไม่?`)) {
          if (Array.isArray(backupData.transactions)) setTransactions(backupData.transactions);
          if (Array.isArray(backupData.documents)) setDocuments(backupData.documents);
          if (Array.isArray(backupData.products)) setProducts(backupData.products);
          if (Array.isArray(backupData.salaries)) setSalaries(backupData.salaries);
          if (Array.isArray(backupData.payrollHistory)) setPayrollHistory(backupData.payrollHistory);
          if (Array.isArray(backupData.users)) setUsers(backupData.users);
          if (Array.isArray(backupData.chatMessages)) setChatMessages(backupData.chatMessages);
          if (backupData.settings && typeof backupData.settings === 'object') setSettings(backupData.settings);

          alert("🎉 คืนค่าระบบ ข้อมูลบัญชี และรูปภาพสลิปทั้งหมดเข้าสู่ระบบสำเร็จเรียบร้อยแล้ว!");
        }
      } catch (err) {
        alert("❌ ไม่สามารถนำเข้าไฟล์สำรองได้: " + err.message);
      }
      e.target.value = ''; // Reset file input
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleCSVImport = (e, dataType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        alert("ไฟล์ไม่มีข้อมูลเพียงพอ");
        return;
      }
      
      const parseLine = (line) => {
        let values = [];
        let insideQuote = false;
        let currentVal = "";
        for (let i = 0; i < line.length; i++) {
          let char = line[i];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            values.push(currentVal.trim());
            currentVal = "";
          } else {
            currentVal += char;
          }
        }
        values.push(currentVal.trim());
        return values;
      };

      const importedItems = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = parseLine(lines[i]);
        if (cols.length === 0) continue;
        
        if (dataType === 'transactions') {
          const [date, typeText, category, description, amountVal, ref] = cols;
          if (!amountVal) continue;
          const amount = parseFloat(amountVal.replace(/,/g, '')) || 0;
          const type = typeText === 'รายรับ' || typeText === 'income' ? 'income' : 'expense';
          if (amount > 0) {
            importedItems.push({
              id: `tx_${Date.now()}_${i}`,
              date: date || new Date().toISOString().split('T')[0],
              type,
              category: category || 'อื่นๆ',
              description: description || '',
              amount,
              ref: ref || `IMP-${Date.now().toString().slice(-6)}`
            });
          }
        } else if (dataType === 'products') {
          const [sku, name, category, priceVal, costVal, stockVal] = cols;
          if (name) {
            importedItems.push({
              id: `prod_${Date.now()}_${i}`,
              sku: sku || `SKU-${Date.now().toString().slice(-4)}-${i}`,
              name,
              category: category || 'ทั่วไป',
              price: parseFloat(priceVal) || 0,
              cost: parseFloat(costVal) || 0,
              stock: parseInt(stockVal) || 0,
              icon: '📦'
            });
          }
        }
      }
      
      if (importedItems.length > 0) {
        if (dataType === 'transactions') {
          if (isFirebaseConfigured()) {
            importedItems.forEach(item => saveDocToCloud('transactions', item));
          } else {
            setTransactions(prev => [...importedItems, ...prev]);
          }
          alert(`นำเข้าบัญชีรายรับ-รายจ่ายสำเร็จ ${importedItems.length} รายการ`);
        } else if (dataType === 'products') {
          if (isFirebaseConfigured()) {
            importedItems.forEach(item => saveDocToCloud('products', item));
          } else {
            setProducts(prev => [...prev, ...importedItems]);
          }
          alert(`นำเข้าสินค้าคลังคลัง POS สำเร็จ ${importedItems.length} รายการ`);
        }
      } else {
        alert("ไม่พบข้อมูลที่ถูกต้องในการนำเข้า");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const printDataReport = (dataType) => {
    const printWindow = window.open("", "_blank");
    let content = "";
    if (dataType === 'transactions') {
      content = `
        <html>
        <head>
          <title>รายงานบัญชีรายรับ-รายจ่าย</title>
          <style>
            body { font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #333; }
            h1 { text-align: center; font-size: 1.8rem; margin-bottom: 5px; }
            .meta { text-align: center; font-size: 0.9rem; color: #666; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.85rem; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .income { color: #10b981; font-weight: bold; }
            .expense { color: #ef4444; font-weight: bold; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>รายงานบัญชีรายรับ-รายจ่าย</h1>
          <div class="meta">
            <div><strong>หน่วยงาน:</strong> ${settings.companyName || 'FlowLedger Pro'}</div>
            <div><strong>วันที่ออกรายงาน:</strong> ${new Date().toLocaleDateString('th-TH')}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ประเภท</th>
                <th>หมวดหมู่</th>
                <th>คำอธิบาย</th>
                <th class="text-right">จำนวนเงิน (บาท)</th>
                <th>เลขที่อ้างอิง</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.date}</td>
                  <td class="${t.type}">${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</td>
                  <td>${t.category}</td>
                  <td>${t.description}</td>
                  <td class="text-right">${t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td>${t.ref || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `;
    } else if (dataType === 'products') {
      content = `
        <html>
        <head>
          <title>รายงานคลังสินค้า POS</title>
          <style>
            body { font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #333; }
            h1 { text-align: center; font-size: 1.8rem; margin-bottom: 5px; }
            .meta { text-align: center; font-size: 0.9rem; color: #666; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.85rem; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>รายงานคลังสินค้า POS (Inventory Report)</h1>
          <div class="meta">
            <div><strong>หน่วยงาน:</strong> ${settings.companyName || 'FlowLedger Pro'}</div>
            <div><strong>วันที่ออกรายงาน:</strong> ${new Date().toLocaleDateString('th-TH')}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>รหัสสินค้า (SKU)</th>
                <th>ชื่อสินค้า / บริการ</th>
                <th>หมวดหมู่</th>
                <th class="text-right">ราคาต่อหน่วย (บาท)</th>
                <th class="text-right">จำนวนคงเหลือ (สต็อก)</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td><code>${p.sku}</code></td>
                  <td>${p.name}</td>
                  <td>${p.category}</td>
                  <td class="text-right">฿${p.price.toLocaleString()}</td>
                  <td class="text-right">${p.stock.toLocaleString()} ชิ้น</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `;
    } else if (dataType === 'salary') {
      content = `
        <html>
        <head>
          <title>รายงานพนักงานและอัตราเงินเดือน</title>
          <style>
            body { font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #333; }
            h1 { text-align: center; font-size: 1.8rem; margin-bottom: 5px; }
            .meta { text-align: center; font-size: 0.9rem; color: #666; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.85rem; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>รายงานโครงสร้างเงินเดือนและพนักงาน (Payroll Report)</h1>
          <div class="meta">
            <div><strong>หน่วยงาน:</strong> ${settings.companyName || 'FlowLedger Pro'}</div>
            <div><strong>วันที่ออกรายงาน:</strong> ${new Date().toLocaleDateString('th-TH')}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ชื่อพนักงาน</th>
                <th>ตำแหน่ง</th>
                <th class="text-right">ฐานเงินเดือน</th>
                <th class="text-right">รายได้พิเศษสะสม</th>
                <th class="text-right">หักประกันสังคม</th>
                <th class="text-right">หักภาษี ณ ที่จ่าย</th>
                <th>ช่องทางรับเงิน</th>
                <th>เลขที่บัญชี</th>
              </tr>
            </thead>
            <tbody>
              ${salaries.map(s => `
                <tr>
                  <td>${s.employeeName}</td>
                  <td>${s.employeeRole}</td>
                  <td class="text-right">฿${s.baseSalary.toLocaleString()}</td>
                  <td class="text-right">฿${(s.allowance || 0).toLocaleString()}</td>
                  <td class="text-right">฿${s.deductionSocial.toLocaleString()}</td>
                  <td class="text-right">฿${s.deductionTax.toLocaleString()}</td>
                  <td>${s.bankName}</td>
                  <td>${s.bankAccount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `;
    }
    
    if (content) {
      printWindow.document.write(content);
      printWindow.document.close();
    }
  };

  // --- POS CART HANDLERS ---
  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const nextQty = item.qty + delta;
        return nextQty > 0 ? { ...item, qty: nextQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const getCartTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const vatRate = 7;
    const vatAmount = (subtotal * vatRate) / 107;
    const netTotal = subtotal - vatAmount;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      netTotal: Math.round(netTotal * 100) / 100
    };
  };

  const handlePOSCheckout = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    const totals = getCartTotals();
    const cash = parseFloat(posCashReceived) || 0;
    
    if (posPaymentMethod === 'cash' && cash < totals.subtotal) {
      alert('จำนวนเงินสดรับน้อยกว่ายอดสุทธิสินค้า');
      return;
    }

    const newReceiptNum = `POS-${Date.now().toString().slice(-6)}`;
    const newReceipt = {
      receiptNum: newReceiptNum,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      items: [...cart],
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      netTotal: totals.netTotal,
      paymentMethod: posPaymentMethod,
      cashReceived: posPaymentMethod === 'cash' ? cash : totals.subtotal,
      change: posPaymentMethod === 'cash' ? (cash - totals.subtotal) : 0
    };

    // Deduct inventory stock
    products.forEach(p => {
      const cartItem = cart.find(item => item.id === p.id);
      if (cartItem) {
        const updatedProduct = { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
        if (isFirebaseConfigured()) {
          saveDocToCloud('pos_products', updatedProduct);
        }
      }
    });

    if (!isFirebaseConfigured()) {
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(item => item.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
        }
        return p;
      }));
    }

    // Save Receipt
    setPosReceipt(newReceipt);
    setShowPOSReceiptModal(true);

    // Ledger record
    const newTx = {
      id: `t_pos_${Date.now()}`,
      date: newReceipt.date,
      type: 'income',
      category: 'รายได้จากการขาย',
      amount: totals.subtotal,
      description: `ขายสินค้าหน้าร้าน บิลเลขที่ ${newReceiptNum}`,
      ref: newReceiptNum
    };
    if (isFirebaseConfigured()) {
      saveDocToCloud('transactions', newTx);
    } else {
      setTransactions(prev => [newTx, ...prev]);
    }

    setCart([]);
    setPosCashReceived('');
  };

  const handlePrintPOSReceipt = () => {
    const printEl = document.querySelector('.printable-receipt-container');
    if (printEl) {
      printEl.classList.add('active-print');
      window.print();
      printEl.classList.remove('active-print');
    }
  };

  // --- LEDGER TRANSACTION HANDLERS ---
  const handleAddOrEditTransaction = (e) => {
    e.preventDefault();
    const cleanAmount = parseFloat(txForm.amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) return;

    if (editingTransaction) {
      const updatedTx = { ...editingTransaction, ...txForm, amount: cleanAmount };
      if (isFirebaseConfigured()) {
        saveDocToCloud('transactions', updatedTx);
      } else {
        setTransactions(prev =>
          prev.map(t => (t.id === editingTransaction.id ? updatedTx : t))
        );
      }
      setEditingTransaction(null);
    } else {
      const newTx = {
        id: `t_${Date.now()}`,
        ...txForm,
        amount: cleanAmount
      };
      if (isFirebaseConfigured()) {
        saveDocToCloud('transactions', newTx);
      } else {
        setTransactions(prev => [newTx, ...prev]);
      }
    }

    setTxForm({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: 'ค่าอาหารและเครื่องดื่ม',
      description: '',
      ref: ''
    });
    setShowAddModal(false);
  };

  const deleteTransaction = (id) => {
    if (currentUser.role !== 'admin') {
      alert('ขออภัย คุณไม่มีสิทธิ์ในการดำเนินการนี้');
      return;
    }
    if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      if (isFirebaseConfigured()) {
        deleteDocFromCloud('transactions', id);
      } else {
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
    }
  };

  const handleClearAllTransactions = async () => {
    if (currentUser.role !== 'admin') {
      alert('ขออภัย คุณไม่มีสิทธิ์ในการดำเนินการนี้ (เฉพาะผู้ดูแลระบบเท่านั้น)');
      return;
    }

    if (transactions.length === 0) {
      alert('ไม่มีรายการธุรกรรมให้เคลียร์ในระบบ');
      return;
    }

    const confirmClear = confirm(
      `คุณต้องการลบ/เคลียร์รายการธุรกรรมทั้งหมด (${transactions.length} รายการ) ออกจากระบบใช่หรือไม่?\n\n⚠️ คำเตือน: รายการทั้งหมดจะถูกลบออกและไม่สามารถกู้คืนได้!`
    );

    if (confirmClear) {
      try {
        if (isFirebaseConfigured()) {
          for (const tx of transactions) {
            await deleteDocFromCloud('transactions', tx.id);
          }
        } else {
          setTransactions([]);
        }
        alert('เคลียร์รายการธุรกรรมทั้งหมดเรียบร้อยแล้ว');
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการเคลียร์ข้อมูล: ' + err.message);
      }
    }
  };

  const openEditModal = (tx) => {
    if (currentUser.role !== 'admin') {
      alert('ขออภัย คุณไม่มีสิทธิ์ในการดำเนินการนี้');
      return;
    }
    setEditingTransaction(tx);
    setTxForm({
      type: tx.type,
      date: tx.date,
      amount: tx.amount,
      category: tx.category,
      description: tx.description,
      ref: tx.ref || ''
    });
    setShowAddModal(true);
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;

      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const descMatch = t.description?.toLowerCase().includes(query);
        const refMatch = t.ref?.toLowerCase().includes(query);
        const catMatch = t.category?.toLowerCase().includes(query);
        if (!descMatch && !refMatch && !catMatch) return false;
      }

      const txDate = new Date(t.date);
      const today = new Date();
      if (filterTime === 'today') {
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const isSameDay = (
          txDate.getFullYear() === today.getFullYear() &&
          txDate.getMonth() === today.getMonth() &&
          txDate.getDate() === today.getDate()
        );
        return isSameDay || t.date === todayStr;
      } else if (filterTime === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(today.getDate() - 7);
        return txDate >= oneWeekAgo && txDate <= today;
      } else if (filterTime === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);
        return txDate >= oneMonthAgo && txDate <= today;
      } else if (filterTime === 'year') {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return txDate >= startOfYear && txDate <= today;
      } else if (filterTime === 'custom') {
        if (customStartDate && txDate < new Date(customStartDate)) return false;
        if (customEndDate && txDate > new Date(customEndDate)) return false;
      }

      return true;
    });
  };

  const filteredTxs = getFilteredTransactions();
  const totalIncome = filteredTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const calculatedVAT = filteredTxs.reduce((sum, t) => {
    if (t.category === 'รายได้จากการขาย') {
      return sum + (t.amount * 7) / 107;
    } else if (t.category === 'ค่าอุปกรณ์สำนักงาน') {
      return sum - (t.amount * 7) / 107;
    }
    return sum;
  }, 0);

  const categoriesExpenseMap = filteredTxs
    .filter(t => t.type === 'expense')
    .reduce((map, t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
      return map;
    }, {});

  const expenseByCategory = Object.keys(categoriesExpenseMap).map(cat => ({
    name: cat,
    value: categoriesExpenseMap[cat]
  })).sort((a, b) => b.value - a.value);

  // Calculate dynamic max value for line chart scaling
  const getChartMaxVal = () => {
    const list = [...filteredTxs].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (list.length === 0) return 1000;
    
    const dateMap = {};
    list.forEach(t => {
      if (!dateMap[t.date]) dateMap[t.date] = { income: 0, expense: 0 };
      dateMap[t.date][t.type] += t.amount;
    });

    const dates = Object.keys(dateMap);
    const values = [];
    dates.forEach(d => {
      values.push(dateMap[d].income);
      values.push(dateMap[d].expense);
    });
    return Math.max(...values, 1000);
  };

  const chartMaxVal = getChartMaxVal();

  // SVG Curved Spline Path Generator (Catmull-Rom style smoothing)
  const getCurvePath = (points) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
    if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

    let path = `M ${points[0].x},${points[0].y}`;
    const smoothing = 0.15; // Smooth tension control

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      const pPrev = points[i - 1] || p0;
      const pNext = points[i + 2] || p1;

      // Calculate control points
      const cp1x = p0.x + (p1.x - pPrev.x) * smoothing;
      const cp1y = p0.y + (p1.y - pPrev.y) * smoothing;

      const cp2x = p1.x - (pNext.x - p0.x) * smoothing;
      const cp2y = p1.y - (pNext.y - p0.y) * smoothing;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }
    return path;
  };

  // --- LINE BOT INTERACTIVE SIMULATOR ---
  const handleLineSendMessage = (text) => {
    const content = text || chatInput;
    if (!content.trim()) return;

    const userMsg = {
      id: `m_${Date.now()}`,
      sender: 'user',
      text: content,
      time: new Date().toTimeString().split(' ')[0].slice(0, 5)
    };

    if (isFirebaseConfigured()) {
      saveDocToCloud('chat_messages', userMsg);
    } else {
      setChatMessages(prev => [...prev, userMsg]);
    }
    setChatInput('');

    setIsBotTyping(true);
    setTimeout(() => {
      setIsBotTyping(false);
      
      let botResponse = '';
      const cleanCmd = content.trim().toLowerCase();

      if (cleanCmd === '/summary') {
        const incomeSum = transactions.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
        const expenseSum = transactions.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
        botResponse = `📊 *สรุปสถานะการเงินปัจจุบัน*\n\n💸 รายรับรวม: ฿${incomeSum.toLocaleString('th-TH')}\n📉 รายจ่ายรวม: ฿${expenseSum.toLocaleString('th-TH')}\n💼 คงเหลือสุทธิ: ฿${(incomeSum - expenseSum).toLocaleString('th-TH')}\n\nบันทึกข้อมูลเรียลไทม์ผ่านบอทแล้ว`;
      } else if (cleanCmd === '/list') {
        const docList = documents.map(d => `📄 ${d.title} (฿${d.amount.toLocaleString()})`).slice(0, 5).join('\n');
        botResponse = `📂 *ประวัติเอกสารล่าสุด 5 รายการ*\n\n${docList || 'ไม่มีข้อมูลคลังเอกสาร'}\n\nเรียกดูเอกสารทั้งหมดในแท็บ "คลังเอกสารจัดเก็บ"`;
      } else {
        botResponse = `🤖 ขออภัยครับ ผมไม่เข้าใจข้อความนี้\n\nสามารถใช้คำสั่งต่อไปนี้เพื่อสื่อสาร:\n⚡ พิมพ์ "/summary" เพื่อดูรายงานเงินออฟฟิศ\n⚡ พิมพ์ "/list" เพื่อดูบิลที่สแกนล่าสุด\n⚡ หรือ "แนบรูปภาพสลิป/บิล" เพื่อสร้างเอกสารอัตโนมัติ`;
      }

      const botMsg = {
        id: `m_bot_${Date.now()}`,
        sender: 'bot',
        text: botResponse,
        time: new Date().toTimeString().split(' ')[0].slice(0, 5)
      };

      if (isFirebaseConfigured()) {
        saveDocToCloud('chat_messages', botMsg);
      } else {
        setChatMessages(prev => [...prev, botMsg]);
      }
    }, 1200);
  };

  const handleLineAttachSlip = (slip) => {
    const userMsg = {
      id: `m_attach_${Date.now()}`,
      sender: 'user',
      text: `📷 ส่งรูปภาพสลิป: ${slip.name}`,
      isImage: true,
      time: new Date().toTimeString().split(' ')[0].slice(0, 5)
    };

    if (isFirebaseConfigured()) {
      saveDocToCloud('chat_messages', userMsg);
    } else {
      setChatMessages(prev => [...prev, userMsg]);
    }

    setActiveLineSlip(slip);
    setIsLineScanning(true);
    setLineScanProgress(0);

    const coords = [
      { x: '10%', y: '8%', w: '40%', h: '8%', label: 'Merchant/Bank', active: false },
      { x: '10%', y: '22%', w: '80%', h: '6%', label: 'Date Time', active: false },
      { x: '10%', y: '33%', w: '80%', h: '6%', label: 'Ref Number', active: false },
      { x: '10%', y: '45%', w: '80%', h: '12%', label: 'Parties Info', active: false },
      { x: '20%', y: '72%', w: '60%', h: '14%', label: 'Amount (฿)', active: false },
    ];
    setLineOCRCoords(coords);

    let currentStep = 0;
    const interval = setInterval(() => {
      setLineScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsLineScanning(false);
          
          setIsBotTyping(true);
          setTimeout(() => {
            setIsBotTyping(false);
            
            const docId = `doc-${Date.now()}`;
            const newDoc = {
              id: docId,
              date: slip.date,
              time: slip.time,
              type: slip.type === 'income' ? 'receipt' : 'tax_invoice',
              title: `${slip.name} (OCR)`,
              ref: slip.ref,
              amount: slip.amount,
              merchant: slip.merchant,
              category: slip.category,
              sender: slip.sender || 'ผู้ยื่นบิล',
              status: 'archived',
              details: `บันทึกอัตโนมัติจาก LINE Bot - ${slip.description}`
            };

            const newTx = {
              id: `t_line_${Date.now()}`,
              date: slip.date,
              type: slip.type,
              category: slip.category,
              amount: slip.amount,
              description: `LINE Bot OCR: ${slip.merchant} (${slip.description})`,
              ref: slip.ref
            };

            const botMsg = {
              id: `m_bot_ocr_${Date.now()}`,
              sender: 'bot',
              text: `✅ สแกนสำเร็จ!\n\n🏢 ร้านค้า/ธนาคาร: ${slip.merchant}\n💰 ยอดเงิน: ฿${slip.amount.toLocaleString()}\n📅 วันที่: ${slip.date}\n🔢 รหัสอ้างอิง: ${slip.ref}\n\nระบบบันทึกบัญชีสำเร็จแล้ว และจัดสร้างเอกสารไฟล์ PDF สำหรับรายงานแล้ว`,
              docLink: newDoc,
              time: new Date().toTimeString().split(' ')[0].slice(0, 5)
            };

            if (isFirebaseConfigured()) {
              saveDocToCloud('documents', newDoc);
              saveDocToCloud('transactions', newTx);
              saveDocToCloud('chat_messages', botMsg);
            } else {
              setDocuments(prev => [newDoc, ...prev]);
              setTransactions(prev => [newTx, ...prev]);
              setChatMessages(prev => [...prev, botMsg]);
            }

          }, 1000);

          return 100;
        }

        const step = Math.floor(prev / 20);
        if (step > currentStep && step < coords.length) {
          currentStep = step;
          setLineOCRCoords(prevCoords => prevCoords.map((c, idx) => idx === step ? { ...c, active: true } : c));
        }

        return prev + 5;
      });
    }, 150);
  };

  const handleLineCustomUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const customSlip = {
        id: `slip_custom_${Date.now()}`,
        name: `ภาพอัปโหลด: ${file.name.slice(0,15)}...`,
        type: 'expense',
        merchant: 'ร้านค้าบริการภายนอก',
        date: new Date().toISOString().split('T')[0],
        time: '13:10:00',
        amount: Math.floor(Math.random() * 2500) + 120,
        ref: 'REF-UPLOAD-' + Math.floor(Math.random() * 1000000),
        sender: 'ผู้ใช้ LINE',
        receiver: settings.companyName,
        category: 'ค่าอาหารและเครื่องดื่ม',
        description: 'ซื้อของใช้ออฟฟิศทั่วไป',
        style: { color: '#090d16', logo: 'FILE' }
      };
      handleLineAttachSlip(customSlip);
    }
  };

  // --- DOCUMENT HUB SEARCH & VIEW ---
  const getFilteredDocs = () => {
    return documents.filter(doc => {
      if (docFilterType !== 'all') {
        if (docFilterType === 'income' && doc.type !== 'receipt') return false;
        if (docFilterType === 'expense' && doc.type !== 'tax_invoice') return false;
      }
      if (docSearchQuery) {
        const q = docSearchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.merchant.toLowerCase().includes(q) ||
          doc.ref.toLowerCase().includes(q) ||
          doc.sender.toLowerCase().includes(q)
        );
      }
      return true;
    });
  };

  const filteredDocs = getFilteredDocs();

  const handlePrint = (inv) => {
    setPrintInvoiceData(inv);
    setTimeout(() => {
      const printEl = document.querySelector('.printable-invoice-container');
      if (printEl) {
        printEl.classList.add('active-print');
        window.print();
        printEl.classList.remove('active-print');
      }
    }, 100);
  };

  const handlePrintDocInvoice = (doc) => {
    const formattedInvoice = {
      invoiceNumber: doc.ref,
      date: doc.date,
      sellerName: doc.type === 'receipt' ? doc.sender : settings.companyName,
      sellerTaxId: doc.type === 'receipt' ? '0105556600999' : settings.companyTaxId,
      sellerAddress: doc.type === 'receipt' ? 'ที่อยู่ร้านค้าตามสลิป OCR' : settings.companyAddress,
      buyerName: doc.type === 'receipt' ? settings.companyName : doc.sender,
      buyerTaxId: doc.type === 'receipt' ? settings.companyTaxId : '0205565000789',
      buyerAddress: doc.type === 'receipt' ? settings.companyAddress : 'ที่อยู่ผู้ชำระตามระบบสลิปโอน',
      imageUrl: doc.imageUrl,
      items: [
        { name: `${doc.title} - ${doc.category}`, qty: 1, price: doc.amount / 1.07 }
      ],
      vatRate: 7,
      vatAmount: doc.amount - (doc.amount / 1.07),
      subtotal: doc.amount / 1.07,
      grandTotal: doc.amount
    };
    handlePrint(formattedInvoice);
  };

  // --- MANUAL TAX INVOICE ADD ---
  const handleInvoiceItemChange = (index, field, value) => {
    const updatedItems = [...invoiceForm.items];
    updatedItems[index][field] = value;
    setInvoiceForm(prev => ({ ...prev, items: updatedItems }));
  };

  const addInvoiceItemRow = () => {
    setInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, { name: '', qty: 1, price: '' }]
    }));
  };

  const removeInvoiceItemRow = (index) => {
    if (invoiceForm.items.length <= 1) return;
    setInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateInvoiceTotals = () => {
    const subtotal = invoiceForm.items.reduce((sum, item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.price) || 0;
      return sum + qty * price;
    }, 0);
    const vatRate = invoiceForm.vatRate;
    const vatAmount = (subtotal * vatRate) / 100;
    const grandTotal = subtotal + vatAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100
    };
  };

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    const totals = calculateInvoiceTotals();
    const newInvoice = {
      id: `inv_${Date.now()}`,
      ...invoiceForm,
      ...totals
    };

    const incomeTx = {
      id: `t_inv_${Date.now()}`,
      type: 'income',
      date: newInvoice.date,
      amount: totals.grandTotal,
      category: 'รายได้จากการขาย',
      description: `ออกใบกำกับภาษีเลขที่ ${newInvoice.invoiceNumber} (${newInvoice.buyerName})`,
      ref: newInvoice.invoiceNumber
    };

    if (isFirebaseConfigured()) {
      saveDocToCloud('invoices', newInvoice);
      saveDocToCloud('transactions', incomeTx);
    } else {
      setInvoices(prev => [newInvoice, ...prev]);
      setTransactions(prev => [incomeTx, ...prev]);
    }

    // Reset Form
    const year = new Date().getFullYear();
    const nextNum = String(invoices.length + 2).padStart(3, '0');
    setInvoiceForm({
      invoiceNumber: `INV-${year}-${nextNum}`,
      date: new Date().toISOString().split('T')[0],
      sellerName: settings.companyName,
      sellerTaxId: settings.companyTaxId,
      sellerAddress: settings.companyAddress,
      buyerName: '',
      buyerTaxId: '',
      buyerAddress: '',
      items: [{ name: '', qty: 1, price: '' }],
      vatRate: 7
    });

    handlePrint(newInvoice);
  };

  // --- LOGIN WRAPPER VIEW ---
  if (!currentUser) {
    return (
      <div className="login-page-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', margin: '0 auto' }}>
              {settings.appLogo && (settings.appLogo.startsWith('http://') || settings.appLogo.startsWith('https://') || settings.appLogo.startsWith('data:image/')) ? (
                <img src={settings.appLogo} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px' }} alt="logo" />
              ) : (
                <span style={{ fontSize: '2rem', lineHeight: '1' }}>{settings.appLogo || '✨'}</span>
              )}
            </div>
            <h1 className="login-title">{settings.appName || 'FlowLedger Pro'}</h1>
            <p className="login-subtitle">ระบบบัญชีรายรับ-รายจ่าย & LINE Bot ดึงข้อมูลบิล</p>
          </div>

          {authError && <div className="login-alert danger"><ShieldAlert size={16} /> {authError}</div>}
          {authSuccess && <div className="login-alert success"><Check size={16} /> {authSuccess}</div>}

          {loginTab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">ชื่อผู้ใช้งาน (Username)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="เช่น admin"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">รหัสผ่าน (Password)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  required 
                  placeholder="ป้อนรหัสผ่าน..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                เข้าสู่ระบบ
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '0.25rem 0', gap: '0.5rem' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>หรือ</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setShowGoogleModal(true); setAuthError(''); }}
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  backgroundColor: '#ffffff', 
                  color: '#1f2937', 
                  border: '1px solid #d1d5db', 
                  fontWeight: '600', 
                  gap: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.357-2.847-6.357-6.357s2.847-6.357 6.357-6.357c1.6 0 3.038.59 4.144 1.554l3.16-3.16C19.23 2.115 15.93.99 12.24.99 6.096.99 1.11 5.975 1.11 12.12s4.986 11.13 11.13 11.13c6.03 0 11.026-4.324 11.026-11.13 0-.616-.06-1.22-.178-1.835H12.24z"/>
                </svg>
                เข้าสู่ระบบด้วย Google
              </button>

              <div className="login-toggle-link" onClick={() => { setLoginTab('register'); setAuthError(''); }} style={{ marginTop: '0.5rem' }}>
                ไม่มีบัญชีใช่หรือไม่? สมัครใช้งานใหม่ที่นี่
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">ชื่อ-นามสกุลผู้ใช้</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="เช่น นายสมจิต คิดบัญชี"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">ชื่อผู้ใช้งาน (Username)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="สำหรับเข้าสู่ระบบ..."
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">รหัสผ่าน (Password)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  required 
                  placeholder="กำหนดรหัสผ่าน..."
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>


              <button type="submit" className="btn btn-success" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                ลงทะเบียน
              </button>

              <div className="login-toggle-link" onClick={() => { setLoginTab('login'); setAuthError(''); }}>
                มีบัญชีแล้ว? สลับไปหน้าล็อกอิน
              </div>
            </form>
          )}
        </div>

        {/* ================= GOOGLE AUTHENTICATION SIMULATOR MODAL ================= */}
        {showGoogleModal && (
          <div className="modal-overlay" onClick={() => !googleAuthLoading && setShowGoogleModal(false)}>
            <div 
              className="modal-content" 
              style={{ 
                maxWidth: '380px', 
                backgroundColor: '#ffffff', 
                color: '#1f2937', 
                padding: '2rem 1.5rem', 
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                textAlign: 'center'
              }} 
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: '1.5rem' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" style={{ display: 'inline-block' }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#202124', marginTop: '0.75rem' }}>ลงชื่อเข้าใช้ด้วย Google</h2>
                <p style={{ fontSize: '0.85rem', color: '#5f6368', marginTop: '0.25rem' }}>เพื่อดำเนินการต่อกับ FlowLedger Pro</p>
              </div>

              {googleAuthLoading ? (
                <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    border: '3px solid #f3f3f3', 
                    borderTop: '3px solid #4285F4', 
                    borderRadius: '50%', 
                    animation: 'spin 0.8s linear infinite' 
                  }}></div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#202124' }}>
                    กำลังเชื่อมต่อบัญชี {selectedGoogleAccount?.email}...
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#5f6368', paddingLeft: '0.5rem', marginBottom: '0.25rem' }}>เลือกบัญชี Google</span>
                  
                  {[
                    { 
                      name: 'FlowLedger Administrator', 
                      email: 'admin.flowledger@gmail.com', 
                      role: 'admin', 
                      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80' 
                    },
                    { 
                      name: 'Somchai Yeoddee', 
                      email: 'somchai.y@gmail.com', 
                      role: 'staff', 
                      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80' 
                    },
                    { 
                      name: 'Somsri Meesook', 
                      email: 'somsri.m@gmail.com', 
                      role: 'staff', 
                      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80' 
                    }
                  ].map((account, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleGoogleLoginSelect(account)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '0.75rem', 
                        borderRadius: '8px', 
                        border: '1px solid #e0e0e0', 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        backgroundColor: '#ffffff'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                    >
                      <img 
                        src={account.avatar} 
                        alt={account.name} 
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#3c4043' }}>{account.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#5f6368', textOverflow: 'ellipsis', overflow: 'hidden' }}>{account.email}</div>
                      </div>
                    </div>
                  ))}
                  
                  <div 
                    onClick={() => {
                      const customEmail = prompt('ป้อนอีเมล Google Account ของคุณ:');
                      if (customEmail && customEmail.includes('@')) {
                        const customName = customEmail.split('@')[0];
                        handleGoogleLoginSelect({
                          name: customName.charAt(0).toUpperCase() + customName.slice(1),
                          email: customEmail,
                          role: 'staff',
                          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80'
                        });
                      }
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      padding: '0.75rem', 
                      borderRadius: '8px', 
                      border: '1px dashed #e0e0e0', 
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: '#ffffff',
                      marginTop: '0.25rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      backgroundColor: '#f1f3f4', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '1rem',
                      color: '#5f6368'
                    }}>👤</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1a73e8' }}>ใช้บัญชีอื่น (Use another account)</div>
                  </div>
                </div>
              )}

              <div style={{ fontSize: '0.7rem', color: '#5f6368', lineHeight: '1.4', borderTop: '1px solid #f1f3f4', paddingTop: '1rem', marginTop: '1rem' }}>
                ก่อนใช้งานแอปนี้ Google จะแชร์ชื่อ อีเมล รูปโปรไฟล์ และการตั้งค่าภาษาของคุณให้กับ FlowLedger Pro
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- LOGGED-IN MAIN VIEW ---
  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}>
            {settings.appLogo && (settings.appLogo.startsWith('http://') || settings.appLogo.startsWith('https://') || settings.appLogo.startsWith('data:image/')) ? (
              <img src={settings.appLogo} style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} alt="logo" />
            ) : (
              <span style={{ fontSize: '1.4rem', lineHeight: '1' }}>{settings.appLogo || '✨'}</span>
            )}
          </div>
          <span className="logo-text">{settings.appName || 'FlowLedger Pro'}</span>
          <span 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: isFirebaseConfigured() ? 'var(--success)' : 'var(--warning)', 
              boxShadow: isFirebaseConfigured() ? '0 0 8px var(--success)' : '0 0 8px var(--warning)',
              marginLeft: 'auto',
              flexShrink: 0
            }} 
            title={isFirebaseConfigured() ? 'ระบบเชื่อมต่อคลาวด์เรียบร้อย (Firebase Active)' : 'ใช้งานในโหมดเครื่องเดียว (Local Mode)'}
          />
        </div>

        <nav className="nav-menu">
          <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={18} />
            <span>{menuNames.dashboard}</span>
          </li>
          <li className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>
            <ShoppingCart size={18} />
            <span>{menuNames.pos}</span>
          </li>
          <li className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
            <Wallet size={18} />
            <span>{menuNames.transactions}</span>
          </li>
          <li className={`nav-item ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
            <FileSpreadsheet size={18} />
            <span>{menuNames.invoices}</span>
          </li>
          {currentUser.role === 'admin' && (
            <li className={`nav-item ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>
              <FileText size={18} />
              <span>{menuNames.salary || 'เงินเดือนพนักงาน'}</span>
            </li>
          )}
          <li className={`nav-item ${activeTab === 'dochub' ? 'active' : ''}`} onClick={() => setActiveTab('dochub')}>
            <Archive size={18} />
            <span>{menuNames.dochub}</span>
          </li>
          {currentUser.role === 'admin' && (
            <li className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={18} />
              <span>{menuNames.settings}</span>
            </li>
          )}
          {currentUser.role === 'admin' && (
            <li className={`nav-item ${activeTab === 'linebot' ? 'active' : ''}`} onClick={() => setActiveTab('linebot')}>
              <MessageSquare size={18} />
              <span>{menuNames.linebot}</span>
            </li>
          )}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span>👤</span>
              )}
              <span>{currentUser.name}</span>
            </div>
            <div style={{ fontSize: '0.7rem' }}>
              <span className={`user-role-badge ${currentUser.role === 'admin' ? 'admin' : 'staff'}`}>
                {currentUser.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'พนักงานทั่วไป'}
              </span>
            </div>
          </div>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>โหมด{theme === 'dark' ? 'สว่าง' : 'มืด'}</span>
          </button>
          {currentUser.role === 'admin' && (
            <button className="theme-toggle-btn" onClick={() => { setMenuForm({ ...menuNames }); setShowMenuEditModal(true); }} style={{ marginTop: '0.4rem', border: '1px solid rgba(99, 102, 241, 0.2)', backgroundColor: 'rgba(99, 102, 241, 0.05)', color: 'var(--primary)' }}>
              <Edit size={16} />
              <span>ปรับแต่งชื่อเมนู</span>
            </button>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        
        {/* ================= DASHBOARD TAB ================= */}
        {activeTab === 'dashboard' && (
          <div>
            <header className="page-header">
              <div className="page-title-group">
                <h1>แดชบอร์ดสรุปผลการเงิน</h1>
                <p>รายงานผลรายรับรายจ่ายและภาษีแบบเรียลไทม์</p>
              </div>
              <div className="filter-bar" style={{ margin: 0 }}>
                <div className="filter-pill-container" style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                  {[
                    { value: 'week', label: 'สัปดาห์นี้' },
                    { value: 'month', label: 'เดือนนี้' },
                    { value: 'year', label: 'ปีนี้' },
                    { value: 'all', label: 'ทั้งหมด' },
                    { value: 'custom', label: 'กำหนดเอง' }
                  ].map(pill => (
                    <button
                      key={pill.value}
                      className={`filter-pill-btn ${filterTime === pill.value ? 'active' : ''}`}
                      onClick={() => setFilterTime(pill.value)}
                      style={{
                        padding: '0.45rem 0.9rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        backgroundColor: filterTime === pill.value ? 'var(--primary)' : 'transparent',
                        color: filterTime === pill.value ? '#ffffff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => {
                        if (filterTime !== pill.value) {
                          e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                          e.target.style.color = 'var(--text-main)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (filterTime !== pill.value) {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = 'var(--text-muted)';
                        }
                      }}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
                {filterTime === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.25s ease-out' }}>
                    <input type="date" className="form-input" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ width: '135px', padding: '0.45rem', fontSize: '0.85rem' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ถึง</span>
                    <input type="date" className="form-input" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ width: '135px', padding: '0.45rem', fontSize: '0.85rem' }} />
                  </div>
                )}
                {currentUser.role === 'admin' && (
                  <button 
                    className="btn"
                    onClick={handleClearAllTransactions}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.95rem',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                    title="ลบ/เคลียร์รายการธุรกรรมทั้งหมด"
                  >
                    <Trash2 size={15} /> เคลียร์รายการ
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => {
                  setTxForm({
                    type: 'expense',
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    category: 'ค่าอาหารและเครื่องดื่ม',
                    description: '',
                    ref: ''
                  });
                  setEditingTransaction(null);
                  setShowAddModal(true);
                }}>
                  <Plus size={16} /> เพิ่มรายการใหม่
                </button>
              </div>
            </header>

            {/* Summary Cards */}
            <div className="summary-grid">
              <div className="glass-card summary-card balance">
                <div className="summary-card-header">
                  <span className="summary-card-title">เงินคงเหลือสุทธิ (Net Balance)</span>
                  <div className="summary-card-icon"><Wallet size={18} /></div>
                </div>
                <div className="summary-card-value" style={{ color: netBalance >= 0 ? 'var(--text-main)' : 'var(--danger)' }}>
                  ฿{netBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
                <div className="summary-card-change up">
                  <TrendingUp size={14} /> {filterTime === 'today' ? '⚡ ข้อมูลเรียลไทม์ (ประจำวันนี้)' : filterTime === 'month' ? '📅 ข้อมูลประจำเดือนนี้' : filterTime === 'week' ? '📅 ข้อมูลประจำสัปดาห์นี้' : filterTime === 'year' ? '📅 ข้อมูลประจำปีนี้' : filterTime === 'all' ? '📊 ข้อมูลสะสมทั้งหมด' : '🗓️ ข้อมูลช่วงเวลาที่กำหนด'}
                </div>
              </div>

              <div className="glass-card summary-card income">
                <div className="summary-card-header">
                  <span className="summary-card-title">รายรับรวม (Total Income)</span>
                  <div className="summary-card-icon"><ArrowUpRight size={18} /></div>
                </div>
                <div className="summary-card-value text-success">
                  ฿{totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
                <div className="summary-card-change up">
                  {filterTime === 'today' ? '🟢 รายรับเรียลไทม์ของวันนี้' : 'รวมรายรับของออฟฟิศทั้งหมด'}
                </div>
              </div>

              <div className="glass-card summary-card expense">
                <div className="summary-card-header">
                  <span className="summary-card-title">รายจ่ายรวม (Total Expense)</span>
                  <div className="summary-card-icon"><ArrowDownRight size={18} /></div>
                </div>
                <div className="summary-card-value text-danger">
                  ฿{totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
                <div className="summary-card-change down">
                  วิเคราะห์ตามบิล/สลิปที่แนบ
                </div>
              </div>

              <div className="glass-card summary-card vat">
                <div className="summary-card-header">
                  <span className="summary-card-title">ประมาณการภาษีนำส่ง (VAT 7%)</span>
                  <div className="summary-card-icon"><FileText size={18} /></div>
                </div>
                <div className="summary-card-value" style={{ color: calculatedVAT >= 0 ? 'var(--warning)' : 'var(--success)' }}>
                  ฿{Math.abs(calculatedVAT).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
                <div className="summary-card-change text-warning">
                  {calculatedVAT >= 0 ? 'ภาษีขายมากกว่าภาษีซื้อ' : 'ภาษีซื้อมากกว่าภาษีขาย (ขอคืนได้)'}
                </div>
              </div>
            </div>

            {/* Charts & Categorized Spending */}
            <div className="charts-grid">
              <div className="glass-card">
                <div className="chart-card-header">
                  <span className="chart-card-title">แนวโน้มรายรับ-รายจ่าย</span>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--success)', borderRadius: '2px' }}></div>
                      <span>รายรับ</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--danger)', borderRadius: '2px' }}></div>
                      <span>รายจ่าย</span>
                    </div>
                  </div>
                </div>
                
                {/* SVG Visualizer Chart */}
                {/* SVG Visualizer Chart */}
                <div className="svg-chart-container" style={{ position: 'relative', height: '270px' }}>
                  {(() => {
                    const chartTxs = [...filteredTxs].sort((a, b) => new Date(a.date) - new Date(b.date));
                    const dateMap = {};
                    chartTxs.forEach(t => {
                      if (!dateMap[t.date]) dateMap[t.date] = { income: 0, expense: 0 };
                      dateMap[t.date][t.type] += t.amount;
                    });
                    const dates = Object.keys(dateMap).sort();

                    if (dates.length === 0) {
                      return (
                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          กรุณาบันทึกข้อมูลการเงินเพื่อแสดงกราฟ
                        </div>
                      );
                    }

                    // Compute points coordinates inside SVG viewBox 540x220
                    // grid x ranges from 55 to 520 (width = 465)
                    // grid y ranges from 20 to 175 (height = 155)
                    const getPoints = (type) => {
                      if (dates.length === 1) {
                        const y = 175 - (dateMap[dates[0]][type] / chartMaxVal) * 155;
                        return [
                          { x: 55, y, date: dates[0], value: dateMap[dates[0]][type] },
                          { x: 520, y, date: dates[0], value: dateMap[dates[0]][type] }
                        ];
                      }
                      return dates.map((d, index) => {
                        const x = 55 + (index / (dates.length - 1)) * 465;
                        const y = 175 - (dateMap[d][type] / chartMaxVal) * 155;
                        return { x, y, date: d, value: dateMap[d][type], index };
                      });
                    };

                    const incomePoints = getPoints('income');
                    const expensePoints = getPoints('expense');

                    const incomePath = getCurvePath(incomePoints);
                    const expensePath = getCurvePath(expensePoints);

                    const formatXAxisDate = (dateStr) => {
                      if (!dateStr) return '';
                      try {
                        const date = new Date(dateStr);
                        if (filterTime === 'week') {
                          const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
                          return days[date.getDay()];
                        } else if (filterTime === 'month') {
                          const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                          return `${date.getDate()} ${months[date.getMonth()]}`;
                        } else if (filterTime === 'year') {
                          const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                          return months[date.getMonth()];
                        }
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      } catch (e) {
                        return dateStr;
                      }
                    };

                    const shouldShowLabel = (index, total) => {
                      if (total <= 8) return true;
                      if (total <= 15) return index % 2 === 0;
                      if (total <= 25) return index % 4 === 0;
                      return index % 5 === 0 || index === total - 1;
                    };

                    return (
                      <svg width="100%" height="100%" viewBox="0 0 540 220" style={{ overflow: 'visible' }}>
                        <defs>
                          {/* Premium drop shadows for chart lines */}
                          <filter id="chart-glow-income" x="-10%" y="-10%" width="120%" height="120%">
                            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#10b981" floodOpacity="0.22" />
                          </filter>
                          <filter id="chart-glow-expense" x="-10%" y="-10%" width="120%" height="120%">
                            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#f43f5e" floodOpacity="0.22" />
                          </filter>

                          {/* Line gradients */}
                          <linearGradient id="line-grad-income" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                          <linearGradient id="line-grad-expense" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="50%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line x1="55" y1="20" x2="520" y2="20" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
                        <line x1="55" y1="58.75" x2="520" y2="58.75" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
                        <line x1="55" y1="97.5" x2="520" y2="97.5" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
                        <line x1="55" y1="136.25" x2="520" y2="136.25" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
                        <line x1="55" y1="175" x2="520" y2="175" stroke="var(--border-color)" strokeWidth="1.5" opacity="0.8" />

                        {/* Y-Axis Labels (inside SVG, scales proportionally, does not stretch!) */}
                        <text x="45" y="24" textAnchor="end" fontSize="0.68rem" fontWeight="700" fill="var(--text-muted)">฿{Math.round(chartMaxVal).toLocaleString('th-TH')}</text>
                        <text x="45" y="62.75" textAnchor="end" fontSize="0.68rem" fontWeight="700" fill="var(--text-muted)">฿{Math.round(chartMaxVal * 0.75).toLocaleString('th-TH')}</text>
                        <text x="45" y="101.5" textAnchor="end" fontSize="0.68rem" fontWeight="700" fill="var(--text-muted)">฿{Math.round(chartMaxVal * 0.5).toLocaleString('th-TH')}</text>
                        <text x="45" y="140.25" textAnchor="end" fontSize="0.68rem" fontWeight="700" fill="var(--text-muted)">฿{Math.round(chartMaxVal * 0.25).toLocaleString('th-TH')}</text>
                        <text x="45" y="179" textAnchor="end" fontSize="0.68rem" fontWeight="700" fill="var(--text-muted)">0.00</text>

                        {/* Hover vertical guideline */}
                        {hoveredIndex !== null && incomePoints[hoveredIndex] && (
                          <line
                            x1={incomePoints[hoveredIndex].x}
                            y1="20"
                            x2={incomePoints[hoveredIndex].x}
                            y2="175"
                            stroke="var(--primary)"
                            strokeWidth="1.5"
                            strokeDasharray="4,4"
                            opacity="0.6"
                          />
                        )}

                        {/* Chart lines */}
                        <path d={incomePath} fill="none" stroke="url(#line-grad-income)" strokeWidth="4.5" strokeLinecap="round" filter="url(#chart-glow-income)" />
                        <path d={expensePath} fill="none" stroke="url(#line-grad-expense)" strokeWidth="4.5" strokeLinecap="round" filter="url(#chart-glow-expense)" />

                        {/* Data labels and dots for Income */}
                        {incomePoints.map((p, idx) => (
                          <g key={`inc-${idx}`} style={{ pointerEvents: 'none' }}>
                            {/* Hover value tooltip */}
                            {(hoveredIndex === idx || dates.length <= 10) && p.value > 0 && (
                              <g>
                                <rect x={p.x - 25} y={p.y - 25} width="50" height="15" rx="3" fill="#10b981" opacity="0.9" />
                                <text x={p.x} y={p.y - 15} textAnchor="middle" fontSize="0.6rem" fontWeight="800" fill="#ffffff">
                                  {Math.round(p.value).toLocaleString('th-TH')}
                                </text>
                              </g>
                            )}
                            {/* Point Dot */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredIndex === idx ? 6.5 : 4}
                              fill="#ffffff"
                              stroke="#10b981"
                              strokeWidth={hoveredIndex === idx ? 4 : 2.5}
                              style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                            />
                          </g>
                        ))}

                        {/* Data labels and dots for Expense */}
                        {expensePoints.map((p, idx) => (
                          <g key={`exp-${idx}`} style={{ pointerEvents: 'none' }}>
                            {/* Hover value tooltip */}
                            {(hoveredIndex === idx || dates.length <= 10) && p.value > 0 && (
                              <g>
                                <rect x={p.x - 25} y={p.y - 25} width="50" height="15" rx="3" fill="#f43f5e" opacity="0.9" />
                                <text x={p.x} y={p.y - 15} textAnchor="middle" fontSize="0.6rem" fontWeight="800" fill="#ffffff">
                                  {Math.round(p.value).toLocaleString('th-TH')}
                                </text>
                              </g>
                            )}
                            {/* Point Dot */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredIndex === idx ? 6.5 : 4}
                              fill="#ffffff"
                              stroke="#f43f5e"
                              strokeWidth={hoveredIndex === idx ? 4 : 2.5}
                              style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                            />
                          </g>
                        ))}

                        {/* X-Axis labels */}
                        {dates.map((d, idx) => {
                          if (!shouldShowLabel(idx, dates.length)) return null;
                          const x = 55 + (idx / (dates.length - 1 || 1)) * 465;
                          return (
                            <text
                              key={`x-lbl-${idx}`}
                              x={x}
                              y="198"
                              textAnchor="middle"
                              fontSize="0.7rem"
                              fontWeight="700"
                              fill="var(--text-muted)"
                            >
                              {formatXAxisDate(d)}
                            </text>
                          );
                        })}

                        {/* Hover triggers columns */}
                        {dates.map((d, idx) => {
                          const x = 55 + (idx / (dates.length - 1 || 1)) * 465;
                          const colWidth = dates.length > 1 ? 465 / (dates.length - 1) : 465;
                          const rectX = idx === 0 ? 55 : x - colWidth / 2;
                          const rectWidth = idx === 0 || idx === dates.length - 1 ? colWidth / 2 : colWidth;

                          return (
                            <rect
                              key={`trg-${idx}`}
                              x={rectX}
                              y="10"
                              width={rectWidth}
                              height="175"
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            />
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>
              </div>

              {/* Expense Category Breakdown */}
              <div className="glass-card">
                <div className="chart-card-header">
                  <span className="chart-card-title">สัดส่วนค่าใช้จ่าย</span>
                </div>
                
                {expenseByCategory.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                      <svg width="130" height="130" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--border-color)" strokeWidth="6"></circle>
                        {(() => {
                          let cumulativePercent = 0;
                          const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#64748b'];
                          const totalExp = expenseByCategory.reduce((sum, item) => sum + item.value, 0);

                          return expenseByCategory.map((item, index) => {
                            const percent = (item.value / totalExp) * 100;
                            const strokeDash = `${percent} ${100 - percent}`;
                            const strokeOffset = 100 - cumulativePercent + 25;
                            cumulativePercent += percent;

                            return (
                              <circle 
                                key={index}
                                cx="21" 
                                cy="21" 
                                r="15.915" 
                                fill="transparent" 
                                stroke={colors[index % colors.length]} 
                                strokeWidth="6" 
                                strokeDasharray={strokeDash}
                                strokeDashoffset={strokeOffset}
                              />
                            );
                          });
                        })()}
                        <g className="chart-text" style={{ transform: 'translate(21px, 24px)', textAnchor: 'middle' }}>
                          <text style={{ fontSize: '0.35rem', fill: 'var(--text-main)' }}>สัดส่วนบิล</text>
                        </g>
                      </svg>
                    </div>

                    <div className="chart-legend">
                      {expenseByCategory.slice(0, 3).map((item, idx) => {
                        const totalExp = expenseByCategory.reduce((sum, i) => sum + i.value, 0);
                        const pct = Math.round((item.value / totalExp) * 100);
                        const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#64748b'];
                        return (
                          <div className="legend-item" key={idx}>
                            <div className="legend-label-group">
                              <span className="legend-color-dot" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                              <span className="legend-label">{item.name}</span>
                            </div>
                            <span className="legend-value">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', height: '180px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    ไม่มีข้อมูลค่าใช้จ่าย
                  </div>
                )}
              </div>
            </div>

            {/* Recent Ledger List */}
            <div className="glass-card">
              <div className="flex-between mb-4">
                <span className="chart-card-title">รายการล่าสุด</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {currentUser.role === 'admin' && transactions.length > 0 && (
                    <button 
                      className="btn"
                      onClick={handleClearAllTransactions}
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Trash2 size={14} /> เคลียร์รายการ
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={() => setActiveTab('transactions')}>
                    ดูบัญชีทั้งหมด
                  </button>
                </div>
              </div>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>รายละเอียด</th>
                      <th>หมวดหมู่</th>
                      <th>รหัสอ้างอิง</th>
                      <th>ประเภท</th>
                      <th className="text-right">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 5).map((tx) => (
                      <tr key={tx.id}>
                        <td>{tx.date}</td>
                        <td className="font-semibold">{tx.description}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{tx.category}</td>
                        <td><code style={{ fontSize: '0.85rem' }}>{tx.ref || '-'}</code></td>
                        <td>
                          <span className={`badge badge-${tx.type}`}>
                            {tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                          </span>
                        </td>
                        <td className={`text-right font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                          {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TRANSACTIONS (GENERAL LEDGER) TAB ================= */}
        {activeTab === 'transactions' && (
          <div>
            <header className="page-header">
              <div className="page-title-group">
                <h1>สมุดบันทึกรายรับ-รายจ่าย</h1>
                <p>จัดการธุรกรรม ค้นหา วิเคราะห์ข้อมูลการเดินบัญชีของสำนักงาน</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {currentUser.role === 'admin' && (
                  <button 
                    className="btn"
                    onClick={handleClearAllTransactions}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.95rem',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                    title="ลบ/เคลียร์รายการธุรกรรมทั้งหมด"
                  >
                    <Trash2 size={15} /> เคลียร์รายการทั้งหมด
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => {
                  setTxForm({
                    type: 'expense',
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    category: 'ค่าอาหารและเครื่องดื่ม',
                    description: '',
                    ref: ''
                  });
                  setEditingTransaction(null);
                  setShowAddModal(true);
                }}>
                  <Plus size={16} /> เพิ่มรายการเดินบัญชี
                </button>
              </div>
            </header>

            <div className="glass-card mb-4">
              <div className="filter-bar">
                <div className="filter-item">
                  <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                  <span className="form-label" style={{ margin: 0 }}>ประเภท:</span>
                  <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: '130px', padding: '0.45rem' }}>
                    <option value="all">ทั้งหมด</option>
                    <option value="income">รายรับ (Income)</option>
                    <option value="expense">รายจ่าย (Expense)</option>
                  </select>
                </div>

                <div className="filter-item">
                  <span className="form-label" style={{ margin: 0 }}>ช่วงเวลา:</span>
                  <select className="form-select" value={filterTime} onChange={(e) => setFilterTime(e.target.value)} style={{ width: '140px', padding: '0.45rem' }}>
                    <option value="all">ทั้งหมด</option>
                    <option value="week">7 วันล่าสุด</option>
                    <option value="month">30 วันล่าสุด</option>
                    <option value="year">ปีนี้</option>
                    <option value="custom">ระบุช่วงเวลา</option>
                  </select>
                </div>

                {filterTime === 'custom' && (
                  <div className="filter-item gap-2">
                    <input type="date" className="form-input" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ width: '135px', padding: '0.45rem' }} />
                    <span style={{ color: 'var(--text-muted)' }}>ถึง</span>
                    <input type="date" className="form-input" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ width: '135px', padding: '0.45rem' }} />
                  </div>
                )}

                <div className="filter-item" style={{ flexGrow: 1 }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="ค้นหาชื่อรายการ, หมวดหมู่, หรือเลขที่อ้างอิง..." 
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    style={{ padding: '0.45rem 1rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>รายการ:</span> <strong>{filteredTxs.length} รายการ</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>ยอดรับรวม:</span> <strong className="text-success">฿{totalIncome.toLocaleString()}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>ยอดจ่ายรวม:</span> <strong className="text-danger">฿{totalExpense.toLocaleString()}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>คงเหลือสุทธิ:</span> <strong style={{ color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>฿{netBalance.toLocaleString()}</strong></div>
              </div>
            </div>

            <div className="glass-card">
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>รายละเอียดธุรกรรม</th>
                      <th>หมวดหมู่</th>
                      <th>รหัสอ้างอิง</th>
                      <th>ประเภท</th>
                      <th className="text-right">จำนวนเงิน</th>
                      {currentUser.role === 'admin' && <th className="text-center" style={{ width: '120px' }}>การจัดการ</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.length > 0 ? (
                      filteredTxs.map((tx) => (
                        <tr key={tx.id}>
                          <td>{tx.date}</td>
                          <td>
                            <div className="font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {tx.imageUrl && (
                                <button 
                                  onClick={() => setSelectedDoc(tx)} 
                                  title="คลิกเพื่อดูรูปภาพสลิปที่แนบมา" 
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}
                                >
                                  <Image size={15} />
                                </button>
                              )}
                              <span>{tx.description}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{tx.category}</td>
                          <td><code>{tx.ref || '-'}</code></td>
                          <td>
                            <span className={`badge badge-${tx.type}`}>
                              {tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                            </span>
                          </td>
                          <td className={`text-right font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                            {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          {currentUser.role === 'admin' && (
                            <td className="text-center">
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button className="btn btn-secondary" onClick={() => openEditModal(tx)} style={{ padding: '0.35rem 0.5rem' }}>แก้ไข</button>
                                <button className="btn btn-danger" onClick={() => deleteTransaction(tx.id)} style={{ padding: '0.35rem 0.5rem' }}><Trash2 size={14} /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={currentUser.role === 'admin' ? 7 : 6} className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                          ไม่พบข้อมูลประวัติบัญชี
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= POS SHOP REGISTER TAB ================= */}
        {activeTab === 'pos' && (
          <div>
            <header className="page-header">
              <div className="page-title-group">
                <h1>ระบบขายสินค้าและบริการหน้าร้าน (POS)</h1>
                <p>เลือกสินค้า ชำระเงิน รวดเร็วและบันทึกรายรับของบริษัททันที</p>
              </div>
              {currentUser.role === 'admin' && (
                <button className="btn btn-primary" onClick={() => openProductCRUDModal()}>
                  <Plus size={16} /> เพิ่มรายการสินค้า
                </button>
              )}
            </header>

            <div className="pos-container">
              {/* Product Catalog */}
              <div className="pos-products-panel">
                <div className="pos-product-grid">
                  {products.map(p => (
                    <div key={p.id} className="pos-product-card" onClick={() => addToCart(p)} style={{ position: 'relative' }}>
                      {currentUser.role === 'admin' && (
                        <div className="pos-card-actions" style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', zIndex: 10 }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openProductCRUDModal(p); }} 
                            style={{ 
                              padding: '5px', 
                              borderRadius: '4px', 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: '1px solid var(--border-color)', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            title="แก้ไขสินค้า"
                          >
                            <Edit size={12} style={{ color: '#4b5563' }} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }} 
                            style={{ 
                              padding: '5px', 
                              borderRadius: '4px', 
                              backgroundColor: '#fee2e2', 
                              border: '1px solid #fca5a5', 
                              color: '#b91c1c', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            title="ลบสินค้า"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                      
                      <div className="pos-product-image">{p.icon}</div>
                      <div>
                        <div className="pos-product-name">{p.name}</div>
                        <div className="pos-product-sku">{p.sku}</div>
                      </div>
                      <div className="flex-between">
                        <span className="pos-product-price">฿{p.price.toLocaleString()}</span>
                        <span style={{ fontSize: '0.75rem', color: p.stock > 0 ? 'var(--text-muted)' : 'var(--danger)' }}>
                          {p.stock > 0 ? `สต็อก: ${p.stock}` : 'สินค้าหมด'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Drawer */}
              <div className="glass-card pos-cart-panel">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingCart className="text-primary" /> รายการสั่งซื้อ
                </h3>
                
                <div className="pos-cart-items">
                  {cart.length > 0 ? (
                    cart.map(item => (
                      <div key={item.id} className="pos-cart-item">
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ฿{item.price.toLocaleString()} x {item.qty}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button className="pos-cart-qty-btn" onClick={() => updateCartQty(item.id, -1)}>-</button>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.qty}</span>
                          <button className="pos-cart-qty-btn" onClick={() => updateCartQty(item.id, 1)}>+</button>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', width: '70px', textAlign: 'right' }}>
                          ฿{(item.price * item.qty).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      ไม่มีสินค้าในตะกร้าชั่วคราว
                    </div>
                  )}
                </div>

                <div className="invoice-summary-box" style={{ maxWidth: '100%', width: '100%' }}>
                  {(() => {
                    const { subtotal, vatAmount, netTotal } = getCartTotals();
                    return (
                      <>
                        <div className="invoice-summary-line">
                          <span>ราคารวมสินค้า:</span>
                          <span>฿{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="invoice-summary-line" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>ภาษีมูลค่าเพิ่มในราคาสินค้า (VAT 7%):</span>
                          <span>฿{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="invoice-summary-line" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>ราคาก่อนภาษี (Net Total):</span>
                          <span>฿{netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="invoice-summary-line total">
                          <span>ยอดชำระสุทธิ:</span>
                          <span>฿{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {cart.length > 0 && (
                  <form onSubmit={handlePOSCheckout} className="mt-4">
                    <div className="form-group">
                      <label className="form-label">วิธีการชำระเงิน</label>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                        <label style={{ cursor: 'pointer' }}>
                          <input type="radio" value="cash" checked={posPaymentMethod === 'cash'} onChange={() => setPosPaymentMethod('cash')} style={{ marginRight: '0.25rem' }} />
                          เงินสด (Cash)
                        </label>
                        <label style={{ cursor: 'pointer' }}>
                          <input type="radio" value="transfer" checked={posPaymentMethod === 'transfer'} onChange={() => setPosPaymentMethod('transfer')} style={{ marginRight: '0.25rem' }} />
                          เงินโอน / PromptPay QR
                        </label>
                      </div>
                    </div>

                    {posPaymentMethod === 'cash' && (
                      <div className="form-group">
                        <label className="form-label">จำนวนเงินที่ได้รับ (บาท)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          required 
                          placeholder="รับเงินสด..."
                          value={posCashReceived}
                          onChange={(e) => setPosCashReceived(e.target.value)}
                        />
                      </div>
                    )}

                    <button type="submit" className="btn btn-success" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                      บันทึกการขาย & พิมพ์ใบเสร็จย่อ
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAX INVOICES TAB ================= */}
        {activeTab === 'invoices' && (
          <div>
            <header className="page-header">
              <div className="page-title-group">
                <h1>การออกใบกำกับภาษีเต็มรูป</h1>
                <p>ออกเอกสารตามหลักเกณฑ์ของกรมสรรพากร พร้อมระบุข้อมูลบริษัทและเลขประจำตัวผู้เสียภาษี</p>
              </div>
            </header>

            <div className="scanner-container">
              {/* Creator Form */}
              <div className="glass-card">
                <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText className="text-primary" /> ข้อมูลการออกใบกำกับภาษี
                </h3>
                
                <form onSubmit={handleSaveInvoice}>
                  <div className="invoice-meta-row">
                    <div className="form-group">
                      <label className="form-label">เลขที่ใบกำกับภาษี (Auto)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        value={invoiceForm.invoiceNumber}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">วันที่ออกเอกสาร</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        required
                        value={invoiceForm.date}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ผู้ขาย (ข้อมูลอ้างอิงบริษัทของคุณ)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={invoiceForm.sellerName}
                      disabled
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">เลขประจำตัวผู้เสียภาษี (ผู้ขาย)</label>
                      <input type="text" className="form-input" value={invoiceForm.sellerTaxId} disabled />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ที่อยู่ผู้ขาย</label>
                      <input type="text" className="form-input" value={invoiceForm.sellerAddress} disabled />
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

                  <div className="form-group">
                    <label className="form-label">ชื่อลูกค้า / บริษัทผู้ชื้อ</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="เช่น บริษัท ออฟฟิศ มาร์ต จำกัด" 
                      required
                      value={invoiceForm.buyerName}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, buyerName: e.target.value }))}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">เลขประจำตัวผู้เสียภาษี (ผู้ซื้อ)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="เลข 13 หลัก" 
                        required
                        maxLength="13"
                        value={invoiceForm.buyerTaxId}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, buyerTaxId: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ที่อยู่ผู้ซื้อ</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="ที่อยู่ในการจัดส่งเอกสารและภาษี" 
                        required
                        value={invoiceForm.buyerAddress}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, buyerAddress: e.target.value }))}
                      />
                    </div>
                  </div>

                  <h4 className="mt-4 mb-2">รายการสินค้า/บริการ</h4>
                  <table className="invoice-items-table">
                    <thead>
                      <tr>
                        <th>ชื่อสินค้า/บริการ</th>
                        <th style={{ width: '80px' }}>จำนวน</th>
                        <th style={{ width: '130px' }}>ราคา/หน่วย</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceForm.items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="เช่น บริการให้คำปรึกษาทางบัญชี" 
                              required
                              value={item.name}
                              onChange={(e) => handleInvoiceItemChange(index, 'name', e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-input text-center" 
                              required
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleInvoiceItemChange(index, 'qty', parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-input" 
                              placeholder="0.00" 
                              required
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleInvoiceItemChange(index, 'price', parseFloat(e.target.value) || '')}
                            />
                          </td>
                          <td>
                            <button 
                              type="button" 
                              className="btn btn-danger" 
                              onClick={() => removeInvoiceItemRow(index)}
                              style={{ padding: '0.5rem' }}
                              disabled={invoiceForm.items.length <= 1}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={addInvoiceItemRow} style={{ margin: 0 }}>
                      <Plus size={14} /> เพิ่มรายการใหม่
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.45rem 0.9rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>คำนวณภาษี (VAT):</span>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', color: 'var(--text-main)' }}>
                        <input 
                          type="radio" 
                          name="invoice-vat-type" 
                          checked={invoiceForm.vatRate === 7} 
                          onChange={() => setInvoiceForm(prev => ({ ...prev, vatRate: 7 }))} 
                        />
                        มี VAT 7%
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', color: 'var(--text-main)' }}>
                        <input 
                          type="radio" 
                          name="invoice-vat-type" 
                          checked={invoiceForm.vatRate === 0} 
                          onChange={() => setInvoiceForm(prev => ({ ...prev, vatRate: 0 }))} 
                        />
                        ไม่มี VAT (0%)
                      </label>
                    </div>
                  </div>

                  <div className="invoice-summary-box">
                    {(() => {
                      const { subtotal, vatAmount, grandTotal } = calculateInvoiceTotals();
                      return (
                        <>
                          <div className="invoice-summary-line">
                            <span>ราคาก่อนภาษี (Subtotal):</span>
                            <span>฿{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="invoice-summary-line" style={{ opacity: invoiceForm.vatRate === 0 ? 0.6 : 1 }}>
                            <span>ภาษีมูลค่าเพิ่ม (VAT {invoiceForm.vatRate}%):</span>
                            <span>฿{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="invoice-summary-line total">
                            <span>ยอดเงินรวมสุทธิ:</span>
                            <span>฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex-between mt-4">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      * กดบันทึกเพื่อออกใบกำกับภาษี และเพิ่มลงระบบบัญชีโดยอัตโนมัติ
                    </span>
                    <button type="submit" className="btn btn-success">
                      บันทึก & ออกใบเสร็จพิมพ์
                    </button>
                  </div>
                </form>
              </div>

              {/* History */}
              <div className="glass-card">
                <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileSpreadsheet className="text-secondary" /> เอกสารใบกำกับภาษีที่ออกแล้ว
                </h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>เลขใบกำกับ</th>
                        <th>วันที่</th>
                        <th>ผู้ชื้อ</th>
                        <th className="text-right">ยอดสุทธิ</th>
                        <th className="text-center">พิมพ์</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length > 0 ? (
                        invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="font-semibold">{inv.invoiceNumber}</td>
                            <td>{inv.date}</td>
                            <td>{inv.buyerName}</td>
                            <td className="text-right font-bold text-success">
                              ฿{inv.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-center">
                              <button className="btn btn-secondary" onClick={() => handlePrint(inv)} style={{ padding: '0.4rem' }}>
                                <Printer size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                            ยังไม่มีประวัติการออกเอกสารใบกำกับภาษี
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= LINE BOT INTERACTIVE SIMULATOR ================= */}
        {activeTab === 'linebot' && (
          <div>
            <header className="page-header">
              <div className="page-title-group">
                <h1>ระบบจำลอง LINE Bot สร้างเอกสารทางบัญชี</h1>
                <p>โต้ตอบกับ LINE Bot เพื่อนำข้อมูลสลิปโอนเงิน หรือใบเสร็จไปสร้างเป็นข้อมูลการเงินและไฟล์รายงานโดยอัตโนมัติ</p>
              </div>
            </header>

            <div className="line-bot-layout">
              {/* Phone Mockup Screen */}
              <div>
                <div className="mobile-phone-mockup">
                  <div className="mobile-status-bar">
                    <span>12:15</span>
                    <span style={{ display: 'flex', gap: '4px' }}>📶 🔋 100%</span>
                  </div>
                  
                  <div className="mobile-line-header">
                    <div className="mobile-line-avatar">FL</div>
                    <div className="mobile-line-title">
                      <span className="mobile-line-name">{settings.lineBotName}</span>
                      <span className="mobile-line-status">● กำลังทำงาน (Online)</span>
                    </div>
                  </div>

                  <div className="mobile-chat-area">
                    <div className="chat-date-divider">วันนี้</div>

                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`chat-bubble-row ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                        {msg.sender === 'bot' && <div className="mobile-line-avatar" style={{ width: '24px', height: '24px', fontSize: '0.65rem' }}>Bot</div>}
                        <div className={`chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                          {msg.text.split('\n').map((line, idx) => <div key={idx}>{line}</div>)}
                          
                          {msg.docLink && (
                            <div className="chat-bubble-doc-card" onClick={() => {
                              setSelectedDoc(msg.docLink);
                              setActiveTab('dochub');
                            }}>
                              <FileText size={18} style={{ color: 'var(--primary)' }} />
                              <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#1e293b' }}>ดูรายงานเอกสาร PDF</div>
                                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>รหัส: {msg.docLink.ref}</div>
                              </div>
                              <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#64748b' }} />
                            </div>
                          )}

                          <span className="chat-bubble-time">{msg.time}</span>
                        </div>
                      </div>
                    ))}

                    {isBotTyping && (
                      <div className="chat-bubble-row bot">
                        <div className="mobile-line-avatar" style={{ width: '24px', height: '24px', fontSize: '0.65rem' }}>Bot</div>
                        <div className="chat-bubble bot-bubble" style={{ padding: '0.4rem 0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>กำลังพิมพ์...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mobile-chat-input-bar">
                    <button className="mobile-chat-btn" onClick={() => document.getElementById('line-file-upload').click()}>
                      <Image size={18} />
                      <input 
                        type="file" 
                        id="line-file-upload" 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleLineCustomUpload}
                      />
                    </button>
                    <input 
                      type="text" 
                      className="mobile-chat-input" 
                      placeholder="ส่งข้อความหาบอท..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLineSendMessage()}
                    />
                    <button className="mobile-chat-btn" onClick={() => handleLineSendMessage()}>
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* OCR Visual Scanner / Slip Selectors */}
              <div className="glass-card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <h3 className="mb-4">1. ทดสอบโดยเลือกเอกสารสลิป/ใบเสร็จ</h3>
                <span className="form-label" style={{ marginBottom: '1rem' }}>คลิกเพื่อจำลองการส่งภาพสลิปเข้าไปยัง LINE Chat เพื่อเริ่มสแกนดึงข้อมูล:</span>
                
                <div className="sample-grid" style={{ marginBottom: '1.5rem' }}>
                  {MOCK_SLIPS.map(slip => (
                    <button 
                      key={slip.id} 
                      className="sample-button"
                      style={{ borderLeft: `4px solid ${slip.style.color}`, width: '100%' }}
                      onClick={() => handleLineAttachSlip(slip)}
                      disabled={isLineScanning}
                    >
                      <span className="sample-button-icon" style={{ color: slip.style.color }}>{slip.style.logo}</span>
                      <strong style={{ fontSize: '0.75rem' }}>{slip.name}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>฿{slip.amount.toLocaleString()}</span>
                    </button>
                  ))}
                </div>

                <div className="ocr-viewport-container" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', minHeight: '300px' }}>
                  {activeLineSlip ? (
                    <div style={{ position: 'relative', width: '250px', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="scanner-overlay-grid"></div>
                      
                      {isLineScanning && <div className="scanner-laser-line"></div>}
                      {isLineScanning && (
                        <div style={{
                          position: 'absolute',
                          bottom: '10px',
                          left: '5%',
                          width: '90%',
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          borderRadius: '6px',
                          padding: '6px',
                          color: '#ffffff',
                          fontSize: '0.65rem',
                          textAlign: 'center',
                          zIndex: 20,
                          border: '1px solid var(--primary)',
                          fontFamily: 'sans-serif'
                        }}>
                          กำลังสแกนวิเคราะห์บิล... {lineScanProgress}%
                        </div>
                      )}

                      {/* Mock Bill Visuals */}
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        backgroundColor: '#ffffff', 
                        borderRadius: '8px', 
                        padding: '1rem',
                        color: '#333333',
                        fontSize: '0.7rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        borderTop: `6px solid ${activeLineSlip.style.color}`
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ color: activeLineSlip.style.color, fontSize: '0.8rem' }}>{activeLineSlip.merchant}</strong>
                            <span style={{ color: '#888888', fontSize: '0.55rem' }}>E-Slip SUCCESS</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div><span style={{ color: '#888888' }}>วันที่-เวลา: </span><span>{activeLineSlip.date} {activeLineSlip.time}</span></div>
                            <div><span style={{ color: '#888888' }}>รหัสอ้างอิง: </span><span>{activeLineSlip.ref}</span></div>
                            <div><span style={{ color: '#888888' }}>รายละเอียด: </span><span>{activeLineSlip.description}</span></div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', borderTop: '1px dashed #dddddd', paddingTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.55rem', color: '#888888', display: 'block' }}>จำนวนเงิน (THB)</span>
                          <strong style={{ fontSize: '1.2rem', color: activeLineSlip.style.color }}>
                            ฿{activeLineSlip.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>

                      {/* Visual OCR Bounding boxes overlaying mock slip */}
                      {lineOCRCoords.map((c, idx) => (
                        <div 
                          key={idx} 
                          className={`ocr-bounding-box ${c.active ? 'active' : ''}`}
                          style={{
                            top: c.y,
                            left: c.x,
                            width: c.w,
                            height: c.h
                          }}
                        >
                          <span className="ocr-bounding-label">{c.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                      เลือกบิลด้านบน หรืออัปโหลดไฟล์ในระบบ LINE<br />เพื่อเริ่มจำลองกระบวนการสแกนความแม่นยำสูง
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= DOCUMENT HUB ARCHIVE TAB ================= */}
        {activeTab === 'dochub' && (
          <div>
            <header className="page-header">
              <div className="page-title-group">
                <h1>คลังเก็บไฟล์เอกสาร (Document Hub)</h1>
                <p>เรียกดูประวัติเอกสารย้อนหลังที่จัดเก็บผ่าน LINE Bot หรือใบเสร็จขายสินค้า</p>
              </div>
            </header>

            <div className="glass-card mb-4">
              <div className="filter-bar">
                <div className="filter-item">
                  <span className="form-label" style={{ margin: 0 }}>ค้นหาเอกสาร:</span>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="ค้นหาชื่อ, เลขที่บิล, หมวดหมู่..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    style={{ width: '250px', padding: '0.45rem 1rem' }}
                  />
                </div>

                <div className="filter-item">
                  <span className="form-label" style={{ margin: 0 }}>ประเภทเอกสาร:</span>
                  <select 
                    className="form-select" 
                    value={docFilterType}
                    onChange={(e) => setDocFilterType(e.target.value)}
                    style={{ width: '160px', padding: '0.45rem' }}
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="income">ใบเสร็จรับเงิน (รายรับ)</option>
                    <option value="expense">ใบกำกับภาษี (รายจ่าย)</option>
                  </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    พบเอกสารทั้งหมด <strong>{filteredDocs.length} ไฟล์</strong>
                  </div>
                  {currentUser.role === 'admin' && filteredDocs.length > 0 && (
                    <button 
                      className="btn btn-danger" 
                      onClick={handleClearAllDocuments}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      🗑️ ล้างคลังเอกสาร
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="doc-hub-grid">
              {filteredDocs.length > 0 ? (
                filteredDocs.map(doc => (
                  <div key={doc.id} className="glass-card doc-hub-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: 0, lineHeight: '1.4', flexGrow: 1 }}>{doc.title}</h3>
                      <span className={`badge badge-${doc.type === 'receipt' ? 'income' : 'expense'}`} style={{ flexShrink: 0 }}>
                        {doc.type === 'receipt' ? 'ใบเสร็จรับเงิน' : 'ใบกำกับภาษี'}
                      </span>
                    </div>

                    {doc.imageUrl && (
                      <div style={{ marginBottom: '0.75rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', height: '160px', width: '100%', backgroundColor: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={doc.imageUrl} 
                          alt="Slip image" 
                          style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', cursor: 'pointer' }}
                          onClick={() => setSelectedDoc(doc)}
                          title="คลิกเพื่อดูรูปภาพสลิปแบบขยายใหญ่"
                        />
                      </div>
                    )}
                    
                    <div className="doc-hub-meta">
                      <div><strong>วันที่สแกน:</strong> {doc.date} {doc.time}</div>
                      <div><strong>เลขอ้างอิง Ref:</strong> {doc.ref}</div>
                      <div><strong>ผู้รับ/ผู้จ่าย:</strong> {doc.sender}</div>
                      <div><strong>หมวดหมู่:</strong> {doc.category}</div>
                    </div>

                    <div style={{ margin: '0.75rem 0', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {doc.details}
                    </div>

                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: doc.type === 'receipt' ? 'var(--success)' : 'var(--danger)', marginBottom: '1rem' }}>
                      ฿{doc.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>

                    <div className="doc-hub-footer">
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handlePrintDocInvoice(doc)} 
                        style={{ flexGrow: 1, padding: '0.4rem 0.2rem', justifyContent: 'center', whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                      >
                        <Printer size={14} style={{ flexShrink: 0 }} /> พิมพ์รายงาน
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setSelectedDoc(doc)} 
                        style={{ flexGrow: 1, padding: '0.4rem 0.2rem', justifyContent: 'center', whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                      >
                        ดูรูปบิลสลิป
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => openEditDocModal(doc)} 
                        style={{ padding: '0.4rem', minWidth: '36px', justifyContent: 'center', flexShrink: 0 }}
                        title="แก้ไขข้อมูลเอกสาร & เปลี่ยนหมวดหมู่"
                      >
                        <Edit size={14} />
                      </button>
                      {currentUser.role === 'admin' && (
                        <button 
                          className="btn btn-danger" 
                          onClick={() => handleDeleteDocument(doc.id)} 
                          style={{ padding: '0.4rem', minWidth: '36px', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  ไม่พบไฟล์เอกสารในระบบจัดเก็บ
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= EMPLOYEE PAYROLL (SALARY) TAB ================= */}
        {activeTab === 'salary' && currentUser.role === 'admin' && (
          <div>
            <header className="page-header">
              <div className="page-title-group">
                <h1>{menuNames.salary || 'เงินเดือนพนักงาน'}</h1>
                <p>จัดการฐานข้อมูลเงินเดือน จัดการสลิปประวัติการจ่ายเงินเดือน และบันทึกบัญชีอัตโนมัติ</p>
              </div>
            </header>

            {/* Sub navigation tabs */}
            <div className="sub-tabs-container mb-4" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <button 
                className={`btn ${salarySubTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSalarySubTab('overview')}
              >
                📊 ภาพรวม & จ่ายเงินเดือน
              </button>
              <button 
                className={`btn ${salarySubTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSalarySubTab('history')}
              >
                📜 ประวัติการจ่ายเงินเดือน
              </button>
              <button 
                className={`btn ${salarySubTab === 'profiles' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSalarySubTab('profiles')}
              >
                ⚙️ ตั้งค่าฐานข้อมูลเงินเดือน
              </button>
            </div>

            {salarySubTab === 'overview' && (
              <div>
                {/* Payroll Metrics Cards */}
                <div className="summary-grid mb-4">
                  <div className="glass-card summary-card balance">
                    <div className="summary-card-header">
                      <span className="summary-card-title">จำนวนพนักงานทั้งหมด</span>
                      <div className="summary-card-icon"><FileText size={18} /></div>
                    </div>
                    <div className="summary-card-value text-primary">
                      {salaries.length} คน
                    </div>
                    <div className="summary-card-change up">
                      <TrendingUp size={14} /> ฐานข้อมูลพนักงานในระบบ
                    </div>
                  </div>

                  <div className="glass-card summary-card income">
                    <div className="summary-card-header">
                      <span className="summary-card-title">ฐานเงินเดือนรวมต่อเดือน</span>
                      <div className="summary-card-icon"><ArrowUpRight size={18} /></div>
                    </div>
                    <div className="summary-card-value text-success">
                      ฿{salaries.reduce((sum, s) => sum + s.baseSalary, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="summary-card-change up">
                      🟢 งบประมาณฐานเงินเดือนประจำเดือน
                    </div>
                  </div>

                  <div className="glass-card summary-card vat">
                    <div className="summary-card-header">
                      <span className="summary-card-title">รวมสวัสดิการ & เบี้ยเลี้ยง</span>
                      <div className="summary-card-icon"><Wallet size={18} /></div>
                    </div>
                    <div className="summary-card-value text-warning">
                      ฿{salaries.reduce((sum, s) => sum + s.allowance, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="summary-card-change up">
                      🟡 โบนัส ค่าล่วงเวลา และสวัสดิการรวม
                    </div>
                  </div>

                  <div className="glass-card summary-card expense">
                    <div className="summary-card-header">
                      <span className="summary-card-title">รวมหักประกันสังคม & ภาษี</span>
                      <div className="summary-card-icon"><ArrowDownRight size={18} /></div>
                    </div>
                    <div className="summary-card-value text-danger">
                      ฿{salaries.reduce((sum, s) => sum + (s.deductionSocial + s.deductionTax), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="summary-card-change down">
                      🔴 ยอดนำส่งประกันสังคมและภาษี ณ ที่จ่าย
                    </div>
                  </div>
                </div>

                <div className="glass-card">
                  <div className="user-mgmt-header mb-4">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>รายการพนักงาน & การสั่งจ่ายเงินเดือน</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>พนักงานทุกคนที่ลงทะเบียนในระบบ และสามารถคลิกทำรายการเพื่อจ่ายเงินเดือนในแต่ละรอบเดือนได้</p>
                  </div>

                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>ชื่อพนักงาน</th>
                          <th>ตำแหน่ง / บทบาท</th>
                          <th className="text-right">ฐานเงินเดือน</th>
                          <th className="text-right">ค่าเบี้ยเลี้ยง/สวัสดิการ</th>
                          <th className="text-right">ยอดหักประกันสังคม</th>
                          <th className="text-right">ยอดหักภาษี ณ ที่จ่าย</th>
                          <th className="text-right">ยอดสุทธิเฉลี่ย</th>
                          <th className="text-center" style={{ width: '180px' }}>ทำรายการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaries.length > 0 ? (
                          salaries.map(s => {
                            const net = s.baseSalary + s.allowance - s.deductionSocial - s.deductionTax;
                            return (
                              <tr key={s.id}>
                                <td className="font-semibold">{s.employeeName}</td>
                                <td><span className="badge badge-secondary">{s.employeeRole}</span></td>
                                <td className="text-right font-bold">฿{s.baseSalary.toLocaleString()}</td>
                                <td className="text-right text-success">฿{s.allowance.toLocaleString()}</td>
                                <td className="text-right text-danger">฿{s.deductionSocial.toLocaleString()}</td>
                                <td className="text-right text-danger">฿{s.deductionTax.toLocaleString()}</td>
                                <td className="text-right font-bold text-primary">฿{net.toLocaleString()}</td>
                                <td className="text-center">
                                  <button 
                                    className="btn btn-success" 
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                    onClick={() => openProcessPayrollModal(s)}
                                  >
                                    💸 จ่ายเงินเดือน
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                              ไม่มีพนักงานลงทะเบียนในระบบเงินเดือน
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {salarySubTab === 'history' && (() => {
              const filteredPayrollHistory = payrollHistory.filter(h => {
                if (salaryFilterType === 'month') {
                  return h.datePaid.startsWith(salaryFilterMonth);
                }
                if (salaryFilterType === 'year') {
                  return h.datePaid.startsWith(salaryFilterYear);
                }
                if (salaryFilterType === 'custom') {
                  if (salaryFilterStart && h.datePaid < salaryFilterStart) return false;
                  if (salaryFilterEnd && h.datePaid > salaryFilterEnd) return false;
                  return true;
                }
                return true;
              });

              return (
                <div className="glass-card">
                  <div className="user-mgmt-header mb-4">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ประวัติการทำรายการจ่ายเงินเดือน</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ประวัติและรายการสลิปเงินเดือนทั้งหมดที่ทำรายการจ่ายสำเร็จแล้ว (คลิกดูสลิปเงินเดือนเพื่อสั่งพิมพ์ได้)</p>
                  </div>

                  {/* Filter controls */}
                  <div className="filter-bar mb-4" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                    <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="form-label" style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>สรุปยอดเวลา:</span>
                      <select 
                        className="form-select" 
                        value={salaryFilterType} 
                        onChange={(e) => setSalaryFilterType(e.target.value)}
                        style={{ width: '130px', padding: '0.4rem' }}
                      >
                        <option value="all">ทั้งหมด</option>
                        <option value="month">รายเดือน</option>
                        <option value="year">รายปี</option>
                        <option value="custom">กำหนดเอง</option>
                      </select>
                    </div>

                    {salaryFilterType === 'month' && (
                      <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="form-label" style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>เลือกเดือน:</span>
                        <input 
                          type="month" 
                          className="form-input" 
                          value={salaryFilterMonth} 
                          onChange={(e) => setSalaryFilterMonth(e.target.value)}
                          style={{ width: '160px', padding: '0.4rem' }}
                        />
                      </div>
                    )}

                    {salaryFilterType === 'year' && (
                      <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="form-label" style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>ระบุปี (ค.ศ.):</span>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="เช่น 2026"
                          value={salaryFilterYear} 
                          onChange={(e) => setSalaryFilterYear(e.target.value)}
                          style={{ width: '100px', padding: '0.4rem' }}
                        />
                      </div>
                    )}

                    {salaryFilterType === 'custom' && (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="form-label" style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>เริ่มต้น:</span>
                          <input 
                            type="date" 
                            className="form-input" 
                            value={salaryFilterStart} 
                            onChange={(e) => setSalaryFilterStart(e.target.value)}
                            style={{ width: '150px', padding: '0.4rem' }}
                          />
                        </div>
                        <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="form-label" style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>สิ้นสุด:</span>
                          <input 
                            type="date" 
                            className="form-input" 
                            value={salaryFilterEnd} 
                            onChange={(e) => setSalaryFilterEnd(e.target.value)}
                            style={{ width: '150px', padding: '0.4rem' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Cards */}
                  <div className="summary-grid mb-4">
                    <div className="glass-card summary-card balance">
                      <div className="summary-card-header">
                        <span className="summary-card-title">รายการโอนเงินสำเร็จ</span>
                        <div className="summary-card-icon"><FileText size={18} /></div>
                      </div>
                      <div className="summary-card-value text-primary">
                        {filteredPayrollHistory.length} รายการ
                      </div>
                      <div className="summary-card-change up">
                        <TrendingUp size={14} /> ประวัติการจ่ายเงินเดือนที่กรอง
                      </div>
                    </div>

                    <div className="glass-card summary-card income">
                      <div className="summary-card-header">
                        <span className="summary-card-title">จ่ายเงินเดือนสุทธิรวม</span>
                        <div className="summary-card-icon"><ArrowUpRight size={18} /></div>
                      </div>
                      <div className="summary-card-value text-success">
                        ฿{filteredPayrollHistory.reduce((sum, h) => sum + h.netPaid, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="summary-card-change up">
                        🟢 ยอดเงินโอนสุทธิที่พนักงานได้รับจริง
                      </div>
                    </div>

                    <div className="glass-card summary-card vat">
                      <div className="summary-card-header">
                        <span className="summary-card-title">ประกันสังคมรวม</span>
                        <div className="summary-card-icon"><Wallet size={18} /></div>
                      </div>
                      <div className="summary-card-value text-warning">
                        ฿{filteredPayrollHistory.reduce((sum, h) => sum + h.deductionSocial, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="summary-card-change up">
                        🟡 ยอดหักประกันสังคมนำส่ง
                      </div>
                    </div>

                    <div className="glass-card summary-card expense">
                      <div className="summary-card-header">
                        <span className="summary-card-title">ภาษี ณ ที่จ่ายรวม</span>
                        <div className="summary-card-icon"><ArrowDownRight size={18} /></div>
                      </div>
                      <div className="summary-card-value text-danger">
                        ฿{filteredPayrollHistory.reduce((sum, h) => sum + h.deductionTax, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="summary-card-change down">
                        🔴 ยอดภาษีหัก ณ ที่จ่ายสะสม
                      </div>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>วันที่จ่ายเงิน</th>
                          <th>รอบเงินเดือน</th>
                          <th>ชื่อพนักงาน</th>
                          <th>ตำแหน่ง</th>
                          <th className="text-right">ยอดรับจริงสุทธิ</th>
                          <th>วิธีรับเงิน / ธนาคาร</th>
                          <th>สถานะการโอน</th>
                          <th className="text-center" style={{ width: '220px' }}>การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayrollHistory.length > 0 ? (
                          filteredPayrollHistory.map(h => (
                            <tr key={h.id}>
                              <td><code>{h.datePaid}</code></td>
                              <td className="font-semibold">{h.monthYear}</td>
                              <td className="font-semibold">{h.employeeName}</td>
                              <td><span className="badge badge-secondary">{h.employeeRole}</span></td>
                              <td className="text-right font-bold text-success">฿{h.netPaid.toLocaleString()}</td>
                              <td>
                                <span style={{ fontSize: '0.78rem' }}>
                                  🏦 {h.bankName || '-'}<br />
                                  <span className="text-muted">{h.bankAccount || '-'}</span>
                                </span>
                              </td>
                            <td>
                              <span className="badge badge-income" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                🟢 สำเร็จ (Paid)
                              </span>
                            </td>
                            <td className="text-center">
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                  onClick={() => handlePrintPayslip(h)}
                                >
                                  📄 สลิปเงินเดือน
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '0.35rem 0.5rem' }}
                                  onClick={() => handleDeletePayrollHistory(h.id, h.transactionId)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            ยังไม่มีประวัติการจ่ายเงินเดือนในระบบ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

            {salarySubTab === 'profiles' && (
              <div className="glass-card">
                <div className="user-mgmt-header mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ฐานข้อมูลอัตราเงินเดือนพนักงาน</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>กำหนดอัตราและสวัสดิการ รายการหักลดหย่อน และช่องทางชำระเงินของพนักงานแต่ละคน</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => openSalaryCRUDModal()}>
                    <Plus size={16} /> ลงทะเบียนพนักงานใหม่
                  </button>
                </div>

                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>ชื่อพนักงาน</th>
                        <th>ตำแหน่ง</th>
                        <th className="text-right">ฐานเงินเดือน</th>
                        <th className="text-right">เบี้ยเลี้ยงสม่ำเสมอ</th>
                        <th className="text-right">หักประกันสังคม</th>
                        <th className="text-right">หักภาษี ณ ที่จ่าย</th>
                        <th>เลขบัญชีและธนาคาร</th>
                        <th className="text-center" style={{ width: '180px' }}>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaries.length > 0 ? (
                        salaries.map(s => (
                          <tr key={s.id}>
                            <td className="font-semibold">{s.employeeName}</td>
                            <td><span className="badge badge-secondary">{s.employeeRole}</span></td>
                            <td className="text-right font-bold text-success">฿{s.baseSalary.toLocaleString()}</td>
                            <td className="text-right text-primary">฿{s.allowance.toLocaleString()}</td>
                            <td className="text-right text-danger">฿{s.deductionSocial.toLocaleString()}</td>
                            <td className="text-right text-danger">฿{s.deductionTax.toLocaleString()}</td>
                            <td>
                              <span style={{ fontSize: '0.8rem' }}>
                                <strong>{s.bankName}</strong><br />
                                <code>{s.bankAccount}</code>
                              </span>
                            </td>
                            <td className="text-center">
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.35rem 0.5rem' }} 
                                  onClick={() => openSalaryCRUDModal(s)}
                                >
                                  แก้ไข
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '0.35rem 0.5rem' }}
                                  onClick={() => handleDeleteSalaryProfile(s.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            ยังไม่มีข้อมูลลงทะเบียนพนักงาน
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= SYSTEM CONFIGURATION / SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <div>
            {currentUser.role !== 'admin' ? (
              /* Access Denied layout for non-admins */
              <div className="access-denied-container">
                <div className="access-denied-icon">
                  <Lock size={48} />
                </div>
                <h2 className="access-denied-title">จำกัดสิทธิ์การเข้าใช้งาน</h2>
                <p className="access-denied-text">
                  ขออภัย คุณเข้าสู่ระบบในฐานะพนักงานทั่วไป (Staff) จึงไม่สามารถเข้าถึงหน้าตั้งค่าระบบหรือระบบจัดการผู้ใช้งานได้ กรุณาติดต่อผู้ดูแลระบบเพื่อปรับสิทธิ์การใช้งาน
                </p>
                <button className="btn btn-primary" onClick={() => setActiveTab('dashboard')}>
                  กลับหน้าหลักแดชบอร์ด
                </button>
              </div>
            ) : (
              /* Normal settings layout for admin */
              <div>
                <header className="page-header">
                  <div className="page-title-group">
                    <h1>ตั้งค่าระบบและจัดการสิทธิ์</h1>
                    <p>กำหนดรายละเอียดธุรกิจ บัญชีผู้ใช้ และตั้งค่าจำลอง Webhook API</p>
                  </div>
                </header>

                {/* Sub tab navigation */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <button 
                    className={`btn ${settingsSubTab === 'general' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSettingsSubTab('general')}
                  >
                    ข้อมูลหน่วยงาน & LINE Bot
                  </button>
                  <button 
                    className={`btn ${settingsSubTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSettingsSubTab('users')}
                  >
                    จัดการผู้ใช้งาน & สิทธิ์
                  </button>
                  <button 
                    className={`btn ${settingsSubTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSettingsSubTab('products')}
                  >
                    จัดการคลังสินค้า POS
                  </button>
                  <button 
                    className={`btn ${settingsSubTab === 'importexport' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSettingsSubTab('importexport')}
                  >
                    นำเข้า & ส่งออกข้อมูล (Excel/PDF/CSV)
                  </button>
                </div>

                {settingsSubTab === 'general' && (
                  <div className="glass-card">
                    <div className="settings-grid">
                      {/* Company profile Settings */}
                      <div>
                        <h3 className="settings-section-title">ข้อมูลออฟฟิศ / ผู้เสียภาษี</h3>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">ชื่อเว็บแอปพลิเคชัน (App Name)</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="เช่น FlowLedger Pro"
                              value={settings.appName || 'FlowLedger Pro'}
                              onChange={(e) => setSettings(prev => ({ ...prev, appName: e.target.value }))}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">โลโก้แอป (Emoji, URL หรืออัปโหลดไฟล์)</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input 
                                type="text" 
                                className="form-input" 
                                placeholder="เช่น ✨ หรือ https://..."
                                value={settings.appLogo || '✨'}
                                onChange={(e) => setSettings(prev => ({ ...prev, appLogo: e.target.value }))}
                              />
                              <label className="btn btn-secondary" style={{ flexShrink: 0, padding: '0.45rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, fontSize: '0.85rem' }}>
                                📁 เลือกรูปภาพ
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  style={{ display: 'none' }}
                                  onChange={handleLogoUpload}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">ชื่อจดทะเบียนบริษัท (ภาษาไทย)</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={settings.companyName}
                            onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            maxLength="13"
                            value={settings.companyTaxId}
                            onChange={(e) => setSettings(prev => ({ ...prev, companyTaxId: e.target.value }))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">ที่อยู่บริษัทสำหรับออกเอกสาร</label>
                          <textarea 
                            rows="3"
                            className="form-textarea" 
                            value={settings.companyAddress}
                            onChange={(e) => setSettings(prev => ({ ...prev, companyAddress: e.target.value }))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">เบอร์โทรศัพท์ติดต่อออฟฟิศ</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={settings.companyPhone}
                            onChange={(e) => setSettings(prev => ({ ...prev, companyPhone: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Line Bot Settings */}
                      <div>
                        <h3 className="settings-section-title">ตั้งค่าบอท LINE OCR Integration</h3>
                        <div className="form-group">
                          <label className="form-label">ชื่อบอท LINE (Display Name)</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={settings.lineBotName}
                            onChange={(e) => setSettings(prev => ({ ...prev, lineBotName: e.target.value }))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Channel Access Token (LINE Developers Console)</label>
                          <input 
                            type="password" 
                            className="form-input" 
                            value={settings.lineChannelToken}
                            onChange={(e) => setSettings(prev => ({ ...prev, lineChannelToken: e.target.value }))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Webhook URL (ใช้ชี้มายังแอปเมื่อขึ้นระบบจริง)</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={settings.lineWebhookUrl}
                            onChange={(e) => setSettings(prev => ({ ...prev, lineWebhookUrl: e.target.value }))}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block', lineHeight: '1.4' }}>
                            💡 สำหรับระบบ Vercel ของจริง ให้กรอก URL ต่อไปนี้ใน LINE Webhook URL: <br/>
                            <code style={{ color: 'var(--primary)', fontWeight: 'bold', padding: '0.1rem 0.3rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', wordBreak: 'break-all' }}>{window.location.origin}/api/line-webhook</code>
                          </span>
                        </div>

                        <div className="form-group">
                          <label className="form-label">SlipOK API Key (สำหรับระบบสแกนสลิปจริง)</label>
                          <input 
                            type="password" 
                            className="form-input" 
                            placeholder="กรอกคีย์ SlipOK เช่น slpk_live_..."
                            value={settings.slipokApiKey || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, slipokApiKey: e.target.value }))}
                          />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                            * ลงทะเบียนรับคีย์เพื่อสแกนสลิปธนาคารจริงและดึงยอดเงินอัตโนมัติได้ที่ <a href="https://www.slipok.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>slipok.com</a>
                          </span>
                        </div>

                        <div className="form-group">
                          <label className="form-label">SlipOK Branch ID (รหัสสาขาของร้านค้า)</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="กรอกรหัสสาขา เช่น 71669"
                            value={settings.slipokBranchId || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, slipokBranchId: e.target.value }))}
                          />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                            * ดูรหัสสาขาได้จากหน้าร้านค้าของคุณในแดชบอร์ด SlipOK (เช่น จากลิงก์ Webhook สำเร็จรูปตัวเลขท้ายสุด)
                          </span>
                        </div>

                        <div className="form-group" style={{ marginTop: '2rem' }}>
                          <div style={{ padding: '1rem', backgroundColor: 'var(--success-glow)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            <strong>💡 ระบบสแกนและตรวจสลิป LINE Bot กำลังทำงาน (Active)</strong>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              หากกรอกคีย์ SlipOK ด้านบน: ระบบจะสแกนรูปภาพสลิปจริงที่ส่งเข้าแชท LINE เพื่อดึงยอดโอนและชื่อคนโอนอัตโนมัติ <br/>
                              หากไม่ได้กรอก: ระบบแชทจำลองจะทำงานในโหมดจำลอง (Mock OCR) ด้วยยอดเงินสุ่มแทนครับ
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Firebase Cloud Firestore Integration - Simplified Status */}
                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '2rem' }}>
                      <h3 className="settings-section-title">☁️ ฐานข้อมูลคลาวด์ (Database Status)</h3>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>สถานะการเชื่อมต่อ:</span>
                          {isFirebaseConfigured() ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: 'var(--success-glow)', border: '1px solid var(--success)', borderRadius: '12px', color: 'var(--success)', fontWeight: 'bold' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', boxShadow: '0 0 8px var(--success)', display: 'inline-block' }}></span> 🟢 เชื่อมต่อคลาวด์เรียบร้อย (Firebase Active)
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: 'var(--warning-glow)', border: '1px solid var(--warning)', borderRadius: '12px', color: 'var(--warning)', fontWeight: 'bold' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--warning)', boxShadow: '0 0 8px var(--warning)', display: 'inline-block' }}></span> 🟡 ทำงานในโหมดจำลองเครื่องเดียว (Local Mode)
                            </span>
                          )}
                        </div>
                        
                        {isFirebaseConfigured() ? (
                          <button 
                            className="btn btn-secondary" 
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                            onClick={() => {
                              if (confirm('คุณต้องการเปลี่ยนไปใช้โหมดเครื่องเดียว (Local Mode)? ระบบจะโหลดข้อมูลจากในเครื่องบราวเซอร์นี้แทน')) {
                                localStorage.setItem('flowledger_db_mode', 'local');
                                window.location.reload();
                              }
                            }}
                          >
                            ⚠️ สลับไปโหมดเครื่องเดียว (Local Mode)
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary" 
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                            onClick={() => {
                              localStorage.setItem('flowledger_db_mode', 'cloud');
                              window.location.reload();
                            }}
                          >
                            ☁️ สลับไปใช้ระบบคลาวด์ (Cloud Mode)
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-success" onClick={handleSaveSettings}>
                        บันทึกข้อมูลการตั้งค่า
                      </button>
                    </div>
                  </div>
                )}

                {settingsSubTab === 'users' && (
                  <div className="glass-card">
                    <div className="user-mgmt-header">
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>บัญชีรายชื่อผู้ใช้ระบบ</h3>
                      <button className="btn btn-primary" onClick={() => openUserCRUDModal()}>
                        <UserPlus size={16} /> เพิ่มผู้ใช้งานใหม่
                      </button>
                    </div>

                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>ชื่อผู้ใช้ (Display Name)</th>
                            <th>Username</th>
                            <th>รหัสผ่าน (Password)</th>
                            <th>สิทธิ์การใช้งาน</th>
                            <th className="text-center" style={{ width: '150px' }}>การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u.id}>
                              <td className="font-semibold">
                                {u.name} {u.id === currentUser.id && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(คุณ)</span>}
                              </td>
                              <td><code>{u.username}</code></td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span>{showPasswordMap[u.id] ? u.password : '••••••••'}</span>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                                    onClick={() => togglePasswordVisibility(u.id)}
                                  >
                                    {showPasswordMap[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </td>
                              <td>
                                <span className={`user-role-badge ${u.role === 'admin' ? 'admin' : 'staff'}`}>
                                  {u.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'พนักงานทั่วไป (Staff)'}
                                </span>
                              </td>
                              <td className="text-center">
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem' }} onClick={() => openUserCRUDModal(u)}>
                                    แก้ไข
                                  </button>
                                  <button 
                                    className="btn btn-danger" 
                                    style={{ padding: '0.35rem 0.5rem' }} 
                                    onClick={() => handleDeleteUser(u.id)}
                                    disabled={u.id === currentUser.id}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {settingsSubTab === 'products' && (
                  <div className="glass-card">
                    <div className="user-mgmt-header">
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>รายการสินค้าและบริการหน้าร้าน POS</h3>
                      <button className="btn btn-primary" onClick={() => openProductCRUDModal()}>
                        <Plus size={16} /> เพิ่มสินค้าใหม่
                      </button>
                    </div>

                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px', textAlign: 'center' }}>ไอคอน</th>
                            <th>รหัสสินค้า (SKU)</th>
                            <th>ชื่อสินค้า / บริการ</th>
                            <th className="text-right">ราคาต่อหน่วย</th>
                            <th className="text-right" style={{ width: '120px' }}>จำนวนคงเหลือ (สต็อก)</th>
                            <th className="text-center" style={{ width: '150px' }}>การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map(p => (
                            <tr key={p.id}>
                              <td className="text-center" style={{ fontSize: '1.5rem' }}>{p.icon}</td>
                              <td><code>{p.sku}</code></td>
                              <td className="font-semibold">{p.name}</td>
                              <td className="text-right font-bold text-success">฿{p.price.toLocaleString()}</td>
                              <td className="text-right" style={{ color: p.stock > 0 ? 'var(--text-main)' : 'var(--danger)', fontWeight: p.stock > 0 ? 'normal' : 'bold' }}>
                                {p.stock.toLocaleString()} ชิ้น
                              </td>
                              <td className="text-center">
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem' }} onClick={() => openProductCRUDModal(p)}>
                                    แก้ไข
                                  </button>
                                  <button 
                                    className="btn btn-danger" 
                                    style={{ padding: '0.35rem 0.5rem' }} 
                                    onClick={() => handleDeleteProduct(p.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {settingsSubTab === 'importexport' && (
                  <div className="glass-card" style={{ padding: '2rem' }}>
                    <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                      
                      {/* Left: Import Section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRight: '1px solid var(--border-color)', paddingRight: '2rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0' }}>
                            📥 นำเข้าข้อมูล (Import Center)
                          </h3>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            อัปโหลดข้อมูลจากไฟล์ภายนอกรูปแบบ CSV เพื่อนำเข้าสู่ระบบบัญชีและคลังสินค้าโดยอัตโนมัติ
                          </p>
                        </div>

                        {/* Import Transactions */}
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>1. นำเข้าบัญชีรายรับ-รายจ่าย (Transactions)</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', margin: 0 }}>
                              📁 เลือกไฟล์ CSV รายการบัญชี
                              <input 
                                type="file" 
                                accept=".csv" 
                                style={{ display: 'none' }} 
                                onChange={(e) => handleCSVImport(e, 'transactions')}
                              />
                            </label>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              * รูปแบบคอลัมน์ของไฟล์ CSV: <br/>
                              <code>วันที่ (YYYY-MM-DD), ประเภท (รายรับ/รายจ่าย), หมวดหมู่, คำอธิบาย, จำนวนเงิน, เลขที่อ้างอิง</code>
                            </span>
                          </div>
                        </div>

                        {/* Import POS Inventory */}
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>2. นำเข้าสินค้าคลัง POS (Products)</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', margin: 0 }}>
                              📁 เลือกไฟล์ CSV สินค้า
                              <input 
                                type="file" 
                                accept=".csv" 
                                style={{ display: 'none' }} 
                                onChange={(e) => handleCSVImport(e, 'products')}
                              />
                            </label>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              * รูปแบบคอลัมน์ของไฟล์ CSV: <br/>
                              <code>รหัสสินค้า(SKU), ชื่อสินค้า, หมวดหมู่, ราคาขาย, ราคาต้นทุน, จำนวนคงเหลือ</code>
                            </span>
                          </div>
                        </div>

                        {/* Import Full System Backup */}
                        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px dashed var(--primary)', borderRadius: '8px', padding: '1rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>3. คืนค่าระบบจากไฟล์สำรอง (Full Backup JSON)</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', margin: 0 }}>
                              📥 เลือกไฟล์ JSON สำรองข้อมูล (.json)
                              <input 
                                type="file" 
                                accept=".json" 
                                style={{ display: 'none' }} 
                                onChange={handleImportFullBackup}
                              />
                            </label>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              * คืนค่ารูปภาพสลิป รายการเดินบัญชี สินค้าคลัง และการตั้งค่าทั้งหมดกลับสู่ระบบ
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Export Section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0' }}>
                            📤 ส่งออกข้อมูล (Export Center)
                          </h3>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            เลือกประเภทชุดข้อมูลที่ต้องการเพื่อสร้างไฟล์รายงานดาวน์โหลดไปใช้งานต่อในโปรแกรมอื่น หรือสำรองข้อมูลทั้งระบบพร้อมภาพสลิป
                          </p>
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 'bold' }}>ขั้นตอนที่ 1: เลือกชุดข้อมูล (Select Data Source)</label>
                          <select 
                            id="export-datatype-select"
                            className="form-select"
                            defaultValue="transactions"
                          >
                            <option value="transactions">📊 บัญชีรายรับ-รายจ่าย (Transactions List)</option>
                            <option value="products">📦 ข้อมูลคลังสินค้า POS (POS Inventory List)</option>
                            <option value="salary">💵 อัตราเงินเดือนพนักงาน (Employees Payroll List)</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                          <label className="form-label" style={{ fontWeight: 'bold', margin: 0 }}>ขั้นตอนที่ 2: เลือกประเภทไฟล์ดาวน์โหลด</label>
                          
                          <button 
                            className="btn btn-success" 
                            style={{ justifyContent: 'center', padding: '0.75rem 1rem' }}
                            onClick={() => {
                              const selectEl = document.getElementById('export-datatype-select');
                              if (selectEl) exportToCSV(selectEl.value);
                            }}
                          >
                            🟢 ส่งออกไฟล์ Excel / CSV (.csv)
                          </button>

                          <button 
                            className="btn btn-primary" 
                            style={{ justifyContent: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                            onClick={() => {
                              const selectEl = document.getElementById('export-datatype-select');
                              if (selectEl) printDataReport(selectEl.value);
                            }}
                          >
                            🔴 ส่งออกรายงานและบันทึกเป็น PDF (.pdf)
                          </button>

                          <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

                          <button 
                            className="btn btn-primary" 
                            style={{ justifyContent: 'center', padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: 'var(--primary)' }}
                            onClick={handleExportFullBackup}
                          >
                            💾 สำรองข้อมูลทั้งระบบพร้อมรูปภาพสลิปทั้งหมด (.json)
                          </button>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
                            * ดาวน์โหลดไฟล์ JSON สำรองข้อมูลการเงิน สินค้า พนักงาน และภาพสลิป Base64 ครบถ้วน
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ================= ADD/EDIT LEDGER TRANSACTION MODAL ================= */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTransaction ? 'แก้ไขรายการเดินบัญชี' : 'เพิ่มรายการเดินบัญชีใหม่'}</h2>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddOrEditTransaction}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">ประเภทรายการ</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ flexGrow: 1, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="type" 
                        value="income" 
                        checked={txForm.type === 'income'} 
                        onChange={() => setTxForm(prev => ({ ...prev, type: 'income', category: 'รายได้จากการขาย' }))}
                        style={{ marginRight: '0.5rem' }} 
                      />
                      รายรับ (Income)
                    </label>
                    <label style={{ flexGrow: 1, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="type" 
                        value="expense" 
                        checked={txForm.type === 'expense'} 
                        onChange={() => setTxForm(prev => ({ ...prev, type: 'expense', category: 'ค่าอาหารและเครื่องดื่ม' }))}
                        style={{ marginRight: '0.5rem' }} 
                      />
                      รายจ่าย (Expense)
                    </label>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">วันที่ธุรกรรม</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required
                      value={txForm.date}
                      onChange={(e) => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">จำนวนเงิน (บาท)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="0.00"
                      required
                      min="0.01"
                      step="0.01"
                      value={txForm.amount}
                      onChange={(e) => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">หมวดหมู่</label>
                  <select 
                    className="form-select"
                    value={txForm.category}
                    onChange={(e) => setTxForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {txForm.type === 'income' ? (
                      <>
                        <option value="รายได้จากการขาย">รายได้จากการขาย</option>
                        <option value="รายได้อื่น ๆ">รายได้อื่น ๆ</option>
                        <option value="ดอกเบี้ยรับ">ดอกเบี้ยรับ</option>
                      </>
                    ) : (
                      <>
                        <option value="ค่าอาหารและเครื่องดื่ม">ค่าอาหารและเครื่องดื่ม</option>
                        <option value="ค่าอุปกรณ์สำนักงาน">ค่าอุปกรณ์สำนักงาน</option>
                        <option value="ค่าเดินทางและยานพาหนะ">ค่าเดินทางและยานพาหนะ</option>
                        <option value="ค่าอินเทอร์เน็ตและโทรศัพท์">ค่าอินเทอร์เน็ตและโทรศัพท์</option>
                        <option value="ค่าเช่าสถานที่">ค่าเช่าสถานที่</option>
                        <option value="อื่น ๆ">อื่น ๆ</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">รายละเอียด / คำอธิบาย</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="เช่น ซื้อกาแฟสดสำหรับรับรองลูกค้า" 
                    required
                    value={txForm.description}
                    onChange={(e) => setTxForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">รหัสเอกสาร / รหัสอ้างอิงธุรกรรม</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="เช่น Ref-123456" 
                    value={txForm.ref}
                    onChange={(e) => setTxForm(prev => ({ ...prev, ref: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }}>
                    {editingTransaction ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= POS RETAIL RECEIPT MODAL ================= */}
      {showPOSReceiptModal && posReceipt && (
        <div className="modal-overlay" onClick={() => setShowPOSReceiptModal(false)}>
          <div className="modal-content" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>บิลเสร็จรับเงินอย่างย่อ POS</h2>
              <button className="modal-close-btn" onClick={() => setShowPOSReceiptModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ backgroundColor: '#ffffff', color: '#000000', padding: '1rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.4' }}>
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{settings.companyName}</div>
                <div style={{ textAlign: 'center', fontSize: '0.7rem' }}>{settings.companyAddress}</div>
                <div style={{ textAlign: 'center', fontSize: '0.7rem' }}>TAX ID: {settings.companyTaxId}</div>
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>บิลเลขที่: {posReceipt.receiptNum}</span>
                  <span>วันที่: {posReceipt.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>เวลา: {posReceipt.time}</span>
                  <span>พนักงาน: Cashier</span>
                </div>
                
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>
                
                {posReceipt.items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.name} x {item.qty}</span>
                    <span>฿{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ราคารวมสินค้า:</span>
                  <span>฿{posReceipt.subtotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666' }}>
                  <span>ราคาก่อนภาษี (VAT 7% Inc):</span>
                  <span>฿{posReceipt.netTotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666' }}>
                  <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                  <span>฿{posReceipt.vatAmount.toLocaleString()}</span>
                </div>
                
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  <span>ยอดสุทธิสินค้า:</span>
                  <span>฿{posReceipt.subtotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>วิธีชำระ:</span>
                  <span>{posReceipt.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>รับเงิน:</span>
                  <span>฿{posReceipt.cashReceived.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>เงินทอน:</span>
                  <span>฿{posReceipt.change.toLocaleString()}</span>
                </div>
                
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>
                <div style={{ textAlign: 'center', fontSize: '0.7rem', marginTop: '10px' }}>ขอบคุณที่ใช้บริการ / THANK YOU</div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={handlePrintPOSReceipt} style={{ flexGrow: 1, justifyContent: 'center' }}>
                <Printer size={16} /> พิมพ์ใบเสร็จย่อ
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPOSReceiptModal(false)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SLIP IMAGE PREVIEW MODAL (DOCUMENT HUB) ================= */}
      {selectedDoc && (
        <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>ภาพสลิปที่แนบ/สแกน (OCR View)</h2>
              <button className="modal-close-btn" onClick={() => setSelectedDoc(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              
              {selectedDoc.imageUrl ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '100%', maxHeight: '450px', backgroundColor: '#090d16', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
                    <img 
                      src={selectedDoc.imageUrl} 
                      alt="สลิปโอนเงินจริง" 
                      style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    <strong>หมวดหมู่:</strong> {selectedDoc.category || 'ทั่วไป'} | <strong>ยอดเงิน:</strong> ฿{selectedDoc.amount?.toLocaleString()} | <strong>Ref:</strong> {selectedDoc.ref}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  width: '240px', 
                  height: '300px', 
                  backgroundColor: '#ffffff', 
                  color: '#333333', 
                  borderRadius: '8px', 
                  padding: '1.25rem',
                  borderTop: '6px solid var(--primary)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '10px' }}>
                      <span>{selectedDoc.merchant}</span>
                      <span style={{ fontSize: '0.6rem', color: '#888' }}>OCR Verified</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div><strong>วันที่ธุรกรรม:</strong> {selectedDoc.date} {selectedDoc.time}</div>
                      <div><strong>เลขอ้างอิง Ref:</strong> {selectedDoc.ref}</div>
                      <div><strong>ผู้ดำเนินการ:</strong> {selectedDoc.sender}</div>
                      <div><strong>รายละเอียด:</strong> {selectedDoc.details}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                    <span style={{ fontSize: '0.6rem', color: '#888', display: 'block' }}>จำนวนเงิน (THB)</span>
                    <strong style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>฿{selectedDoc.amount?.toLocaleString()}</strong>
                  </div>
                </div>
              )}

              <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={() => handlePrintDocInvoice(selectedDoc)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                  <Printer size={16} /> พิมพ์รายงาน PDF
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => { const docToEdit = selectedDoc; setSelectedDoc(null); openEditDocModal(docToEdit); }} 
                  style={{ flexGrow: 1, justifyContent: 'center' }}
                >
                  <Edit size={16} /> แก้ไขหมวดหมู่ / ข้อมูล
                </button>
                <button className="btn btn-secondary" onClick={() => setSelectedDoc(null)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT DOCUMENT / CATEGORY MODAL ================= */}
      {editingDoc && (
        <div className="modal-overlay" onClick={() => setEditingDoc(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ แก้ไขข้อมูลเอกสาร & หมวดหมู่บัญชี</h2>
              <button className="modal-close-btn" onClick={() => setEditingDoc(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEditedDoc}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div className="form-group">
                  <label className="form-label">หมวดหมู่บัญชี (Category)</label>
                  <select 
                    className="form-select"
                    value={docForm.category}
                    onChange={(e) => setDocForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="ค่าอาหารและเครื่องดื่ม">ค่าอาหารและเครื่องดื่ม</option>
                    <option value="ค่าเดินทางและยานพาหนะ">ค่าเดินทางและยานพาหนะ</option>
                    <option value="ค่าอุปกรณ์สำนักงาน">ค่าอุปกรณ์สำนักงาน</option>
                    <option value="ค่าอินเทอร์เน็ตและโทรศัพท์">ค่าอินเทอร์เน็ตและโทรศัพท์</option>
                    <option value="ค่าเช่าสถานที่">ค่าเช่าสถานที่</option>
                    <option value="ค่าสาธารณูปโภค">ค่าสาธารณูปโภค</option>
                    <option value="ค่าซ่อมแซมและบำรุงรักษา">ค่าซ่อมแซมและบำรุงรักษา</option>
                    <option value="ค่าโฆษณาและการตลาด">ค่าโฆษณาและการตลาด</option>
                    <option value="ค่าใช้จ่ายทั่วไป">ค่าใช้จ่ายทั่วไป</option>
                    <option value="รายได้จากการขาย">รายได้จากการขาย</option>
                    <option value="รายได้จากการบริการ">รายได้จากการบริการ</option>
                    <option value="อื่น ๆ">อื่น ๆ</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อหัวข้อเอกสาร (Document Title)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required
                    value={docForm.title}
                    onChange={(e) => setDocForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ประเภทเอกสาร</label>
                    <select 
                      className="form-select"
                      value={docForm.type}
                      onChange={(e) => setDocForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="expense">ใบกำกับภาษี / รายจ่าย</option>
                      <option value="receipt">ใบเสร็จรับเงิน / รายรับ</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">จำนวนเงิน (THB)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      step="0.01"
                      required
                      value={docForm.amount}
                      onChange={(e) => setDocForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อผู้รับ / ผู้จ่ายเงิน (Customer / Merchant)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={docForm.sender}
                    onChange={(e) => setDocForm(prev => ({ ...prev, sender: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">รายละเอียด / หมายเหตุ (Details)</label>
                  <textarea 
                    className="form-input" 
                    rows="2"
                    value={docForm.details}
                    onChange={(e) => setDocForm(prev => ({ ...prev, details: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }}>
                    💾 บันทึกการแก้ไข
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingDoc(null)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PRINTABLE INVOICE TEMPLATE ================= */}
      {printInvoiceData && (
        <div className="printable-invoice-container">
          <div className="print-header">
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold' }}>{printInvoiceData.sellerName}</h2>
              <p style={{ fontSize: '12px', color: '#444' }}>{printInvoiceData.sellerAddress}</p>
              <p style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}><strong>เลขประจำตัวผู้เสียภาษี:</strong> {printInvoiceData.sellerTaxId}</p>
            </div>
            <div className="print-title">
              <h1>ใบกำกับภาษี / ใบเสร็จรับเงิน</h1>
              <p>TAX INVOICE / RECEIPT</p>
              <div style={{ textAlign: 'left', marginTop: '10px', fontSize: '12px', border: '1px solid #ddd', padding: '6px', borderRadius: '4px' }}>
                <div><strong>เลขที่เอกสาร:</strong> {printInvoiceData.invoiceNumber}</div>
                <div><strong>วันที่ออกเอกสาร:</strong> {printInvoiceData.date}</div>
              </div>
            </div>
          </div>

          <div className="print-parties">
            <div className="print-party-box">
              <h3>ข้อมูลลูกค้า (ผู้ซื้อ)</h3>
              <p><strong>ชื่อลูกค้า:</strong> {printInvoiceData.buyerName}</p>
              <p><strong>ที่อยู่จัดส่ง:</strong> {printInvoiceData.buyerAddress}</p>
              <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {printInvoiceData.buyerTaxId}</p>
            </div>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>ลำดับ</th>
                <th>รายละเอียดรายการสินค้า/บริการ</th>
                <th style={{ width: '60px', textAlign: 'center' }}>จำนวน</th>
                <th style={{ width: '100px', textAlign: 'right' }}>ราคาต่อหน่วย</th>
                <th style={{ width: '120px', textAlign: 'right' }}>จำนวนเงินรวม</th>
              </tr>
            </thead>
            <tbody>
              {printInvoiceData.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right' }}>฿{parseFloat(item.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right' }}>฿{(item.qty * item.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-totals">
            <div className="print-total-row">
              <span>ราคาสินค้ารวม (Subtotal):</span>
              <span>฿{printInvoiceData.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="print-total-row">
              <span>ภาษีมูลค่าเพิ่ม (VAT {printInvoiceData.vatRate !== undefined ? printInvoiceData.vatRate : 7}%):</span>
              <span>฿{printInvoiceData.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="print-total-row grand">
              <span>ยอดเงินสุทธิทั้งสิ้น (Grand Total):</span>
              <span>฿{printInvoiceData.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', marginTop: '60px', fontSize: '12px', textAlign: 'center' }}>
            <div>
              <div style={{ borderBottom: '1px solid #333', height: '40px', width: '200px', margin: '0 auto' }}></div>
              <p style={{ marginTop: '10px' }}>ลงชื่อ ผู้ส่งของ / ผู้รับมอบอำนาจ</p>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #333', height: '40px', width: '200px', margin: '0 auto' }}></div>
              <p style={{ marginTop: '10px' }}>ลงชื่อ ผู้รับเงิน / ผู้เขียนเอกสาร</p>
            </div>
          </div>

          {printInvoiceData.imageUrl && (
            <div className="print-slip-proof" style={{ marginTop: '25px', padding: '12px 15px', border: '1px dashed #666', borderRadius: '8px', textAlign: 'center', pageBreakInside: 'avoid' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#333' }}>
                📎 หลักฐานการชำระเงิน / รูปภาพสลิปที่แนบมา (Attached Transfer Slip Proof)
              </h4>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img 
                  src={printInvoiceData.imageUrl} 
                  alt="หลักฐานสลิปโอนเงิน" 
                  style={{ maxHeight: '280px', maxWidth: '100%', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '6px', padding: '4px', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
          )}

          <div className="print-footer">
            <p>ขอขอบคุณที่ใช้บริการ / เอกสารนี้จัดพิมพ์ขึ้นโดยอัตโนมัติผ่านทางระบบสารสนเทศ FlowLedger Pro</p>
          </div>
        </div>
      )}

      {/* ================= PRINTABLE 80mm RECEIPT ================= */}
      {posReceipt && (
        <div className="printable-receipt-container">
          <div className="receipt-text-center" style={{ fontWeight: 'bold' }}>{settings.companyName}</div>
          <div className="receipt-text-center" style={{ fontSize: '9px' }}>{settings.companyAddress}</div>
          <div className="receipt-text-center" style={{ fontSize: '9px' }}>TAX ID: {settings.companyTaxId}</div>
          <div className="receipt-divider"></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>บิลเลขที่: {posReceipt.receiptNum}</span>
            <span>วันที่: {posReceipt.date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>เวลา: {posReceipt.time}</span>
            <span>เครื่องขาย: POS#1</span>
          </div>
          <div className="receipt-divider"></div>
          {posReceipt.items.map((item, idx) => (
            <div key={idx}>
              <div>{item.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>&nbsp;&nbsp;{item.qty} x ฿{item.price.toLocaleString()}</span>
                <span>฿{(item.price * item.qty).toLocaleString()}</span>
              </div>
            </div>
          ))}
          <div className="receipt-divider"></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>รวมเป็นเงิน:</span>
            <span>฿{posReceipt.subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <span>มูลค่าก่อนภาษี (VAT 7% Inc):</span>
            <span>฿{posReceipt.netTotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <span>ภาษีมูลค่าเพิ่ม 7%:</span>
            <span>฿{posReceipt.vatAmount.toLocaleString()}</span>
          </div>
          <div className="receipt-divider"></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>ยอดชำระสุทธิ:</span>
            <span>฿{posReceipt.subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>ชำระด้วย:</span>
            <span>{posReceipt.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>รับเงินสด:</span>
            <span>฿{posReceipt.cashReceived.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>เงินทอน:</span>
            <span>฿{posReceipt.change.toLocaleString()}</span>
          </div>
          <div className="receipt-double-divider"></div>
          <div className="receipt-text-center" style={{ fontSize: '9px' }}>เอกสารใบเสร็จรับเงินอย่างย่อ</div>
          <div className="receipt-text-center" style={{ fontSize: '9px', marginTop: '4px' }}>ขอบคุณที่ใช้บริการ / Thank You</div>
        </div>
      )}

      {/* ================= USER CRUD ADD/EDIT MODAL (ADMIN ONLY) ================= */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'แก้ไขบัญชีผู้ใช้งาน' : 'เพิ่มบัญชีผู้ใช้งานใหม่'}</h2>
              <button className="modal-close-btn" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">ชื่อผู้แสดงผล (Display Name)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="เช่น นายสมใจ รักดี"
                    value={userForm.name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อผู้ใช้งาน (Username)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="ภาษาอังกฤษไม่มีช่องว่าง..."
                    value={userForm.username}
                    onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                    disabled={editingUser && editingUser.id === 'u1'} // Prevent changing original superadmin username
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">รหัสผ่าน (Password)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="กำหนดรหัสผ่าน..."
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ระดับสิทธิ์ (Role)</label>
                  <select 
                    className="form-select"
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                    disabled={editingUser && editingUser.id === currentUser.id} // Prevent admin from downgrading their own role
                  >
                    <option value="staff">พนักงานทั่วไป (Staff)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }}>
                    {editingUser ? 'บันทึกการแก้ไข' : 'บันทึกเพิ่มผู้ใช้'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT MENU NAMES MODAL (ADMIN ONLY) ================= */}
      {showMenuEditModal && currentUser.role === 'admin' && (
        <div className="modal-overlay" onClick={() => setShowMenuEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>แก้ไขปรับแต่งชื่อเมนูหลัก</h2>
              <button className="modal-close-btn" onClick={() => setShowMenuEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveMenuNames}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  ปรับแต่งคำเรียกหัวข้อเมนูบนแถบนำทาง (Sidebar) ได้ตามภาษาและโครงสร้างองค์กรของคุณ
                </p>

                <div className="form-group">
                  <label className="form-label">เมนู: หน้าหลัก & แดชบอร์ด</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={menuForm.dashboard}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, dashboard: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เมนู: บัญชีรายรับ-รายจ่าย</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={menuForm.transactions}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, transactions: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เมนู: ใบซื้อขายหน้าร้าน POS</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={menuForm.pos}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, pos: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เมนู: ออกใบกำกับภาษี</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={menuForm.invoices}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, invoices: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เมนู: ระบบ LINE Bot</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={menuForm.linebot}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, linebot: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เมนู: คลังเอกสารจัดเก็บ</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={menuForm.dochub}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, dochub: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เมนู: เงินเดือนพนักงาน</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={menuForm.salary}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, salary: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เมนู: ตั้งค่าระบบ</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={menuForm.settings}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, settings: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 2, justifyContent: 'center' }}>
                    บันทึกการแก้ไข
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleResetMenuNames} style={{ flexGrow: 1, justifyContent: 'center' }}>
                    รีเซ็ต
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => setShowMenuEditModal(false)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================= PRODUCT CRUD ADD/EDIT MODAL (ADMIN ONLY) ================= */}
      {showProductModal && currentUser.role === 'admin' && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'แก้ไขสินค้า / บริการ POS' : 'เพิ่มสินค้า / บริการ POS ใหม่'}</h2>
              <button className="modal-close-btn" onClick={() => setShowProductModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">ชื่อสินค้า / บริการ</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="เช่น สมุดโน้ตปกหนัง A5"
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">รหัสสินค้า (SKU)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="เช่น SKU-NOTE-07"
                      value={productForm.sku}
                      onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                      disabled={!!editingProduct}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ไอคอนอิโมจิ (Emoji Icon)</label>
                    <input 
                      type="text" 
                      className="form-input text-center" 
                      required 
                      placeholder="เช่น 📚, 🖊️, 💻"
                      value={productForm.icon}
                      onChange={(e) => setProductForm(prev => ({ ...prev, icon: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ราคาขายต่อหน่วย (บาท)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">จำนวนคงเหลือในคลัง (สต็อก)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      placeholder="จำนวน..."
                      min="0"
                      value={productForm.stock}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }}>
                    {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================= GOOGLE AUTHENTICATION SIMULATOR MODAL ================= */}
      {showGoogleModal && (
        <div className="modal-overlay" onClick={() => !googleAuthLoading && setShowGoogleModal(false)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '380px', 
              backgroundColor: '#ffffff', 
              color: '#1f2937', 
              padding: '2rem 1.5rem', 
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              textAlign: 'center'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" style={{ display: 'inline-block' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#202124', marginTop: '0.75rem' }}>ลงชื่อเข้าใช้ด้วย Google</h2>
              <p style={{ fontSize: '0.85rem', color: '#5f6368', marginTop: '0.25rem' }}>เพื่อดำเนินการต่อกับ FlowLedger Pro</p>
            </div>

            {googleAuthLoading ? (
              <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  border: '3px solid #f3f3f3', 
                  borderTop: '3px solid #4285F4', 
                  borderRadius: '50%', 
                  animation: 'spin 0.8s linear infinite' 
                }}></div>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#202124' }}>
                  กำลังเชื่อมต่อบัญชี {selectedGoogleAccount?.email}...
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#5f6368', paddingLeft: '0.5rem', marginBottom: '0.25rem' }}>เลือกบัญชี Google</span>
                
                {[
                  { 
                    name: 'FlowLedger Administrator', 
                    email: 'admin.flowledger@gmail.com', 
                    role: 'admin', 
                    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80' 
                  },
                  { 
                    name: 'Somchai Yeoddee', 
                    email: 'somchai.y@gmail.com', 
                    role: 'staff', 
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80' 
                  },
                  { 
                    name: 'Somsri Meesook', 
                    email: 'somsri.m@gmail.com', 
                    role: 'staff', 
                    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80' 
                  }
                ].map((account, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleGoogleLoginSelect(account)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      padding: '0.75rem', 
                      borderRadius: '8px', 
                      border: '1px solid #e0e0e0', 
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: '#ffffff'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <img 
                      src={account.avatar} 
                      alt={account.name} 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#3c4043' }}>{account.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#5f6368', textOverflow: 'ellipsis', overflow: 'hidden' }}>{account.email}</div>
                    </div>
                  </div>
                ))}
                
                <div 
                  onClick={() => {
                    const customEmail = prompt('ป้อนอีเมล Google Account ของคุณ:');
                    if (customEmail && customEmail.includes('@')) {
                      const customName = customEmail.split('@')[0];
                      handleGoogleLoginSelect({
                        name: customName.charAt(0).toUpperCase() + customName.slice(1),
                        email: customEmail,
                        role: 'staff',
                        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80'
                      });
                    }
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    border: '1px dashed #e0e0e0', 
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: '#ffffff',
                    marginTop: '0.25rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    backgroundColor: '#f1f3f4', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '1rem',
                    color: '#5f6368'
                  }}>👤</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1a73e8' }}>ใช้บัญชีอื่น (Use another account)</div>
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.7rem', color: '#5f6368', lineHeight: '1.4', borderTop: '1px solid #f1f3f4', paddingTop: '1rem', marginTop: '1rem' }}>
              ก่อนใช้งานแอปนี้ Google จะแชร์ชื่อ อีเมล รูปโปรไฟล์ และการตั้งค่าภาษาของคุณให้กับ FlowLedger Pro
            </div>
          </div>
        </div>
      )}


      {/* ================= EMPLOYEE SALARY PROFILE CRUD MODAL (ADMIN ONLY) ================= */}
      {showSalaryModal && currentUser.role === 'admin' && (
        <div className="modal-overlay" onClick={() => setShowSalaryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSalary ? 'แก้ไขข้อมูลอัตราเงินเดือนพนักงาน' : 'ลงทะเบียนอัตราเงินเดือนพนักงานใหม่'}</h2>
              <button className="modal-close-btn" onClick={() => setShowSalaryModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSalaryProfile}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">ชื่อ-นามสกุลพนักงาน</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="เช่น นายสมศักดิ์ รักมั่น"
                    value={salaryForm.employeeName}
                    onChange={(e) => setSalaryForm(prev => ({ ...prev, employeeName: e.target.value }))}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ตำแหน่งงาน / บทบาท</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="เช่น บัญชี, พนักงานคลังสินค้า"
                      value={salaryForm.employeeRole}
                      onChange={(e) => setSalaryForm(prev => ({ ...prev, employeeRole: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ฐานเงินเดือน (Base Salary)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      placeholder="เช่น 15000"
                      min="0"
                      value={salaryForm.baseSalary}
                      onChange={(e) => setSalaryForm(prev => ({ ...prev, baseSalary: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: '700' }}>รายได้พิเศษและเบี้ยเลี้ยงอื่นๆ</label>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={addAllowanceRow}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      ➕ เพิ่มรายการ
                    </button>
                  </div>
                  
                  {salaryForm.allowances && salaryForm.allowances.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {salaryForm.allowances.map((item, idx) => (
                        <div key={item.id || idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <select
                            className="form-select"
                            style={{ flex: 2, padding: '0.45rem' }}
                            value={item.label}
                            onChange={(e) => updateAllowanceRow(item.id, 'label', e.target.value)}
                          >
                            <option value="ค่าเบี้ยเลี้ยง / สวัสดิการสม่ำเสมอ">ค่าเบี้ยเลี้ยง / สวัสดิการสม่ำเสมอ</option>
                            <option value="ค่าล่วงเวลา (OT)">ค่าล่วงเวลา (OT)</option>
                            <option value="เบี้ยขยัน">เบี้ยขยัน</option>
                            <option value="เงินตกเบิก">เงินตกเบิก</option>
                            <option value="เบิกค่าสำรองจ่าย">เบิกค่าสำรองจ่าย</option>
                            <option value="รายได้พิเศษอื่นๆ">อื่น ๆ</option>
                          </select>
                          <input
                            type="number"
                            className="form-input"
                            style={{ flex: 1, padding: '0.45rem' }}
                            placeholder="จำนวนเงิน"
                            min="0"
                            value={item.amount}
                            onChange={(e) => updateAllowanceRow(item.id, 'amount', e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '0.45rem', minWidth: '36px', height: '36px', justifyContent: 'center' }}
                            onClick={() => removeAllowanceRow(item.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                      ไม่มีการกำหนดรายได้พิเศษเพิ่มเติม
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ยอดหักประกันสังคมต่อเดือน</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      placeholder="ปกติ 750"
                      min="0"
                      value={salaryForm.deductionSocial}
                      onChange={(e) => setSalaryForm(prev => ({ ...prev, deductionSocial: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">หักภาษี ณ ที่จ่ายสะสมเฉลี่ย</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="เช่น 300"
                      min="0"
                      value={salaryForm.deductionTax}
                      onChange={(e) => setSalaryForm(prev => ({ ...prev, deductionTax: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ช่องทางรับเงิน (ชื่อธนาคาร)</label>
                    <select 
                      className="form-select"
                      value={salaryForm.bankName}
                      onChange={(e) => setSalaryForm(prev => ({ ...prev, bankName: e.target.value }))}
                    >
                      <option value="ธนาคารกสิกรไทย (KBank)">ธนาคารกสิกรไทย (KBank)</option>
                      <option value="ธนาคารไทยพาณิชย์ (SCB)">ธนาคารไทยพาณิชย์ (SCB)</option>
                      <option value="ธนาคารกรุงเทพ (BBL)">ธนาคารกรุงเทพ (BBL)</option>
                      <option value="ธนาคารกรุงไทย (KTB)">ธนาคารกรุงไทย (KTB)</option>
                      <option value="ธนาคารทหารไทยธนชาต (TTB)">ธนาคารทหารไทยธนชาต (TTB)</option>
                      <option value="เงินสด (Cash)">เงินสด (Cash)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">เลขที่บัญชีธนาคาร</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="เช่น 123-4-56789-0"
                      value={salaryForm.bankAccount}
                      onChange={(e) => setSalaryForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }}>
                    {editingSalary ? 'บันทึกการแก้ไข' : 'ลงทะเบียนพนักงาน'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSalaryModal(false)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PROCESS PAYROLL MODAL (ADMIN ONLY) ================= */}
      {showProcessPayrollModal && processingSalaryProfile && (
        <div className="modal-overlay" onClick={() => setShowProcessPayrollModal(false)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💸 สั่งจ่ายเงินเดือนพนักงาน</h2>
              <button className="modal-close-btn" onClick={() => setShowProcessPayrollModal(false)}>✕</button>
            </div>
            <form onSubmit={handleProcessPayroll}>
              <div className="modal-body">
                <div style={{ backgroundColor: 'var(--bg-body)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>สรุปสิทธิ์เงินเดือนพนักงาน</h3>
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div><strong>ชื่อ:</strong> {processingSalaryProfile.employeeName}</div>
                      <div><strong>ตำแหน่ง:</strong> {processingSalaryProfile.employeeRole}</div>
                      <div><strong>ฐานเงินเดือน:</strong> ฿{processingSalaryProfile.baseSalary.toLocaleString()}</div>
                      <div><strong>หักประกันสังคม:</strong> ฿{processingSalaryProfile.deductionSocial.toLocaleString()}</div>
                      <div><strong>หักภาษี ณ ที่จ่าย:</strong> ฿{processingSalaryProfile.deductionTax.toLocaleString()}</div>
                      <div><strong>รวมเงินได้พิเศษ:</strong> ฿{processingSalaryProfile.allowance.toLocaleString()}</div>
                    </div>
                    {processingSalaryProfile.allowances && processingSalaryProfile.allowances.length > 0 && (
                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <strong style={{ display: 'block', marginBottom: '0.2rem' }}>รายละเอียดรายได้พิเศษ:</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.2rem 1rem', paddingLeft: '0.4rem' }}>
                          {processingSalaryProfile.allowances.map((item, idx) => (
                            <React.Fragment key={idx}>
                              <span>{item.label}:</span>
                              <span>฿{(parseFloat(item.amount) || 0).toLocaleString()}</span>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">รอบประจำเดือน (Period)</label>
                    <input 
                      type="month" 
                      className="form-input" 
                      required 
                      value={payrollForm.monthYear}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, monthYear: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันที่จ่ายเงิน (Calendar)</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required 
                      value={payrollForm.datePaid}
                      onChange={(e) => handleDatePaidChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">วันจ่าย (Day)</label>
                    <select
                      className="form-select"
                      value={payrollForm.payDay}
                      onChange={(e) => handleDayMonthChange('payDay', e.target.value)}
                    >
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">เดือนที่จ่าย (Month)</label>
                    <select
                      className="form-select"
                      value={payrollForm.payMonth}
                      onChange={(e) => handleDayMonthChange('payMonth', e.target.value)}
                    >
                      {[
                        { val: '1', label: 'มกราคม' },
                        { val: '2', label: 'กุมภาพันธ์' },
                        { val: '3', label: 'มีนาคม' },
                        { val: '4', label: 'เมษายน' },
                        { val: '5', label: 'พฤษภาคม' },
                        { val: '6', label: 'มิถุนายน' },
                        { val: '7', label: 'กรกฎาคม' },
                        { val: '8', label: 'สิงหาคม' },
                        { val: '9', label: 'กันยายน' },
                        { val: '10', label: 'ตุลาคม' },
                        { val: '11', label: 'พฤศจิกายน' },
                        { val: '12', label: 'ธันวาคม' }
                      ].map(item => (
                        <option key={item.val} value={item.val}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เงินโบนัส / เงินช่วยเหลือพิเศษ</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="เช่น 1000"
                      min="0"
                      value={payrollForm.bonus}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, bonus: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ยอดสุทธิที่จะชำระ (Net Paid)</label>
                    <div style={{ 
                      padding: '0.45rem 1rem', 
                      backgroundColor: 'rgba(46, 213, 115, 0.1)', 
                      border: '1px solid var(--success)', 
                      borderRadius: '8px', 
                      fontSize: '1.2rem', 
                      fontWeight: 'bold', 
                      color: 'var(--success)', 
                      textAlign: 'center' 
                    }}>
                      ฿{(
                        processingSalaryProfile.baseSalary + 
                        processingSalaryProfile.allowance + 
                        (parseFloat(payrollForm.bonus) || 0) - 
                        processingSalaryProfile.deductionSocial - 
                        processingSalaryProfile.deductionTax
                      ).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">บันทึกเพิ่มเติม (Note)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="เช่น โบนัสผลงานประจำเดือน หรือรอบตกเบิก..."
                    value={payrollForm.note}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, note: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="submit" className="btn btn-success" style={{ flexGrow: 1, justifyContent: 'center' }}>
                    ✅ ยืนยันการสั่งจ่ายและบันทึกรายจ่าย
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProcessPayrollModal(false)} style={{ flexGrow: 1, justifyContent: 'center' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PRINTABLE PAYSLIP TEMPLATE ================= */}
      {showPayslipModal && selectedPayslip && (
        <div className="printable-payslip-container">
          <div className="payslip-wrapper">
            
            {/* Header */}
            <div className="payslip-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: '#111' }}>{settings.companyName}</h1>
                <p style={{ fontSize: '0.8rem', color: '#555', margin: 0, lineHeight: '1.4' }}>
                  {settings.companyAddress}<br />
                  <strong>เลขผู้เสียภาษี:</strong> {settings.companyTaxId}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#111' }}>ใบสั่งจ่ายเงินเดือน (Payslip)</h2>
                <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', textAlign: 'left', fontSize: '0.78rem' }}>
                  <div><strong>รอบประจำเดือน:</strong> {selectedPayslip.monthYear}</div>
                  <div><strong>วันที่จ่ายเงิน:</strong> {selectedPayslip.datePaid}</div>
                </div>
              </div>
            </div>

            {/* Employee details info */}
            <div className="payslip-info-box" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', border: '1px solid #eee', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
              <div>
                <div><strong>ชื่อพนักงาน:</strong> {selectedPayslip.employeeName}</div>
                <div><strong>ตำแหน่งงาน:</strong> {selectedPayslip.employeeRole}</div>
              </div>
              <div>
                <div><strong>รับเงินผ่านทาง:</strong> {selectedPayslip.bankName || 'ธนาคาร'}</div>
                <div><strong>เลขที่บัญชี:</strong> {selectedPayslip.bankAccount || '-'}</div>
              </div>
            </div>

            {/* Income and Deductions Table */}
            <table className="payslip-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333', borderTop: '2px solid #333', backgroundColor: '#f9f9f9' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', width: '60%' }}>รายการรายได้ (Earnings)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', width: '40%' }}>จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>เงินเดือนพื้นฐาน (Base Salary)</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>฿{selectedPayslip.baseSalary.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                </tr>
                {selectedPayslip.allowances && selectedPayslip.allowances.length > 0 ? (
                  selectedPayslip.allowances.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem' }}>{item.label}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        ฿{(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  selectedPayslip.allowance > 0 && (
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem' }}>ค่าเบี้ยเลี้ยง / สวัสดิการสม่ำเสมอ (Allowance)</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>฿{selectedPayslip.allowance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )
                )}
                {selectedPayslip.bonus > 0 && (
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem' }}>เงินพิเศษ / โบนัส (Bonus)</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>฿{selectedPayslip.bonus.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
                <tr style={{ borderBottom: '2px solid #333', fontWeight: 'bold' }}>
                  <td style={{ padding: '0.5rem' }}>รวมเงินได้ทั้งหมด (Total Earnings)</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    ฿{(selectedPayslip.baseSalary + selectedPayslip.allowance + selectedPayslip.bonus).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                <tr style={{ backgroundColor: '#f9f9f9' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>รายการหักเงิน (Deductions)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>จำนวนเงิน (บาท)</th>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>กองทุนประกันสังคม (Social Security Fund)</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: '#d11' }}>฿{selectedPayslip.deductionSocial.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                </tr>
                {selectedPayslip.deductionTax > 0 && (
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem' }}>ภาษีเงินได้หัก ณ ที่จ่าย (Withholding Income Tax)</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#d11' }}>฿{selectedPayslip.deductionTax.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
                <tr style={{ borderBottom: '2px solid #333', fontWeight: 'bold' }}>
                  <td style={{ padding: '0.5rem' }}>รวมยอดเงินหักทั้งหมด (Total Deductions)</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: '#d11' }}>
                    ฿{(selectedPayslip.deductionSocial + selectedPayslip.deductionTax).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Net Salary paid */}
            <div className="payslip-net" style={{ border: '2px solid #333', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '2rem', backgroundColor: '#fcfcfc' }}>
              <span>ยอดเงินสุทธิสั่งจ่าย (Net Pay):</span>
              <span style={{ fontSize: '1.3rem', color: '#111' }}>฿{selectedPayslip.netPaid.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Note if exists */}
            {selectedPayslip.note && (
              <div style={{ fontSize: '0.78rem', color: '#666', borderLeft: '3px solid #ccc', paddingLeft: '0.5rem', marginBottom: '2.5rem' }}>
                <strong>หมายเหตุ:</strong> {selectedPayslip.note}
              </div>
            )}

            {/* Signature fields */}
            <div className="payslip-signatures" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', marginTop: '80px', textAlign: 'center', fontSize: '0.78rem' }}>
              <div>
                <div style={{ borderBottom: '1px solid #333', height: '40px', width: '200px', margin: '0 auto' }}></div>
                <p style={{ marginTop: '8px', color: '#555' }}>ผู้จ่ายเงิน / ผู้รับมอบอำนาจ (Cashier)</p>
              </div>
              <div>
                <div style={{ borderBottom: '1px solid #333', height: '40px', width: '200px', margin: '0 auto' }}></div>
                <p style={{ marginTop: '8px', color: '#555' }}>ผู้รับเงิน / พนักงาน (Employee)</p>
              </div>
            </div>

            <div className="payslip-footer" style={{ borderTop: '1px solid #ddd', marginTop: '4rem', paddingTop: '0.75rem', textAlign: 'center', fontSize: '0.7rem', color: '#777' }}>
              <p>เอกสารใบจ่ายเงินเดือนฉบับนี้เป็นความลับเฉพาะบุคคล / จัดพิมพ์ขึ้นอัตโนมัติผ่านทางระบบสารสนเทศ FlowLedger Pro</p>
            </div>
            
            {/* Close button for non-print view */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }} className="no-print">
              <button className="btn btn-secondary" onClick={() => setShowPayslipModal(false)} style={{ padding: '0.5rem 2rem' }}>
                ✕ ปิดหน้าต่างพิมพ์สลิป
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
