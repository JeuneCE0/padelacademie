export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prenom, nom, email, tel } = req.body || {};
  if (!prenom || !nom || !email || !tel) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  const headers = {
    'Authorization': 'Bearer ' + GHL_API_KEY,
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  };

  try {
    // 1. Create or update contact
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
      return res.status(500).json({ error: 'GHL contact error', details: contactData });
    }

    const contactId = contactData.contact?.id;
    if (!contactId) {
      return res.status(500).json({ error: 'Contact ID missing', details: contactData });
    }

    // 2. Find pipeline "Pipeline" and its first stage
    const pipeRes = await fetch(
      'https://services.leadconnectorhq.com/opportunities/pipelines?locationId=' + LOCATION_ID,
      { method: 'GET', headers }
    );
    const pipeData = await pipeRes.json();

    if (!pipeRes.ok) {
      return res.status(500).json({ error: 'GHL pipeline error', details: pipeData });
    }

    const pipeline = (pipeData.pipelines || []).find(p => p.name === 'Pipeline');
    if (!pipeline) {
      return res.status(500).json({ error: 'Pipeline "Pipeline" not found', pipelines: (pipeData.pipelines || []).map(p => p.name) });
    }

    const firstStage = pipeline.stages && pipeline.stages[0];
    if (!firstStage) {
      return res.status(500).json({ error: 'No stages in pipeline' });
    }

    // 3. Create opportunity in the pipeline
    const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pipelineId: pipeline.id,
        locationId: LOCATION_ID,
        name: prenom + ' ' + nom + ' - Quizz Padel',
        stageId: firstStage.id,
        contactId: contactId,
        status: 'open'
      })
    });
    const oppData = await oppRes.json();

    if (!oppRes.ok) {
      return res.status(500).json({ error: 'GHL opportunity error', details: oppData });
    }

    return res.status(200).json({ ok: true, contactId, opportunityId: oppData.opportunity?.id });

  } catch (err) {
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
}
