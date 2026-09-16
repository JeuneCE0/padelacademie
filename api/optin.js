// Quiz v7 → GoHighLevel : contact + champs personnalisés + note récap + opportunité.
// Toutes les variables des séquences (WhatsApp + 8 emails) arrivent ici déjà calculées par le quiz :
// le CRM n'a aucun embranchement à gérer, il lit {{contact.<champ>}}.
const GHL = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';

// Champs personnalisés GHL, créés au premier lead s'ils manquent (nom = clé du template).
const FIELDS = [
  'profil', 'profil_nom', 'profil_emoji',
  'niveau', 'niveau_nom', 'niveau_suivant', 'score_niveau',
  'douleur_top', 'douleur_top_note',
  'phrase_profil', 'erreur_principale', 'premiere_action', 'conseil_profil',
  'motivation', 'objectif', 'projection', 'qualification', 'investissement',
  'quiz_date',
];
const PROFILS = ['muraille', 'brute', 'pousseur', 'pile'];

function str(v, max = 500) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function num(v, min, max) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

// Numéro WhatsApp saisi librement → E.164. 06/07 → +33 ; 0692/0693 (Réunion) → +262.
function normalizePhone(raw) {
  let p = raw.replace(/[\s.\-()]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (/^0\d{9}$/.test(p)) p = (/^069[23]/.test(p) ? '+262' : '+33') + p.slice(1);
  return /^\+\d{8,15}$/.test(p) ? p : null;
}

function parseLead(body) {
  const b = body && typeof body === 'object' ? body : {};
  const prenom = str(b.prenom, 60);
  const email = str(b.email, 200).toLowerCase();
  const whatsapp = str(b.whatsapp, 30);
  const phone = whatsapp ? normalizePhone(whatsapp) : null;
  const profil = PROFILS.includes(b.profil) ? b.profil : null;
  const niveau = num(b.niveau, 1, 8);

  const errors = [];
  if (!prenom) errors.push('prenom');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('email');
  if (!phone) errors.push('whatsapp');
  if (!profil) errors.push('profil');
  if (niveau === null) errors.push('niveau');
  if (errors.length) return { errors };

  const reponses = Array.isArray(b.reponses)
    ? b.reponses.slice(0, 40)
        .map((r) => ({ question: str(r && r.question, 300), reponse: str(r && r.reponse, 300) }))
        .filter((r) => r.question)
    : [];

  return {
    lead: {
      prenom, email, phone, whatsapp_saisi: whatsapp, profil, niveau, reponses,
      profil_nom: str(b.profil_nom, 60),
      profil_emoji: str(b.profil_emoji, 8),
      niveau_nom: str(b.niveau_nom, 60),
      niveau_suivant: num(b.niveau_suivant, 1, 8) ?? Math.min(niveau + 1, 8),
      score_niveau: num(b.score_niveau, 0, 24) ?? '',
      douleur_top: str(b.douleur_top, 200),
      douleur_top_note: num(b.douleur_top_note, 1, 5) ?? '',
      phrase_profil: str(b.phrase_profil),
      erreur_principale: str(b.erreur_principale),
      premiere_action: str(b.premiere_action),
      conseil_profil: str(b.conseil_profil),
      motivation: str(b.motivation, 200),
      objectif: str(b.objectif, 200),
      projection: str(b.projection, 200),
      qualification: str(b.qualification, 200),
      investissement: str(b.investissement, 200),
      quiz_date: new Date().toISOString().slice(0, 10),
    },
  };
}

async function ghl(path, init, headers) {
  const res = await fetch(GHL + path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Résout clé → id de champ personnalisé, en créant les champs absents. Cache par instance.
let fieldIdsCache = null;
async function ensureFields(locationId, headers) {
  if (fieldIdsCache) return fieldIdsCache;
  const list = await ghl(`/locations/${locationId}/customFields?model=contact`, { method: 'GET' }, headers);
  if (!list.ok) {
    console.error('[optin] GHL customFields list error:', list.status, JSON.stringify(list.data));
    return {};
  }
  const ids = {};
  for (const f of list.data.customFields || []) {
    const key = String(f.fieldKey || '').split('.').pop();
    if (FIELDS.includes(key)) ids[key] = f.id;
    else if (FIELDS.includes(f.name) && !ids[f.name]) ids[f.name] = f.id;
  }
  for (const key of FIELDS) {
    if (ids[key]) continue;
    const created = await ghl(`/locations/${locationId}/customFields`, {
      method: 'POST',
      body: JSON.stringify({ name: key, dataType: 'TEXT', model: 'contact' }),
    }, headers);
    const id = created.data && created.data.customField && created.data.customField.id;
    if (created.ok && id) ids[key] = id;
    else console.error('[optin] GHL customField create error (' + key + '):', created.status, JSON.stringify(created.data));
  }
  // Ne pas figer un cache incomplet : un champ non créé sera retenté au lead suivant.
  if (FIELDS.every((k) => ids[k])) fieldIdsCache = ids;
  return ids;
}

function recap(lead) {
  const lines = [
    `Diagnostic quiz v7 · ${lead.quiz_date}`,
    `Profil : ${lead.profil_emoji} ${lead.profil_nom} (${lead.profil})`,
    `Niveau : ${lead.niveau}/8 (${lead.niveau_nom}) · score brut ${lead.score_niveau}`,
    `Douleur n°1 : « ${lead.douleur_top} » notée ${lead.douleur_top_note}/5`,
    `Erreur principale : ${lead.erreur_principale}`,
    `Première action : ${lead.premiere_action}`,
    `Motivation : ${lead.motivation}`,
    `Objectif 75 j : ${lead.objectif}`,
    `Projection : ${lead.projection}`,
    `Qualification : ${lead.qualification}`,
    `Investissement : ${lead.investissement}`,
    `WhatsApp saisi : ${lead.whatsapp_saisi}`,
    '',
    'Réponses :',
    ...lead.reponses.map((r) => `- ${r.question} → ${r.reponse}`),
  ];
  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parsed = parseLead(req.body);
  if (parsed.errors) return res.status(400).json({ error: 'Champs invalides', fields: parsed.errors });
  const lead = parsed.lead;

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  const PIPELINE_NAME = process.env.GHL_PIPELINE_NAME || '';
  if (!GHL_API_KEY || !LOCATION_ID) {
    console.error('[optin] Variables env manquantes: GHL_API_KEY=' + (GHL_API_KEY ? 'SET' : 'MISSING') + ', GHL_LOCATION_ID=' + (LOCATION_ID ? 'SET' : 'MISSING'));
    return res.status(500).json({ error: 'Configuration GHL manquante' });
  }
  const headers = { Authorization: 'Bearer ' + GHL_API_KEY, Version: VERSION, 'Content-Type': 'application/json' };

  try {
    const ids = await ensureFields(LOCATION_ID, headers);
    const customFields = FIELDS
      .filter((k) => ids[k] && lead[k] !== '' && lead[k] !== null && lead[k] !== undefined)
      .map((k) => ({ id: ids[k], field_value: String(lead[k]) }));

    // 1. Contact (upsert sur email/téléphone)
    const contact = await ghl('/contacts/upsert', {
      method: 'POST',
      body: JSON.stringify({
        locationId: LOCATION_ID,
        firstName: lead.prenom,
        email: lead.email,
        phone: lead.phone,
        source: 'Quiz Plan de Progression v7',
        tags: ['quiz-v7', 'profil-' + lead.profil, 'niveau-' + lead.niveau],
        customFields,
      }),
    }, headers);
    const contactId = contact.data && contact.data.contact && contact.data.contact.id;
    if (!contact.ok || !contactId) {
      console.error('[optin] GHL contact error:', contact.status, JSON.stringify(contact.data));
      return res.status(502).json({ error: 'GHL contact error' });
    }

    const warnings = [];

    // 2. Note récap pour l'appel (toutes les réponses, lisibles d'un coup d'œil)
    const note = await ghl(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: recap(lead) }),
    }, headers);
    if (!note.ok) {
      warnings.push('note');
      console.error('[optin] GHL note error:', note.status, JSON.stringify(note.data));
    }

    // 3. Opportunité dans le pipeline (première étape)
    let opportunityId = null;
    const pipes = await ghl('/opportunities/pipelines?locationId=' + LOCATION_ID, { method: 'GET' }, headers);
    const pipelines = (pipes.data && pipes.data.pipelines) || [];
    const pipeline = PIPELINE_NAME ? pipelines.find((p) => p.name === PIPELINE_NAME) : pipelines[0];
    const stage = pipeline && pipeline.stages && pipeline.stages[0];
    if (!pipes.ok || !pipeline || !stage) {
      warnings.push('pipeline');
      console.error('[optin] GHL pipeline introuvable:', pipes.status, PIPELINE_NAME || '(premier)', pipelines.map((p) => p.name).join(', '));
    } else {
      const opp = await ghl('/opportunities/', {
        method: 'POST',
        body: JSON.stringify({
          pipelineId: pipeline.id,
          locationId: LOCATION_ID,
          name: `${lead.prenom} · ${lead.profil_nom || lead.profil} · niv. ${lead.niveau}/8`,
          pipelineStageId: stage.id,
          contactId,
          status: 'open',
          source: 'QUIZ V7',
        }),
      }, headers);
      opportunityId = (opp.data && opp.data.opportunity && opp.data.opportunity.id) || null;
      if (!opp.ok) {
        warnings.push('opportunity');
        console.error('[optin] GHL opportunity error:', opp.status, JSON.stringify(opp.data));
      }
    }

    return res.status(200).json({ ok: true, contactId, opportunityId, warnings });
  } catch (err) {
    console.error('[optin] Server error:', err && err.message, err && err.stack);
    return res.status(500).json({ error: 'Server error' });
  }
}
