import React, { createContext, useContext, useState, useEffect } from 'react';
import { parseResponseSafely } from '../utils/api';
import { BrandingSettings, ChoirInfo, LeadershipContactRecord } from '../types';

interface BrandingContextType {
  branding: BrandingSettings;
  choirInfo: ChoirInfo;
  leadershipContacts: LeadershipContactRecord;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
  updateBranding: (data: Partial<BrandingSettings> & Partial<ChoirInfo>) => Promise<void>;
  refreshContacts: () => Promise<void>;
  updateContacts: (data: Partial<LeadershipContactRecord>) => Promise<void>;
}

const defaultBranding: BrandingSettings = {
  id: 'default_branding',
  main_logo_url: '',
  app_icon_url: '',
  splash_logo_url: '',
  light_logo_url: '',
  dark_logo_url: '',
  banner_image_url: '',
  primary_color: '#1e3a8a',
  secondary_color: '#d97706',
  accent_color: '#2563eb',
  background_color: '#f8fafc',
  text_color: '#0f172a',
};

const defaultLeadershipContacts: LeadershipContactRecord = {
  id: 'default_contacts',
  leader_name: '[INSERT NAME]',
  leader_phone: '[INSERT PHONE NUMBER]',
  leader_whatsapp: '[INSERT WHATSAPP NUMBER]',
  leader_title_rw: 'Umuyobozi wa Korali',
  leader_title_en: 'Choir Leader / President',
  secretary_name: '[INSERT NAME]',
  secretary_phone: '[INSERT PHONE NUMBER]',
  secretary_whatsapp: '[INSERT WHATSAPP NUMBER]',
  secretary_title_rw: 'Umunyamabanga wa Korali',
  secretary_title_en: 'Choir Secretary',
  general_phone: '[INSERT PHONE NUMBER]',
  general_whatsapp: '[INSERT WHATSAPP NUMBER]',
  general_email: '[INSERT EMAIL ADDRESS]',
  address: '[INSERT CHOIR ADDRESS]',
  city: 'Kigali',
  country: 'Rwanda',
  weekday_range: 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
  weekday_hours: '[INSERT HOURS]',
  weekend_range: 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
  weekend_hours: '[INSERT HOURS]',
  contact_description_rw: 'Ufite ikibazo, igitekerezo, cyangwa ushaka kumenya byinshi kuri La Lumiere Choir? Twandikire cyangwa utuvugishe ukoresheje bumwe mu buryo bukurikira.',
  contact_description_en: 'Do you have questions, feedback, or need information about La Lumiere Choir? Get in touch with our leadership team using the options below.',
};

const defaultChoirInfo: ChoirInfo = {
  choir_name: 'La Lumiere Choir',
  affiliation: 'ADEPR Nyanza, Kicukiro District, Kigali, Rwanda',
  welcome_message: "Igitabo cy'Indirimbo 92 zo Guhimbaza no Gusingiza Imana muri Korali La Lumiere.",
  scripture_verse: '“Zaburi 147:1; Yobu 8:7”',
  songs_badge_text: '92',
  about_story: 'La Lumiere Choir is a renowned gospel choir based at ADEPR Nyanza in Kicukiro District, Kigali, Rwanda. Dedicated to spreading the Gospel of Jesus Christ through anointed worship, inspiring harmonies, and soul-stirring hymns.',
  mission: 'To illuminate souls with the true Light of Christ through spiritual songs, evangelism, and selfless fellowship.',
  vision: 'A generation transformed and anchored in genuine praise, worship, and devotion to God across Rwanda and the nations.',
  contact_phone: '+250 788 000 000',
  contact_email: 'info@lalumierechoir.rw',
  socials: {
    youtube: 'https://youtube.com/@LaLumiereChoir',
    instagram: 'https://instagram.com/lalumierechoir',
    facebook: 'https://facebook.com/lalumierechoir',
  },
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [choirInfo, setChoirInfo] = useState<ChoirInfo>(defaultChoirInfo);
  const [leadershipContacts, setLeadershipContacts] = useState<LeadershipContactRecord>(defaultLeadershipContacts);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const { data } = await parseResponseSafely<LeadershipContactRecord>(res);
      if (res.ok && data) {
        setLeadershipContacts(prev => ({
          ...prev,
          ...data,
        }));
      }
    } catch (err) {
      console.warn('Failed to load leadership contacts:', err);
    }
  };

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/branding');
      const { data } = await parseResponseSafely<{ branding?: any; settings?: any }>(res);
      if (res.ok && data) {
        if (data.branding && Object.keys(data.branding).length > 0) {
          setBranding({ ...defaultBranding, ...data.branding });
        }
        if (data.settings) {
          setChoirInfo(prev => ({
            ...prev,
            choir_name: data.settings.choir_name || prev.choir_name,
            affiliation: data.settings.church_affiliation || prev.affiliation,
            welcome_message: data.settings.welcome_message || prev.welcome_message,
            scripture_verse: data.settings.scripture_verse || prev.scripture_verse,
            songs_badge_text: data.settings.songs_badge_text || prev.songs_badge_text,
            about_story: data.settings.about_story || prev.about_story,
            mission: data.settings.mission_statement || prev.mission,
            vision: data.settings.vision_statement || prev.vision,
            contact_phone: data.settings.contact_phone || prev.contact_phone,
            contact_email: data.settings.contact_email || prev.contact_email,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load branding:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
    fetchContacts();
  }, []);

  const updateBranding = async (data: any) => {
    const token = localStorage.getItem('lalumiere_token');
    const res = await fetch('/api/admin/branding', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const { errorMessage } = await parseResponseSafely(res);
    if (!res.ok) {
      throw new Error(errorMessage || 'Failed to update branding');
    }

    await fetchBranding();
  };

  const updateContacts = async (data: Partial<LeadershipContactRecord>) => {
    const token = localStorage.getItem('lalumiere_token');
    const res = await fetch('/api/admin/contacts', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const { data: resData, errorMessage } = await parseResponseSafely<{ success?: boolean; message?: string }>(res);
    if (!res.ok) {
      throw new Error(errorMessage || 'Failed to update contact information');
    }

    await fetchContacts();
    await fetchBranding();
  };

  return (
    <BrandingContext.Provider
      value={{
        branding,
        choirInfo,
        leadershipContacts,
        isLoading,
        refreshBranding: fetchBranding,
        updateBranding,
        refreshContacts: fetchContacts,
        updateContacts,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
