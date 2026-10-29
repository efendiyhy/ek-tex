'use strict';
/* Plain-text scholarly abstracts. No HTML from external metadata enters the DOM. */
const MAX_ABSTRACT_LENGTH = 14000;

function decodeEntities(input) {
  const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',hellip:'…',alpha:'α',beta:'β',gamma:'γ',mu:'μ',times:'×'};
  return String(input||'').replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key[0] !== '#') return named[key] || match;
    const point = key[1] === 'x' ? parseInt(key.slice(2),16) : parseInt(key.slice(1),10);
    return Number.isInteger(point) && point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : ' ';
  });
}
function cleanText(value) {
  if (typeof value !== 'string') return '';
  const noUnsafe = value.slice(0,120000)
    .replace(/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|template)\s*>/gi,' ')
    .replace(/<\/?(?:jats:)?(?:p|sec|title|br|list-item|list|abstract)\b[^>]*>/gi,'\n')
    .replace(/<[^>]+>/g,' ');
  return decodeEntities(noUnsafe).replace(/[\t ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0, MAX_ABSTRACT_LENGTH);
}
function fromCrossref(message) {
  return cleanText(message?.abstract);
}
function fromOpenAlex(inverted) {
  if (!inverted || typeof inverted !== 'object' || Array.isArray(inverted)) return '';
  const positions = [];
  for (const [word, ids] of Object.entries(inverted)) {
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      if (Number.isInteger(id) && id >= 0 && id < 10000) positions.push([id,word]);
      if (positions.length > 5000) return '';
    }
  }
  if (!positions.length) return '';
  positions.sort((a,b)=>a[0]-b[0]);
  return cleanText(positions.map(([_,word])=>word).join(' '));
}
function normalizedDoi(value) {
  const doi=String(value||'').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').replace(/^doi:/i,'');
  return /^10\.\d{4,9}\/[^\s<>"']{1,200}$/i.test(doi)?doi:null;
}
async function resolveAbstract(doi, fetchJson) {
  // Never construct an outbound URL using an unvalidated arbitrary host.
  const id = normalizedDoi(doi);
  if (!id) throw new Error('DOI tidak valid.');
  try {
    const data = await fetchJson('https://api.crossref.org/works/'+encodeURIComponent(id));
    const abstract = fromCrossref(data?.message);
    if (abstract) return {doi:id,abstract,source:'Crossref',available:true};
  } catch (_) { /* Crossref may lack a record; try OpenAlex next. */ }
  try {
    const data = await fetchJson('https://api.openalex.org/works/doi:'+encodeURIComponent(id));
    const abstract = fromOpenAlex(data?.abstract_inverted_index);
    if (abstract) return {doi:id,abstract,source:'OpenAlex',available:true};
  } catch (_) { /* Missing, offline or rate-limited. */ }
  return {doi:id,abstract:'',source:null,available:false};
}
module.exports={MAX_ABSTRACT_LENGTH,decodeEntities,cleanText,fromCrossref,fromOpenAlex,normalizedDoi,resolveAbstract};
