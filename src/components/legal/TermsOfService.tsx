import React, { useState, useEffect } from 'react';
import { Language } from '../../types';
import { getDeveloperSettings } from '../../utils/developerStorage';
import { parsePlainLegalBlocks } from '../../utils/legalRoutes';
import { TERMS_DEFAULT_CONTENT } from './legalDefaults';

export interface TermsOfServiceProps {
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  onBack?: () => void;
  onNavigatePrivacy?: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({
  language = 'ht',
  onLanguageChange,
  onBack,
  onNavigatePrivacy,
}) => {
  const [activeLang, setActiveLang] = useState<Language>(language);
  const [legalConfig, setLegalConfig] = useState(() => getDeveloperSettings().legalConfig);

  useEffect(() => {
    setActiveLang(language);
  }, [language]);

  useEffect(() => {
    const refresh = () => {
      setLegalConfig(getDeveloperSettings().legalConfig);
    };
    window.addEventListener('omnichurch_dev_settings_updated', refresh);
    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', refresh);
    };
  }, []);

  const handleLangSwitch = (nextLang: Language) => {
    setActiveLang(nextLang);
    if (onLanguageChange) {
      onLanguageChange(nextLang);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  const content = TERMS_DEFAULT_CONTENT[activeLang] || TERMS_DEFAULT_CONTENT.ht;
  const customOverride = legalConfig?.customTerms?.[activeLang];
  const resolvedTitle = customOverride?.title?.trim() || content.title;
  const resolvedDate = customOverride?.lastUpdatedDate?.trim() || content.lastUpdatedDate;
  const customBodyText = customOverride?.content?.trim() || '';
  const customBlocks = customBodyText ? parsePlainLegalBlocks(customBodyText) : [];

  return (
    <div className="min-h-screen w-full bg-white text-black font-sans antialiased selection:bg-gray-200 selection:text-black">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* Top Utility Navigation Line (Flat, No Cards) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-gray-300 text-xs sm:text-sm print:hidden">
          <button
            type="button"
            id="legal-terms-back-btn"
            onClick={handleBack}
            className="text-black hover:underline font-medium cursor-pointer bg-transparent border-0 p-0"
          >
            {content.backLabel}
          </button>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-1.5" role="group" aria-label="Language">
              {(['ht', 'fr', 'en', 'es'] as Language[]).map((code, idx) => (
                <React.Fragment key={code}>
                  {idx > 0 && <span className="text-gray-400">/</span>}
                  <button
                    type="button"
                    onClick={() => handleLangSwitch(code)}
                    className={`uppercase cursor-pointer bg-transparent border-0 p-0 ${
                      activeLang === code
                        ? 'font-bold text-black underline underline-offset-4'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    {code}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {onNavigatePrivacy && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  id="legal-terms-to-privacy-btn"
                  onClick={onNavigatePrivacy}
                  className="text-black underline underline-offset-2 hover:text-gray-700 cursor-pointer bg-transparent border-0 p-0"
                >
                  {content.otherDocLinkLabel}
                </button>
              </>
            )}

            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="text-gray-700 hover:text-black hover:underline cursor-pointer bg-transparent border-0 p-0"
            >
              {content.printLabel}
            </button>
          </div>
        </div>

        {/* Document Header */}
        <header className="pt-8 pb-6 border-b border-gray-300">
          <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold mb-2">
            {content.brand}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
            {resolvedTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-700 mt-2">
            {content.lastUpdatedLabel} {resolvedDate}
          </p>
          <p className="text-xs sm:text-sm text-gray-700 mt-1">
            {content.effectiveLabel}
          </p>
        </header>

        {/* Document Body */}
        <main className="py-6 space-y-6 text-sm sm:text-[15px] leading-relaxed text-black">
          {customBlocks.length > 0 ? (
            customBlocks.map((block, idx) => {
              if (block.type === 'heading') {
                return (
                  <h2 key={idx} className="text-base sm:text-lg font-bold text-black pt-3">
                    {block.text}
                  </h2>
                );
              }
              if (block.type === 'list') {
                return (
                  <ul key={idx} className="list-disc pl-6 space-y-1.5 text-gray-900">
                    {block.items.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-gray-900 whitespace-pre-line">
                  {block.text}
                </p>
              );
            })
          ) : (
            <>
              <p>{content.intro}</p>

              {content.sections.map((section) => (
                <section key={section.title} className="space-y-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-black pt-2">
                    {section.title}
                  </h2>
                  {section.paragraphs?.map((para, idx) => (
                    <p key={idx} className="text-gray-900">
                      {para}
                    </p>
                  ))}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc pl-6 space-y-1.5 text-gray-900">
                      {section.bullets.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </>
          )}
        </main>

        {/* Document Footer */}
        <footer className="pt-6 mt-6 border-t border-gray-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-700">
          <span>{content.footerNote}</span>
          <div className="flex items-center gap-3 print:hidden">
            {onNavigatePrivacy && (
              <button
                type="button"
                onClick={onNavigatePrivacy}
                className="text-black underline hover:text-gray-700 cursor-pointer bg-transparent border-0 p-0"
              >
                {content.otherDocLinkLabel}
              </button>
            )}
            <button
              type="button"
              onClick={handleBack}
              className="text-black underline hover:text-gray-700 cursor-pointer bg-transparent border-0 p-0"
            >
              {content.backLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TermsOfService;
