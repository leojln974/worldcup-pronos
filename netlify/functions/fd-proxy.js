// Netlify Function : proxy pour football-data.org
// Évite les blocages CORS et cache la clé API côté serveur

const FD_KEY = process.env.FD_API_KEY || '63f7cf9d26f442bca2b4e7a0728d7ec5';
const FD_BASE = 'https://api.football-data.org/v4';

exports.handler = async (event) => {
  const path = event.queryStringParameters?.path;
  if (!path) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing path parameter' }) };
  }

  // Sécurité : autoriser uniquement les paths de football-data
  if (!path.startsWith('/competitions/') && !path.startsWith('/matches')) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden path' }) };
  }

  try {
    const url = FD_BASE + path;
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': FD_KEY,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        // Cache Netlify CDN : 5 minutes pour données live, 1h pour standings
        'Cache-Control': path.includes('status=IN_PLAY') || path.includes('status=PAUSED')
          ? 'public, s-maxage=30, stale-while-revalidate=60'
          : 'public, s-maxage=300, stale-while-revalidate=600',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('FD proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Proxy error', message: error.message }),
    };
  }
};
