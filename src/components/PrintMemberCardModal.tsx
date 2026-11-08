import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Member, Church, Language } from '../types';
import { generateQrDataUrl, getMemberVerificationUrl, saveChurch, getSavedLanguage } from '../utils/storage';
import { churchHasValidRnc, getChurchRnc } from '../utils/rncValidator';
import { useToast } from '../context/ToastContext';
import { CARD_STYLES, CardStyleDefinition } from '../data/cardStyles';
import {
  BADGE_DOMAIN_STYLES,
  BadgeDomainStyleId,
  getSavedBadgeDomainStyle,
  saveBadgeDomainStyle,
} from '../data/badgeDomainStyles';
import { BadgeDomainDisplay } from './common/BadgeDomainDisplay';
import { exportCardsToPdf, PdfExportLayout, PdfExportProgress } from '../utils/cardPdfExporter';
import {
  Printer,
  X,
  ArrowLeft,
  ShieldCheck,
  Layers,
  Palette,
  Scissors,
  Check,
  Users,
  Search,
  Sliders,
  BookOpen,
  Cross,
  Crown,
  Shield,
  Star,
  Church as ChurchIcon,
  Feather,
  Download,
  Loader2,
  CheckCircle2,
  PenTool,
  ImagePlus,
  Trash2,
  Upload,
} from 'lucide-react';
import { SignatureDrawModal } from './common/SignatureDrawModal';

export type CardLayoutSide = 'both' | 'front' | 'back';
export type PhotoShape = 'rounded' | 'circle' | 'shield';

export interface PrintMemberCardModalProps {
  church: Church;
  initialMember?: Member;
  allMembers?: Member[];
  onClose: () => void;
  language?: Language;
  fullPage?: boolean;
  onBack?: () => void;
}

interface CategoryOption {
  id: string;
  labels: Record<Language, string>;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'all', labels: { ht: 'Tout', fr: 'Tout', en: 'All', es: 'Todos' } },
  { id: 'Gold & Prestig', labels: { ht: 'Lò & Prestig', fr: 'Or & Prestige', en: 'Gold & Prestige', es: 'Oro & Prestigio' } },
  { id: 'Wayal & Ble', labels: { ht: 'Wayal & Ble', fr: 'Royal & Bleu', en: 'Royal & Blue', es: 'Real & Azul' } },
  { id: 'Ministè & Sakre', labels: { ht: 'Ministè & Sakre', fr: 'Ministère & Sacré', en: 'Ministry & Sacred', es: 'Ministerio & Sagrado' } },
  { id: 'Emwòd & Gras', labels: { ht: 'Emwòd & Gras', fr: 'Émeraude & Grâce', en: 'Emerald & Grace', es: 'Esmeralda & Gracia' } },
  { id: 'Wouj & Rubis', labels: { ht: 'Wouj & Rubis', fr: 'Rouge & Rubis', en: 'Red & Ruby', es: 'Rojo & Rubí' } },
  { id: 'Vyolèt & Majeste', labels: { ht: 'Vyolèt & Majeste', fr: 'Violet & Majesté', en: 'Violet & Majesty', es: 'Violeta & Majestad' } },
  { id: 'Ekolojik & Blan', labels: { ht: 'Ekolojik & Blan', fr: 'Écologique & Blanc', en: 'Eco & Pure White', es: 'Ecológico & Blanco' } },
  { id: 'Nwa & Titanyòm', labels: { ht: 'Nwa & Titanyòm', fr: 'Noir & Titane', en: 'Black & Titanium', es: 'Negro & Titanio' } },
  { id: 'Owò & Gradyan', labels: { ht: 'Owò & Gradyan', fr: 'Aurore & Dégradé', en: 'Aurora & Gradient', es: 'Aurora & Degradado' } },
];

export const PrintMemberCardModal: React.FC<PrintMemberCardModalProps> = ({
  church,
  initialMember,
  allMembers = [],
  onClose,
  language,
  fullPage = false,
  onBack,
}) => {
  const toast = useToast();
  const activeLang: Language = language || getSavedLanguage() || 'ht';
  const isEs = activeLang === 'es';
  const isEn = activeLang === 'en';
  const isFr = activeLang === 'fr';

  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Strictly enforce tenant isolation: only members belonging to this specific church
  const churchMembers = useMemo(() => {
    const cleanId = church.id.trim();
    const churchCodeUpper = (church.code || '').toUpperCase();
    return allMembers.filter(
      (m) =>
        m.churchId === cleanId ||
        (churchCodeUpper && (m.churchId || '').toUpperCase() === churchCodeUpper)
    );
  }, [allMembers, church]);

  // Selected members for printing
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    if (initialMember?.id) return [initialMember.id];
    if (churchMembers.length > 0) return [churchMembers[0].id];
    return [];
  });

  // Theme / Style State (from 100+ Pro Styles)
  const [selectedStyleId, setSelectedStyleId] = useState<string>('gold-prestige-1');
  const [styleCategory, setStyleCategory] = useState<string>('all');
  const [styleSearch, setStyleSearch] = useState<string>('');

  // Layout & Customization Controls
  const [layoutSide, setLayoutSide] = useState<CardLayoutSide>('both');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(!initialMember && churchMembers.length > 1);
  const [batchSearch, setBatchSearch] = useState<string>('');
  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);

  // PDF Export Modal & Processing State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [pdfLayout, setPdfLayout] = useState<PdfExportLayout>('a4_grid');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<PdfExportProgress | null>(null);

  // Custom text fields
  const [headerTitle, setHeaderTitle] = useState<string>(
    isEs ? 'CARNET DE IDENTIDAD DE MIEMBRO' : isEn ? 'MEMBER IDENTITY CARD' : isFr ? 'CARTE D’IDENTITÉ DE MEMBRE' : 'KAT IDANTITE MANM'
  );
  const [badgeText, setBadgeText] = useState<string>(
    isEs ? 'TITULAR • OFICIAL' : isEn ? 'HOLDER • OFFICIAL' : isFr ? 'TITULAIRE • OFFICIEL' : 'TITILÈ • OFISYÈL'
  );
  const [scriptureText, setScriptureText] = useState<string>(
    isEs
      ? '"Así nosotros, siendo muchos, somos un cuerpo en Cristo, y todos miembros los unos de los otros." — Rom. 12:5'
      : isEn
      ? '"So we, though many, are one body in Christ, and individually members one of another." — Rom. 12:5'
      : isFr
      ? '"Ainsi, nous qui sommes plusieurs, nous formons un seul corps en Christ." — Rom. 12:5'
      : '"Nou tout fè yon sèl kò nan Kris la, e nou chak se yon manm pou lòt." — Wom. 12:5'
  );
  const [photoShape, setPhotoShape] = useState<PhotoShape>('rounded');
  const [watermarkChoice, setWatermarkChoice] = useState<string>('auto');
  const [badgeDomainStyle, setBadgeDomainStyle] = useState<BadgeDomainStyleId>(() => getSavedBadgeDomainStyle());

  // Electronic Signature State & Signer Title
  const [signatureUrl, setSignatureUrl] = useState<string>(church.signatureUrl || '');
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
  const [signerTitle, setSignerTitle] = useState<string>(
    isEs ? 'Firma Autorizada' : isEn ? 'Authorized Signature' : isFr ? 'Signature Autorisée' : 'Siyati Otorize'
  );
  const signatureFileInputRef = useRef<HTMLInputElement>(null);

  // Map memberId to QR URL
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  const activeMembersToPrint = useMemo(() => {
    if (churchMembers.length > 0) {
      const selected = churchMembers.filter((m) => selectedMemberIds.includes(m.id));
      if (selected.length > 0) return selected;
    }
    if (initialMember) return [initialMember];
    if (churchMembers.length > 0) return [churchMembers[0]];
    return [];
  }, [churchMembers, selectedMemberIds, initialMember]);

  const currentStyle: CardStyleDefinition = useMemo(() => {
    return CARD_STYLES.find((s) => s.id === selectedStyleId) || CARD_STYLES[0];
  }, [selectedStyleId]);

  // Generate QR codes for active members with zero-freeze caching
  useEffect(() => {
    let isMounted = true;
    const missingMembers = activeMembersToPrint.filter(
      (m) => m && !qrMap[m.id] && (m.barcodeToken || m.memberId || m.id)
    );

    if (missingMembers.length === 0) return;

    const generateMissing = async () => {
      const results = await Promise.all(
        missingMembers.map(async (m) => {
          const token = getMemberVerificationUrl(m) || (m.barcodeToken || m.memberId || m.id || 'MB001').trim();
          const url = await generateQrDataUrl(token);
          return { id: m.id, url };
        })
      );

      if (isMounted && results.length > 0) {
        setQrMap((prev) => {
          const updated = { ...prev };
          let changed = false;
          for (const item of results) {
            if (updated[item.id] !== item.url) {
              updated[item.id] = item.url;
              changed = true;
            }
          }
          return changed ? updated : prev;
        });
      }
    };

    generateMissing();

    return () => {
      isMounted = false;
    };
  }, [activeMembersToPrint, qrMap]);

  const handlePrint = () => {
    if (activeMembersToPrint.length === 0) {
      toast.error(
        isEs ? 'Sin Miembros' : isEn ? 'No Members' : isFr ? 'Aucun Membre' : 'Pa gen Manm',
        isEs
          ? 'Por favor seleccione al menos un miembro para imprimir.'
          : isEn
          ? 'Please select at least one member to print.'
          : isFr
          ? 'Veuillez sélectionner au moins un membre pour imprimer.'
          : 'Tanpri chwazi omwen yon manm pou enprime.'
      );
      return;
    }
    toast.info(
      isEs ? 'Hoja de Impresión CR80 Abierta' : isEn ? 'CR80 Print Dialog Opened' : isFr ? 'Feuille d’Impression CR80 Ouverte' : 'Fèy Enpresyon CR80 Louvri',
      isEs
        ? 'Envíe el documento a su impresora o guarde como PDF.'
        : isEn
        ? 'Send document to your printer or save as PDF.'
        : isFr
        ? 'Envoyez le document à l’imprimante ou enregistrez en PDF.'
        : 'Voye dokiman an sou enprimant ou oswa anrejistre kòm PDF.'
    );
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 50);
    });
  };

  const handleStartExportPdf = async () => {
    if (!cardsContainerRef.current) {
      toast.error(
        isEs ? 'Error de Documento' : isEn ? 'Document Error' : isFr ? 'Erreur de Document' : 'Erè Dokiman',
        isEs
          ? 'El área de previsualización de tarjetas aún no está lista.'
          : isEn
          ? 'The card preview container is not ready.'
          : isFr
          ? 'La zone de prévisualisation des cartes n’est pas prête.'
          : 'Zòn previzyalizasyon kat yo poko pare.'
      );
      return;
    }
    if (activeMembersToPrint.length === 0) {
      toast.error(
        isEs ? 'Sin Miembros' : isEn ? 'No Members' : isFr ? 'Aucun Membre' : 'Pa gen Manm',
        isEs
          ? 'Por favor seleccione al menos un miembro para exportar.'
          : isEn
          ? 'Please select at least one member to export.'
          : isFr
          ? 'Veuillez sélectionner au moins un membre pour exporter.'
          : 'Tanpri chwazi omwen yon manm pou ekspòte.'
      );
      return;
    }

    try {
      setIsExportingPdf(true);
      setPdfProgress({
        current: 0,
        total: activeMembersToPrint.length * (layoutSide === 'both' ? 2 : 1),
        percent: 0,
        stage: isEs
          ? 'Inicializando motor PDF...'
          : isEn
          ? 'Initializing PDF engine...'
          : isFr
          ? 'Initialisation du moteur PDF...'
          : 'Inisyalizasyon motè PDF...',
      });

      const pdfBlob = await exportCardsToPdf(cardsContainerRef.current, {
        church,
        members: activeMembersToPrint,
        side: layoutSide,
        layout: pdfLayout,
        showCropMarks,
        onProgress: (prog) => {
          setPdfProgress(prog);
        },
      });

      // Generate downloadable file URL
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      const cleanChurchCode = (church.code || 'LEGLIZ').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Badges_Cards_${cleanChurchCode}_${pdfLayout}_${dateStr}.pdf`;

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        isEs ? '¡Exportación PDF Exitosa!' : isEn ? 'PDF Export Succeeded!' : isFr ? 'Exportation PDF Réussie !' : 'Ekspòtasyon PDF Reyisi !',
        isEs
          ? `Archivo ${filename} descargado exitosamente (${activeMembersToPrint.length} miembros).`
          : isEn
          ? `File ${filename} downloaded successfully (${activeMembersToPrint.length} members).`
          : isFr
          ? `Fichier ${filename} téléchargé avec succès (${activeMembersToPrint.length} membres).`
          : `Fichye ${filename} telechaje avèk siksè (${activeMembersToPrint.length} manm).`
      );

      setShowExportModal(false);
    } catch (err: any) {
      console.error('Erè ekspòtasyon PDF:', err);
      toast.error(
        isEs ? 'Error de Exportación' : isEn ? 'Export Error' : isFr ? 'Erreur d’Exportation' : 'Erè Ekspòtasyon',
        err?.message || (isEs ? 'Ocurrió un error al generar el PDF.' : isEn ? 'An error occurred while generating the PDF.' : isFr ? 'Une erreur est survenue lors de la génération du PDF.' : 'Yon erè rive pandan jenerasyon PDF la.')
      );
    } finally {
      setIsExportingPdf(false);
      setPdfProgress(null);
    }
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error(
        isEs ? 'Archivo Demasiado Grande' : isEn ? 'File Too Large' : isFr ? 'Fichier Trop Volumineux' : 'Fichye Twò Gwo',
        isEs
          ? 'Por favor elija una imagen menor a 4MB.'
          : isEn
          ? 'Please choose an image smaller than 4MB.'
          : isFr
          ? 'Veuillez choisir une image inférieure à 4 Mo.'
          : 'Tanpri chwazi yon imaj siyati ki mwens pase 4MB.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSignatureUrl(dataUrl);
      const updatedChurch: Church = {
        ...church,
        signatureUrl: dataUrl,
      };
      saveChurch(updatedChurch);
      toast.success(
        isEs ? '¡Firma Electrónica Guardada!' : isEn ? 'Electronic Signature Saved!' : isFr ? 'Signature Électronique Enregistrée !' : 'Siyati Elektwonik Anrejistre !',
        isEs
          ? 'La firma fue cargada y aplicada a todas las tarjetas.'
          : isEn
          ? 'Signature uploaded and applied across all member cards.'
          : isFr
          ? 'La signature a été téléversée et appliquée sur toutes les cartes.'
          : 'Siyati a monte e li aplike sou tout kat yo kounye a.'
      );
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDrawnSignature = (dataUrl: string) => {
    setSignatureUrl(dataUrl);
    const updatedChurch: Church = {
      ...church,
      signatureUrl: dataUrl,
    };
    saveChurch(updatedChurch);
    toast.success(
      isEs ? '¡Firma Dibujada Guardada!' : isEn ? 'Drawn Signature Saved!' : isFr ? 'Signature Tracée Enregistrée !' : 'Siyati Trase a Anrejistre !',
      isEs
        ? 'Su firma electrónica dibujada se aplicó a todas las tarjetas.'
        : isEn
        ? 'Your hand-drawn signature was applied across all cards.'
        : isFr
        ? 'Votre signature manuscrite a été appliquée sur toutes les cartes.'
        : 'Siyati elektwonik ou fèk ekri a aplike sou tout kat yo kounye a.'
    );
  };

  const handleRemoveSignature = () => {
    setSignatureUrl('');
    if (signatureFileInputRef.current) {
      signatureFileInputRef.current.value = '';
    }
    const updatedChurch: Church = {
      ...church,
      signatureUrl: undefined,
    };
    saveChurch(updatedChurch);
    toast.info(
      isEs ? 'Firma Eliminada' : isEn ? 'Signature Removed' : isFr ? 'Signature Supprimée' : 'Siyati Retire',
      isEs
        ? 'Las tarjetas usarán la firma de texto estándar.'
        : isEn
        ? 'Cards will use standard text signature.'
        : isFr
        ? 'Les cartes utiliseront la signature textuelle standard.'
        : 'Kat yo ap itilize siyati tèks estanda a.'
    );
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.length === churchMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(churchMembers.map((m) => m.id));
    }
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredBatchMembers = useMemo(() => {
    const query = batchSearch.trim().toLowerCase();
    if (!query) return churchMembers;
    return churchMembers.filter(
      (m) =>
        (m.fullName || '').toLowerCase().includes(query) ||
        (m.memberId || '').toLowerCase().includes(query) ||
        (m.department || '').toLowerCase().includes(query)
    );
  }, [churchMembers, batchSearch]);

  const filteredStyles = useMemo(() => {
    const query = styleSearch.trim().toLowerCase();
    return CARD_STYLES.filter((s) => {
      const matchesCategory = styleCategory === 'all' || s.category === styleCategory;
      const matchesSearch =
        query === '' ||
        (s.name || '').toLowerCase().includes(query) ||
        (s.category || '').toLowerCase().includes(query) ||
        (s.tag || '').toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [styleCategory, styleSearch]);

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  return (
    <div
      className={
        fullPage
          ? 'w-full pb-12 print:pb-0'
          : 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible'
      }
    >
      {/* Container Dialog or Page */}
      <div
        className={
          fullPage
            ? 'relative w-full bg-[#0B0F19] border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[85vh] print:border-none print:shadow-none print:bg-white print:w-full print:rounded-none'
            : 'relative w-full max-w-6xl bg-[#0B0F19] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:w-full print:rounded-none'
        }
      >
        {/* MODAL / PAGE HEADER (Hidden in Print) */}
        <div className="bg-[#131B2E] px-4 sm:px-6 py-4 border-b border-slate-700/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            {fullPage && (
              <button
                type="button"
                id="btn-cards-back-to-members"
                onClick={handleGoBack}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm mr-1"
                title={isEs ? 'Volver a Miembros' : isEn ? 'Back to Members' : isFr ? 'Retour aux Membres' : 'Tounen nan Lis Manm'}
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">
                  {isEs ? 'Volver a Miembros' : isEn ? 'Back to Members' : isFr ? 'Retour aux Membres' : 'Tounen nan Lis Manm'}
                </span>
                <span className="sm:hidden">{isEs ? 'Volver' : isEn ? 'Back' : isFr ? 'Retour' : 'Tounen'}</span>
              </button>
            )}

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center text-amber-300">
                <Printer className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  {isEs ? 'Impresión & Personalización de Carnets' : isEn ? 'Member Card Printing & Customization' : isFr ? 'Impression & Personnalisation des Cartes' : 'Enpresyon & Pèsonalizasyon Kat Manm'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold tracking-wider uppercase">
                  CR80 (85.6 × 54 mm)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                  {isEs ? '100+ Diseños Pro' : isEn ? '100+ Pro Styles' : isFr ? '100+ Styles Pro' : '100+ Stil Pro'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isEs
                  ? `Elija entre más de 100 estilos profesionales, personalice textos y códigos QR para ${church.name}.`
                  : isEn
                  ? `Choose from 100+ professional styles, customize text and QR codes for ${church.name}.`
                  : isFr
                  ? `Choisissez parmi plus de 100 styles professionnels, personnalisez textes et codes QR pour ${church.name}.`
                  : `Chwazi pami 100 estil pwofesyonèl, pèsonalize tèks ak kòd QR pou ${church.name}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-toggle-customizer"
              onClick={() => setShowCustomizer(!showCustomizer)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showCustomizer
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">
                {isEs ? 'Personalizar Textos y Formato' : isEn ? 'Customize Text & Layout' : isFr ? 'Personnaliser Textes & Format' : 'Pèsonalize Tèks & Fòma'}
              </span>
              <span className="sm:hidden">
                {isEs ? 'Personalizar' : isEn ? 'Customize' : isFr ? 'Personnaliser' : 'Pèsonalize'}
              </span>
            </button>

            <button
              type="button"
              id="btn-open-export-pdf-modal"
              onClick={() => setShowExportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer border border-indigo-400/30"
              title={isEs ? 'Exportar tarjetas en PDF HD' : isEn ? 'Export cards to HD PDF' : isFr ? 'Exporter les cartes en PDF HD' : 'Ekspòte tout kat manm yo an PDF HD pare pou enprimri ekstèn oswa enprimant plastik PVC'}
            >
              <Download className="w-4 h-4 text-indigo-200" />
              <span>
                {isEs
                  ? `Exportar PDF (${activeMembersToPrint.length})`
                  : isEn
                  ? `Export PDF (${activeMembersToPrint.length})`
                  : isFr
                  ? `Exporter PDF (${activeMembersToPrint.length})`
                  : `Ekspòte PDF (${activeMembersToPrint.length})`}
              </span>
            </button>

            <button
              type="button"
              id="btn-trigger-print-modal"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>
                {isEs
                  ? `Imprimir (${activeMembersToPrint.length})`
                  : isEn
                  ? `Print (${activeMembersToPrint.length})`
                  : isFr
                  ? `Imprimer (${activeMembersToPrint.length})`
                  : `Enprime (${activeMembersToPrint.length})`}
              </span>
            </button>
            <button
              type="button"
              id="btn-close-print-modal"
              onClick={handleGoBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label={isEs ? 'Cerrar' : isEn ? 'Close' : isFr ? 'Fermer' : 'Fèmen'}
              title={fullPage ? (isEs ? 'Volver' : isEn ? 'Back' : isFr ? 'Retour' : 'Tounen') : (isEs ? 'Cerrar' : isEn ? 'Close' : isFr ? 'Fermer' : 'Fèmen')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP CONTROLS & STYLE SELECTOR BAR (Hidden in Print) */}
        <div className="bg-[#0E1524] px-5 py-3 border-b border-slate-800 shrink-0 print:hidden space-y-3">
          {/* Quick Row: Layout Side + Crop Marks + Batch Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Layout Side Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                {isEs ? 'Caras a Imprimir:' : isEn ? 'Sides to Print:' : isFr ? 'Faces à Imprimer :' : 'Fas pou Enprime:'}
              </span>
              <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setLayoutSide('both')}
                  className={`py-1 px-2.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    layoutSide === 'both'
                      ? 'bg-indigo-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isEs ? 'Frente + Reverso (2 Caras)' : isEn ? 'Front + Back (2 Sides)' : isFr ? 'Recto + Verso (2 Faces)' : 'Rèkto + Vèso (2 Fas)'}
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutSide('front')}
                  className={`py-1 px-2.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    layoutSide === 'front'
                      ? 'bg-indigo-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isEs ? 'Frente (Recto)' : isEn ? 'Front (Recto)' : isFr ? 'Face Avant (Recto)' : 'Devan (Rèkto)'}
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutSide('back')}
                  className={`py-1 px-2.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    layoutSide === 'back'
                      ? 'bg-indigo-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isEs ? 'Reverso (Verso)' : isEn ? 'Back (Verso)' : isFr ? 'Face Arrière (Verso)' : 'Dèyè (Vèso)'}
                </button>
              </div>
            </div>

            {/* Crop Marks & Batch Toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCropMarks}
                  onChange={(e) => setShowCropMarks(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
                />
                <span className="text-[11px] flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-amber-400" />
                  {isEs ? 'Guías de corte (Crop marks)' : isEn ? 'Crop marks (Cutting guides)' : isFr ? 'Repères de coupe (Crop marks)' : 'Gid pou koupe (Crop marks)'}
                </span>
              </label>

              {churchMembers.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsBatchMode(!isBatchMode)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    isBatchMode
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {isEs
                      ? `Selección (${selectedMemberIds.length}/${churchMembers.length})`
                      : isEn
                      ? `Select Members (${selectedMemberIds.length}/${churchMembers.length})`
                      : isFr
                      ? `Sélection Membres (${selectedMemberIds.length}/${churchMembers.length})`
                      : `Seleksyon Manm (${selectedMemberIds.length}/${churchMembers.length})`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 100+ STYLES GALLERY TABS & SEARCH */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 shrink-0 flex items-center gap-1 mr-1">
                  <Palette className="w-3.5 h-3.5" />
                  {isEs ? 'Estilos Pro' : isEn ? 'Pro Styles' : isFr ? 'Styles Pro' : 'Stil Pro'} ({CARD_STYLES.length}):
                </span>
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setStyleCategory(cat.id)}
                    className={`px-2.5 py-0.8 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      styleCategory === cat.id
                        ? 'bg-amber-400 text-slate-950 font-black shadow'
                        : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {cat.labels[activeLang] || cat.labels.ht}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-52 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder={isEs ? 'Buscar estilo...' : isEn ? 'Search styles...' : isFr ? 'Rechercher un style...' : 'Chèche pami 100 stil...'}
                  value={styleSearch}
                  onChange={(e) => setStyleSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Horizontal Scrollable Swatch Gallery */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
              {filteredStyles.map((style) => {
                const isSelected = style.id === selectedStyleId;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyleId(style.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div
                      className={`w-7 h-5 rounded-md border overflow-hidden shadow-inner flex items-center justify-center text-[8px] font-bold ${style.bgGradient} ${
                        style.isDark ? 'border-white/20 text-white' : 'border-slate-400 text-black'
                      }`}
                    >
                      ✝
                    </div>
                    <div className="pr-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-white max-w-[130px] truncate block">
                          {style.name}
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[9px] text-slate-500 block truncate max-w-[120px]">
                        {style.tag} • {style.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ADVANCED CUSTOMIZATION DRAWER (If Open) */}
        {showCustomizer && (
          <div className="bg-[#101827] border-b border-slate-800 p-4 shrink-0 print:hidden space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                {isEs ? 'Personalización Detallada del Carnet' : isEn ? 'Detailed Card Customization' : isFr ? 'Personnalisation Détaillée de la Carte' : 'Pèsonalizasyon Detaye Kat la'}
              </h4>
              <span className="text-[11px] text-slate-400">
                {isEs
                  ? 'Todos los cambios se aplican en tiempo real en la vista previa abajo'
                  : isEn
                  ? 'All changes apply in real time to the live preview below'
                  : isFr
                  ? 'Toutes les modifications s’appliquent en temps réel sur l’aperçu ci-dessous'
                  : 'Tout chanjman yo aplike an tan reyèl sou kat la anba a'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Header Title Customization */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  {isEs ? 'Texto de Encabezado (Header):' : isEn ? 'Header Title:' : isFr ? 'Texte d’En-tête (Header) :' : 'Tèks An-tèt (Header):'}
                </label>
                <input
                  type="text"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Badge Text Customization */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  {isEs ? 'Etiqueta de Insignia:' : isEn ? 'Badge Label:' : isFr ? 'Étiquette du Badge :' : 'Etikèt Badj (Titilè):'}
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <select
                    onChange={(e) => e.target.value && setBadgeText(e.target.value)}
                    className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-xs cursor-pointer"
                  >
                    <option value="">{isEs ? 'Elegir...' : isEn ? 'Choose...' : isFr ? 'Choisir...' : 'Chwazi...'}</option>
                    <option value={isEs ? 'TITULAR • OFICIAL' : isEn ? 'HOLDER • OFFICIAL' : isFr ? 'TITULAIRE • OFFICIEL' : 'TITILÈ • OFISYÈL'}>
                      {isEs ? 'TITULAR' : isEn ? 'HOLDER' : isFr ? 'TITULAIRE' : 'TITILÈ'}
                    </option>
                    <option value={isEs ? 'MIEMBRO ACTIVO' : isEn ? 'ACTIVE MEMBER' : isFr ? 'MEMBRE ACTIF' : 'MANM AKTIF'}>
                      {isEs ? 'MIEMBRO ACTIVO' : isEn ? 'ACTIVE MEMBER' : isFr ? 'MEMBRE ACTIF' : 'MANM AKTIF'}
                    </option>
                    <option value={isEs ? 'LIDERAZGO' : isEn ? 'LEADERSHIP' : isFr ? 'DIRIGEANT' : 'DIRIJAN'}>
                      {isEs ? 'LIDERAZGO' : isEn ? 'LEADERSHIP' : isFr ? 'DIRIGEANT' : 'DIRIJAN'}
                    </option>
                    <option value={isEs ? 'LÍDER JUVENIL' : isEn ? 'YOUTH LEADER' : isFr ? 'LEADER JEUNESSE' : 'LIDÈ JÈN'}>
                      {isEs ? 'LÍDER JUVENIL' : isEn ? 'YOUTH LEADER' : isFr ? 'LEADER JEUNESSE' : 'LIDÈ JÈN'}
                    </option>
                    <option value={isEs ? 'DIÁSPORA' : isEn ? 'DIASPORA' : isFr ? 'DIASPORA' : 'DIASPORA'}>DIASPORA</option>
                  </select>
                </div>
              </div>

              {/* Scripture / Verse Choice */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  {isEs ? 'Versículo / Lema en Reverso:' : isEn ? 'Scripture / Motto on Back:' : isFr ? 'Verset / Devise au Verso :' : 'Vèsè / Deviz nan Vèso:'}
                </label>
                <input
                  type="text"
                  value={scriptureText}
                  onChange={(e) => setScriptureText(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Photo Shape & Watermark */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  {isEs ? 'Formato de Foto y Marca de Agua:' : isEn ? 'Photo Shape & Watermark:' : isFr ? 'Forme de Photo & Filigrane :' : 'Fòma Foto & Filigran:'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={photoShape}
                    onChange={(e) => setPhotoShape(e.target.value as PhotoShape)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-xs cursor-pointer"
                  >
                    <option value="rounded">
                      {isEs ? 'Rectángulo Redondeado' : isEn ? 'Rounded Rectangle' : isFr ? 'Rectangle Arrondi' : 'Foto Kare Awondi'}
                    </option>
                    <option value="circle">
                      {isEs ? 'Circular' : isEn ? 'Circle' : isFr ? 'Circulaire' : 'Foto Wonn'}
                    </option>
                    <option value="shield">
                      {isEs ? 'Insignia Escudo' : isEn ? 'Shield Badge' : isFr ? 'Écusson' : 'Foto Badj Boukliye'}
                    </option>
                  </select>

                  <select
                    value={watermarkChoice}
                    onChange={(e) => setWatermarkChoice(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-xs cursor-pointer"
                  >
                    <option value="auto">
                      {isEs ? 'Símbolo: Auto' : isEn ? 'Symbol: Auto' : isFr ? 'Symbole : Auto' : 'Senbòl: Otomatik'}
                    </option>
                    <option value="cross">✝ {isEs ? 'Cruz' : isEn ? 'Cross' : isFr ? 'Croix' : 'Lakwa'}</option>
                    <option value="dove">🕊️ {isEs ? 'Paloma' : isEn ? 'Dove' : isFr ? 'Colombe' : 'Pijon'}</option>
                    <option value="bible">📖 {isEs ? 'Biblia' : isEn ? 'Bible' : isFr ? 'Bible' : 'Labib'}</option>
                    <option value="crown">👑 {isEs ? 'Corona' : isEn ? 'Crown' : isFr ? 'Couronne' : 'Kouwòn'}</option>
                    <option value="shield">🛡️ {isEs ? 'Escudo' : isEn ? 'Shield' : isFr ? 'Bouclier' : 'Boukliye'}</option>
                    <option value="star">✦ {isEs ? 'Estrella' : isEn ? 'Star' : isFr ? 'Étoile' : 'Zetwal'}</option>
                    <option value="church">⛪ {isEs ? 'Iglesia' : isEn ? 'Church' : isFr ? 'Église' : 'Legliz'}</option>
                  </select>
                </div>
              </div>

              {/* Badge Domain Style (5 Styles) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  {isEs
                    ? 'Estilo de Dominio / Depto (5 Formatos):'
                    : isEn
                    ? 'Domain / Dept Format (5 Styles):'
                    : isFr
                    ? 'Format Domaine / Dépt (5 Styles) :'
                    : 'Fòma Domèn / Depatman (5 Stil):'}
                </label>
                <select
                  value={badgeDomainStyle}
                  onChange={(e) => {
                    const s = e.target.value as BadgeDomainStyleId;
                    setBadgeDomainStyle(s);
                    saveBadgeDomainStyle(s);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 text-xs font-bold cursor-pointer focus:outline-none focus:border-amber-400"
                >
                  {BADGE_DOMAIN_STYLES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.icon} {st.name[activeLang] || st.name.ht}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Electronic Signature Row */}
            <div className="pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {isEs
                        ? 'Firma Electrónica Autorizada (Para todas las tarjetas)'
                        : isEn
                        ? 'Authorized Electronic Signature (For all cards)'
                        : isFr
                        ? 'Signature Électronique Autorisée (Pour toutes les cartes)'
                        : 'Siyati Elektwonik Otorize (Pou tout Kat & Badj)'}
                    </span>
                    {signatureUrl ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {isEs ? 'Activa' : isEn ? 'Active' : isFr ? 'Activée' : 'Aktive'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                        {isEs ? 'Texto por defecto' : isEn ? 'Default text' : isFr ? 'Texte par défaut' : 'Tèks pa defo'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEs
                      ? 'Cargue una imagen de firma (PNG o JPG) o dibújela en pantalla para aplicarla automáticamente en todas las tarjetas.'
                      : isEn
                      ? 'Upload a signature image (transparent PNG or JPG) or draw directly on screen to apply across all cards.'
                      : isFr
                      ? 'Téléversez une image de signature (PNG transparent ou JPG) ou tracez-la directement pour l’appliquer sur toutes les cartes.'
                      : 'Telechaje imaj siyati admin / pastè a (PNG transparan oswa JPG) oswa trase l sou ekran an pou l monte otomatikman sou tout kat yo.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={signatureFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleUploadSignature}
                  className="hidden"
                  id="card-signature-upload-input"
                />

                {signatureUrl ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Mini signature preview */}
                    <div className="h-8 px-2.5 bg-white/95 rounded-lg border border-slate-600 flex items-center justify-center shadow-inner">
                      <img
                        src={signatureUrl}
                        alt="Siyati Elektwonik"
                        className="h-6 max-w-[70px] object-contain"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-400/30 hover:from-amber-500/30 hover:to-amber-400/40 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                      title={isEs ? 'Volver a dibujar la firma' : isEn ? 'Redraw signature' : isFr ? 'Retracer la signature' : 'Retrase siyati a dirèkteman'}
                    >
                      <PenTool className="w-3 h-3 text-amber-400" />
                      <span>{isEs ? 'Redibujar' : isEn ? 'Redraw' : isFr ? 'Retracer' : 'Retrase'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => signatureFileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title={isEs ? 'Cambiar imagen' : isEn ? 'Change image' : isFr ? 'Changer d’image' : 'Chanje imaj'}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{isEs ? 'Cambiar' : isEn ? 'Change' : isFr ? 'Changer' : 'Chanje'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveSignature}
                      className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 text-xs cursor-pointer transition-colors"
                      title={isEs ? 'Eliminar firma' : isEn ? 'Remove signature' : isFr ? 'Supprimer signature' : 'Retire siyati a'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      id="btn-draw-card-signature"
                      onClick={() => setShowSignaturePad(true)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{isEs ? '✍️ Dibujar Firma' : isEn ? '✍️ Draw Directly' : isFr ? '✍️ Tracer Direct' : '✍️ Ekri Dirèk'}</span>
                    </button>

                    <button
                      type="button"
                      id="btn-upload-card-signature"
                      onClick={() => signatureFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isEs ? 'Subir Imagen' : isEn ? 'Upload Image' : isFr ? 'Téléverser' : 'Upload Imaj'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BATCH SELECTION DRAWER */}
        {isBatchMode && (
          <div className="bg-[#0F172A] border-b border-slate-800 p-3 sm:px-5 shrink-0 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  {isEs
                    ? `Selección de Miembros (${selectedMemberIds.length}/${churchMembers.length})`
                    : isEn
                    ? `Member Selection (${selectedMemberIds.length}/${churchMembers.length})`
                    : isFr
                    ? `Sélection des Membres (${selectedMemberIds.length}/${churchMembers.length})`
                    : `Seleksyon Manm pou Enprime an Pakèt (${selectedMemberIds.length}/${churchMembers.length})`}
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  {selectedMemberIds.length === churchMembers.length
                    ? (isEs ? 'Deseleccionar todos' : isEn ? 'Deselect all' : isFr ? 'Désélectionner tout' : 'Deseleksyone tout')
                    : (isEs ? 'Seleccionar todos' : isEn ? 'Select all' : isFr ? 'Sélectionner tout' : 'Chwazi tout')}
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder={isEs ? 'Buscar miembros...' : isEn ? 'Search members...' : isFr ? 'Rechercher des membres...' : 'Chèche manm...'}
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {filteredBatchMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMemberSelection(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                        isSelected ? 'bg-amber-400 text-slate-950' : 'border border-slate-600'
                      }`}
                    >
                      {isSelected && '✓'}
                    </span>
                    <span>{m.fullName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({m.memberId})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PRINT NOTICE BANNER (Hidden in Print) */}
        <div className="bg-slate-900/80 px-5 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0 print:hidden">
          <div className="flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isEs ? (
                <>
                  <strong>Consejo de Impresión CR80:</strong> En la ventana de diálogo de su navegador, active <em>"Gráficos de fondo"</em> para que los colores y degradados se impriman con calidad nítida.
                </>
              ) : isEn ? (
                <>
                  <strong>CR80 Printing Tip:</strong> In your browser print dialog, enable <em>"Background graphics"</em> to ensure gradients and rich badges print with high precision.
                </>
              ) : isFr ? (
                <>
                  <strong>Conseil d’Impression CR80 :</strong> Dans la fenêtre d’impression du navigateur, cochez <em>"Graphiques d’arrière-plan"</em> pour un rendu professionnel des dégradés.
                </>
              ) : (
                <>
                  <strong>Konsèy Enpresyon CR80:</strong> Nan fenèt enpresyon navigatè a, asire w ou chwazi <em>"Background graphics"</em> pou tout koulè ak gradyan soti pwofesyonèl.
                </>
              )}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-bold">
            {isEs ? 'Diseño Activo' : isEn ? 'Active Style' : isFr ? 'Style Actif' : 'Stil Chwazi'}: {currentStyle.name}
          </span>
        </div>

        {/* MAIN PRINT PREVIEW & PRINTABLE CANVAS */}
        <div
          className={`p-4 sm:p-8 bg-[#070A11] print:bg-white print:p-0 print:overflow-visible print:m-0 ${
            fullPage ? 'min-h-[550px] flex-1' : 'overflow-y-auto flex-1'
          }`}
        >
          {activeMembersToPrint.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-sm">
                {isEs
                  ? 'No hay ningún miembro seleccionado.'
                  : isEn
                  ? 'No member currently selected.'
                  : isFr
                  ? 'Aucun membre sélectionné.'
                  : 'Pa gen okenn manm seleksyone.'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isEs
                  ? 'Por favor seleccione al menos un miembro para generar el carnet.'
                  : isEn
                  ? 'Please select at least one member to generate cards.'
                  : isFr
                  ? 'Veuillez sélectionner au moins un membre pour générer les cartes.'
                  : 'Tanpri chwazi omwen yon manm pou jenere kat fizik.'}
              </p>
            </div>
          ) : (
            <div
              ref={cardsContainerRef}
              className="flex flex-col gap-10 print:gap-6 items-center justify-center"
            >
              {activeMembersToPrint.map((member, idx) => (
                <PrintableCardUnit
                  key={member.id}
                  member={member}
                  church={church}
                  qrUrl={qrMap[member.id] || ''}
                  styleDef={currentStyle}
                  side={layoutSide}
                  showCropMarks={showCropMarks}
                  pageBreak={idx < activeMembersToPrint.length - 1}
                  headerTitle={headerTitle}
                  badgeText={badgeText}
                  scriptureText={scriptureText}
                  photoShape={photoShape}
                  watermarkChoice={watermarkChoice}
                  badgeDomainStyle={badgeDomainStyle}
                  signatureUrl={signatureUrl}
                  signerTitle={signerTitle}
                  language={activeLang}
                />
              ))}
            </div>
          )}
        </div>

        {/* MODAL EXPORT PDF */}
        {showExportModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F172A] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isEs ? 'Exportar Carnets en PDF (HD)' : isEn ? 'Export Badges to PDF (HD)' : isFr ? 'Exporter les Badges en PDF (HD)' : 'Ekspòte Badge an PDF (HD)'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isEs
                        ? 'Crea un documento PDF listo para imprimir en centros de copiado o impresoras de tarjetas de PVC.'
                        : isEn
                        ? 'Generate high-resolution PDF document ready for commercial printing or PVC card printers.'
                        : isFr
                        ? 'Générez un document PDF haute résolution prêt pour imprimerie ou imprimante PVC.'
                        : 'Kreye yon fichye PDF pare pou enprimri ekstèn oswa machin kat plastik PVC.'}
                    </p>
                  </div>
                </div>
                {!isExportingPdf && (
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* PDF EXPORT CONFIGURATION */}
              <div className="space-y-4">
                {/* Layout Format Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    {isEs ? 'Formato de Página PDF:' : isEn ? 'PDF Page Format:' : isFr ? 'Format de Page PDF :' : 'Fòma Paj PDF la:'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPdfLayout('a4_grid')}
                      disabled={isExportingPdf}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        pdfLayout === 'a4_grid'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-xs">
                          {isEs ? 'Hoja A4 (Grilla)' : isEn ? 'A4 Sheet (Grid)' : isFr ? 'Feuille A4 (Grille)' : 'Fèy A4 (Grid)'}
                        </span>
                        {pdfLayout === 'a4_grid' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isEs ? '10 tarjetas por hoja (2x5)' : isEn ? '10 cards per page (2x5)' : isFr ? '10 cartes par page (2x5)' : '10 Kat pa paj (2x5)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPdfLayout('letter_grid')}
                      disabled={isExportingPdf}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        pdfLayout === 'letter_grid'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-xs">
                          {isEs ? 'Carta US (Grilla)' : isEn ? 'US Letter (Grid)' : isFr ? 'US Letter (Grille)' : 'US Letter (Grid)'}
                        </span>
                        {pdfLayout === 'letter_grid' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isEs ? '8 tarjetas por hoja (8.5x11 in)' : isEn ? '8 cards per page (8.5x11 in)' : isFr ? '8 cartes par page (8.5x11 in)' : '8 Kat pa paj (8.5x11 in)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPdfLayout('cr80_single')}
                      disabled={isExportingPdf}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        pdfLayout === 'cr80_single'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-xs">
                          {isEs ? 'Tarjeta PVC CR80' : isEn ? 'CR80 Single PVC' : isFr ? 'Carte PVC CR80' : 'CR80 Plastik'}
                        </span>
                        {pdfLayout === 'cr80_single' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isEs ? '1 por pág (Zebra, Fargo, Evolis)' : isEn ? '1 per page (Zebra, Fargo, Evolis)' : isFr ? '1 par page (Zebra, Fargo, Evolis)' : '1 Kat/Paj (Zebra, Evolis, Fargo)'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Summary Info Table */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      {isEs ? 'Cantidad de Miembros Seleccionados:' : isEn ? 'Selected Members Count:' : isFr ? 'Nombre de Membres Sélectionnés :' : 'Kantite Manm Seleksyone:'}
                    </span>
                    <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
                      {activeMembersToPrint.length} {isEs ? 'miembros' : isEn ? 'members' : isFr ? 'membres' : 'manm'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      {isEs ? 'Caras a Imprimir:' : isEn ? 'Sides to Print:' : isFr ? 'Faces à Imprimer :' : 'Fas pou Enprime:'}
                    </span>
                    <span className="font-bold text-amber-300">
                      {layoutSide === 'both'
                        ? (isEs ? 'Frente + Reverso (2 Caras)' : isEn ? 'Front + Back (2 Sides)' : isFr ? 'Recto + Verso (2 Faces)' : 'Rèkto + Vèso (2 Fas)')
                        : layoutSide === 'front'
                        ? (isEs ? 'Sólo Frente' : isEn ? 'Front Only' : isFr ? 'Recto Seulement' : 'Rèkto Sèlman')
                        : (isEs ? 'Sólo Reverso' : isEn ? 'Back Only' : isFr ? 'Verso Seulement' : 'Vèso Sèlman')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      {isEs ? 'Resolución de Impresión:' : isEn ? 'Print Resolution:' : isFr ? 'Résolution d’Impression :' : 'Rezolisyon Enpresyon:'}
                    </span>
                    <span className="font-bold text-emerald-400 font-mono">HD 300+ DPI (Ultra-Sharp)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      {isEs ? 'Marcas de Corte (Crop Marks):' : isEn ? 'Crop Marks (Cutting Guides):' : isFr ? 'Repères de Coupe (Crop Marks) :' : 'Gid pou Koupe (Crop Marks):'}
                    </span>
                    <span className="font-bold text-slate-300">
                      {showCropMarks
                        ? (isEs ? 'Sí (Activo)' : isEn ? 'Yes (Active)' : isFr ? 'Oui (Activé)' : 'Wi (Aktive)')
                        : (isEs ? 'No' : isEn ? 'No' : isFr ? 'Non' : 'Non')}
                    </span>
                  </div>
                </div>

                {/* Export Progress Bar when active */}
                {isExportingPdf && pdfProgress && (
                  <div className="space-y-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>{pdfProgress.stage}</span>
                      </span>
                      <span className="font-mono font-bold text-white">{pdfProgress.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                        style={{ width: `${pdfProgress.percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {isEs
                        ? 'Por favor espere mientras se compila el documento PDF... Esto puede tomar unos segundos para un lote grande.'
                        : isEn
                        ? 'Please wait while the PDF document compiles... This may take a few seconds for large batches.'
                        : isFr
                        ? 'Veuillez patienter pendant la compilation du document PDF... Cela peut prendre quelques secondes pour un grand lot.'
                        : 'Tanpri tann pandan dokiman PDF la ap konpile... Sa ka pran kèk segonn pou yon gwo kantite kat.'}
                    </p>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                {!isExportingPdf && (
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isEs ? 'Cancelar' : isEn ? 'Cancel' : isFr ? 'Annuler' : 'Anile'}
                  </button>
                )}

                <button
                  type="button"
                  id="btn-confirm-export-pdf"
                  onClick={handleStartExportPdf}
                  disabled={isExportingPdf || activeMembersToPrint.length === 0}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                    isExportingPdf
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 hover:scale-[1.02]'
                  }`}
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isEs
                          ? `Generando PDF (${pdfProgress?.percent || 0}%)...`
                          : isEn
                          ? `Generating PDF (${pdfProgress?.percent || 0}%)...`
                          : isFr
                          ? `Génération du PDF (${pdfProgress?.percent || 0}%)...`
                          : `N ap jenere PDF (${pdfProgress?.percent || 0}%)...`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-white" />
                      <span>
                        {isEs
                          ? `Descargar Archivo PDF (${activeMembersToPrint.length} Tarjetas)`
                          : isEn
                          ? `Download PDF File (${activeMembersToPrint.length} Cards)`
                          : isFr
                          ? `Télécharger Fichier PDF (${activeMembersToPrint.length} Cartes)`
                          : `Telechaje Fichye PDF (${activeMembersToPrint.length} Kat)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Signature Draw Modal */}
      <SignatureDrawModal
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSaveDrawnSignature}
        language={activeLang}
        title={isEs ? '✍️ Escribir Firma Electrónica Autorizada' : isEn ? '✍️ Draw Authorized Electronic Signature' : isFr ? '✍️ Tracer la Signature Électronique Autorisée' : '✍️ Ekri Siyati Elektwonik Otorize'}
        subtitle={isEs ? 'Dibuje su firma directamente para que se aplique en todas las tarjetas.' : isEn ? 'Draw your signature directly to apply across all member cards.' : isFr ? 'Tracez votre signature directement pour qu’elle s’applique sur toutes les cartes.' : 'Trase siyati ou dirèkteman. Chwazi plizyè koulè oswa koulè pèsonalize pou l parèt sou tout kat yo.'}
      />
    </div>
  );
};

// ==========================================
// SINGLE CR80 CARD UNIT COMPONENT
// Standard ISO/IEC 7810 ID-1 (CR80): 85.60 × 53.98 mm
// ==========================================
interface PrintableCardUnitProps {
  member: Member;
  church: Church;
  qrUrl: string;
  styleDef: CardStyleDefinition;
  side: CardLayoutSide;
  showCropMarks: boolean;
  pageBreak: boolean;
  headerTitle: string;
  badgeText: string;
  scriptureText: string;
  photoShape: PhotoShape;
  watermarkChoice: string;
  badgeDomainStyle?: BadgeDomainStyleId;
  signatureUrl?: string;
  signerTitle?: string;
  language?: Language;
}

const PrintableCardUnit: React.FC<PrintableCardUnitProps> = ({
  member,
  church,
  qrUrl,
  styleDef,
  side,
  showCropMarks,
  pageBreak,
  headerTitle,
  badgeText,
  scriptureText,
  photoShape,
  watermarkChoice,
  badgeDomainStyle = 'classic_pill',
  signatureUrl,
  signerTitle = 'Siyati Otorize',
  language,
}) => {
  const activeLang = language || getSavedLanguage();
  const isEs = activeLang === 'es';
  const isEn = activeLang === 'en';
  const isFr = activeLang === 'fr';

  const hasValidRnc = churchHasValidRnc(church);
  const churchRnc = getChurchRnc(church);

  const effectiveSignature = signatureUrl || church.signatureUrl;

  // Barcode generator
  const renderBarcodeLines = () => {
    const code = String(member?.barcodeToken || member?.memberId || 'MB1234');
    const bars: boolean[] = [];
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      bars.push(true, charCode % 2 === 0, charCode % 3 === 0, true, false, charCode % 5 === 0, true);
    }
    return (
      <div
        className={`flex items-center justify-center gap-[2px] h-7 px-2 py-0.5 rounded shadow-sm ${
          styleDef.isDark ? 'bg-white border border-slate-300' : 'bg-slate-100 border border-slate-300'
        }`}
      >
        {bars.slice(0, 52).map((isBar, idx) => (
          <div
            key={idx}
            className={`h-full ${isBar ? 'bg-black' : 'bg-transparent'}`}
            style={{ width: idx % 4 === 0 ? '2.5px' : '1.2px' }}
          />
        ))}
      </div>
    );
  };

  const selectedWatermark = watermarkChoice === 'auto' ? styleDef.watermark : watermarkChoice;

  const renderWatermarkSymbol = () => {
    switch (selectedWatermark) {
      case 'cross':
        return <Cross className="w-48 h-48 opacity-[0.06] text-current" />;
      case 'dove':
        return <Feather className="w-48 h-48 opacity-[0.06] text-current" />;
      case 'bible':
        return <BookOpen className="w-48 h-48 opacity-[0.06] text-current" />;
      case 'crown':
        return <Crown className="w-48 h-48 opacity-[0.06] text-current" />;
      case 'shield':
        return <Shield className="w-48 h-48 opacity-[0.06] text-current" />;
      case 'star':
        return <Star className="w-48 h-48 opacity-[0.06] text-current" />;
      case 'church':
        return <ChurchIcon className="w-48 h-48 opacity-[0.06] text-current" />;
      default:
        return <Cross className="w-48 h-48 opacity-[0.06] text-current" />;
    }
  };

  const getPhotoShapeClass = () => {
    switch (photoShape) {
      case 'circle':
        return 'rounded-full';
      case 'shield':
        return 'rounded-2xl [clip-path:polygon(50%_0%,100%_15%,100%_80%,50%_100%,0%_80%,0%_15%)]';
      case 'rounded':
      default:
        return 'rounded-xl';
    }
  };

  return (
    <div
      className={`relative flex flex-wrap items-center justify-center gap-6 print:gap-4 print:my-4 ${
        pageBreak ? 'print:break-after-page' : ''
      }`}
    >
      {/* FRONT SIDE (RÈKTO) */}
      {(side === 'both' || side === 'front') && (
        <div className="relative">
          {showCropMarks && <CropMarks />}
          <div
            data-card-face={isEs ? 'Frente' : isEn ? 'Front' : isFr ? 'Recto' : 'Rèkto'}
            data-member-name={member.fullName}
            className={`w-[85.6mm] h-[53.98mm] rounded-[3.18mm] overflow-hidden p-3.5 flex flex-col justify-between select-none shadow-2xl print:shadow-none border relative ${
              styleDef.bgGradient
            } ${styleDef.textColor} ${styleDef.accentBorder}`}
            style={{
              boxSizing: 'border-box',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          >
            {/* Watermark Background Art */}
            <div className="absolute right-0 bottom-0 pointer-events-none translate-x-12 translate-y-12">
              {renderWatermarkSymbol()}
            </div>

            {/* Header: Church Name + Logo + Title */}
            <div className={`flex items-start justify-between border-b pb-1.5 ${styleDef.headerBorder}`}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border ${
                    styleDef.badgeBg
                  } ${styleDef.accentColor} ${styleDef.accentBorder}`}
                >
                  ✝
                </div>
                <div>
                  <div className="text-[7.5px] font-black uppercase tracking-wider font-mono opacity-80 line-clamp-1">
                    {headerTitle}
                  </div>
                  <h4 className={`text-[10.5px] font-black uppercase tracking-tight leading-tight line-clamp-1 ${styleDef.accentColor}`}>
                    {church.name}
                  </h4>
                  <p className={`text-[8px] font-medium leading-none ${styleDef.subTextColor}`}>
                    {church.code}{church.city ? ` • ${church.city}` : ''}{hasValidRnc ? ` • RNC: ${churchRnc}` : ''}
                  </p>
                </div>
              </div>

              <div
                className={`px-1.5 py-0.5 rounded text-[7.5px] font-black tracking-wider uppercase border shrink-0 ${
                  styleDef.badgeBg
                } ${styleDef.badgeText} ${styleDef.accentBorder}`}
              >
                {badgeText}
              </div>
            </div>

            {/* Middle Section: Member Avatar / Details */}
            <div className="grid grid-cols-12 gap-2 items-center my-auto relative z-10">
              {/* Photo Box */}
              <div className="col-span-3 flex flex-col items-center">
                <div
                  className={`w-12 h-13 overflow-hidden flex items-center justify-center font-extrabold text-base border-2 shadow-md ${
                    styleDef.photoBorder
                  } ${getPhotoShapeClass()} ${styleDef.isDark ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}
                >
                  {member.googlePhoto || member.avatarUrl ? (
                    <img
                      src={member.googlePhoto || member.avatarUrl}
                      alt={member.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{member.fullName?.[0] || 'M'}</span>
                  )}
                </div>
                <span className={`text-[6.5px] mt-0.5 font-bold uppercase tracking-wider ${styleDef.subTextColor}`}>
                  ID: {member.memberId}
                </span>
              </div>

              {/* Name & Metadata */}
              <div className="col-span-9 space-y-0.5 pl-1">
                <div>
                  <span className={`text-[7px] uppercase font-bold tracking-wider ${styleDef.subTextColor}`}>
                    {isEs ? 'NOMBRE Y APELLIDO' : isEn ? 'FULL NAME' : isFr ? 'NOM & PRÉNOM' : 'NON & SIYATI'}
                  </span>
                  <h3 className="text-[12px] font-extrabold leading-tight truncate">
                    {member.titlePrefix ? `${member.titlePrefix} ` : ''}{member.fullName}
                  </h3>
                </div>

                <BadgeDomainDisplay
                  department={member.department}
                  role={member.role}
                  styleId={badgeDomainStyle}
                  language={activeLang}
                  isDark={styleDef.isDark}
                  accentColorClass={styleDef.accentColor}
                  badgeBgClass={styleDef.badgeBg}
                  badgeTextClass={styleDef.badgeText}
                  accentBorderClass={styleDef.accentBorder}
                  subTextColorClass={styleDef.subTextColor}
                />

                <div className="flex items-center justify-between pt-0.5">
                  <span
                    className={`font-mono text-[8.5px] font-black px-1.5 py-0.5 rounded border ${
                      styleDef.isDark
                        ? 'bg-black/60 text-amber-300 border-amber-400/30'
                        : 'bg-slate-100 text-slate-950 border-slate-300'
                    }`}
                  >
                    N°: {member.memberId}
                  </span>
                  <span className={`text-[7px] font-mono ${styleDef.subTextColor}`}>
                    {isEs ? 'Ingreso' : isEn ? 'Joined' : isFr ? 'Admis' : 'Adm'}: {member.joinedDate || '2024'}
                  </span>
                </div>

                {member.legalDocumentNumber && (
                  <div className="flex items-center justify-between text-[7px] font-mono pt-0.5">
                    <span className={`uppercase font-bold ${styleDef.subTextColor}`}>
                      {member.legalDocumentType === 'nif'
                        ? 'NIF'
                        : member.legalDocumentType === 'passeport'
                        ? (isEs ? 'PASAPORTE' : isEn ? 'PASSPORT' : isFr ? 'PASSEPORT' : 'PASIPÒ')
                        : member.legalDocumentType === 'autre'
                        ? (isEs ? 'DOCUMENTO' : isEn ? 'DOCUMENT' : isFr ? 'DOCUMENT' : 'DOKIMAN')
                        : 'CIN / NIF'}:
                    </span>
                    <span className="font-bold tracking-wider font-mono">
                      {member.legalDocumentNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Shield Seal + Pastor Verification */}
            <div
              className={`pt-1 border-t flex items-center justify-between text-[7px] ${styleDef.headerBorder} ${styleDef.subTextColor}`}
            >
              <div className="flex items-center gap-1 font-semibold">
                <ShieldCheck className={`w-2.5 h-2.5 ${styleDef.accentColor}`} />
                <span>{isEs ? 'Iglesia' : isEn ? 'Church' : isFr ? 'Église' : 'Legliz'}: {church.code}</span>
              </div>
              <span className="italic font-serif font-bold">
                {isEs ? 'Pastor' : isEn ? 'Pastor' : isFr ? 'Pasteur' : 'Pastè'}: {church.pastor || (isEs ? 'Dirección' : isEn ? 'Leadership' : isFr ? 'Direction' : 'Direksyon')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* BACK SIDE (VÈSO) */}
      {(side === 'both' || side === 'back') && (
        <div className="relative">
          {showCropMarks && <CropMarks />}
          <div
            data-card-face={isEs ? 'Reverso' : isEn ? 'Back' : isFr ? 'Verso' : 'Vèso'}
            data-member-name={member.fullName}
            className={`w-[85.6mm] h-[53.98mm] rounded-[3.18mm] overflow-hidden p-3.5 flex flex-col justify-between select-none shadow-2xl print:shadow-none border relative ${
              styleDef.bgGradient
            } ${styleDef.textColor} ${styleDef.accentBorder}`}
            style={{
              boxSizing: 'border-box',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          >
            {/* Watermark Background */}
            <div className="absolute left-0 top-0 pointer-events-none -translate-x-12 -translate-y-12">
              {renderWatermarkSymbol()}
            </div>

            {/* Top Back Header */}
            <div className={`flex items-center justify-between border-b pb-1 ${styleDef.headerBorder}`}>
              <span className={`text-[8px] font-black uppercase tracking-wider ${styleDef.accentColor}`}>
                {isEs ? 'PASE DE ASISTENCIA E IDENTIFICACIÓN' : isEn ? 'ATTENDANCE PASS & DIGITAL ID' : isFr ? 'PASS PRÉSENCE & ID ÉLECTRONIQUE' : 'PASS PREZANS & ID ELEKTWONIK'}
              </span>
              <span className={`text-[7.5px] font-mono font-bold ${styleDef.subTextColor}`}>
                {member.memberId}
              </span>
            </div>

            {/* Middle Section: QR Code + Barcode + Scripture */}
            <div className="grid grid-cols-12 gap-2 items-center my-auto relative z-10">
              {/* QR Code Container */}
              <div className="col-span-5 flex flex-col items-center">
                <div className="p-1 bg-white rounded-lg shadow border border-slate-300">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`QR Code pou ${member.fullName}`}
                      className="w-16 h-16 object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center text-[7px] text-slate-400">
                      QR Code
                    </div>
                  )}
                </div>
                <span className={`text-[6px] font-mono tracking-widest uppercase mt-0.5 font-bold ${styleDef.subTextColor}`}>
                  {isEs ? 'ESCANEAR PARA ASISTENCIA' : isEn ? 'SCAN FOR ATTENDANCE' : isFr ? 'SCANNER POUR PRÉSENCE' : 'SCAN POU PREZANS'}
                </span>
              </div>

              {/* Barcode & Church Rules / Scripture */}
              <div className="col-span-7 space-y-1 pl-1">
                {renderBarcodeLines()}
                <p className={`text-[6.8px] leading-tight italic font-serif ${styleDef.subTextColor}`}>
                  {scriptureText}
                </p>
                <div className={`text-[6px] space-y-0.2 ${styleDef.subTextColor}`}>
                  <div className="truncate">📍 {church.address || (isEs ? 'Dirección' : isEn ? 'Church Address' : isFr ? 'Adresse de l’église' : 'Adrès Legliz')}, {church.city}</div>
                  <div>📞 {church.phone || 'N/A'}{hasValidRnc ? ` • RNC: ${churchRnc}` : ''}</div>
                </div>
              </div>
            </div>

            {/* Bottom: Signature line & Legal Notice */}
            <div
              className={`pt-1 border-t flex items-center justify-between text-[6.5px] ${styleDef.headerBorder} ${styleDef.subTextColor}`}
            >
              <div className="flex flex-col justify-end min-h-[20px]">
                <span className="font-semibold text-[5.5px] uppercase tracking-wider opacity-80">
                  {signerTitle}:
                </span>
                {effectiveSignature ? (
                  <div className="h-5 flex items-center mt-0.5">
                    <img
                      src={effectiveSignature}
                      alt={isEs ? 'Firma Autorizada' : isEn ? 'Authorized Signature' : isFr ? 'Signature Autorisée' : 'Siyati Elektwonik Otorize'}
                      className="h-4 max-h-5 max-w-[80px] object-contain"
                    />
                  </div>
                ) : (
                  <span className={`font-serif italic text-[7.5px] font-bold ${styleDef.accentColor}`}>
                    {church.pastor || (isEs ? 'Dirección' : isEn ? 'Leadership' : isFr ? 'Direction' : 'Direksyon')} ✓
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="block font-bold uppercase">
                  {isEs ? 'PROPIEDAD DE LA IGLESIA' : isEn ? 'PROPERTY OF THE CHURCH' : isFr ? 'PROPRIÉTÉ DE L’ÉGLISE' : 'PWOPRIYETE LEGLIZ LA'}
                </span>
                <span className="text-[5.5px] opacity-75">
                  {isEs
                    ? 'Si encuentra esta tarjeta, por favor devuélvala a la dirección indicada arriba.'
                    : isEn
                    ? 'If found, please return this card to the church address above.'
                    : isFr
                    ? 'Si vous trouvez cette carte, veuillez la retourner à l’adresse ci-dessus.'
                    : 'Si w jwenn kat sa a, tanpri remèt li nan adrès anwo a.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SCISSOR / CROP MARKS (PRINT CUTTING GUIDES)
// ==========================================
const CropMarks: React.FC = () => (
  <div className="pointer-events-none print:block">
    <div className="absolute -top-2.5 -left-2.5 w-2.5 h-2.5 border-t border-l border-dashed border-slate-400 print:border-black" />
    <div className="absolute -top-2.5 -right-2.5 w-2.5 h-2.5 border-t border-r border-dashed border-slate-400 print:border-black" />
    <div className="absolute -bottom-2.5 -left-2.5 w-2.5 h-2.5 border-b border-l border-dashed border-slate-400 print:border-black" />
    <div className="absolute -bottom-2.5 -right-2.5 w-2.5 h-2.5 border-b border-r border-dashed border-slate-400 print:border-black" />
  </div>
);
