import React from 'react';
import { ContactSection, LeadershipContactInfo, DEFAULT_LEADERSHIP_CONTACTS } from './ContactSection';

export { DEFAULT_LEADERSHIP_CONTACTS };
export type { LeadershipContactInfo };

interface ContactChoirSectionProps {
  contacts?: LeadershipContactInfo;
  className?: string;
}

export const ContactChoirSection: React.FC<ContactChoirSectionProps> = (props) => {
  return <ContactSection {...props} />;
};
