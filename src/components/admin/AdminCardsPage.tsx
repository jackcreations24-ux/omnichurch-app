import React from 'react';
import { Church, Member, Language } from '../../types';
import { PrintMemberCardModal } from '../PrintMemberCardModal';

interface AdminCardsPageProps {
  church: Church;
  allMembers: Member[];
  initialMember?: Member;
  language?: Language;
  onBack: () => void;
}

export const AdminCardsPage: React.FC<AdminCardsPageProps> = ({
  church,
  allMembers,
  initialMember,
  language,
  onBack,
}) => {
  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      <PrintMemberCardModal
        church={church}
        allMembers={allMembers}
        initialMember={initialMember}
        language={language}
        onClose={onBack}
        onBack={onBack}
        fullPage={true}
      />
    </div>
  );
};
