export const BRAND_PLATFORM_TYPES = [
  "All",
  "E-Commerce & Retail",
  "Tech & Software",
  "Lifestyle & Wellness",
  "Education & Courses",
  "Finance & Business"
];

export const amazonAssociatesCountryPrograms = [
  {
    country: "United States",
    domain: "amazon.com",
    applyUrl: "https://affiliate-program.amazon.com/"
  },
  {
    country: "India",
    domain: "amazon.in",
    applyUrl: "https://affiliate-program.amazon.in/"
  },
  {
    country: "United Kingdom",
    domain: "amazon.co.uk",
    applyUrl: "https://affiliate-program.amazon.co.uk/"
  },
  {
    country: "Canada",
    domain: "amazon.ca",
    applyUrl: "https://associates.amazon.ca/"
  },
  {
    country: "Germany",
    domain: "amazon.de",
    applyUrl: "https://partnernet.amazon.de/"
  },
  {
    country: "France",
    domain: "amazon.fr",
    applyUrl: "https://partenaires.amazon.fr/"
  },
  {
    country: "Italy",
    domain: "amazon.it",
    applyUrl: "https://programma-affiliazione.amazon.it/"
  },
  {
    country: "Spain",
    domain: "amazon.es",
    applyUrl: "https://afiliados.amazon.es/"
  },
  {
    country: "Japan",
    domain: "amazon.co.jp",
    applyUrl: "https://affiliate.amazon.co.jp/"
  },
  {
    country: "Singapore",
    domain: "amazon.sg",
    applyUrl: "https://affiliate-program.amazon.sg/"
  },
  {
    country: "Netherlands",
    domain: "amazon.nl",
    applyUrl: "https://partnernet.amazon.nl/"
  },
  {
    country: "Saudi Arabia",
    domain: "amazon.sa",
    applyUrl: "https://affiliate-program.amazon.sa/"
  },
  {
    country: "Poland",
    domain: "amazon.pl",
    applyUrl: "https://affiliate-program.amazon.pl/"
  },
  {
    country: "Sweden",
    domain: "amazon.se",
    applyUrl: "https://affiliate-program.amazon.se/"
  },
  {
    country: "Australia",
    domain: "amazon.com.au",
    applyUrl: "https://affiliate-program.amazon.com.au/"
  }
];

export const brandPrograms = [
  {
    id: "amazon-associates",
    name: "Amazon Associates",
    platformType: "E-Commerce & Retail",
    domain: "amazon.com",
    logoUrl: "https://logo.clearbit.com/amazon.com",
    commission: "1%–10%",
    fit: "Beginners and niche bloggers",
    highlight: "Trusted brand, wide product range",
    applyUrl: "https://affiliate-program.amazon.com/",
    countryPrograms: amazonAssociatesCountryPrograms
  },
  {
    id: "walmart-affiliate",
    name: "Walmart Affiliate Program",
    platformType: "E-Commerce & Retail",
    domain: "walmart.com",
    logoUrl: "https://logo.clearbit.com/walmart.com",
    commission: "1%–4%",
    fit: "Product variety creators",
    highlight: "Reliable tracking, broad catalog",
    applyUrl: "https://affiliates.walmart.com/"
  },
  {
    id: "target-affiliates",
    name: "Target Affiliates",
    platformType: "E-Commerce & Retail",
    domain: "target.com",
    logoUrl: "https://logo.clearbit.com/target.com",
    commission: "Up to 8%",
    fit: "Curated product creators",
    highlight: "Clean interface, curated products",
    applyUrl: "https://partners.target.com/"
  },
  {
    id: "shopify-affiliate",
    name: "Shopify Affiliate Program",
    platformType: "E-Commerce & Retail",
    domain: "shopify.com",
    logoUrl: "https://logo.clearbit.com/shopify.com",
    commission: "$150 per referral",
    fit: "Entrepreneurs and tech bloggers",
    highlight: "Strong fit for business content",
    applyUrl: "https://www.shopify.com/affiliates"
  },
  {
    id: "etsy-affiliate",
    name: "Etsy Affiliate Program",
    platformType: "E-Commerce & Retail",
    domain: "etsy.com",
    logoUrl: "https://logo.clearbit.com/etsy.com",
    commission: "4%",
    fit: "Handmade, craft, and art creators",
    highlight: "Great for niche product storytelling",
    applyUrl: "https://www.etsy.com/affiliates"
  },
  {
    id: "flipkart-affiliate",
    name: "Flipkart Affiliate Program",
    platformType: "E-Commerce & Retail",
    domain: "flipkart.com",
    logoUrl: "https://logo.clearbit.com/flipkart.com",
    commission: "Varies by category",
    fit: "India-focused commerce creators",
    highlight: "Strong local marketplace reach for product-led content",
    applyUrl: "https://affiliate.flipkart.com/",
    commissionDetails: [
      "Fashion categories can reach 8%.",
      "Books, general merchandise, furniture, and grocery are commonly 4%.",
      "Home, appliances, and several electronics categories are commonly 3%.",
      "Mobiles can be much lower, including 1%, 0.5%, or 0% depending on tier."
    ],
    joinSteps: [
      {
        title: "Sign up for the affiliate program",
        detail: "Create or activate your Flipkart affiliate account."
      },
      {
        title: "Copy and paste your affiliate link",
        detail: "Save your Flipkart tracking link back in Atribe."
      },
      {
        title: "Earn when your shoppers shop",
        detail: "Atribe can route future Flipkart support through your link."
      }
    ],
    commissionFootnote: "Rates are category-based and can change by month, with some categories excluded."
  },
  {
    id: "bluehost",
    name: "Bluehost",
    platformType: "Tech & Software",
    domain: "bluehost.com",
    logoUrl: "https://logo.clearbit.com/bluehost.com",
    commission: "$65+ per signup",
    fit: "Web hosting review creators",
    highlight: "Popular with blog and startup audiences",
    applyUrl: "https://www.bluehost.com/affiliates"
  },
  {
    id: "canva-pro",
    name: "Canva Pro Affiliate Program",
    platformType: "Tech & Software",
    domain: "canva.com",
    logoUrl: "https://logo.clearbit.com/canva.com",
    commission: "15% recurring",
    fit: "Designers and marketers",
    highlight: "Strong recurring model",
    applyUrl: "https://www.canva.com/affiliates/"
  },
  {
    id: "nordvpn",
    name: "NordVPN",
    platformType: "Tech & Software",
    domain: "nordvpn.com",
    logoUrl: "https://logo.clearbit.com/nordvpn.com",
    commission: "Up to 40%",
    fit: "Privacy and productivity creators",
    highlight: "Popular and high-converting",
    applyUrl: "https://nordvpn.com/affiliate/"
  },
  {
    id: "adobe-creative-cloud",
    name: "Adobe Creative Cloud",
    platformType: "Tech & Software",
    domain: "adobe.com",
    logoUrl: "https://logo.clearbit.com/adobe.com",
    commission: "85% of first month / 8.33% recurring",
    fit: "Creative professionals",
    highlight: "Trusted software for creator audiences",
    applyUrl: "https://www.adobe.com/affiliate-program.html"
  },
  {
    id: "convertkit",
    name: "ConvertKit",
    platformType: "Tech & Software",
    domain: "convertkit.com",
    logoUrl: "https://logo.clearbit.com/convertkit.com",
    commission: "30% recurring",
    fit: "Bloggers and email marketers",
    highlight: "Strong match for audience-building content",
    applyUrl: "https://convertkit.com/affiliate"
  },
  {
    id: "hellofresh",
    name: "HelloFresh",
    platformType: "Lifestyle & Wellness",
    domain: "hellofresh.com",
    logoUrl: "https://logo.clearbit.com/hellofresh.com",
    commission: "$10–$15 per sale",
    fit: "Food bloggers and lifestyle influencers",
    highlight: "Easy product storytelling for routines",
    applyUrl: "https://www.hellofresh.com/pages/affiliate-program"
  },
  {
    id: "noom",
    name: "Noom Affiliate Program",
    platformType: "Lifestyle & Wellness",
    domain: "noom.com",
    logoUrl: "https://logo.clearbit.com/noom.com",
    commission: "Up to $20 per sale",
    fit: "Health and wellness creators",
    highlight: "Trending health topic",
    applyUrl: "https://www.noom.com/affiliates/"
  },
  {
    id: "fabletics",
    name: "Fabletics",
    platformType: "Lifestyle & Wellness",
    domain: "fabletics.com",
    logoUrl: "https://logo.clearbit.com/fabletics.com",
    commission: "$10 per VIP signup",
    fit: "Fitness and fashion influencers",
    highlight: "Works well for active lifestyle content",
    applyUrl: "https://www.fabletics.com/affiliates"
  },
  {
    id: "sephora",
    name: "Sephora",
    platformType: "Lifestyle & Wellness",
    domain: "sephora.com",
    logoUrl: "https://logo.clearbit.com/sephora.com",
    commission: "Up to 10%",
    fit: "Beauty bloggers and makeup artists",
    highlight: "Strong beauty category recognition",
    applyUrl: "https://www.sephora.com/beauty/affiliate-program"
  },
  {
    id: "booking",
    name: "Booking.com",
    platformType: "Lifestyle & Wellness",
    domain: "booking.com",
    logoUrl: "https://logo.clearbit.com/booking.com",
    commission: "Variable per booking",
    fit: "Travel and lifestyle creators",
    highlight: "Global trust and broad traveler demand",
    applyUrl: "https://www.booking.com/content/affiliate-program.html"
  },
  {
    id: "coursera",
    name: "Coursera",
    platformType: "Education & Courses",
    domain: "coursera.org",
    logoUrl: "https://logo.clearbit.com/coursera.org",
    commission: "10%–45%",
    fit: "Upskilling and career creators",
    highlight: "Strong demand in learning content",
    applyUrl: "https://www.coursera.org/about/affiliates"
  },
  {
    id: "skillshare",
    name: "Skillshare",
    platformType: "Education & Courses",
    domain: "skillshare.com",
    logoUrl: "https://logo.clearbit.com/skillshare.com",
    commission: "$7 per signup",
    fit: "Creative niches and educators",
    highlight: "Accessible fit for creator audiences",
    applyUrl: "https://www.skillshare.com/en/affiliates"
  },
  {
    id: "masterclass",
    name: "MasterClass",
    platformType: "Education & Courses",
    domain: "masterclass.com",
    logoUrl: "https://logo.clearbit.com/masterclass.com",
    commission: "25% per sale",
    fit: "Culture and creative educators",
    highlight: "Celebrity-led catalog converts attention",
    applyUrl: "https://www.masterclass.com/affiliate"
  },
  {
    id: "teachable",
    name: "Teachable",
    platformType: "Education & Courses",
    domain: "teachable.com",
    logoUrl: "https://logo.clearbit.com/teachable.com",
    commission: "30%",
    fit: "Coaches and digital educators",
    highlight: "Great fit for course-led businesses",
    applyUrl: "https://teachable.com/affiliate-program"
  },
  {
    id: "udemy",
    name: "Udemy",
    platformType: "Education & Courses",
    domain: "udemy.com",
    logoUrl: "https://logo.clearbit.com/udemy.com",
    commission: "Up to 15%",
    fit: "Broad educational content",
    highlight: "Huge variety of courses",
    applyUrl: "https://www.udemy.com/affiliate/"
  },
  {
    id: "fiverr",
    name: "Fiverr Affiliates",
    platformType: "Finance & Business",
    domain: "fiverr.com",
    logoUrl: "https://logo.clearbit.com/fiverr.com",
    commission: "$15–$150 CPA",
    fit: "Freelance and side-hustle creators",
    highlight: "Popular with entrepreneurship audiences",
    applyUrl: "https://affiliates.fiverr.com/"
  },
  {
    id: "freshbooks",
    name: "FreshBooks",
    platformType: "Finance & Business",
    domain: "freshbooks.com",
    logoUrl: "https://logo.clearbit.com/freshbooks.com",
    commission: "$10 trial / $200 paid",
    fit: "Small business and freelance creators",
    highlight: "Strong fit for operations content",
    applyUrl: "https://www.freshbooks.com/affiliates"
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    platformType: "Finance & Business",
    domain: "quickbooks.intuit.com",
    logoUrl: "https://logo.clearbit.com/intuit.com",
    commission: "Variable",
    fit: "Business and finance creators",
    highlight: "Recognized and trusted brand",
    applyUrl: "https://quickbooks.intuit.com/accountants/resources/affiliate-program/"
  },
  {
    id: "robinhood",
    name: "Robinhood",
    platformType: "Finance & Business",
    domain: "robinhood.com",
    logoUrl: "https://logo.clearbit.com/robinhood.com",
    commission: "Up to $20",
    fit: "Finance blogs and Gen Z creators",
    highlight: "Accessible investing brand recognition",
    applyUrl: "https://robinhood.com/us/en/support/articles/referrals/"
  }
];
