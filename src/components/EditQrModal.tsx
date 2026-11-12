import { useState, useEffect } from 'react';
import { 
  Lock, 
  Globe, 
  ExternalLink, 
  Check, 
  Save, 
  Download, 
  QrCode as QrIcon, 
  X, 
  Smartphone,
  Eye,
  MessageSquare,
  Instagram,
  Facebook,
  CreditCard,
  Phone,
  Send,
  Video,
  Trash2,
  Building2,
  Wallet,
  Copy,
  Info,
  Sparkles,
  RotateCcw,
  Clock,
  Calendar
} from 'lucide-react';
import { adminUpdateQrCode, generateQrDataUrl, resetQrScanCount } from '../lib/qrService';
import { 
  processSmartLink, 
  encodeBankDetails, 
  decodeBankDetails, 
  detectWalletInfo, 
  isQuickPayUrl,
  sanitizeQuickPayUrl,
  formatTikTokTargetUrl,
  formatInstagramTargetUrl,
  formatTelegramTargetUrl,
  formatSnapchatTargetUrl
} from '../lib/deepLinks';
import { AppType, QrCodeRecord, BankDetails, WalletItem, WalletProvider } from '../types/qr';
import { PlatformBrandIcon, WalletProviderIcon } from './BrandIcons';

const WALLET_PROVIDERS: Array<{ id: WalletProvider; nameAr: string; nameEn: string; prefix: string; color: string }> = [
  { id: 'vodafone', nameAr: 'فودافون كاش', nameEn: 'Vodafone Cash', prefix: '010', color: 'border-red-500/40 text-red-400 bg-red-500/10' },
  { id: 'orange', nameAr: 'أورانج كاش', nameEn: 'Orange Cash', prefix: '012', color: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
  { id: 'etisalat', nameAr: 'اتصالات كاش', nameEn: 'Etisalat Cash', prefix: '011', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  { id: 'we', nameAr: 'وي باي (WE Pay)', nameEn: 'WE Pay', prefix: '015', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
];

interface EditQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: QrCodeRecord | null;
  domainUrl: string;
  onSaved: (updatedRecord: QrCodeRecord) => void;
  onDelete?: (id: string) => void;
}

const EGYPTIAN_BANKS = [
  'البنك الأهلي المصري (NBE)',
  'بنك مصر (Banque Misr)',
  'البنك التجاري الدولي (CIB)',
  'بنك قطر الوطني (QNB)',
  'بنك القاهرة (Banque du Caire)',
  'بنك الإسكندرية (AlexBank)',
  'بنك فيصل الإسلامي',
  'مصرف أبوظبي الإسلامي (ADIB)',
  'بنك البركة مصر',
  'البنك العربي الأفريقي الدولي (AAIB)',
  'بنك كريدي أجريكول مصر',
  'بنك HSBC مصر',
  'بنك آخر / حساب دولي'
];

export const PLATFORM_META: Record<AppType, { labelAr: string; labelEn: string; placeholder: string; hint: string }> = {
  whatsapp: {
    labelAr: 'واتساب',
    labelEn: 'WhatsApp',
    placeholder: '01012345678 أو wa.me/2010...',
    hint: 'أدخل رقم الموبايل أو رابط محادثة واتساب',
  },
  instagram: {
    labelAr: 'إنستغرام',
    labelEn: 'Instagram',
    placeholder: '@username أو رابط الحساب instagram.com/...',
    hint: 'أدخل يوزر الحساب أو الرابط الكامل',
  },
  facebook: {
    labelAr: 'فيسبوك',
    labelEn: 'Facebook',
    placeholder: 'facebook.com/yourpage أو رابط البروفايل أو ID',
    hint: 'أدخل رابط الصفحة أو الحساب على فيسبوك',
  },
  telegram: {
    labelAr: 'تيليجرام',
    labelEn: 'Telegram',
    placeholder: 't.me/username أو @channel',
    hint: 'أدخل يوزر التليجرام أو رابط القناة/المحادثة',
  },
  tiktok: {
    labelAr: 'تيك توك',
    labelEn: 'TikTok',
    placeholder: 'tiktok.com/@username أو @username',
    hint: 'أدخل رابط أو يوزر حساب تيك توك',
  },
  phone: {
    labelAr: 'اتصال هاتفي',
    labelEn: 'Phone Call',
    placeholder: '01012345678 أو +2010...',
    hint: 'أدخل رقم الهاتف للاتصال المباشر',
  },
  website: {
    labelAr: 'موقع ويب',
    labelEn: 'Website',
    placeholder: 'https://yourwebsite.com',
    hint: 'أدخل رابط الموقع الإلكتروني المطلوب التوجيه إليه',
  },
  instapay: {
    labelAr: 'إنستاباي',
    labelEn: 'InstaPay',
    placeholder: 'https://ipn.eg/S/... (رابط الدفع السريع)',
    hint: 'الصق رابط الدفع السريع المباشر من تطبيق إنستاباي',
  },
  wallet: {
    labelAr: 'محفظة كاش',
    labelEn: 'Cash Wallet',
    placeholder: '010... أو 012... أو رابط دفع',
    hint: 'رقم محفظة فودافون/اتصالات/أورنج/وي كاش',
  },
  bank: {
    labelAr: 'حساب بنكي',
    labelEn: 'Bank Account',
    placeholder: 'بيانات الحساب البنكي',
    hint: 'إدخال بيانات الحساب البنكي للتحويل الفوري',
  },
  snapchat: {
    labelAr: 'سناب شات',
    labelEn: 'Snapchat',
    placeholder: 'snapchat.com/add/... أو @username',
    hint: 'أدخل رابط أو يوزر حساب سناب شات',
  },
  other: {
    labelAr: 'رابط مخصص',
    labelEn: 'Custom Link',
    placeholder: 'https://...',
    hint: 'أدخل أي رابط ويب مخصص أو صفحة خارجية',
  },
};

export function EditQrModal({ isOpen, onClose, record, domainUrl, onSaved, onDelete }: EditQrModalProps) {
  const [selectedType, setSelectedType] = useState<AppType>('website');
  const [targetUrl, setTargetUrl] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Subscription expiry state
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Bank Specific fields
  const [bankName, setBankName] = useState(EGYPTIAN_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [bankNotes, setBankNotes] = useState('');

  // Wallet specific & Multi-wallets (1 to 4)
  const [walletPhone, setWalletPhone] = useState('');
  const [walletCount, setWalletCount] = useState<number>(1);
  const [wallets, setWallets] = useState<Array<{ phone: string; provider: WalletProvider; ownerName: string }>>([
    { phone: '', provider: 'vodafone', ownerName: '' },
    { phone: '', provider: 'orange', ownerName: '' },
    { phone: '', provider: 'etisalat', ownerName: '' },
    { phone: '', provider: 'we', ownerName: '' },
  ]);
  const [currentScans, setCurrentScans] = useState<number>(record?.total_scans || 0);

  const handleWalletPhoneChange = (index: number, val: string) => {
    setWallets((prev) => {
      const next = [...prev];
      const trimmed = val.trim();
      let newProvider: WalletProvider = 'generic';

      if (trimmed) {
        const isUrl = isQuickPayUrl(trimmed);
        if (isUrl) {
          const lower = trimmed.toLowerCase();
          if (lower.includes('vodafone') || lower.includes('voda')) newProvider = 'vodafone';
          else if (lower.includes('orange')) newProvider = 'orange';
          else if (lower.includes('etisalat') || lower.includes('e&')) newProvider = 'etisalat';
          else if (lower.includes('we') || lower.includes('te.eg') || lower.includes('telecom')) newProvider = 'we';
          else newProvider = next[index].provider !== 'generic' ? next[index].provider : 'vodafone';
        } else {
          const detected = detectWalletInfo(trimmed);
          if (detected.provider !== 'generic') {
            newProvider = detected.provider as WalletProvider;
          } else {
            newProvider = next[index].provider !== 'generic' ? next[index].provider : 'generic';
          }
        }
      }

      next[index] = {
        ...next[index],
        phone: val,
        provider: newProvider,
      };
      return next;
    });
    if (index === 0) {
      setWalletPhone(val);
      setTargetUrl(val);
    }
  };

  const handleWalletOwnerChange = (index: number, val: string) => {
    setWallets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ownerName: val };
      return next;
    });
  };

  const handleWalletProviderChange = (index: number, prov: WalletProvider) => {
    setWallets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], provider: prov };
      return next;
    });
  };

  useEffect(() => {
    if (record) {
      const hasStoredWallets = Array.isArray(record.wallets) && record.wallets.length > 0;
      const type = (hasStoredWallets || record.app_type === 'wallet') ? 'wallet' : (record.app_type || 'website');
      setSelectedType(type);
      setLabel(record.label || '');
      setSavedSuccess(false);
      setCurrentScans(record.total_scans || 0);
      setExpiresAt(record.expires_at || null);

      const rawUrl = record.target_url || '';
      setTargetUrl(rawUrl);

      // If bank type, load details
      if (type === 'bank' || rawUrl.startsWith('bank://')) {
        const decoded = decodeBankDetails(rawUrl);
        if (decoded) {
          setBankName(decoded.bankName || EGYPTIAN_BANKS[0]);
          setAccountNumber(decoded.accountNumber || '');
          setAccountName(decoded.accountName || '');
          setIban(decoded.iban || '');
          setBankNotes(decoded.notes || '');
        } else {
          setAccountNumber(rawUrl.replace(/^https?:\/\//, ''));
        }
      } else if (type === 'wallet') {
        if (record.wallets && record.wallets.length > 0) {
          const count = Math.min(4, Math.max(1, record.wallets.length));
          setWalletCount(count);
          setWallets([
            { phone: record.wallets[0]?.phone || '', provider: record.wallets[0]?.provider || (record.wallets[0]?.phone ? 'vodafone' : 'generic'), ownerName: record.wallets[0]?.ownerName || '' },
            { phone: record.wallets[1]?.phone || '', provider: record.wallets[1]?.provider || (record.wallets[1]?.phone ? 'orange' : 'generic'), ownerName: record.wallets[1]?.ownerName || '' },
            { phone: record.wallets[2]?.phone || '', provider: record.wallets[2]?.provider || (record.wallets[2]?.phone ? 'etisalat' : 'generic'), ownerName: record.wallets[2]?.ownerName || '' },
            { phone: record.wallets[3]?.phone || '', provider: record.wallets[3]?.provider || (record.wallets[3]?.phone ? 'we' : 'generic'), ownerName: record.wallets[3]?.ownerName || '' },
          ]);
          setWalletPhone(record.wallets[0]?.phone || '');
        } else {
          let clean = rawUrl;
          if (clean.startsWith('tel:*9*7*')) {
            clean = clean.replace('tel:*9*7*', '').replace('#', '').replace('%23', '');
          }
          let detectedProvider: WalletProvider = 'generic';
          if (clean) {
            if (isQuickPayUrl(clean)) {
              const lower = clean.toLowerCase();
              if (lower.includes('vodafone') || lower.includes('voda')) detectedProvider = 'vodafone';
              else if (lower.includes('orange')) detectedProvider = 'orange';
              else if (lower.includes('etisalat') || lower.includes('e&')) detectedProvider = 'etisalat';
              else if (lower.includes('we') || lower.includes('te.eg') || lower.includes('telecom')) detectedProvider = 'we';
              else detectedProvider = 'vodafone';
            } else {
              const detected = detectWalletInfo(clean);
              detectedProvider = (detected.provider !== 'generic' ? detected.provider : 'vodafone') as WalletProvider;
            }
          }
          setWalletCount(1);
          setWallets([
            { phone: clean, provider: detectedProvider, ownerName: '' },
            { phone: '', provider: 'generic', ownerName: '' },
            { phone: '', provider: 'generic', ownerName: '' },
            { phone: '', provider: 'generic', ownerName: '' },
          ]);
          setWalletPhone(clean);
        }
      }

      const fullScanUrl = `${domainUrl}/q/${record.id}`;
      generateQrDataUrl(fullScanUrl, 400).then((url) => setQrDataUrl(url));
    }
  }, [record, domainUrl]);

  if (!isOpen || !record) return null;

  const handleResetScans = async () => {
    if (!record) return;
    const ok = await resetQrScanCount(record.id, 0);
    if (ok) {
      setCurrentScans(0);
      record.total_scans = 0;
      onSaved({ ...record, total_scans: 0 });
    }
  };

  const handleExtendDays = (days: number) => {
    const base = (expiresAt && new Date(expiresAt).getTime() > Date.now())
      ? new Date(expiresAt).getTime()
      : Date.now();
    const nextDate = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
    setExpiresAt(nextDate);
  };

  const handleSelectPlatform = (newType: AppType) => {
    if (newType === selectedType) return;

    setSelectedType(newType);

    // If switching back to the card's originally saved platform, restore its saved values.
    // If switching to a new/different platform, completely purge and clear all fields clean!
    if (record && newType === (record.app_type || 'website')) {
      const origUrl = record.target_url || '';
      setTargetUrl(origUrl);
      if (newType === 'bank' || origUrl.startsWith('bank://')) {
        const decoded = decodeBankDetails(origUrl);
        if (decoded) {
          setBankName(decoded.bankName || EGYPTIAN_BANKS[0]);
          setAccountNumber(decoded.accountNumber || '');
          setAccountName(decoded.accountName || '');
          setIban(decoded.iban || '');
          setBankNotes(decoded.notes || '');
        } else {
          setAccountNumber(origUrl.replace(/^https?:\/\//, ''));
        }
      } else if (newType === 'wallet') {
        if (record.wallets && record.wallets.length > 0) {
          const count = Math.min(4, Math.max(1, record.wallets.length));
          setWalletCount(count);
          setWallets([
            { phone: record.wallets[0]?.phone || '', provider: record.wallets[0]?.provider || 'vodafone', ownerName: record.wallets[0]?.ownerName || '' },
            { phone: record.wallets[1]?.phone || '', provider: record.wallets[1]?.provider || 'orange', ownerName: record.wallets[1]?.ownerName || '' },
            { phone: record.wallets[2]?.phone || '', provider: record.wallets[2]?.provider || 'etisalat', ownerName: record.wallets[2]?.ownerName || '' },
            { phone: record.wallets[3]?.phone || '', provider: record.wallets[3]?.provider || 'we', ownerName: record.wallets[3]?.ownerName || '' },
          ]);
          setWalletPhone(record.wallets[0]?.phone || '');
        } else {
          let clean = origUrl;
          if (clean.startsWith('tel:*9*7*')) {
            clean = clean.replace('tel:*9*7*', '').replace('#', '').replace('%23', '');
          }
          let detectedProvider: WalletProvider = 'generic';
          if (clean) {
            if (isQuickPayUrl(clean)) {
              const lower = clean.toLowerCase();
              if (lower.includes('vodafone') || lower.includes('voda')) detectedProvider = 'vodafone';
              else if (lower.includes('orange')) detectedProvider = 'orange';
              else if (lower.includes('etisalat') || lower.includes('e&')) detectedProvider = 'etisalat';
              else if (lower.includes('we') || lower.includes('te.eg') || lower.includes('telecom')) detectedProvider = 'we';
              else detectedProvider = 'vodafone';
            } else {
              const detected = detectWalletInfo(clean);
              detectedProvider = (detected.provider !== 'generic' ? detected.provider : 'vodafone') as WalletProvider;
            }
          }
          setWalletCount(1);
          setWallets([
            { phone: clean, provider: detectedProvider, ownerName: '' },
            { phone: '', provider: 'generic', ownerName: '' },
            { phone: '', provider: 'generic', ownerName: '' },
            { phone: '', provider: 'generic', ownerName: '' },
          ]);
          setWalletPhone(clean);
        }
      }
    } else {
      // Switching to a new/different platform -> PURGE ALL OLD VALUES
      setTargetUrl('');
      setWalletPhone('');
      setWalletCount(1);
      setWallets([
        { phone: '', provider: 'generic', ownerName: '' },
        { phone: '', provider: 'generic', ownerName: '' },
        { phone: '', provider: 'generic', ownerName: '' },
        { phone: '', provider: 'generic', ownerName: '' },
      ]);
      setAccountNumber('');
      setAccountName('');
      setIban('');
      setBankNotes('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);

    let finalRawInput = targetUrl.trim();
    let activeWalletsToSave: WalletItem[] | undefined = undefined;

    // Custom formatting based on selected platform
    if (selectedType === 'bank') {
      const bankDetails: BankDetails = {
        bankName,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        iban: iban.trim(),
        notes: bankNotes.trim(),
      };
      finalRawInput = encodeBankDetails(bankDetails);
      activeWalletsToSave = [];
    } else if (selectedType === 'wallet') {
      const activeList: WalletItem[] = [];
      for (let i = 0; i < walletCount; i++) {
        const item = wallets[i];
        const trimmedVal = item.phone.trim();
        if (!trimmedVal) {
          alert(walletCount === 1 ? 'يرجى إدخال رقم المحفظة أو رابط الدفع السريع.' : `يرجى إدخال بيانات المحفظة رقم ${i + 1} (رقم المحفظة أو رابط الدفع السريع).`);
          setLoading(false);
          return;
        }

        const trimmedOwner = item.ownerName?.trim() || '';
        if (!trimmedOwner) {
          alert(walletCount === 1 ? 'يرجى كتابة اسم صاحب المحفظة (إلزامي).' : `يرجى كتابة اسم صاحب المحفظة رقم ${i + 1} (إلزامي).`);
          setLoading(false);
          return;
        }

        if (isQuickPayUrl(trimmedVal)) {
          const fullUrl = sanitizeQuickPayUrl(trimmedVal, item.provider);
          activeList.push({
            phone: fullUrl,
            provider: item.provider !== 'generic' ? item.provider : 'vodafone',
            ownerName: trimmedOwner,
          });
        } else {
          const detected = detectWalletInfo(trimmedVal);
          const finalProv = item.provider !== 'generic' ? item.provider : (detected.provider !== 'generic' ? detected.provider : 'vodafone');
          activeList.push({
            phone: detected.cleanPhone || trimmedVal,
            provider: finalProv,
            ownerName: trimmedOwner,
          });
        }
      }

      activeWalletsToSave = activeList;
      finalRawInput = activeList[0].phone;
      setTargetUrl(finalRawInput);
    } else if (selectedType === 'instapay') {
      activeWalletsToSave = [];
      let ipnLink = targetUrl.trim();
      const hasLink = ipnLink.includes('ipn.eg') || ipnLink.startsWith('http://') || ipnLink.startsWith('https://');
      if (!hasLink) {
        alert('تطبيق إنستاباي يتطلب وضع رابط الدفع السريع المباشر (مثل: https://ipn.eg/S/...) وليس اسم المستخدم أو العنوان، حتى يتم فتح صفحة الدفع في التطبيق للعميل مباشرة.');
        setLoading(false);
        return;
      }
      if (ipnLink.startsWith('ipn.eg/')) {
        ipnLink = `https://${ipnLink}`;
      } else if (!ipnLink.startsWith('http://') && !ipnLink.startsWith('https://')) {
        ipnLink = `https://${ipnLink}`;
      }
    } else if (selectedType === 'tiktok') {
      activeWalletsToSave = [];
      finalRawInput = formatTikTokTargetUrl(targetUrl);
    } else if (selectedType === 'instagram') {
      activeWalletsToSave = [];
      finalRawInput = formatInstagramTargetUrl(targetUrl);
    } else if (selectedType === 'telegram') {
      activeWalletsToSave = [];
      finalRawInput = formatTelegramTargetUrl(targetUrl);
    } else if (selectedType === 'snapchat') {
      activeWalletsToSave = [];
      finalRawInput = formatSnapchatTargetUrl(targetUrl);
    } else {
      activeWalletsToSave = [];
    }

    try {
      const result = await adminUpdateQrCode(
        record.id, 
        finalRawInput, 
        selectedType, 
        label.trim(),
        expiresAt,
        undefined,
        activeWalletsToSave
      );
      if (result.success && result.record) {
        setSavedSuccess(true);
        onSaved(result.record);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to update QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${record.id}.png`;
    link.click();
  };

  // Preview current computed URL
  let currentPreviewInput = targetUrl.trim();
  if (selectedType === 'bank') {
    currentPreviewInput = encodeBankDetails({
      bankName,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      iban: iban.trim(),
    });
  } else if (selectedType === 'wallet') {
    currentPreviewInput = walletPhone.trim();
  }
  const currentLinkInfo = processSmartLink(currentPreviewInput, selectedType);

  // Platform Buttons: STRICT SINGLE SELECTION
  const paymentPlatforms: Array<{ type: AppType; label: string; icon: any; hint: string }> = [
    { type: 'bank', label: 'حساب بنكي رسمي', icon: Building2, hint: 'عرض كارت حساب وتحويل فوري' },
    { type: 'instapay', label: 'إنستاباي InstaPay', icon: CreditCard, hint: 'تحويل مباشر ipn.eg' },
    { type: 'wallet', label: 'محفظة كاش (فودافون/اتصالات)', icon: Wallet, hint: 'كود تحويل فوري ومباشر' },
  ];

  const socialPlatforms: Array<{ type: AppType; label: string; icon: any }> = [
    { type: 'whatsapp', label: 'واتساب', icon: MessageSquare },
    { type: 'instagram', label: 'إنستغرام', icon: Instagram },
    { type: 'facebook', label: 'فيسبوك', icon: Facebook },
    { type: 'telegram', label: 'تيليجرام', icon: Send },
    { type: 'tiktok', label: 'تيك توك', icon: Video },
    { type: 'phone', label: 'اتصال هاتفي', icon: Phone },
    { type: 'website', label: 'موقع ويب', icon: Globe },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e0e12] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.2)] border border-amber-500/35 overflow-hidden flex flex-col max-h-[94vh] text-white">
        {/* Ambient Gold Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
              <QrIcon className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                  تعديل الرمز والمنصة المستهدفة
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  record.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                }`}>
                  {record.is_active ? 'مفعل نشط' : 'في انتظار التفعيل'}
                </span>
              </div>
              <p className="text-xs text-slate-400">اختر المنصة أو البنك المطلوب ربطه بهذا الكود (اختيار واحد فقط)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
          {/* Top Info: Immutable ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-200/90 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  معرّف الكود الفريد (ID - Primary Key)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400/10 text-amber-300 rounded-md border border-amber-400/20">
                  ثابت ومحمي (ممنوع التعديل)
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={record.id}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-amber-500/20 rounded-xl font-mono text-sm font-bold text-amber-300 select-all cursor-not-allowed shadow-inner"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-amber-400/50 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-200/90">مرات المسح والزيارات</label>
                {record.is_active && currentScans > 0 && (
                  <button
                    type="button"
                    onClick={handleResetScans}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1 cursor-pointer"
                    title="تصفير العداد والبدء من 0"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>تصفير العداد</span>
                  </button>
                )}
              </div>
              <div className="px-3.5 py-2.5 bg-black/60 border border-amber-500/20 rounded-xl text-sm font-bold text-amber-400 flex items-center justify-between">
                <span>{currentScans}</span>
                <span className="text-xs text-slate-400 font-normal">
                  {record.is_active ? 'زيارة حقيقية بعد التفعيل' : 'العد يبدأ بعد التفعيل فقط'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Bank & Financial Options (Single Select) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-200/90 flex items-center justify-between">
              <span>🏦 خيارات البنوك والمدفوعات الإلكترونية:</span>
              <span className="text-[11px] text-amber-400/80 font-normal">اختيار واحد فقط</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {paymentPlatforms.map((p) => {
                const isSelected = selectedType === p.type;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => handleSelectPlatform(p.type)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-right transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e1c12] text-amber-300 border-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.25)] ring-2 ring-amber-400 font-black'
                        : 'bg-black/40 text-slate-300 border-amber-500/20 hover:border-amber-400/40 hover:bg-black/60'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-black/40 p-1">
                      <PlatformBrandIcon type={p.type} className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{p.label}</p>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>
                        {p.hint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Social & Messaging Platforms (Single Select) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-200/90 flex items-center justify-between">
              <span>📱 منصات التواصل والتطبيقات الأخرى:</span>
              <span className="text-[11px] text-amber-400/80 font-normal">اختيار واحد فقط</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {socialPlatforms.map((p) => {
                const isSelected = selectedType === p.type;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => handleSelectPlatform(p.type)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-semibold transition gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e1c12] text-amber-300 border-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.25)] ring-2 ring-amber-400 font-black'
                        : 'bg-black/40 text-slate-300 border-amber-500/20 hover:border-amber-400/40 hover:bg-black/60'
                    }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center">
                      <PlatformBrandIcon type={p.type} className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] truncate w-full text-center">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Dynamic Input fields based on selected platform */}

          {/* A. If BANK selected */}
          {selectedType === 'bank' && (
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>إدخال بيانات الحساب البنكي (للتحويل الفوري):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bank Name Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-200/90">اسم البنك:</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {EGYPTIAN_BANKS.map((b) => (
                      <option key={b} value={b} className="bg-[#121216] text-white">{b}</option>
                    ))}
                  </select>
                </div>

                {/* Account Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-200/90">رقم الحساب البنكي (إلزامي):</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="مثال: 12345678901234"
                    className="w-full px-3 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    dir="ltr"
                    required
                  />
                </div>

                {/* Account Holder Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-200/90">اسم صاحب الحساب (اختياري):</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="مثال: أحمد محمد علي"
                    className="w-full px-3 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* IBAN */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-200/90">الآيبان الدولي IBAN (اختياري):</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="EG0000000000000000000000000"
                    className="w-full px-3 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs font-mono text-amber-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-200/80">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  عند مسح هذا الرمز، ستظهر للعميل بطاقة بنكية أوبسيديان وذهب فاخرة تعرض اسم البنك ورقم الحساب وزر لنسخ الرقم بضغطة واحدة لتحويل الأموال دون أي أخطاء.
                </span>
              </div>
            </div>
          )}

          {/* B. If WALLET selected (Multi-Wallet 1 to 4) */}
          {selectedType === 'wallet' && (
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl space-y-4 animate-in fade-in">
              {/* Wallet Count Selector */}
              <div className="p-3.5 bg-black/60 border border-amber-500/20 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-200">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>عدد المحافظ الإلكترونية المربوطة بهذا الكارت:</span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    (1 إلى 4 محافظ)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  يمكنك ربط محفظة واحدة أو حتى 4 محافظ (فودافون، أورانج، اتصالات، وي). لكل محفظة لوجو شركتها الخاص وخانة لاسم صاحب المحفظة:
                </p>

                {/* 4 Segmented Count Buttons */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[1, 2, 3, 4].map((count) => {
                    const isCountSelected = walletCount === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setWalletCount(count)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                          isCountSelected
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-amber-300 shadow-md font-black scale-[1.02]'
                            : 'bg-[#18181b] text-slate-300 border-white/10 hover:border-amber-400/40 hover:text-white'
                        }`}
                      >
                        <span className="text-sm font-mono font-black">{count}</span>
                        <span className="text-[10px] opacity-90">
                          {count === 1 ? 'محفظة واحدة' : count === 2 ? 'محفظتان' : `${count} محافظ`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallet Cards (1 to 4) */}
              <div className="space-y-3">
                {Array.from({ length: walletCount }).map((_, index) => {
                  const item = wallets[index];
                  const hasInput = Boolean(item.phone && item.phone.trim());
                  const detected = hasInput ? detectWalletInfo(item.phone) : null;
                  const isUrl = hasInput ? isQuickPayUrl(item.phone) : false;
                  const activeProvider: WalletProvider = (hasInput 
                    ? (item.provider !== 'generic' ? item.provider : (detected && detected.provider !== 'generic' ? detected.provider : 'generic'))
                    : (item.provider !== 'generic' ? item.provider : 'generic')
                  ) as WalletProvider;
                  const isKnownBrand = hasInput && activeProvider !== 'generic';
                  const activeMeta = isKnownBrand ? WALLET_PROVIDERS.find(p => p.id === activeProvider) : null;

                  return (
                    <div 
                      key={index} 
                      className={`p-3.5 rounded-2xl border transition-all space-y-3 bg-black/60 ${
                        isKnownBrand && activeProvider === 'vodafone' ? 'border-red-500/35 shadow-[0_0_20px_rgba(230,0,0,0.1)]' :
                        isKnownBrand && activeProvider === 'orange' ? 'border-orange-500/35 shadow-[0_0_20px_rgba(255,121,0,0.1)]' :
                        isKnownBrand && activeProvider === 'etisalat' ? 'border-emerald-500/35 shadow-[0_0_20px_rgba(113,158,25,0.1)]' :
                        isKnownBrand && activeProvider === 'we' ? 'border-purple-500/35 shadow-[0_0_20px_rgba(102,45,145,0.15)]' :
                        'border-amber-500/25 shadow-[0_0_15px_rgba(212,175,55,0.06)]'
                      }`}
                    >
                      {/* Header with Provider Logo & Switcher */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-black/80 border border-white/15 p-1 flex items-center justify-center flex-shrink-0 shadow">
                            <WalletProviderIcon provider={isKnownBrand ? activeProvider : 'generic'} size={28} className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-white block">
                              {walletCount > 1 ? `المحفظة رقم ${index + 1}` : 'بيانات المحفظة الإلكترونية'}
                            </span>
                            {isKnownBrand && activeMeta ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border inline-block mt-0.5 ${activeMeta.color}`}>
                                {activeMeta.nameAr}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border inline-block mt-0.5 text-amber-300/80 bg-amber-500/10 border-amber-500/20">
                                تحديد تلقائي عند كتابة الرقم أو الرابط
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Provider Switcher */}
                        <select
                          value={item.provider}
                          onChange={(e) => handleWalletProviderChange(index, e.target.value as WalletProvider)}
                          className="px-2 py-1 bg-[#121216] border border-white/15 rounded-lg text-[11px] font-bold text-amber-200 focus:outline-none focus:border-amber-400"
                        >
                          <option value="generic">تحديد تلقائي للشبكة</option>
                          <option value="vodafone">فودافون كاش (010)</option>
                          <option value="orange">أورانج كاش (012)</option>
                          <option value="etisalat">اتصالات كاش (011)</option>
                          <option value="we">وي باي (015)</option>
                        </select>
                      </div>

                      {/* Input 1: Phone Number or Quick Pay Link */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <label className="flex items-center gap-1 text-amber-200/90">
                            <span>رقم المحفظة أو رابط الدفع السريع (إلزامي):</span>
                            {isKnownBrand && activeMeta && !isUrl && (
                              <span className="text-amber-400 font-mono font-black">({activeMeta.prefix})</span>
                            )}
                          </label>
                          {item.phone && (
                            <button
                              type="button"
                              onClick={() => handleWalletPhoneChange(index, '')}
                              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>مسح</span>
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={item.phone}
                            onChange={(e) => handleWalletPhoneChange(index, e.target.value)}
                            placeholder="010... أو رابط الدفع السريع https://..."
                            className="w-full pr-3.5 pl-10 py-2.5 bg-black/70 border border-amber-500/30 rounded-xl text-xs font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                            dir="ltr"
                            required
                          />
                          {item.phone && (
                            <button
                              type="button"
                              onClick={() => handleWalletPhoneChange(index, '')}
                              className="absolute left-3 top-2.5 text-slate-400 hover:text-amber-300 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Quick Pay URL Detected Badge */}
                        {isUrl && (
                          <div className="flex items-center gap-1.5 p-2 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 border border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-200">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                            <span>رابط دفع سريع{isKnownBrand && activeMeta ? ` لماركة (${activeMeta.nameAr})` : ''} ⚡ سيظهر زر فاخر للدفع السريع والتحويل المباشر!</span>
                          </div>
                        )}
                      </div>

                      {/* Input 2: Wallet Owner Name - Mandatory */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <label className="text-amber-200/90 font-bold">
                            اسم صاحب المحفظة (إلزامي):
                          </label>
                          <span className="text-[10px] text-amber-400 font-bold">إلزامي</span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={item.ownerName}
                            onChange={(e) => handleWalletOwnerChange(index, e.target.value)}
                            placeholder="مثال: أحمد محمد علي"
                            className="w-full pr-3.5 pl-8 py-2 bg-black/70 border border-amber-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                            required
                          />
                          {item.ownerName && (
                            <button
                              type="button"
                              onClick={() => handleWalletOwnerChange(index, '')}
                              className="absolute left-2.5 top-2 text-slate-400 hover:text-amber-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-black/50 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/80 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  عند مسح الكارت، ستظهر {walletCount === 1 ? 'بطاقة المحفظة' : `${walletCount} بطاقات للمحافظ`} مع لوجو كل شركة رسمي، واسم صاحب المحفظة، ورقم الهاتف، وزر نسخ مخصص لكل رقم.
                </span>
              </div>
            </div>
          )}

          {/* C. If INSTAPAY selected */}
          {selectedType === 'instapay' && (
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>رابط الدفع السريع من إنستاباي InstaPay (إلزامي):</span>
                </div>
                {targetUrl && (
                  <button
                    type="button"
                    onClick={() => setTargetUrl('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>مسح</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://ipn.eg/S/... (رابط الدفع السريع فقط)"
                  className="w-full pr-3.5 pl-10 py-2.5 bg-black/60 border border-amber-500/30 rounded-xl text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  dir="ltr"
                  required
                  autoFocus
                />
                {targetUrl && (
                  <button
                    type="button"
                    onClick={() => setTargetUrl('')}
                    className="absolute left-3 top-3 text-slate-400 hover:text-amber-300 transition cursor-pointer"
                    title="تفريغ الحقل"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                💡 <strong>طريقة الحصول على الرابط:</strong> افتح تطبيق إنستاباي &gt; اضغط &quot;اطلب دفع&quot; &gt; اضغط &quot;مشاركة الرابط&quot; والصقه هنا ليتم توجيه العميل للدفع في التطبيق فوراً.
              </p>
            </div>
          )}

          {/* D. Standard Target URL for other platforms */}
          {selectedType !== 'bank' && selectedType !== 'wallet' && selectedType !== 'instapay' && (() => {
            const currentMeta = PLATFORM_META[selectedType] || PLATFORM_META.website;
            return (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-200/90 flex items-center gap-1.5">
                    <span>الرابط المستهدف أو الحساب</span>
                    <span className="text-amber-400 font-black">({currentMeta.labelAr} - {currentMeta.labelEn}):</span>
                  </label>
                  {targetUrl && (
                    <button
                      type="button"
                      onClick={() => setTargetUrl('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition"
                      title="مسح وتفريغ الحقل"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>مسح الرابط القديم</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder={currentMeta.placeholder}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full pr-4 pl-10 py-3 bg-black/60 border border-amber-500/30 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner transition font-mono font-bold"
                    dir="ltr"
                    required
                    autoFocus
                  />
                  {targetUrl && (
                    <button
                      type="button"
                      onClick={() => setTargetUrl('')}
                      className="absolute left-3 top-3.5 text-slate-400 hover:text-amber-300 transition cursor-pointer"
                      title="تفريغ الحقل"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {currentMeta.hint}
                </p>
              </div>
            );
          })()}

          {/* Label / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-amber-200/90">
              تسمية الكارت / وصف داخلي للأدمن (اختياري):
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثال: كارت تحويل بنكي للمتجر - الحساب الرئيسي"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-amber-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Subscription Expiry & Duration Management */}
          <div className="p-4 bg-gradient-to-br from-amber-500/10 via-black/60 to-[#121216] border border-amber-500/30 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>إدارة مدة التفعيل والاشتراك الشهري:</span>
              </span>
              {expiresAt ? (
                new Date(expiresAt).getTime() < Date.now() ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    منتهي الصلاحية ⚠️
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    نشط (باقي {Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} يوم)
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  دائم / غير محدود ✦
                </span>
              )}
            </div>

            {/* Current Expiry Date Display & Date Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold block">
                  تاريخ انتهاء الاشتراك:
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={expiresAt ? expiresAt.split('T')[0] : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setExpiresAt(new Date(e.target.value + 'T23:59:59.000Z').toISOString());
                      } else {
                        setExpiresAt(null);
                      }
                    }}
                    className="w-full px-3 py-2 bg-black/70 border border-amber-500/30 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Fast Extend Buttons */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold block">
                  تمديد سريع للاشتراك:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleExtendDays(30)}
                    className="flex-1 py-1.5 px-2 bg-amber-400/15 hover:bg-amber-400 hover:text-black text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <span>+1 شهر</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtendDays(90)}
                    className="flex-1 py-1.5 px-2 bg-amber-400/15 hover:bg-amber-400 hover:text-black text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <span>+3 شهور</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtendDays(180)}
                    className="flex-1 py-1.5 px-2 bg-amber-400/15 hover:bg-amber-400 hover:text-black text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <span>+6 شهور</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiresAt(null)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition border ${
                      expiresAt === null
                        ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400'
                        : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    <span>دائم</span>
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              * عند انتهاء مدة التفعيل، ستتوقف إعادة التوجيه وسيظهر للعميل صفحة فاخرة لتجديد الاشتراك عبر واتساب.
            </p>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 bg-black/60 border border-amber-500/20 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-400" />
                معاينة نتيجة المسح المباشر:
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-400/15 border border-amber-400/30 text-amber-300 rounded-full font-bold">
                جاهز للعمل بنسبة 100%
              </span>
            </div>

            {selectedType === 'bank' ? (
              <div className="p-3 bg-[#141418] rounded-xl border border-amber-500/30 space-y-1.5 text-xs">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  {bankName}
                </p>
                <div className="flex items-center justify-between bg-black/50 p-2 rounded-lg font-mono" dir="ltr">
                  <span className="text-amber-200 font-bold">{accountNumber || 'رقم الحساب'}</span>
                  <span className="text-[11px] text-slate-400">Account #</span>
                </div>
                {accountName && <p className="text-slate-300 text-[11px]">الاسم: {accountName}</p>}
                {iban && <p className="text-amber-200/60 text-[10px] font-mono" dir="ltr">IBAN: {iban}</p>}
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px] w-24">الرابط المباشر:</span>
                  <code className="text-amber-300 bg-black/80 px-2 py-1 rounded border border-amber-500/20 truncate flex-1 font-mono text-[11px]" dir="ltr">
                    {currentLinkInfo.schemeUrl || '—'}
                  </code>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <a
                href={`${domainUrl}/q/${record.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                تجربة مسح الكود ومحاكاة التوجيه في تبويب جديد
              </a>
            </div>
          </div>

          {/* QR Image Box */}
          <div className="p-4 bg-[#141418] rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {qrDataUrl && (
                <div className="p-1.5 bg-white border border-amber-500/30 rounded-xl shadow-md">
                  <img src={qrDataUrl} alt="QR Code" className="w-16 h-16 object-contain" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-amber-200">رمز الـ QR الكلاسيكي عالي الدقة</p>
                <p className="text-[11px] text-amber-400/80 font-mono" dir="ltr">{domainUrl}/q/{record.id}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              تنزيل الصورة (PNG)
            </button>
          </div>

          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-3 bg-amber-400/20 border border-amber-400/30 rounded-2xl text-xs text-amber-300 font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
              تم حفظ التعديلات وتحديث المنصة والرابط بنجاح!
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-amber-500/20">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(record.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-rose-300 hover:text-white hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-xs font-bold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف الكود نهائياً
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-black font-black text-xs rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.3)] transition cursor-pointer"
              >
                <Save className="w-4 h-4 text-black" />
                {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
