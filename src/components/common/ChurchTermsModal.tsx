import React, { useState } from 'react';
import { Church } from '../../types';
import {
  ShieldCheck,
  X,
  FileText,
  Lock,
  HeartHandshake,
  BadgeCheck,
  CheckCircle2,
  Building2,
  AlertCircle,
  Copy,
  Printer,
  BookOpen,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ChurchTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  church: Church;
  language?: string;
}

type TabType = 'community' | 'privacy' | 'financial' | 'security';

export const ChurchTermsModal: React.FC<ChurchTermsModalProps> = ({
  isOpen,
  onClose,
  church,
  language = 'ht',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('community');
  const toast = useToast();

  if (!isOpen) return null;

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success(
      isEs ? 'Texto Copiado' : isEn ? 'Text Copied' : isFr ? 'Texte Copié' : 'Tèks Kopye',
      isEs
        ? 'El reglamento se ha copiado al portapapeles.'
        : isEn
        ? 'Guidelines copied to clipboard.'
        : isFr
        ? 'Règlement copié dans le presse-papiers.'
        : 'Règ la kopye nan memwa aparèy ou a.'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto text-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  {isEs ? 'Estatutos y Privacidad' : isFr ? 'Règlement & Confidentialité' : isEn ? 'Rules & Privacy Policy' : 'Règlemantasyon & Vi Prive'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {church.name}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>
                  {isEs
                    ? 'Reglamento, Términos y Protección de Datos'
                    : isFr
                    ? 'Règlement Intérieur, Conditions & Vie Privée'
                    : isEn
                    ? 'Church Guidelines, Terms & Privacy Policy'
                    : 'Règlemantasyon Entèn, Kondisyon & Vi Prive'}
                </span>
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUBTABS NAVIGATION */}
        <div className="px-5 pt-3 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'community'
                ? 'border-amber-400 text-amber-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{isEs ? '1. Convivencia y Respeto' : isFr ? '1. Vie Communautaire' : isEn ? '1. Community Conduct' : '1. Règ Kominotè'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-indigo-400 text-indigo-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>{isEs ? '2. Privacidad y Datos' : isFr ? '2. Vie Privée & Données' : isEn ? '2. Privacy & Data' : '2. Vi Prive & Done'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'financial'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>{isEs ? '3. Díezmos y Finanzas' : isFr ? '3. Dîmes & Dons' : isEn ? '3. Giving & Tithes' : '3. Dîm & Donasyon'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'border-sky-400 text-sky-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{isEs ? '4. Seguridad y PIN' : isFr ? '4. Sécurité & PIN' : isEn ? '4. Security & Access' : '4. Sekirite & PIN'}</span>
          </button>
        </div>

        {/* CONTENT AREA (SCROLLABLE) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm leading-relaxed text-slate-300">
          {/* TAB 1: COMMUNITY CONDUCT */}
          {activeTab === 'community' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <HeartHandshake className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-white text-sm">
                    {isEs
                      ? 'Espíritu de Hermandad y Respeto Cristiano'
                      : isFr
                      ? 'Esprit de Fraternité et de Respect Chrétien'
                      : isEn
                      ? 'Christian Fellowship and Mutual Respect'
                      : 'Lespri Fratènite, Lapè ak Respè Kretyen'}
                  </h4>
                  <p className="text-slate-300 text-xs mt-1">
                    {isEs
                      ? 'Esta plataforma existe para edificar la iglesia local, fortalecer la comunión y glorificar a Dios en orden y santidad.'
                      : isFr
                      ? 'Cette plateforme existe pour édifier l’église locale, fortifier la communion fraternelle et glorifier Dieu dans l’ordre.'
                      : isEn
                      ? 'This platform exists to edify the local church, strengthen Christian communion, and serve God with excellence.'
                      : 'Platfòm sa a la pou edifye asanble a, ranfòse kominyon fratènèl la epi sèvi Bondye nan lòd, lapè ak sentete.'}
                  </p>
                </div>
              </div>

              {/* Specific rules list */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <h5 className="font-bold text-white flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>{isEs ? '1. Publicaciones y Comentarios Constructivos' : isFr ? '1. Publications & Commentaires Constructifs' : isEn ? '1. Constructive Interactions' : '1. Kòmantè ak Entèraksyon ki Edifye'}</span>
                  </h5>
                  <p className="text-slate-300 text-xs">
                    {isEs
                      ? 'Todo comentario en los anuncios debe ser edificante, respetuoso y acorde con los valores bíblicos. No se toleran palabras ofensivas, discusiones divisivas ni ataques personales.'
                      : isFr
                      ? 'Tout commentaire sur les annonces doit être édifiant, respectueux et conforme aux valeurs de l’Évangile. Aucun propos injurieux ou divisionniste n’est toléré.'
                      : isEn
                      ? 'All comments and reactions on church announcements must be uplifting, respectful, and aligned with Christian principles. Disrespectful behavior is prohibited.'
                      : 'Tout kòmantè ak reyaksyon sou anons legliz la dwe fèt nan lespri respè, ankourajman ak edifikasyon. Pa gen plas pou jouman, diskisyon initil oswa divizyon.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <h5 className="font-bold text-white flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>{isEs ? '2. Fidelidad a la Iglesia Local' : isFr ? '2. Engagement et Ponctualité' : isEn ? '2. Active Participation' : '2. Angajman ak Patisipasyon Nan Sèvis'}</span>
                  </h5>
                  <p className="text-slate-300 text-xs">
                    {isEs
                      ? 'Se anima a cada miembro a participar fielmente en los cultos, vigilias, estudios bíblicos y actividades programadas por el liderazgo pastoral.'
                      : isFr
                      ? 'Chaque membre est encouragé à participer fidèlement aux cultes, prières et activités programmées par la direction pastorale.'
                      : isEn
                      ? 'Members are encouraged to faithfully attend services, prayer meetings, and ministries organized by the pastoral leadership.'
                      : 'Chak manm ankouraje pou yo prezan nan tout kil, priyè, etid biblik ak aktivite kominotè komite pastoral la òganize.'}
                  </p>
                </div>

                {church.churchRules?.communityGuidelines && (
                  <div className="p-4 rounded-xl bg-slate-800/90 border border-amber-400/40 text-xs text-slate-200">
                    <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span>{isEs ? 'Reglamento Específico de Esta Iglesia:' : 'Règleman Espesifik Legliz Sa a:'}</span>
                    </div>
                    <p className="whitespace-pre-line">{church.churchRules.communityGuidelines}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY & DATA PROTECTION */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3">
                <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-white text-sm">
                    {isEs
                      ? 'Compromiso de Privacidad y Protección de Datos'
                      : isFr
                      ? 'Confidentialité et Protection des Données Personnelles'
                      : isEn
                      ? 'Strict Member Privacy & Confidentiality'
                      : 'Pwoteksyon Done & Respè Vi Prive Manm yo'}
                  </h4>
                  <p className="text-slate-300 text-xs mt-1">
                    {isEs
                      ? 'Sus datos personales (teléfono, dirección, registro de asistencia, código de membresía) son estrictamente confidenciales y de uso exclusivo de la iglesia.'
                      : isFr
                      ? 'Vos données personnelles (téléphone, adresse, présences, carte de membre) sont strictement confidentielles et réservées à l’administration de l’église.'
                      : isEn
                      ? 'Your personal data (phone, address, attendance records, member ID) is strictly confidential and used solely for ministry management.'
                      : 'Enfòmasyon pèsonèl ou (telefòn, adrès, rapò prezans, kat manm) rete 100% konfidansyèl e rezève sèlman pou jesyon eklezyastik legliz la.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <h5 className="font-bold text-white flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>{isEs ? '1. Ninguna Venta o Cesión a Terceros' : isFr ? '1. Aucune Vente à des Tiers' : isEn ? '1. No Third-Party Commercial Sharing' : '1. Pa Gen Okenn Done k ap Vann oswa Pataje'}</span>
                  </h5>
                  <p className="text-slate-300 text-xs">
                    {isEs
                      ? 'La información de los miembros jamás será vendida, alquilada ni compartida con empresas comerciales ni entidades externas con fines publicitarios.'
                      : isFr
                      ? 'Les coordonnées des membres ne seront jamais vendues, louées ou cédées à des entreprises commerciales ou publicitaires.'
                      : isEn
                      ? 'Church member records are never sold, rented, or distributed to third-party commercial entities for marketing.'
                      : 'Enfòmasyon manm yo pap janm vann, lwe oswa pataje ak okenn konpayi komèsyal pou fè piblisite.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <h5 className="font-bold text-white flex items-center gap-2 mb-1">
                    <BadgeCheck className="w-4 h-4 text-indigo-400" />
                    <span>{isEs ? '2. Control del Historial de Asistencia y QR' : isFr ? '2. Enregistrement Sécurisé des Présences' : isEn ? '2. Secure Attendance & QR Scan Logs' : '2. Sekirite Nan Eskane Kat ak Rapò Prezans'}</span>
                  </h5>
                  <p className="text-slate-300 text-xs">
                    {isEs
                      ? 'Los escaneos del código QR solo registran la fecha, hora y servicio asistido para fines pastorales, estadísticas internas y seguimiento espiritual.'
                      : isFr
                      ? 'Les scans de QR code enregistrent uniquement la date, l’heure et le culte pour le suivi pastoral et les rapports internes de l’assemblée.'
                      : isEn
                      ? 'QR code scans only record timestamp and service type for church record-keeping, pastoral care, and fellowship analytics.'
                      : 'Lè yo eskane kòd QR kat manm ou, sa sèlman anrejistre lè ak kil ou te prezan pou ede lidèchip pastoral la nan swivi espirityèl manm yo.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIAL INTEGRITY & GIVING */}
          {activeTab === 'financial' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-white text-sm">
                    {isEs
                      ? 'Transparencia Financiera, Díezmos y Donaciones'
                      : isFr
                      ? 'Transparence Financière, Dîmes & Offrandes'
                      : isEn
                      ? 'Financial Integrity, Tithes & Church Donations'
                      : 'Transparans Finansye, Dîm, Ofrann & Donasyon'}
                  </h4>
                  <p className="text-slate-300 text-xs mt-1">
                    {isEs
                      ? '«Cada uno dé como propuso en su corazón: no con tristeza, ni por necesidad, porque Dios ama al dador alegre.» (2 Corintios 9:7)'
                      : isFr
                      ? '« Que chacun donne comme il l’a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie. » (2 Corinthiens 9:7)'
                      : isEn
                      ? '“Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.” (2 Cor 9:7)'
                      : '« Se pou chak moun bay jan yo te deside nan kè yo, san regrèt ni fòse, paske Bondye renmen moun ki bay ak kè kontan. » (2 Korent 9:7)'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <h5 className="font-bold text-white flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{isEs ? '1. Destino Directo a las Cuentas de la Iglesia' : isFr ? '1. Destination Directe aux Comptes de l’Église' : isEn ? '1. Direct Church Account Transfers' : '1. Tout Don Ale Dirèkteman Nan Kont Legliz la'}</span>
                  </h5>
                  <p className="text-slate-300 text-xs">
                    {isEs
                      ? 'Todas las transferencias, aportes de díezmos y ofrendas realizados a través de los números oficiales de la iglesia van directamente a los fondos de la congregación.'
                      : isFr
                      ? 'Tous les virements, dîmes et offrandes effectués via les coordonnées bancaires officielles de l’église sont versés directement à l’assemblée.'
                      : isEn
                      ? 'All tithes, offerings, and donations submitted using official church payment accounts go directly to church operations and community outreach.'
                      : 'Tout dîm, ofrann ak donasyon ki fèt sou nimewo kont ofisyèl legliz la ale dirèkteman nan fon legliz la pou soutni travay Bondye a.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <h5 className="font-bold text-white flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{isEs ? '2. Claridad entre Donaciones a la Iglesia y Apoyo al Desarrollador' : isFr ? '2. Distinction Claire entre Dons d’Église & Soutien Technique' : isEn ? '2. Clear Distinction Between Church Giving & Developer Support' : '2. Diferans Klè Ant Don Legliz ak Sipò Devlopè a'}</span>
                  </h5>
                  <p className="text-slate-300 text-xs">
                    {isEs
                      ? 'La sección de díezmos de la iglesia es completamente independiente de las opciones de apoyo voluntario al desarrollador de software (Jackson Charles). Cada una cuenta con canales claros y transparentes.'
                      : isFr
                      ? 'Les dîmes et dons pour l’église sont totalement indépendants du soutien bénévole au développeur du logiciel (Jackson Charles).'
                      : isEn
                      ? 'Church tithes are separate from voluntary developer support contributions. Each section clearly outlines its recipient and purpose.'
                      : 'Kont labank legliz la separe nèt ak don volontè pou soutni devlopè aplikasyon an (Jackson Charles). Chak pati endike aklè kote kòb la prale.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & PIN MANAGEMENT */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-white text-sm">
                    {isEs
                      ? 'Responsabilidad de Acceso, PIN y Biometría'
                      : isFr
                      ? 'Sécurité d’Accès, Code PIN et Biométrie'
                      : isEn
                      ? 'Account Security, PIN & Biometric Access'
                      : 'Sekirite Aksè, Kòd PIN ak Byometri'}
                  </h4>
                  <p className="text-slate-300 text-xs mt-1">
                    {isEs
                      ? 'Cada miembro es responsable de la confidencialidad de su código PIN y de su tarjeta digital de miembro.'
                      : isFr
                      ? 'Chaque membre est responsable de la confidentialité de son code PIN et de sa carte de membre numérique.'
                      : isEn
                      ? 'Members are responsible for maintaining the confidentiality of their PIN code and digital ID badge.'
                      : 'Chak manm responsab pou kenbe kòd PIN li sekrè epi pwoteje kat manm dijital li a.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <h5 className="font-bold text-white flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>{isEs ? '1. Validez de la Tarjeta Digital' : isFr ? '1. Validité de la Carte Numérique' : isEn ? '1. Digital Card Legitimacy' : '1. Valè Kat Manm Dijital la'}</span>
                  </h5>
                  <p className="text-slate-300 text-xs">
                    {isEs
                      ? 'La tarjeta digital de miembro es personal e intransferible. No debe ser compartida para falsificar registros de asistencia.'
                      : isFr
                      ? 'La carte de membre numérique est personnelle et non transférable. Elle ne doit pas être prêtée pour fausser les présences.'
                      : isEn
                      ? 'The digital membership card is personal and non-transferable. It may not be shared to falsify attendance records.'
                      : 'Kat manm dijital la se yon dokiman pèsonèl. Li pa dwe prete ak yon lòt moun pou fek rapò prezans nan kil yo.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <h5 className="font-bold text-white flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>{isEs ? '2. Actualización de Datos Personales' : isFr ? '2. Mise à Jour des Coordonnées' : isEn ? '2. Administrative Data Updates' : '2. Modifikasyon Enfòmasyon Kontak'}</span>
                  </h5>
                  <p className="text-slate-300 text-xs">
                    {isEs
                      ? 'Por seguridad institucional, las modificaciones de números de teléfono o dirección son validadas por el equipo administrativo de la iglesia.'
                      : isFr
                      ? 'Pour des raisons de sécurité, les mises à jour des coordonnées sont gérées avec l’administration de l’église.'
                      : isEn
                      ? 'For security integrity, changes to primary phone numbers and addresses are verified through church administration.'
                      : 'Pou sekirite ak otantisite lis manm yo, nenpòt chanjman nan nimewo telefòn oswa adrès valide dirèkteman ak sekretariat legliz la.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-slate-950/70 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {isEs
                ? 'Conforme a los estándares eclesiásticos y de privacidad digital.'
                : isFr
                ? 'Conforme aux standards ecclésiastiques et de vie privée.'
                : isEn
                ? 'Compliant with church standards and digital privacy protection.'
                : 'Konfòm ak règlemantasyon eklezyastik ak pwoteksyon vi prive.'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() =>
                handleCopyText(
                  `RÈG SA A KONSÈNE: ${church.name}\n- Règ Kominotè ak Eklezyastik\n- Pwoteksyon Done & Konfidansyalite\n- Transparans Finansye sou Dîm ak Ofrann\n- Sekirite PIN ak Kat Manm`
                )
              }
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title={isEs ? 'Copiar Resumen' : isEn ? 'Copy Summary' : isFr ? 'Copier Résumé' : 'Kopye Rezime'}
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEs ? 'Copiar' : isEn ? 'Copy' : isFr ? 'Copier' : 'Kopye'}</span>
            </button>

            <button
              type="button"
              id="btn-close-church-terms"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer transform active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{isEs ? 'Entendido / Cerrar' : isFr ? 'J’ai Compris / Fermer' : isEn ? 'I Understand / Close' : 'Mwen Konprann / Fèmen'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
