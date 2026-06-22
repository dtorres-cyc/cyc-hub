// modules/marketing/services/googleAds.js — Conector con Google Ads API (REST)

async function getOverview(days = 30) {
    if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN || !process.env.GOOGLE_ADS_CUSTOMER_ID || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
        return null;
    }

    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, '');
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const managerId = process.env.GOOGLE_ADS_MANAGER_ID; // Opcional

    try {
        // 1. Obtener Access Token a partir del Refresh Token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken
            })
        });
        const tokenData = await tokenRes.json();
        
        if (tokenData.error) {
            throw new Error(`Auth Error: ${tokenData.error_description || tokenData.error}`);
        }

        const accessToken = tokenData.access_token;

        // 2. Ejecutar la query GAQL en la API de Google Ads
        const url = `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`;
        
        // Mapear el período de días a formato GAQL
        let dateRange = 'LAST_30_DAYS';
        if (days === 7) dateRange = 'LAST_7_DAYS';
        else if (days === 90) dateRange = 'LAST_90_DAYS';

        const query = `
            SELECT 
                metrics.cost_micros, 
                metrics.clicks, 
                metrics.impressions, 
                metrics.conversions 
            FROM customer 
            LIMIT 1
        `;

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json'
        };

        if (managerId) {
            headers['login-customer-id'] = managerId.replace(/-/g, '');
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ query })
        });

        const data = await res.json();
        if (data.error || (data[0] && data[0].error)) {
            throw new Error(data.error ? data.error.message : 'API error response');
        }

        // Parsear resultados
        const metrics = data.results && data.results[0] && data.results[0].metrics;
        if (!metrics) {
            return {
                spend: 0,
                leads: 0,
                clicks: 0,
                impressions: 0,
                cpl: 0,
                cpc: 0,
                ctr: 0,
                conversions: 0
            };
        }

        // Google Ads reporta costo en micro-monedas (dividir por 1,000,000)
        const spend = parseFloat(metrics.costMicros || 0) / 1000000;
        const clicks = parseInt(metrics.clicks || 0);
        const impressions = parseInt(metrics.impressions || 0);
        const conversions = parseFloat(metrics.conversions || 0);

        return {
            spend: Math.round(spend),
            leads: Math.round(conversions),
            clicks: clicks,
            impressions: impressions,
            cpl: conversions > 0 ? Math.round(spend / conversions) : 0,
            cpc: clicks > 0 ? Math.round(spend / clicks) : 0,
            ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
            conversions: Math.round(conversions)
        };
    } catch (err) {
        console.error('Error en servicio Google Ads:', err.message);
        return null;
    }
}

async function getCampaigns() {
    if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN || !process.env.GOOGLE_ADS_CUSTOMER_ID || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
        return null;
    }

    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, '');
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const managerId = process.env.GOOGLE_ADS_MANAGER_ID;

    try {
        // 1. Obtener access token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken
            })
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description);
        const accessToken = tokenData.access_token;

        // 2. Query de campañas
        const url = `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`;
        const query = `
            SELECT 
                campaign.id, 
                campaign.name, 
                campaign.status, 
                metrics.cost_micros, 
                metrics.impressions, 
                metrics.clicks, 
                metrics.conversions 
            FROM campaign 
            WHERE campaign.status IN ('ENABLED', 'PAUSED')
        `;

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json'
        };
        if (managerId) headers['login-customer-id'] = managerId.replace(/-/g, '');

        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ query })
        });
        const data = await res.json();

        return (data.results || []).map(row => {
            const c = row.campaign;
            const m = row.metrics;
            const spend = parseFloat(m.costMicros || 0) / 1000000;
            const clicks = parseInt(m.clicks || 0);
            const impressions = parseInt(m.impressions || 0);
            const conversions = parseFloat(m.conversions || 0);

            return {
                id: c.id,
                nombre: c.name,
                plataforma: 'google',
                estado: c.status === 'ENABLED' ? 'Activa' : 'Pausada',
                gasto: Math.round(spend),
                impresiones: impressions,
                clics: clicks,
                ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
                conversions: Math.round(conversions),
                cpa: conversions > 0 ? Math.round(spend / conversions) : 0
            };
        });
    } catch (err) {
        console.error('Error al obtener campañas de Google Ads:', err.message);
        return null;
    }
}

module.exports = {
    getOverview,
    getCampaigns
};
