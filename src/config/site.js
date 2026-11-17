// Ustawienia marki i danych firmy. Wszystko można nadpisać zmiennymi w Railway (Variables).
const env = process.env;

const siteUrl = (env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

module.exports = {
  name: 'NieruchomosciPomorza.pl',
  url: siteUrl,
  locale: 'pl_PL',
  tagline: 'Nieruchomości z całego wybrzeża – od Świnoujścia po Krynicę Morską',
  description:
    'Ogłoszenia nieruchomości w województwie pomorskim i zachodniopomorskim: mieszkania, domy, działki i lokale na sprzedaż i wynajem w Trójmieście, Słupsku, Koszalinie, Szczecinie i okolicach.',
  region: 'Pomorskie i Zachodniopomorskie',
  contact: {
    email: env.CONTACT_EMAIL || 'kontakt@nieruchomoscipomorza.pl',
    partnersEmail: env.PARTNERS_EMAIL || env.CONTACT_EMAIL || 'partnerzy@nieruchomoscipomorza.pl',
    adsEmail: env.ADS_EMAIL || env.CONTACT_EMAIL || 'reklama@nieruchomoscipomorza.pl',
    phone: env.CONTACT_PHONE || '+48 000 000 000',
    hours: env.CONTACT_HOURS || 'pon.–pt. 8:00–17:00'
  },
  // Dane operatora serwisu – uzupełnij w Railway, pojawiają się w regulaminie, polityce prywatności i stopce.
  company: {
    name: env.COMPANY_NAME || '[Nazwa firmy operatora]',
    address: env.COMPANY_ADDRESS || '[Adres siedziby]',
    nip: env.COMPANY_NIP || '[NIP]',
    regon: env.COMPANY_REGON || ''
  },
  socials: {
    facebook: env.SOCIAL_FACEBOOK || 'https://www.facebook.com/nieruchomoscipomorza',
    instagram: env.SOCIAL_INSTAGRAM || 'https://www.instagram.com/nieruchomoscipomorza',
    linkedin: env.SOCIAL_LINKEDIN || 'https://www.linkedin.com/company/nieruchomoscipomorza',
    tiktok: env.SOCIAL_TIKTOK || 'https://www.tiktok.com/@nieruchomoscipomorza',
    youtube: env.SOCIAL_YOUTUBE || 'https://www.youtube.com/@nieruchomoscipomorza'
  },
  colors: {
    navy: '#17221d',
    teal: '#4f7560',
    orange: '#ff7b1c',
    yellow: '#f4a942',
    paper: '#f7f6f2'
  },
  perPage: 24
};
