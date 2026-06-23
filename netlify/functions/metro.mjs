import { getMetroData } from './_metroCore.mjs';

// Prod (Netlify) proxy: gov API'sini sunucu tarafında çeker, temiz JSON döner.
export const handler = async () => {
  try {
    const data = await getMetroData();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: String(e?.message || e) }),
    };
  }
};
