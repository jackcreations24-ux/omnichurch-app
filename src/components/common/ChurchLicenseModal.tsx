import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  CheckCircle2,
  X,
  ExternalLink,
  Mail,
  MessageCircle,
  Copy,
  Check,
  DollarSign,
  Zap,
  Calendar,
  Building2,
  Award,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Church, Language, LicenseTier } from '../../types';
import {
  getChurchLicense,
  hasActiveChurchLicense,
  validateAndActivateLicense,
  deleteLicenseForChurch,
  revokeChurchLicense,
  verifyMasterPin,
  getDonationConfig,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';

interface ChurchLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  church: Church;
  language?: Language;
  onLicenseUpdated?: () => void;
}

export const ChurchLicenseModal: React.FC<ChurchLicenseModalProps> = ({
  isOpen,
  onClose,
  church,
  language = 'ht',
  onLicenseUpdated,
}) => {
  const toast = useToast();
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [donationConfig, setDonationConfig] = useState(() => getDonationConfig());

  React.useEffect(() => {
    const handleUpdate = () => {
      setDonationConfig(getDonationConfig());
    };
    window.addEventListener('omnichurch_dev_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', handleUpdate);
    };
  }, []);

  // Developer quick deletion states
  const [showDevDeleteBox, setShowDevDeleteBox] = useState<boolean>(false);
  const [devPinInput, setDevPinInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen) return null;

  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  const isLicensed = hasActiveChurchLicense(church.id);
  const licenseDetails = getChurchLicense(church.id);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success(
      isEs ? 'Copiado' : isFr ? 'Copié' : isEn ? 'Copied' : 'Kopye',
      isEs ? 'Copiado al portapapeles' : isFr ? 'Copié dans le presse-papier' : isEn ? 'Copied to clipboard' : 'Kopye nan memwa'
    );
  };

  const handleActivate = async () => {
    const trimmed = licenseKeyInput.trim().toUpperCase();
    if (!trimmed) {
      toast.error(
        isEs ? 'Clave Vacía' : isFr ? 'Clé Vide' : isEn ? 'Empty Key' : 'Kle Vid',
        isEs
          ? 'Por favor introduzca una clave de licencia válida.'
          : isFr
          ? 'Veuillez entrer une clé de licence valide.'
          : isEn
          ? 'Please enter a valid license key.'
          : 'Tanpri antre yon kle lisans ki valab.'
      );
      return;
    }

    setIsActivating(true);
    try {
      const res = await validateAndActivateLicense(trimmed, church.id, church.name);
      if (res.success) {
        toast.success(
          isEs ? '¡Licencia Activada!' : isFr ? 'Licence Activée !' : isEn ? 'License Activated!' : 'Lisans Aktive avèk Siksè!',
          isEs
            ? `La iglesia "${church.name}" ahora cuenta con una licencia oficial activa.`
            : isFr
            ? `L’église "${church.name}" dispose désormais d’une licence active.`
            : isEn
            ? `Church "${church.name}" now has an active official license.`
            : `Legliz "${church.name}" aktive kounye a avèk tout privilèj yo.`
        );
        setLicenseKeyInput('');
        if (onLicenseUpdated) onLicenseUpdated();
      } else {
        toast.error(
          isEs ? 'Error de Activación' : isFr ? 'Erreur d’Activation' : isEn ? 'Activation Error' : 'Erè Aktivasyon',
          res.message
        );
      }
    } catch (e: any) {
      toast.error('Erè', e?.message || 'Yon erè pase pandan aktivasyon an.');
    } finally {
      setIsActivating(false);
    }
  };

  // Developer Action: Permanently Delete or Revoke License
  const handleDeveloperDeleteLicense = async () => {
    if (!verifyMasterPin(devPinInput)) {
      toast.error('Kòd Dev Envalid', 'Tanpri antre bon kòd sekirite devlopè a (Master PIN) pou efase lisans lan.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteLicenseForChurch(church.id);
      toast.success(
        'Lisans Efase Definitif!',
        `Lisans pou legliz "${church.name}" efase nèt nan baz done a.`
      );
      setShowDevDeleteBox(false);
      setDevPinInput('');
      if (onLicenseUpdated) onLicenseUpdated();
    } catch (err: any) {
      toast.error('Erè', err?.message || 'Pa ka efase lisans lan.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Developer Action: Revoke License
  const handleDeveloperRevokeLicense = async () => {
    if (!verifyMasterPin(devPinInput)) {
      toast.error('Kòd Dev Envalid', 'Tanpri antre bon kòd sekirite devlopè a (Master PIN).');
      return;
    }

    setIsDeleting(true);
    try {
      await revokeChurchLicense(church.id, 'Revoke pa Devlopè');
      toast.info(
        'Lisans Revoke!',
        `Lisans pou legliz "${church.name}" sispann/revoke kounye a.`
      );
      setShowDevDeleteBox(false);
      setDevPinInput('');
      if (onLicenseUpdated) onLicenseUpdated();
    } catch (err: any) {
      toast.error('Erè', err?.message || 'Pa ka revoke lisans lan.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#1E293B] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-950 border border-blue-500/40 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <img src="/icon.png" alt="OmniChurch" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>{isEs ? 'Licencia Oficial y Soporte del Desarrollador' : isFr ? 'Licence Officielle & Support Développeur' : isEn ? 'Official License & Developer Support' : 'Lisans Ofisyèl & Sipò Devlopè'}</span>
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{church.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* 1. CURRENT LICENSE STATUS / PRICING CARD */}
          {isLicensed ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white flex items-center gap-2">
                      <span>{isEs ? 'Licencia Pro Activa ($70 USD / 1 Año)' : isFr ? 'Licence Pro Active ($70 USD / 1 An)' : isEn ? 'Pro License Active ($70 USD / 1 Year)' : 'Lisans Pro Aktif ($70 USD / 1 Ane)'}</span>
                      <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {licenseDetails?.tier?.toUpperCase() || 'PRO'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      {isEs ? 'Esta congregación cuenta con todas las funciones desbloqueadas: RNC y Diezmos.' : 'Legliz sa a gen RNC ofisyèl ak seksyon Dîm & Ofrann debloke nèt.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">{isEs ? 'Expira el:' : isFr ? 'Expire le :' : isEn ? 'Expires on:' : 'Ekspire le:'}</span>
                  <span className="font-mono text-xs font-bold text-emerald-300 flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" />
                    {licenseDetails?.expiresAt ? new Date(licenseDetails.expiresAt).toLocaleDateString() : 'Lifetime (San Limit)'}
                  </span>
                </div>
              </div>

              {/* UNLOCKED FEATURES SUMMARY */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{isEs ? 'RNC Autorizado' : 'RNC Otorize'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{isEs ? 'Diezmos & Ofrendas' : 'Dîm & Ofrann'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{isEs ? 'Sin Publicidad' : 'San Piblisite'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{isEs ? 'Soporte VIP' : 'Sipò Priyoritè'}</span>
                </div>
              </div>

              {/* DEVELOPER FAST MANAGEMENT & DELETION CONTROLS */}
              <div className="pt-3 border-t border-slate-800/80">
                {!showDevDeleteBox ? (
                  <button
                    type="button"
                    onClick={() => setShowDevDeleteBox(true)}
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Gestión de Desarrollador: Revocar / Eliminar Licencia' : 'Opsyon Devlopè: Revoke oswa Efase Lisans sa a'}</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Kòd Sekirite Devlopè (Master PIN):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDevDeleteBox(false);
                          setDevPinInput('');
                        }}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Anile
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        type="password"
                        value={devPinInput}
                        onChange={(e) => setDevPinInput(e.target.value)}
                        placeholder="Antre PIN Dev..."
                        maxLength={10}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-700/60 text-white font-mono text-xs focus:outline-none focus:border-rose-500 w-full sm:w-40"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDeveloperRevokeLicense}
                          disabled={isDeleting || !devPinInput.trim()}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDeveloperDeleteLicense}
                          disabled={isDeleting || !devPinInput.trim()}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeleting ? 'Ap efase...' : 'Efase Nèt nan Baz Done'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/50 shadow-xl space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 tracking-wider">
                        {isEs ? 'PLAN OFICIAL ANUAL' : isFr ? 'PLAN OFFICIEL ANNUEL' : isEn ? 'OFFICIAL ANNUAL PLAN' : 'PLAN ANWÈL OFISYÈL'}
                      </span>
                      <span className="text-xs font-bold text-amber-200">
                        {isEs ? 'Válido por 1 Año' : isFr ? 'Valide pour 1 An' : isEn ? 'Valid for 1 Year' : 'Valid pou 1 Ane (12 Mwa)'}
                      </span>
                    </div>
                    <h4 className="font-black text-base text-white flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-amber-300">$70.00 USD</span>
                      <span className="text-xs text-slate-400">/ {isEs ? 'año' : isFr ? 'an' : isEn ? 'year' : 'ane'}</span>
                    </h4>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-right">
                  <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">{isEs ? 'Estado' : 'Estati'}</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1 justify-end">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isEs ? 'No Activada' : isFr ? 'Non Activée' : isEn ? 'Not Active' : 'Poko Aktive'}</span>
                  </span>
                </div>
              </div>

              {/* WHY THIS LICENSE IS MANDATORY (RNC & TITHES) */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <p className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isEs
                      ? '¿Qué desbloquea esta licencia de $70.00 USD / 1 año?'
                      : isFr
                      ? 'Que débloque cette licence de 70,00 $ USD / 1 an ?'
                      : isEn
                      ? 'What does this $70.00 USD / 1-year license unlock?'
                      : 'Kisa lisans $70.00 USD / 1 ane sa a debloke?'}
                  </span>
                </p>
                <ul className="space-y-1.5 text-slate-300 pl-1 text-[11.5px]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{isEs ? 'RNC y Certificación Oficial:' : isFr ? 'RNC & Certification Officielle :' : isEn ? 'Official RNC & Anti-Fraud Security:' : 'RNC ak Pwoteksyon Anti-Fwòd:'}</strong>{' '}
                      {isEs
                        ? 'Permite registrar y validar el RNC con foto del documento legal de la iglesia para verificación policial y bancaria.'
                        : isFr
                        ? 'Permet d’enregistrer et valider le RNC avec photo du document légal pour les contrôles officiels.'
                        : isEn
                        ? 'Allows validating official RNC with photo of church legal document to prevent fraud with authorities.'
                        : 'Pèmèt anrejistre epi valide RNC a (ansanm ak foto dokiman legal la) pou sètifye legliz la devan Lapolis, Lajistis ak Leta.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{isEs ? 'Módulo de Diezmos y Ofrendas:' : isFr ? 'Module Dîmes & Offrandes :' : isEn ? 'Tithes & Offerings Module:' : 'Seksyon Dîm ak Ofrann:'}</strong>{' '}
                      {isEs
                        ? 'Se utiliza esta misma licencia para activar las cuentas bancarias, MonCash, Zelle y PayPal de la iglesia para los miembros.'
                        : isFr
                        ? 'C’est cette même licence qui sert à activer les comptes bancaires, MonCash, Zelle et PayPal pour les membres.'
                        : isEn
                        ? 'The exact same license activates official church bank accounts, MonCash, Zelle, and PayPal giving.'
                        : 'Se menm lisans sa a ki sèvi pou aktive kont labank, MonCash, Zelle, ak PayPal legliz la pou manm yo ka fè donasyon.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{isEs ? '100% Sin Publicidad:' : isFr ? '100% Sans Publicité :' : isEn ? '100% Ad-Free:' : '100% San Piblisite:'}</strong>{' '}
                      {isEs
                        ? 'Elimina cualquier anuncio y garantiza soporte prioritario durante todo el año.'
                        : 'Retire tout piblisite epi garanti asistans teknik dirèk pandan tout ane a.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* 2. DEVELOPER CONTACT & CREDENTIALS CARD */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-amber-400/20 shrink-0">
                  JC
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>Jackson Charles</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Lead Architect & Developer
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 italic mt-0.5">
                    &ldquo;
                    {isEs
                      ? 'Apoyando el crecimiento espiritual, administrativo y digital de la iglesia.'
                      : 'Ede legliz yo grandi nimerikman ak espirityèlman avèk teknoloji modèn.'}
                    &rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* CONTACT BUTTONS & CHANNELS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
              {/* EMAIL */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-medium">Imèl Ofisyèl</span>
                    <span className="text-xs font-mono text-slate-200 truncate block">
                      {donationConfig.developerEmail || 'Kontak Pa Disponib'}
                    </span>
                  </div>
                </div>
                {donationConfig.developerEmail && (
                  <button
                    type="button"
                    onClick={() => handleCopy(donationConfig.developerEmail, 'email')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                    title="Kopye Imèl"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* DYNAMIC PAYMENT / SUPPORT BASED ON DEVELOPER ENGINE CONFIG */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 overflow-hidden">
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {donationConfig.moncashEnabled
                        ? (donationConfig.zelleEnabled ? 'MonCash & Zelle' : 'MonCash (Digicel)')
                        : donationConfig.zelleEnabled
                        ? 'Zelle (USA)'
                        : donationConfig.paypalEnabled
                        ? 'PayPal'
                        : donationConfig.wiseEnabled
                        ? 'Wise Transfer'
                        : 'Soutyen / Peman'}
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate block">
                      {donationConfig.moncashEnabled
                        ? (donationConfig.moncashNumber || 'MonCash')
                        : donationConfig.zelleEnabled
                        ? (donationConfig.zelleInfo || 'Zelle')
                        : donationConfig.paypalEnabled
                        ? (donationConfig.paypalEmail || 'PayPal')
                        : (donationConfig.developerName || 'Soutyen')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const payText = donationConfig.moncashEnabled
                      ? `MonCash: ${donationConfig.moncashNumber || ''} (${donationConfig.moncashName || donationConfig.developerName || ''})`.trim()
                      : donationConfig.zelleEnabled
                      ? `Zelle: ${donationConfig.zelleInfo || ''} (${donationConfig.developerName || ''})`.trim()
                      : donationConfig.paypalEnabled
                      ? `PayPal: ${donationConfig.paypalEmail || ''}`.trim()
                      : donationConfig.developerEmail || '';
                    if (payText) {
                      handleCopy(payText, 'payment');
                    }
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                  title="Kopye enfòmasyon peman"
                >
                  {copiedField === 'payment' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 3. LICENSE ACTIVATION KEY INPUT FORM */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <h4 className="font-extrabold text-sm text-white">
                {isEs ? 'Introducir Clave de Activación' : isFr ? 'Entrer la Clé d’Activation' : isEn ? 'Enter Activation Key' : 'Antre Kle Lisans pou Aktive'}
              </h4>
            </div>

            <p className="text-xs text-slate-400">
              {isEs
                ? 'Pegue la clave proporcionada por el desarrollador (Formato: OMNI-PRO-XXXX...)'
                : 'Kole kle devlopè a ba ou a (Fòma: OMNI-PRO-XXXX...)'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                placeholder="OMNI-PRO-XXXX-XXXX-XXXX"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase tracking-wider"
              />
              <button
                type="button"
                onClick={handleActivate}
                disabled={isActivating || !licenseKeyInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition disabled:opacity-50 active:scale-98"
              >
                <Zap className="w-4 h-4 text-slate-950" />
                <span>{isActivating ? 'Ap valide...' : isEs ? 'Activar Licencia' : isFr ? 'Activer Licence' : isEn ? 'Activate License' : 'Aktive Lisans'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>OmniChurch Engine & License Registry</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition"
          >
            {isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}
          </button>
        </div>
      </div>
    </div>
  );
};
