// modules/marketing/services/metaAds.js — Conector con Meta Marketing API

async function getOverview(days = 30) {
    if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
        return null; // El router hará fallback
    }

    const accountId = process.env.META_AD_ACCOUNT_ID;
    const token = process.env.META_ACCESS_TOKEN;
    const version = 'v25.0';

    try {
        // Consultar el endpoint de insights de Meta
        const url = `https://graph.facebook.com/${version}/${accountId}/insights?fields=spend,impressions,inline_link_clicks,actions&date_preset=last_${days}_days&access_token=${token}`;
        
        // fetch está disponible globalmente en Node 18+ (especificado en package.json engines)
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const insights = data.data && data.data[0];
        if (!insights) {
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

        const spend = parseFloat(insights.spend || 0);
        const clicks = parseInt(insights.inline_link_clicks || 0);
        const impressions = parseInt(insights.impressions || 0);
        
        // Meta reporta conversiones en el array de actions
        let leads = 0;
        if (insights.actions) {
            const leadAction = insights.actions.find(a => a.action_type === 'lead' || a.action_type === 'submit_application');
            leads = leadAction ? parseInt(leadAction.value) : 0;
        }

        return {
            spend: Math.round(spend),
            leads: leads,
            clicks: clicks,
            impressions: impressions,
            cpl: leads > 0 ? Math.round(spend / leads) : 0,
            cpc: clicks > 0 ? Math.round(spend / clicks) : 0,
            ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
            conversions: leads
        };
    } catch (err) {
        console.error('Error en servicio Meta Ads:', err.message);
        return null;
    }
}

async function getCampaigns() {
    if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
        return null;
    }

    const accountId = process.env.META_AD_ACCOUNT_ID;
    const token = process.env.META_ACCESS_TOKEN;
    const version = 'v25.0';

    try {
        const url = `https://graph.facebook.com/${version}/${accountId}/campaigns?fields=name,status,insights{spend,impressions,inline_link_clicks,actions}&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);

        return (data.data || []).map(camp => {
            const insights = camp.insights && camp.insights.data && camp.insights.data[0];
            const spend = parseFloat(insights?.spend || 0);
            const clicks = parseInt(insights?.inline_link_clicks || 0);
            const impressions = parseInt(insights?.impressions || 0);
            let leads = 0;
            if (insights?.actions) {
                const leadAction = insights.actions.find(a => a.action_type === 'lead');
                leads = leadAction ? parseInt(leadAction.value) : 0;
            }

            return {
                id: camp.id,
                nombre: camp.name,
                plataforma: 'meta',
                estado: camp.status === 'ACTIVE' ? 'Activa' : 'Pausada',
                gasto: Math.round(spend),
                impresiones: impressions,
                clics: clicks,
                ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
                conversions: leads,
                cpa: leads > 0 ? Math.round(spend / leads) : 0
            };
        });
    } catch (err) {
        console.error('Error al obtener campañas de Meta Ads:', err.message);
        return null;
    }
}

module.exports = {
    getOverview,
    getCampaigns
};
