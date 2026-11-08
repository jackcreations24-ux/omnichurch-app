import React, { useState, useEffect } from 'react';
import { Church, Member, Language } from '../../types';
import { updateMember } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import {
  ShieldCheck,
  X,
  Check,
  User,
  Crown,
  BookOpen,
  Music,
  HeartHandshake,
  Cross,
  Award,
  Users,
  Scroll,
  Megaphone,
  Briefcase,
  Layers,
} from 'lucide-react';

interface AdminChangeRoleModalProps {
  church: Church;
  member: Member | null;
  isOpen: boolean;
  language?: Language;
  onClose: () => void;
  onMemberUpdated: (updatedMember: Member) => void;
}

export const AdminChangeRoleModal: React.FC<AdminChangeRoleModalProps> = ({
  church,
  member,
  isOpen,
  language = 'ht',
  onClose,
  onMemberUpdated,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const [selectedRole, setSelectedRole] = useState<string>('Manm');
  const [selectedPrefix, setSelectedPrefix] = useState<string>('Frè');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('Service Général');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (member) {
      setSelectedRole(member.role || (isEs ? 'Miembro' : isFr ? 'Membre' : isEn ? 'Member' : 'Manm'));
      setSelectedPrefix(
        member.titlePrefix ||
          (member.gender === 'female'
            ? isEs
              ? 'Hna.'
              : isFr
              ? 'Sr'
              : isEn
              ? 'Sis.'
              : 'Sè'
            : isEs
            ? 'Hno.'
            : isFr
            ? 'Fr.'
            : isEn
            ? 'Bro.'
            : 'Frè')
      );
      setSelectedDepartment(member.department || (isEs ? 'Servicio General' : 'Service Général'));
    }
  }, [member, isOpen, isEs, isFr, isEn]);

  if (!isOpen || !member) return null;

  const prefixes = [
    { label: isEs ? 'Hno. (Hermano)' : isFr ? 'Fr. (Frère)' : isEn ? 'Bro. (Brother)' : 'Frè (Frère)', value: isEs ? 'Hno.' : isFr ? 'Fr.' : isEn ? 'Bro.' : 'Frè' },
    { label: isEs ? 'Hna. (Hermana)' : isFr ? 'Sr (Sœur)' : isEn ? 'Sis. (Sister)' : 'Sè (Sœur)', value: isEs ? 'Hna.' : isFr ? 'Sr' : isEn ? 'Sis.' : 'Sè' },
    { label: isEs ? 'Pastor' : isFr ? 'Pasteur' : isEn ? 'Pastor' : 'Pastè', value: isEs ? 'Pastor' : isFr ? 'Pasteur' : isEn ? 'Pastor' : 'Pastè' },
    { label: isEs ? 'Pastora' : isFr ? 'Pasteure' : isEn ? 'Pastor (F)' : 'Pastè (Fi)', value: isEs ? 'Pastora' : isFr ? 'Pasteure' : isEn ? 'Pastor' : 'Pastè' },
    { label: isEs ? 'Diácono' : isFr ? 'Diacre' : isEn ? 'Deacon' : 'Dyak', value: isEs ? 'Diácono' : isFr ? 'Diacre' : isEn ? 'Deacon' : 'Dyak' },
    { label: isEs ? 'Diaconisa' : isFr ? 'Diaconesse' : isEn ? 'Deaconess' : 'Dyakonès', value: isEs ? 'Diaconisa' : isFr ? 'Diaconesse' : isEn ? 'Deaconess' : 'Dyakonès' },
    { label: isEs ? 'Evangelista' : isFr ? 'Évangéliste' : isEn ? 'Evangelist' : 'Evanjelis', value: isEs ? 'Evangelista' : isFr ? 'Évangéliste' : isEn ? 'Evangelist' : 'Evanjelis' },
    { label: isEs ? 'Salmista / Maestro' : isFr ? 'Chantre / Maître' : isEn ? 'Worship Leader / Maestro' : 'Chantre / Mèt', value: isEs ? 'Salmista' : isFr ? 'Chantre' : isEn ? 'Minister' : 'Chantre' },
    { label: isEs ? 'Dr. / Lic.' : isFr ? 'Dr / Me' : isEn ? 'Dr. / Min.' : 'Doktè / Mèt', value: isEs ? 'Dr.' : isFr ? 'Dr' : isEn ? 'Dr.' : 'Doktè' },
  ];

  const roleCategories = [
    {
      categoryName: isEs ? 'Culte & Predicación' : isFr ? 'Culte & Prédication' : isEn ? 'Worship & Preaching' : 'Kilt & Predikasyon',
      roles: [
        {
          id: 'dirijan',
          name: isEs ? 'Director de Culto / Servicio' : isFr ? 'Dirigeant du Culte / Service' : isEn ? 'Service Leader' : 'Dirijan Sèvis / Kilt',
          desc: isEs ? 'Preside el servicio y las ceremonias' : isFr ? 'Préside le culte et les cérémonies' : isEn ? 'Leads the service and worship order' : 'Dirije sèvis la, priyè ak seremoni yo',
          icon: Crown,
          badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
          autoPrefix: isEs ? 'Hno.' : isFr ? 'Fr.' : isEn ? 'Bro.' : 'Frè',
          targetServiceRole: 'Dirijan',
        },
        {
          id: 'predikate',
          name: isEs ? 'Predicador' : isFr ? 'Prédicateur' : isEn ? 'Preacher / Speaker' : 'Predikatè',
          desc: isEs ? 'Entrega el mensaje y la Palabra de Dios' : isFr ? 'Apporte le message et la Parole de Dieu' : isEn ? 'Delivers the sermon and biblical message' : 'Pote mesaj la ak Pawòl Bondye a nan kilt la',
          icon: BookOpen,
          badgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
          autoPrefix: isEs ? 'Pastor' : isFr ? 'Pasteur' : isEn ? 'Pastor' : 'Pastè',
          targetServiceRole: 'Predikatè',
        },
        {
          id: 'lekte',
          name: isEs ? 'Lector Bíblico' : isFr ? 'Lecteur de la Parole' : isEn ? 'Scripture Reader' : 'Lektè Pawòl la',
          desc: isEs ? 'Encargado de la lectura bíblica oficial' : isFr ? 'Chargé de la lecture biblique officielle' : isEn ? 'Reads the designated scripture passage' : 'Fè lekti pasaj biblik ofisyèl la nan kilt la',
          icon: Scroll,
          badgeColor: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40',
          autoPrefix: isEs ? 'Hno.' : isFr ? 'Fr.' : isEn ? 'Bro.' : 'Frè',
          targetServiceRole: 'Lektè',
        },
      ],
    },
    {
      categoryName: isEs ? 'Liderazgo Pastoral & Diaconado' : isFr ? 'Leadership Pastoral & Diaconat' : isEn ? 'Pastoral & Diaconate Leadership' : 'Lidèchip Pastoral & Dyak',
      roles: [
        {
          id: 'paste',
          name: isEs ? 'Pastor Titular' : isFr ? 'Pasteur Titulaire' : isEn ? 'Senior Pastor' : 'Pastè Titilè',
          desc: isEs ? 'Líder espiritual principal de la iglesia' : isFr ? 'Responsable spirituel principal' : isEn ? 'Lead pastoral minister' : 'Gid espirityèl prensipal legliz la',
          icon: Cross,
          badgeColor: 'bg-indigo-400/20 text-indigo-300 border-indigo-400/40',
          autoPrefix: isEs ? 'Pastor' : isFr ? 'Pasteur' : isEn ? 'Pastor' : 'Pastè',
          targetServiceRole: 'Pastè',
        },
        {
          id: 'paste-asosye',
          name: isEs ? 'Pastor Asociado' : isFr ? 'Pasteur Associé' : isEn ? 'Associate Pastor' : 'Pastè Asosye',
          desc: isEs ? 'Asistencia y apoyo pastoral directo' : isFr ? 'Soutien et assistance pastorale' : isEn ? 'Pastoral assistant & ministry' : 'Èd pastoral ak sipò nan tout sèvis yo',
          icon: Award,
          badgeColor: 'bg-blue-400/20 text-blue-300 border-blue-400/40',
          autoPrefix: isEs ? 'Pastor' : isFr ? 'Pasteur' : isEn ? 'Pastor' : 'Pastè',
          targetServiceRole: 'Pastè Asosye',
        },
        {
          id: 'dyak',
          name: isEs ? 'Diácono / Diaconisa' : isFr ? 'Diacre / Diaconesse' : isEn ? 'Deacon / Deaconess' : 'Dyak / Dyakonès',
          desc: isEs ? 'Servicio ministerial, orden y apoyo' : isFr ? 'Service au sanctuaire, ordre et soutien' : isEn ? 'Sanctuary order and member care' : 'Òd nan tanp lan ak sèvis bay tout manm yo',
          icon: Briefcase,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          autoPrefix: isEs ? 'Diácono' : isFr ? 'Diacre' : isEn ? 'Deacon' : 'Dyak',
          targetServiceRole: 'Dyak',
        },
        {
          id: 'evanjelis',
          name: isEs ? 'Evangelista' : isFr ? 'Évangéliste' : isEn ? 'Evangelist' : 'Evanjelis',
          desc: isEs ? 'Misiones, cruzadas y evangelización' : isFr ? 'Missions et évangélisation' : isEn ? 'Missions and community outreach' : 'Misyon deyò, kwazad ak gaye levanjil la',
          icon: Megaphone,
          badgeColor: 'bg-orange-400/20 text-orange-300 border-orange-400/40',
          autoPrefix: isEs ? 'Evangelista' : isFr ? 'Évangéliste' : isEn ? 'Evangelist' : 'Evanjelis',
          targetServiceRole: 'Evanjelis',
        },
      ],
    },
    {
      categoryName: isEs ? 'Música, Protocolo & Ministerios' : isFr ? 'Musique, Protocole & Ministères' : isEn ? 'Music, Ushers & Ministries' : 'Mizik, Akèy & Ministè',
      roles: [
        {
          id: 'mizisyen',
          name: isEs ? 'Chantre / Músico / Coro' : isFr ? 'Chantre / Musicien / Chorale' : isEn ? 'Musician / Worship Team' : 'Chantre / Mizisyen / Koral',
          desc: isEs ? 'Liderazgo en música, alabanza y coro' : isFr ? 'Louange, chant et direction musicale' : isEn ? 'Worship and musical praise ministry' : 'Dirije louanj, enstriman ak chan koral nan kilt la',
          icon: Music,
          badgeColor: 'bg-purple-400/20 text-purple-300 border-purple-400/40',
          autoPrefix: isEs ? 'Salmista' : isFr ? 'Chantre' : isEn ? 'Minister' : 'Chantre',
          targetServiceRole: 'Mizisyen',
        },
        {
          id: 'akey',
          name: isEs ? 'Protocolo & Bienvenida (Ushers)' : isFr ? 'Accueil & Protocole' : isEn ? 'Ushers & Hospitality' : 'Akèy & Pwotokòl',
          desc: isEs ? 'Recepción de miembros, acomodación y orden' : isFr ? 'Accueil des fidèles et protocole' : isEn ? 'Greeting, seating and sanctuary hospitality' : 'Resevwa moun nan pòt la, plase yo ak asire lòd',
          icon: HeartHandshake,
          badgeColor: 'bg-rose-400/20 text-rose-300 border-rose-400/40',
          autoPrefix: isEs ? 'Hno.' : isFr ? 'Fr.' : isEn ? 'Bro.' : 'Frè',
          targetServiceRole: 'Akèy',
        },
        {
          id: 'jenes',
          name: isEs ? 'Líder de Jóvenes / Niños' : isFr ? 'Responsable Jeunesse / ECODIM' : isEn ? 'Youth & Children Leader' : 'Lidè Jeunesse / Monitè Timoun',
          desc: isEs ? 'Encargado de actividades juveniles y niños' : isFr ? 'Encadrement des jeunes et enfants' : isEn ? 'Youth leader & Sunday school coordinator' : 'Kowòdinatè aktivite jèn yo ak lekòl dimanch timoun',
          icon: Users,
          badgeColor: 'bg-teal-400/20 text-teal-300 border-teal-400/40',
          autoPrefix: isEs ? 'Hno.' : isFr ? 'Fr.' : isEn ? 'Bro.' : 'Frè',
          targetServiceRole: 'Lidè Jenès',
        },
        {
          id: 'manm',
          name: isEs ? 'Miembro Regular' : isFr ? 'Membre Régulier' : isEn ? 'Regular Member' : 'Manm Senp / Regilye',
          desc: isEs ? 'Miembro activo en plena comunión' : isFr ? 'Fidèle engagé dans la communauté' : isEn ? 'Active member in communion' : 'Manm batize ak aktif nan kilt ak aktivite legliz la',
          icon: User,
          badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
          autoPrefix: isEs ? 'Hno.' : isFr ? 'Fr.' : isEn ? 'Bro.' : 'Frè',
          targetServiceRole: 'Manm',
        },
      ],
    },
  ];

  const handleSelectRole = (roleName: string, autoPrefix?: string) => {
    setSelectedRole(roleName);
    if (autoPrefix && (!selectedPrefix || selectedPrefix === 'Frè' || selectedPrefix === 'Hno.' || selectedPrefix === 'Bro.' || selectedPrefix === 'Fr.')) {
      setSelectedPrefix(autoPrefix);
    }
  };

  const handleSaveRole = async () => {
    try {
      setIsSaving(true);
      const cleanPrefix = selectedPrefix.trim();
      const cleanRole = selectedRole.trim();
      const cleanDept = selectedDepartment.trim();

      const updatedMember: Member = {
        ...member,
        titlePrefix: cleanPrefix || undefined,
        role: cleanRole,
        department: cleanDept,
      };

      updateMember(church.id, updatedMember);
      onMemberUpdated(updatedMember);

      toast.success(
        isEs ? '¡Rol Actualizado!' : isFr ? 'Rôle Mis à Jour !' : isEn ? 'Role Updated!' : 'Wòl Mete Ajou!',
        isEs
          ? `${updatedMember.fullName} ahora tiene el rol "${cleanRole}" (${cleanPrefix}) y aparecerá correctamente en los anuncios de cultos.`
          : isFr
          ? `${updatedMember.fullName} a maintenant le rôle "${cleanRole}" (${cleanPrefix}) et apparaîtra correctement dans les annonces de culte.`
          : isEn
          ? `${updatedMember.fullName} now holds the role "${cleanRole}" (${cleanPrefix}) and will appear accurately in official service rosters.`
          : `${updatedMember.fullName} kounye a gen wòl "${cleanRole}" (${cleanPrefix}) epi non l ap parèt kòrèkteman nan anons kilt yo.`
      );
      onClose();
    } catch (err) {
      toast.error(
        isEs ? 'Error' : isFr ? 'Erreur' : isEn ? 'Error' : 'Erè',
        isEs ? 'No se pudo actualizar el rol.' : 'Pa t kapab mete wòl la ajou.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const previewFormattedName = `${selectedPrefix ? `${selectedPrefix} ` : ''}${member.fullName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#131D2E] rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden my-auto text-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="p-5 border-b border-slate-700/80 bg-gradient-to-r from-slate-900 via-[#182336] to-slate-900 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-extrabold text-xl shadow-inner shrink-0 overflow-hidden">
              {member.avatarUrl || member.googlePhoto ? (
                <img
                  src={member.avatarUrl || member.googlePhoto}
                  alt={member.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Crown className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  {isEs ? 'Asignar / Cambiar Rol Ministerial' : isFr ? 'Attribuer / Changer Rôle Ministériel' : isEn ? 'Assign / Change Ministry Role' : 'Chanje Wòl & Tit Manm lan'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold">
                  {member.memberId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEs
                  ? `Adapte el rol de ${member.fullName} para que figure en la dirección de cultos y avisos oficiales.`
                  : isFr
                  ? `Adaptez le rôle de ${member.fullName} pour qu’il figure dans la direction des cultes et annonces officielles.`
                  : isEn
                  ? `Set ${member.fullName}’s position so they are accurately listed in service bulletins and rosters.`
                  : `Mete wòl ${member.fullName} kòrèkteman pou non l parèt otomatikman kòm dirijan, predikatè oswa lektè nan anons ofisyèl yo.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-change-role-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* CURRENT PROFILE SUMMARY & PREVIEW */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                {isEs ? 'Vista previa en Anuncios Oficiales de Culto:' : isFr ? 'Aperçu dans les Annonces Officielles de Culte :' : isEn ? 'Preview in Official Service Announcements:' : 'Aperçu Jan non l ap parèt nan Anons Kilt yo:'}
              </span>
              <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>{previewFormattedName}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {selectedRole}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 sm:text-right">
              <span className="block text-[11px] text-slate-500">{isEs ? 'Departamento:' : 'Depatman:'}</span>
              <span className="font-semibold text-slate-200">{selectedDepartment}</span>
            </div>
          </div>

          {/* TITLE PREFIX SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>{isEs ? 'Título de Cortesía / Prefijo Oficial:' : isFr ? 'Titre de Courtoisie / Préfixe Officiel :' : isEn ? 'Courtesy Title / Ministry Prefix:' : 'Tit Prefiks Ofisyèl (Frè, Sè, Pastè, Dyak...):'}</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {isEs ? 'Acompañará el nombre en los avisos' : 'Ap parèt devan non an nan anons yo'}
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {prefixes.map((p) => {
                const isSelected = selectedPrefix === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSelectedPrefix(p.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-sm ring-1 ring-amber-400/30'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span>{p.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN MINISTRY ROLES SELECTOR */}
          <div className="space-y-4 pt-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{isEs ? 'Seleccionar el Rol en la Iglesia & Culto:' : isFr ? 'Sélectionner le Rôle dans l’Église & le Culte :' : isEn ? 'Select Ministry & Service Role:' : 'Chwazi Wòl nan Legliz la & nan Kilt yo:'}</span>
            </label>

            {roleCategories.map((category) => (
              <div key={category.categoryName} className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  {category.categoryName}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {category.roles.map((r) => {
                    const sRole = (selectedRole || '').toLowerCase();
                    const rName = (r.name || '').toLowerCase();
                    const rTarget = (r.targetServiceRole || '').toLowerCase();
                    const isSelected = sRole === rName || (rTarget ? sRole.includes(rTarget) : false);
                    const IconComp = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRole(r.name, r.autoPrefix)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative group ${
                          isSelected
                            ? 'bg-indigo-950/70 border-indigo-400 ring-1 ring-indigo-400/50 shadow-md'
                            : 'bg-slate-900/80 border-slate-700/80 hover:bg-slate-850 hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${r.badgeColor}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-white group-hover:text-amber-300 transition-colors truncate">
                              {r.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                            {r.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* DEPARTMENT SELECTION */}
          <div className="space-y-1.5 pt-1">
            <label htmlFor="select-role-dept" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>{isEs ? 'Departamento Asignado:' : isFr ? 'Département Assigné :' : isEn ? 'Assigned Department:' : 'Depatman Asiyen:'}</span>
            </label>
            <select
              id="select-role-dept"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              <option value="Service Général">Service Général / Kilt Jeneral</option>
              <option value="Dominical">Dominical / Kilt Dimanch</option>
              <option value="Étude Biblique">Étude Biblique / Etid Biblik</option>
              <option value="Intercession">Intercession / Lapriyè</option>
              <option value="Jeunesse">Jeunesse / Jèn yo</option>
              <option value="Club des Enfants">Club des Enfants / ECODIM</option>
              <option value="Chorale">Chorale & Louange / Mizik</option>
              <option value="Accueil & Protocole">Accueil & Protocole / Akèy</option>
              <option value="Son & Média">Son & Média / Sonorizasyon</option>
              <option value="Dames">Dames / Dam</option>
              <option value="Hommes">Hommes / Gason</option>
              <option value="Evangélisation & Misyon">Evangélisation & Misyon</option>
            </select>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-700/80 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer transition-colors"
          >
            {isEs ? 'Cancelar' : isFr ? 'Annuler' : isEn ? 'Cancel' : 'Anile'}
          </button>

          <button
            type="button"
            id="btn-save-member-role"
            disabled={isSaving}
            onClick={handleSaveRole}
            className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSaving
                ? (isEs ? 'Guardando...' : isFr ? 'Enregistrement...' : isEn ? 'Saving...' : 'Ap anrejistre...')
                : (isEs ? 'Guardar Rol & Actualizar Anuncios' : isFr ? 'Enregistrer Rôle & Mettre à Jour Annonces' : isEn ? 'Save Role & Update Rosters' : 'Anrejistre Wòl & Mete Anons Ajou')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
