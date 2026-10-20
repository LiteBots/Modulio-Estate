// Ustawienia marki i danych firmy. Wszystko można nadpisać zmiennymi w Railway (Variables).
const env = process.env;

const siteUrl = (env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

module.exports = {
  name: 'ModulioEstate',
  url: siteUrl,
  locale: 'pl_PL',
  tagline: 'Nieruchomości na Pomorzu i Pomorzu Zachodnim',
  description:
    'Ogłoszenia nieruchomości w województwie pomorskim i zachodniopomorskim: mieszkania, domy, działki i lokale na sprzedaż i wynajem w Trójmieście, Słupsku, Koszalinie, Szczecinie i okolicach.',
  region: 'Pomorskie i Zachodniopomorskie',
  contact: {
    email: env.CONTACT_EMAIL || 'kontakt@modulioestate.pl',
    partnersEmail: env.PARTNERS_EMAIL || env.CONTACT_EMAIL || 'partnerzy@modulioestate.pl',
    adsEmail: env.ADS_EMAIL || env.CONTACT_EMAIL || 'reklama@modulioestate.pl',
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
    facebook: env.SOCIAL_FACEBOOK || 'https://www.facebook.com/modulioestate',
    instagram: env.SOCIAL_INSTAGRAM || 'https://www.instagram.com/modulioestate',
    linkedin: env.SOCIAL_LINKEDIN || 'https://www.linkedin.com/company/modulioestate',
    tiktok: env.SOCIAL_TIKTOK || 'https://www.tiktok.com/@modulioestate',
    youtube: env.SOCIAL_YOUTUBE || 'https://www.youtube.com/@modulioestate'
  },
  colors: {
    navy: '#18325a',
    teal: '#37908f',
    orange: '#e9733b',
    yellow: '#f4a942',
    paper: '#f7f6f2'
  },
  perPage: 24
};
