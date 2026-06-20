import { getRoute } from './_routeCore.mjs';

// Prod (Netlify) proxy: rota motorunu (ORS anahtarı server tarafında) çağırır.
export const handler = async (event) => {
  try {
    const params = JSON.parse(event.body || '{}');
    const data = await getRoute(params);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
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
