// Meta tagi, canonical, Open Graph i dane strukturalne JSON-LD.
const site = require('../config/site');
const { TYPE_BY_KEY } = require('../config/property');

function abs(path) {
  if (!path) return site.url;
  if (/^https?:\/\//.test(path)) return path;
  return site.url + (path.startsWith('/') ? path : '/' + path);
}

function setSeo(res, opts = {}) {
  const seo = res.locals.seo || {};
  Object.assign(seo, opts);
  if (opts.title) seo.fullTitle = opts.title.includes(site.name) ? opts.title : `${opts.title} | ${site.name}`;
  if (opts.path !== undefined) seo.canonical = abs(opts.path);
  if (opts.breadcrumbs) seo.jsonld = [...(seo.jsonld || []), breadcrumbLd(opts.breadcrumbs)];
  res.locals.seo = seo;
  res.locals.breadcrumbs = opts.breadcrumbs || res.locals.breadcrumbs || null;
}

function addJsonLd(res, obj) {
  if (!obj) return;
  res.locals.seo = res.locals.seo || {};
  res.locals.seo.jsonld = [...(res.locals.seo.jsonld || []), obj];
}

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.url) }))
  };
}

function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': site.url + '/#organization',
    name: site.name,
    url: site.url,
    logo: abs('/img/logo.png'),
    email: site.contact.email,
    telephone: site.contact.phone,
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Województwo pomorskie' },
      { '@type': 'AdministrativeArea', name: 'Województwo zachodniopomorskie' }
    ],
    sameAs: Object.values(site.socials).filter(Boolean)
  };
}

function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': site.url + '/#website',
    name: site.name,
    url: site.url,
    inLanguage: 'pl-PL',
    publisher: { '@id': site.url + '/#organization' },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: site.url + '/szukaj?q={search_term_string}' },
      'query-input': 'required name=search_term_string'
    }
  };
}

function listingLd(l, agency) {
  const t = TYPE_BY_KEY[l.type];
  const img = (l.images || []).map((i) => abs(i.url));
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: l.title,
    url: abs(l.url),
    description: (l.description || '').slice(0, 500),
    datePosted: (l.publishedAt || l.createdAt || new Date()).toISOString(),
    image: img.length ? img : [abs('/img/og-default.jpg')],
    offers: {
      '@type': 'Offer',
      price: l.price,
      priceCurrency: 'PLN',
      availability: l.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      businessFunction: l.transaction === 'wynajem' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell'
    },
    about: {
      '@type': l.type === 'dom' ? 'SingleFamilyResidence' : l.type === 'mieszkanie' || l.type === 'pokoj' ? 'Apartment' : 'Place',
      name: t ? t.label : 'Nieruchomość',
      floorSize: l.area ? { '@type': 'QuantitativeValue', value: l.area, unitCode: 'MTK' } : undefined,
      numberOfRooms: l.rooms || undefined,
      address: {
        '@type': 'PostalAddress',
        addressLocality: l.cityName,
        addressRegion: l.voivodeship === 'pomorskie' ? 'pomorskie' : 'zachodniopomorskie',
        streetAddress: l.showExactAddress && l.street ? l.street : undefined,
        addressCountry: 'PL'
      },
      geo: l.lat && l.lng ? { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } : undefined
    }
  };
  if (agency) obj.offers.seller = { '@type': 'RealEstateAgent', name: agency.name, url: abs('/biuro/' + agency.slug) };
  return obj;
}

function agencyLd(a, cityName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: a.name,
    url: abs('/biuro/' + a.slug),
    logo: a.logo ? abs(a.logo) : undefined,
    image: a.cover ? abs(a.cover) : a.logo ? abs(a.logo) : abs('/img/og-default.jpg'),
    telephone: a.phone || undefined,
    email: a.email || undefined,
    description: a.shortDescription || undefined,
    address: { '@type': 'PostalAddress', streetAddress: a.address || undefined, addressLocality: cityName || undefined, addressCountry: 'PL' },
    sameAs: Object.values(a.socials || {}).filter(Boolean)
  };
}

function itemListLd(listings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: listings.slice(0, 24).map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(l.url), name: l.title }))
  };
}

function faqLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
  };
}

function articleLd(a) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.excerpt,
    datePublished: a.date,
    dateModified: a.updated || a.date,
    author: { '@type': 'Organization', name: site.name },
    publisher: { '@id': site.url + '/#organization' },
    mainEntityOfPage: abs('/poradnik/' + a.slug),
    image: abs('/img/og-default.jpg')
  };
}

module.exports = { abs, setSeo, addJsonLd, breadcrumbLd, organizationLd, websiteLd, listingLd, agencyLd, itemListLd, faqLd, articleLd };
