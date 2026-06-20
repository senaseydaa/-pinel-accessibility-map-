import { getAccessibleInfra } from './_osmCore.mjs';

// Prod (Netlify) proxy: Overpass'ı sunucu tarafında çeker, temiz JSON döner.
export const handler = async () => {
  try {
    const data = await getAccessibleInfra();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1800',
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
