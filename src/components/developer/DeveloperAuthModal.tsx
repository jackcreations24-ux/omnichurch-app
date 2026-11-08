import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Language } from '../../types';
import {
  verifyMasterPin,
  getDeveloperLockoutInfo,
  recordFailedMasterAuthAttempt,
  recordSuccessfulMasterAuth,
  DeveloperLockoutInfo,
} from '../../utils/developerStorage';
import {
  Shield,
  KeyRound,
  Lock,
  Unlock,
  X,
  AlertTriangle,
  Cpu,
  Terminal,
  Eye,
  EyeOff,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface DeveloperAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  language?: Language;
}

export const DeveloperAuthModal: React.FC<DeveloperAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  language = 'ht',
}) => {
  const toast = useToast();
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);
  const [lockout, setLockout] = useState<DeveloperLockoutInfo>(() => getDeveloperLockoutInfo());

  // Check and countdown lockout timer every second
  useEffect(() => {
    if (!isOpen) return;

    const checkLockout = () => {
      const current = getDeveloperLockoutInfo();
      setLockout(current);
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setIsChecking(false);
      setLockout(getDeveloperLockoutInfo());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const handleDigit = (digit: string) => {
    if (lockout.isLocked) return;
    if (password.length < 32) {
      setPassword((prev) => prev + digit);
      setError(null);
    }
  };

  const handleDelete = () => {
    if (lockout.isLocked) return;
    setPassword((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (lockout.isLocked) return;
    setPassword('');
    setError(null);
  };

  const handleVerify = async () => {
    if (lockout.isLocked) {
      setError(
        isEs
          ? `Sistema temporalmente bloqueado. Espere ${lockout.remainingSeconds}s.`
          : isEn
          ? `System temporarily locked. Please wait ${lockout.remainingSeconds}s.`
          : isFr
          ? `Système temporairement verrouillé. Veuillez attendre ${lockout.remainingSeconds}s.`
          : `Sistèm nan bloke pou sekirite. Tanpri tann ${lockout.remainingSeconds}s.`
      );
      return;
    }

    const trimmed = password.trim();
    if (!trimmed) {
      setError(
        isEs
          ? 'Por favor ingrese la clave de desarrollador.'
          : isEn
          ? 'Please enter the developer password or PIN.'
          : isFr
          ? 'Veuillez saisir le mot de passe développeur.'
          : 'Tanpri antre modpas oswa PIN Devlopè a.'
      );
      return;
    }

    setIsChecking(true);
    setError(null);

    // Simulate cryptographic processing time
    setTimeout(async () => {
      const isValid = verifyMasterPin(trimmed);
      if (isValid) {
        await recordSuccessfulMasterAuth();
        setIsChecking(false);
        toast.success(
          isEs ? 'Acceso Autorizado' : isEn ? 'Access Granted' : isFr ? 'Accès Autorisé' : 'Aksè Devlopè Otorize ✓',
          isEs
            ? 'Bienvenido al Developer Engine Panel.'
            : isEn
            ? 'Welcome to the Developer Engine Panel.'
            : isFr
            ? 'Bienvenue dans le Developer Engine Panel.'
            : 'Byenvini nan Panèl Devlopè Engine lan.'
        );
        onSuccess();
      } else {
        const newLockout = await recordFailedMasterAuthAttempt();
        setLockout(newLockout);
        setIsChecking(false);
        setShake(true);

        if (newLockout.isLocked) {
          setError(
            isEs
              ? `Demasiados intentos fallidos. Sistema bloqueado por ${newLockout.remainingSeconds} segundos.`
              : isEn
              ? `Too many failed attempts. System locked for ${newLockout.remainingSeconds} seconds.`
              : isFr
              ? `Trop de tentatives échouées. Système verrouillé pendant ${newLockout.remainingSeconds} secondes.`
              : `Twòp tantativ echwe. Sistèm nan bloke pou sekirite pandan ${newLockout.remainingSeconds} segonn.`
          );
        } else {
          const attemptsLeft = 5 - newLockout.failedAttempts;
          setError(
            isEs
              ? `Clave incorrecta. ${attemptsLeft > 0 ? `Quedan ${attemptsLeft} intentos antes del bloqueo.` : 'Acceso denegado.'}`
              : isEn
              ? `Incorrect password. ${attemptsLeft > 0 ? `${attemptsLeft} attempts remaining before lockout.` : 'Access denied.'}`
              : isFr
              ? `Mot de passe incorrect. ${attemptsLeft > 0 ? `${attemptsLeft} tentatives restantes avant blocage.` : 'Accès refusé.'}`
              : `Modpas sa a pa kòrèk. ${attemptsLeft > 0 ? `Rete sèlman ${attemptsLeft} tantativ anvan sistèm nan bloke.` : 'Aksè refize.'}`
          );
        }
        setTimeout(() => setShake(false), 600);
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          x: shake ? [-8, 8, -6, 6, -3, 3, 0] : 0,
        }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm rounded-3xl bg-[#0B1120] border border-amber-500/40 p-6 text-white shadow-2xl shadow-amber-500/10 relative overflow-hidden"
      >
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Cpu className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
            <Terminal className="w-3.5 h-3.5" />
            <span>Developer Engine Gate</span>
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            {isEs ? 'Acceso Ultra Seguro' : isEn ? 'Secure Developer Gate' : isFr ? 'Portail Sécurisé' : 'Aksè Devlopè Ultra Sekirize'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEs
              ? 'Ingrese la clave maestra o PIN para autenticar su sesión de desarrollo.'
              : isEn
              ? 'Enter master password or PIN to authenticate developer session.'
              : isFr
              ? 'Saisissez le mot de passe maître pour authentifier la session développeur.'
              : 'Antre modpas mèt la oswa PIN sekirite pou debloke panèl devlopè a.'}
          </p>
        </div>

        {/* LOCKOUT ACTIVE BANNER */}
        {lockout.isLocked && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/80 border border-rose-600/80 text-rose-200 text-xs flex items-center gap-3 animate-pulse">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <div className="font-extrabold text-rose-300">
                {isEs ? 'Sistema Bloqueado por Seguridad' : isEn ? 'System Locked for Security' : isFr ? 'Système Bloqué' : 'Sistèm Bloke pou Sekirite'}
              </div>
              <div className="text-[11px] text-rose-300/90 font-mono mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-400" />
                <span>
                  {isEs ? 'Reintento disponible en:' : isEn ? 'Retry available in:' : isFr ? 'Réessai dans :' : 'Ou ka re-eseye nan:'}{' '}
                  <strong className="text-white text-xs">{lockout.remainingSeconds}s</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Password / PIN Input with Visibility Toggle */}
        <div className="relative mb-3">
          <input
            type={showPassword ? 'text' : 'password'}
            id="input-developer-master-pin"
            maxLength={40}
            autoFocus
            disabled={lockout.isLocked || isChecking}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleVerify();
            }}
            placeholder={isEs ? 'Contraseña o PIN' : isEn ? 'Password or PIN' : isFr ? 'Mot de passe ou PIN' : 'Modpas oswa PIN'}
            className="w-full py-3 pl-4 pr-20 rounded-2xl bg-slate-900/90 border border-slate-700 text-white font-mono text-base tracking-wider focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={showPassword ? 'Kache modpas' : 'Montre modpas'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {password.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                tabIndex={-1}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Efase tout"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Warning or Error Alert */}
        {error && !lockout.isLocked && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-900/60 flex items-center gap-2 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Mode Toggle: Show numeric keypad toggle on mobile */}
        <div className="flex items-center justify-between my-2 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={() => setShowKeypad((prev) => !prev)}
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2 font-medium cursor-pointer"
          >
            {showKeypad
              ? (isEs ? 'Ocultar teclado numérico' : isEn ? 'Hide numeric keypad' : isFr ? 'Masquer le pavé' : 'Kache klavye nimerik')
              : (isEs ? 'Mostrar teclado numérico' : isEn ? 'Show numeric keypad' : isFr ? 'Afficher le pavé' : 'Sèvi ak klavye nimerik pou PIN')}
          </button>
          <span className="font-mono text-[10px] text-slate-500">
            SHA-256 Protected
          </span>
        </div>

        {/* Optional Keypad Grid */}
        {showKeypad && (
          <div className="grid grid-cols-3 gap-2 my-2.5 animate-fadeIn">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                type="button"
                disabled={lockout.isLocked || isChecking}
                onClick={() => {
                  if (k === 'C') handleClear();
                  else if (k === '⌫') handleDelete();
                  else handleDigit(k);
                }}
                className={`h-10 rounded-xl text-sm font-extrabold flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                  k === 'C' || k === '⌫'
                    ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs'
                    : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-base shadow-sm hover:border-amber-400/40'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-2 border-t border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 font-bold text-xs transition-colors cursor-pointer"
          >
            {isEs ? 'Cancelar' : isEn ? 'Cancel' : isFr ? 'Annuler' : 'Anile'}
          </button>
          <button
            type="button"
            id="btn-unlock-developer-engine"
            onClick={handleVerify}
            disabled={isChecking || password.trim().length === 0 || lockout.isLocked}
            className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? (
              <span>{isEs ? 'Verificando...' : isEn ? 'Verifying...' : isFr ? 'Vérification...' : 'W ap verifye...'}</span>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>{isEs ? 'Desbloquear Panel' : isEn ? 'Unlock Panel' : isFr ? 'Déverrouiller' : 'Debloke Panèl'}</span>
              </>
            )}
          </button>
        </div>

        {/* Security Note */}
        <div className="mt-3 text-center flex items-center justify-center gap-1.5 text-slate-500">
          <Shield className="w-3 h-3 text-amber-500/60" />
          <span className="text-[10px] font-mono tracking-wider">
            {isEs
              ? 'Área Protegida • Bloqueo Automático contra Fuerza Bruta'
              : isEn
              ? 'Protected Area • Anti-Brute-Force Lockout Active'
              : isFr
              ? 'Zone Protégée • Verrouillage Anti-Force Brute'
              : 'Espas Pwoteje • Pwoteksyon Fòs Brital Aktif'}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

