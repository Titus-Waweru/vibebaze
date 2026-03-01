import { Helmet } from "react-helmet-async";

const BASE_URL = "https://www.vibebaze.com";
const DEFAULT_IMAGE = `${BASE_URL}/social-preview.png`;
const SITE_NAME = "VibeBaze";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
}

const SEO = ({
  title = "VibeBaze - Africa's Creator Platform | Share, Connect, Earn",
  description = "VibeBaze is Africa's premier creator platform. Share videos, photos, and connect with millions. Earn with M-PESA, no barriers. Join 10K+ African creators today!",
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
}: SEOProps) => {
  const url = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@VibeBaze" />
      <meta name="twitter:creator" content="@VibeBaze" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
