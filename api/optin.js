export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prenom, nom, email, tel } = req.body || {};
  if (!prenom || !nom || !email || !tel) {
    console.error('[optin] Champs manquants:', { prenom: !!prenom, nom: !!nom, email: !!email, tel: !!tel });
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  const PIPELINE_NAME = process.env.GHL_PIPELINE_NAME || '';

  if (!GHL_API_KEY || !LOCATION_ID) {
    console.error('[optin] Variables env manquantes: GHL_API_KEY=' + (GHL_API_KEY ? 'SET' : 'MISSING') + ', GHL_LOCATION_ID=' + (LOCATION_ID ? 'SET' : 'MISSING'));
    return res.status(500).json({ error: 'Configuration GHL manquante' });
  }

  const headers = {
    'Authorization': 'Bearer ' + GHL_API_KEY,
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  };

  try {
    // 1. Create or update contact
    console.log('[optin] Upsert contact:', prenom, nom, email);
    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locationId: LOCATION_ID,
        firstName: prenom,
        lastName: nom,
        email: email,
        phone: tel,
        source: 'Quizz Padel Academie'
      })
    });
    const contactData = await contactRes.json();

    if (!contactRes.ok) {
      console.error('[optin] GHL contact error:', contactRes.status, JSON.stringify(contactData));
      return res.status(500).json({ error: 'GHL contact error', details: contactData });
    }

    const contactId = contactData.contact?.id;
    if (!contactId) {
      console.error('[optin] Contact ID missing in response:', JSON.stringify(contactData));
      return res.status(500).json({ error: 'Contact ID missing', details: contactData });
    }
    console.log('[optin] Contact created/updated:', contactId);

    // 2. Find pipeline and its first stage
    const pipeRes = await fetch(
      'https://services.leadconnectorhq.com/opportunities/pipelines?locationId=' + LOCATION_ID,
      { method: 'GET', headers }
    );
    const pipeData = await pipeRes.json();

    if (!pipeRes.ok) {
      console.error('[optin] GHL pipeline error:', pipeRes.status, JSON.stringify(pipeData));
      return res.status(500).json({ error: 'GHL pipeline error', details: pipeData });
    }

    const pipelines = pipeData.pipelines || [];
    console.log('[optin] Pipelines disponibles:', pipelines.map(p => p.name).join(', '));

    // Use configured pipeline name, or fall back to first available pipeline
    let pipeline;
    if (PIPELINE_NAME) {
      pipeline = pipelines.find(p => p.name === PIPELINE_NAME);
      if (!pipeline) {
        console.error('[optin] Pipeline "' + PIPELINE_NAME + '" not found. Disponibles:', pipelines.map(p => p.name));
        return res.status(500).json({ error: 'Pipeline "' + PIPELINE_NAME + '" not found', pipelines: pipelines.map(p => p.name) });
      }
    } else {
      pipeline = pipelines[0];
      if (!pipeline) {
        console.error('[optin] Aucun pipeline trouvé dans le compte GHL');
        return res.status(500).json({ error: 'Aucun pipeline trouvé' });
      }
      console.log('[optin] Aucun GHL_PIPELINE_NAME configuré, utilisation du premier pipeline:', pipeline.name);
    }

    const firstStage = pipeline.stages && pipeline.stages[0];
    if (!firstStage) {
      console.error('[optin] Aucun stage dans le pipeline:', pipeline.name);
      return res.status(500).json({ error: 'No stages in pipeline' });
    }
    console.log('[optin] Pipeline:', pipeline.name, '| Stage:', firstStage.name);

    // 3. Create opportunity in the pipeline
    const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pipelineId: pipeline.id,
        locationId: LOCATION_ID,
        name: prenom + ' ' + nom + ' - Quizz Padel',
        pipelineStageId: firstStage.id,
        contactId: contactId,
        status: 'open'
      })
    });
    const oppData = await oppRes.json();

    if (!oppRes.ok) {
      console.error('[optin] GHL opportunity error:', oppRes.status, JSON.stringify(oppData));
      return res.status(500).json({ error: 'GHL opportunity error', details: oppData });
    }

    console.log('[optin] Opportunity created:', oppData.opportunity?.id);
    return res.status(200).json({ ok: true, contactId, opportunityId: oppData.opportunity?.id });

  } catch (err) {
    console.error('[optin] Server error:', err.message, err.stack);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
}
