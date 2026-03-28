/**
 * Dilling Knowledge Base
 *
 * Static KB articles for the AI agent to answer FAQs about
 * shipping, returns, materials, care, brand story, and more.
 */

export interface KBArticle {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  url: string;
}

export const KNOWLEDGE_BASE: KBArticle[] = [
  // ─── Brand & About ───────────────────────────────────────
  {
    id: "about-dilling",
    title: "Om Dilling / About Dilling",
    category: "About",
    keywords: ["about", "om", "dilling", "history", "historie", "brand", "mærke", "bredsten", "1916"],
    url: "https://dk.dilling.com/om-dilling",
    content: `Dilling er en dansk familieejet virksomhed grundlagt i 1916 i Bredsten, Danmark. I over 100 år har Dilling specialiseret sig i undertøj og beklædning i naturmaterialer — primært merinould og økologisk bomuld.

Dilling har eget farveri i Bredsten, hvor alt farves kemikaliefrit. Alle produkter er produceret med fokus på bæredygtighed, kvalitet og komfort.

Dilling is a Danish family-owned company founded in 1916 in Bredsten, Denmark. For over 100 years, Dilling has specialized in underwear and clothing made from natural materials — primarily merino wool and organic cotton.

Dilling operates its own dye house in Bredsten, where all dyeing is done without harmful chemicals. All products are made with a focus on sustainability, quality, and comfort.`,
  },
  {
    id: "sustainability",
    title: "Bæredygtighed / Sustainability",
    category: "About",
    keywords: ["bæredygtighed", "sustainability", "miljø", "environment", "økologisk", "organic", "svanemærket", "nordic swan", "certified"],
    url: "https://dk.dilling.com/baeredygtighed",
    content: `Dilling er engageret i bæredygtighed:
- Eget farveri i Bredsten — kemikaliefri farvning
- Svanemærket (Nordic Swan Ecolabel) på udvalgte produkter
- GOTS-certificeret økologisk bomuld
- Mulesing-fri merinould fra certificerede farme
- Minimal emballage med genbrugsmaterialer
- Langvarige produkter designet til at holde i mange år

Dilling is committed to sustainability:
- Own dye house in Bredsten — chemical-free dyeing
- Nordic Swan Ecolabel on select products
- GOTS-certified organic cotton
- Mulesing-free merino wool from certified farms
- Minimal packaging with recycled materials
- Long-lasting products designed to endure for years`,
  },

  // ─── Materials ───────────────────────────────────────────
  {
    id: "merino-wool",
    title: "Merinould / Merino Wool",
    category: "Materials",
    keywords: ["merinould", "merino wool", "merino", "uld", "wool", "temperatur", "temperature", "lugtfri", "odor"],
    url: "https://dk.dilling.com/merinould",
    content: `Merinould er et premium naturmateriale med unikke egenskaber:
- Temperaturregulerende: holder dig varm om vinteren og kølig om sommeren
- Fugtabsorberende: kan absorbere op til 30% af sin egen vægt i fugt uden at føles våd
- Naturligt lugtreducerende: merinofibrene binder bakterier og reducerer lugt
- Blød og kløfri: fibertykkelse under 19,5 mikron gør materialet blødt mod huden
- UV-beskyttende: naturlig UPF-beskyttelse
- Brandhæmmende: selvudslukkende og produkt af naturlige proteiner

Velegnet til: base layers, activewear, undertøj, sokker og hverdagstøj.

Merino wool is a premium natural material with unique properties:
- Temperature regulating: keeps you warm in winter and cool in summer
- Moisture-wicking: can absorb up to 30% of its own weight in moisture
- Naturally odor-resistant: merino fibers bind bacteria and reduce odor
- Soft and itch-free: fiber thickness under 19.5 microns
- UV-protective: natural UPF protection
- Fire-resistant: self-extinguishing, made of natural proteins`,
  },
  {
    id: "cotton",
    title: "Økologisk Bomuld / Organic Cotton",
    category: "Materials",
    keywords: ["bomuld", "cotton", "økologisk", "organic", "GOTS"],
    url: "https://dk.dilling.com/bomuld",
    content: `Dillings økologiske bomuld er GOTS-certificeret (Global Organic Textile Standard):
- Dyrket uden pesticider og kunstgødning
- Blød, åndbar og komfortabel
- Hypoallergenisk — velegnet til sensitiv hud
- Ideel til varmere vejr og hverdagsbrug

Organic cotton is GOTS-certified:
- Grown without pesticides or synthetic fertilizers
- Soft, breathable, and comfortable
- Hypoallergenic — suitable for sensitive skin
- Ideal for warmer weather and everyday wear`,
  },
  {
    id: "wool-silk",
    title: "Uld/Silke / Wool-Silk",
    category: "Materials",
    keywords: ["uld", "silke", "wool", "silk", "blanding", "blend"],
    url: "https://dk.dilling.com/uld-silke",
    content: `Uld/silke-blandingen kombinerer det bedste fra begge materialer:
- Merinouldens varme og fugtregulering
- Silkens lette, glatte og luksuriøse føling
- Ekstra blød mod huden — perfekt til babyer og sensitiv hud
- Tynd og let — perfekt som base layer

The wool-silk blend combines the best of both materials:
- Merino wool's warmth and moisture regulation
- Silk's lightweight, smooth, and luxurious feel
- Extra soft against the skin — perfect for babies and sensitive skin
- Thin and lightweight — perfect as a base layer`,
  },

  // ─── Shipping & Delivery ─────────────────────────────────
  {
    id: "shipping",
    title: "Levering / Shipping",
    category: "Shipping",
    keywords: ["levering", "shipping", "fragt", "delivery", "pakkeshop", "gratis", "free", "forsendelse"],
    url: "https://dk.dilling.com/levering",
    content: `Leveringstider og priser:
- Danmark: Gratis levering til pakkeshop ved køb over 499 DKK. Ellers 39 DKK.
- Levering til døren (PostNord): 59 DKK
- Leveringstid: 2-4 hverdage i Danmark
- EU-lande: levering fra 49 DKK, 3-7 hverdage
- Ordrer afsendes mandag-fredag

Shipping times and prices:
- Denmark: Free delivery to pickup point for orders over 499 DKK. Otherwise 39 DKK.
- Home delivery (PostNord): 59 DKK
- Delivery time: 2-4 business days in Denmark
- EU countries: from 49 DKK, 3-7 business days
- Orders shipped Monday-Friday`,
  },

  // ─── Returns ─────────────────────────────────────────────
  {
    id: "returns",
    title: "Returret / Returns",
    category: "Returns",
    keywords: ["retur", "return", "returret", "bytte", "exchange", "refund", "refundering", "100 dage", "100 days"],
    url: "https://dk.dilling.com/returret",
    content: `Dilling tilbyder 100 dages returret:
- 100 dages fuld returret på alle ubrugte varer med originale mærkater
- Gratis returnering i Danmark via returlabel
- Pengene refunderes til oprindelig betalingsmetode inden for 14 dage
- Brugt undertøj kan ikke returneres af hygiejniske årsager
- Kontakt kundeservice for at starte en returnering

Dilling offers 100-day return policy:
- 100-day full return on all unused items with original tags
- Free returns in Denmark via return label
- Refund to original payment method within 14 days
- Worn underwear cannot be returned for hygiene reasons
- Contact customer service to initiate a return`,
  },

  // ─── Care Instructions ───────────────────────────────────
  {
    id: "care-wool",
    title: "Vaskevejledning Uld / Wool Care",
    category: "Care",
    keywords: ["vask", "wash", "pleje", "care", "uld", "wool", "merinould", "merino", "30 grader"],
    url: "https://dk.dilling.com/vaskevejledning",
    content: `Vaskevejledning for merinould:
- Vask ved maks. 30°C på uldprogram
- Brug uldvaskemiddel (IKKE almindeligt vaskemiddel)
- Undgå skyllemiddel
- Centrifuger forsigtigt eller slet ikke
- Tør fladt — ALDRIG i tørretumbler
- Luft tøjet mellem vask — merinould kræver sjælden vask pga. naturlig lugtreduktion

Wool care instructions:
- Wash at max 30°C on wool cycle
- Use wool detergent (NOT regular detergent)
- Avoid fabric softener
- Gentle spin or none
- Dry flat — NEVER tumble dry
- Air between washes — merino wool needs infrequent washing due to natural odor resistance`,
  },
  {
    id: "care-cotton",
    title: "Vaskevejledning Bomuld / Cotton Care",
    category: "Care",
    keywords: ["vask", "wash", "pleje", "care", "bomuld", "cotton", "60 grader"],
    url: "https://dk.dilling.com/vaskevejledning",
    content: `Vaskevejledning for bomuld:
- Vask ved op til 60°C
- Almindeligt vaskemiddel kan bruges
- Tøj kan tørretumbles ved lav temperatur
- Stryges ved medium temperatur om nødvendigt

Cotton care instructions:
- Wash at up to 60°C
- Regular detergent can be used
- Can be tumble dried on low heat
- Iron on medium if needed`,
  },

  // ─── Sizing ──────────────────────────────────────────────
  {
    id: "sizing",
    title: "Størrelsesguide / Sizing Guide",
    category: "Sizing",
    keywords: ["størrelse", "size", "størrelsesguide", "sizing guide", "pasform", "fit", "mål", "measurements"],
    url: "https://dk.dilling.com/stoerrelse",
    content: `Dillings størrelser følger standard EU-størrelser:
- Dame: XS (34-36), S (36-38), M (38-40), L (40-42), XL (42-44), XXL (44-46)
- Herre: S (44-46), M (48-50), L (52-54), XL (56-58), XXL (60-62)
- Børn: 80-170 cm (alder 1-14 år)
- Baby: 50-86 cm (0-18 måneder)

Tips:
- Merinould har naturlig elasticitet — i tvivl, vælg den mindste størrelse
- Activewear: vælg normal størrelse for tætsiddende fit
- Everyday wear: normal størrelse for komfortabel pasform

Dilling uses standard EU sizes. Merino wool has natural stretch — when in doubt, choose the smaller size. Activewear fits close to the body; everyday wear has a comfortable regular fit.`,
  },
];

/**
 * Search the knowledge base by keyword matching.
 */
export function searchKnowledgeBase(
  query: string,
  opts?: { category?: string; limit?: number }
): KBArticle[] {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/);

  let results = KNOWLEDGE_BASE.filter((article) => {
    if (opts?.category && article.category !== opts.category) return false;
    const keywordMatch = article.keywords.some((kw) =>
      words.some((word) => kw.includes(word) || word.includes(kw))
    );
    const titleMatch = article.title.toLowerCase().includes(lower);
    const contentMatch = article.content.toLowerCase().includes(lower);
    return keywordMatch || titleMatch || contentMatch;
  }).sort((a, b) => {
    const aKeywords = a.keywords.filter((kw) =>
      words.some((word) => kw.includes(word) || word.includes(kw))
    ).length;
    const bKeywords = b.keywords.filter((kw) =>
      words.some((word) => kw.includes(word) || word.includes(kw))
    ).length;
    return bKeywords - aKeywords;
  });

  if (opts?.limit) results = results.slice(0, opts.limit);
  return results;
}
