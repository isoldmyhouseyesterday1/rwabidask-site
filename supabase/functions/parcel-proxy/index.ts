import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GCP_PROJECT = "leafy-loader-492820-p7";
const BQ_URL      = `https://bigquery.googleapis.com/bigquery/v2/projects/${GCP_PROJECT}/queries`;
const JOBS_URL    = `https://bigquery.googleapis.com/bigquery/v2/projects/${GCP_PROJECT}/jobs`;
const CORS        = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization,apikey"};
const MAPS_KEY    = Deno.env.get("GOOGLE_MAPS_SERVER_KEY") ?? Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";

// ── DECODE TABLES ──────────────────────────────────────────────────────────
const HEAT_SYSTEM: Record<number,string> = {1:"Electric",2:"Electric Wall",3:"Forced Air",4:"Hot Water",5:"Hot Water Radiant",6:"Space Heaters",7:"Steam",8:"Steam (no boiler)",9:"Ventilation",10:"Wall Furnace",11:"Package Unit",12:"Warmed & Cooled Air",13:"Hot & Chilled Water",14:"Heat Pump",15:"Floor Furnace",16:"Through-Wall Heat Pump",17:"Complete HVAC",18:"Evaporative Cooling",19:"Refrigerated Cooling",20:"No Heat",26:"Controlled Atmosphere",27:"Controlled Atmosphere Warm/Cooled"};
const HEAT_SOURCE: Record<number,string> = {1:"Oil",2:"Gas",3:"Electric",4:"Oil/Solar",5:"Gas/Solar",6:"Electric/Solar",7:"Other"};
const BLDG_GRADE: Record<number,string> = {1:"Cabin",2:"Substandard",3:"Poor",4:"Low",5:"Fair",6:"Low Average",7:"Average",8:"Good",9:"Better",10:"Very Good",11:"Excellent",12:"Luxury",13:"Mansion",20:"Exceptional"};
const CONDITION: Record<number,string> = {1:"Poor",2:"Fair",3:"Average",4:"Good",5:"Very Good"};
const PRESENT_USE: Record<number,string> = {2:"Single Family",3:"Duplex",4:"Triplex",5:"4-Plex",6:"Single Family (Commercial Zone)",7:"Houseboat",8:"Mobile Home",9:"Single Family (Commercial Use)",10:"Congregate Housing",11:"Apartment",16:"Apartment (Mixed Use)",17:"Apartment (Co-op)",18:"Apartment (Subsidized)",20:"Residential Condominium",25:"Condominium (Mixed Use)",29:"Townhouse",38:"Mobile Home Park",49:"Retirement Facility",51:"Hotel/Motel",58:"Resort/Lodge/Retreat",59:"Nursing Home",60:"Neighborhood Shopping Center",61:"Community Shopping Center",62:"Regional Shopping Center",96:"Retail Strip",101:"Retail Store",106:"Office Building",122:"Medical/Dental Office",130:"Farm",143:"Golf Course",145:"Health Club",146:"Marina",149:"Public Park",300:"Vacant (Single Family)",301:"Vacant (Multi-Family)",309:"Vacant (Commercial)",324:"Forest Land",326:"Open Space",330:"Easement",333:"River/Creek/Stream",334:"Tideland 1st Class",335:"Tideland 2nd Class",337:"Fresh Water Body"};
const WATERFRONT_BODY: Record<number,string> = {1:"Duwamish River",2:"Elliott Bay",3:"Puget Sound",4:"Lake Union",5:"Ship Canal",6:"Lake Washington",7:"Lake Sammamish",8:"Other Lake",9:"River/Slough"};
const WATERFRONT_BANK: Record<number,string> = {1:"Low Bank",2:"Medium Bank",3:"High Bank",4:"No Bank"};
const WATERFRONT_ACCESS: Record<number,string> = {1:"Access to Residence",2:"Access to Waterfront",3:"No Waterfront Access"};
const TIDELANDS: Record<number,string> = {1:"Uplands Only",2:"Uplands with Tidelands/Shorelands",3:"Tidelands/Shorelands Only"};
const WATER_SYSTEM: Record<number,string> = {1:"Private",2:"Water District",3:"Private Restricted",4:"Public Restricted"};
const SEWER_SYSTEM: Record<number,string> = {1:"Private",2:"Public",3:"Private Restricted",4:"Public Restricted"};
const STREET_SURFACE: Record<number,string> = {1:"Paved",2:"Gravel",3:"Dirt",4:"Undeveloped"};
const TOPOGRAPHY: Record<number,string> = {1:"Flat",2:"Gently Rolling",3:"Rolling",4:"Hilly",5:"Steep",6:"Very Steep",7:"Water",8:"Swampy"};
const ACCESS: Record<number,string> = {1:"Legal — Undeveloped",2:"Privately Maintained",3:"Public Maintained",4:"No Access"};
const SALE_INSTRUMENT: Record<number,string> = {1:"None",2:"Warranty Deed",3:"Statutory Warranty Deed",4:"Special Warranty Deed",5:"Corporate Warranty Deed",6:"Assumption Warranty Deed",7:"Grant Deed",8:"Contract (Equity)",9:"Contract (Installment)",10:"Real Estate Contract",11:"Purchaser's Assignment",13:"Seller's Assignment",15:"Quit Claim Deed",18:"Trustee's Deed",19:"Executor's Deed",20:"Fiduciary Deed",21:"Sheriff's Deed",22:"Bargain and Sale Deed",24:"Deed of Personal Representative",26:"Other",27:"Deed",28:"Forfeiture of Real Estate Contract"};
const CONSTR_CLASS: Record<number,string> = {1:"Wood Frame",2:"Masonry (Brick/Block)",3:"Steel Frame",4:"Reinforced Concrete",5:"Pre-engineered Metal"};
const BLDG_QUALITY: Record<number,string> = {1:"Economy",2:"Low",3:"Fair",4:"Average",5:"Good",6:"Very Good",7:"Excellent"};

const SALE_REASON: Record<number,string> = {1:"None",2:"Assumption",3:"Mortgage Assumption",4:"Foreclosure",5:"Trust",6:"Executor/Admin/Guardian",7:"Testamentary Trust",8:"Estate Settlement",9:"Settlement",10:"Property Settlement",11:"Divorce Settlement",12:"Tenancy Partition",13:"Community Property Established",14:"Partial Interest — Gift",15:"Easement",16:"Correction Refiling",17:"Trade",18:"Other",19:"Quit Claim — Gift"};
const SALE_WARNING: Record<number,string> = {1:"Personal Property Included",2:"1031 Exchange",3:"Contract or Cash Sale",4:"Pre-Sale",5:"Full Price Not Reported",10:"Tear Down",11:"Corporate Affiliates",12:"Estate — Administrator/Guardian/Executor",13:"Bankruptcy",14:"Sheriff/Tax Sale",15:"No Market Exposure",16:"Government to Government",17:"Non-Profit Organization",18:"Quit Claim Deed",22:"Partial Interest",23:"Forced Sale",25:"Fulfillment of Contract",26:"Improvements Changed Since Sale",29:"Segregation/Merger",30:"Historic Property",31:"Exempt from Excise Tax",32:"$1,000 or Less",33:"Lease or Leasehold",34:"Change of Use",38:"Divorce",39:"Mortgage Assumption",45:"Multi-Parcel Sale",46:"Non-Representative Sale",51:"Related Party / Friend / Neighbor",54:"Affordable Housing",56:"Builder or Developer Sale",60:"Short Sale",61:"Financial Institution Resale",62:"Auction Sale",66:"Condemnation/Eminent Domain",73:"COVID Impact",74:"Contamination"};
const VIEW_QUALITY: Record<number,string> = {1:"Fair",2:"Average",3:"Good",4:"Excellent"};

function dc(map: Record<number,string>, code: unknown): string|null {
  if (!code && code !== 0) return null;
  const n = parseInt(String(code));
  return map[n] || null;
}

function decodeViews(f: any): string[] {
  const views: string[] = [];
  const vq = (score: unknown) => dc(VIEW_QUALITY, score);
  if (parseInt(f.MtRainier||0)>0)       views.push(`Mt. Rainier (${vq(f.MtRainier)})`);
  if (parseInt(f.Olympics||0)>0)         views.push(`Olympic Mountains (${vq(f.Olympics)})`);
  if (parseInt(f.Cascades||0)>0)         views.push(`Cascade Mountains (${vq(f.Cascades)})`);
  if (parseInt(f.PugetSound||0)>0)       views.push(`Puget Sound (${vq(f.PugetSound)})`);
  if (parseInt(f.LakeWashington||0)>0)   views.push(`Lake Washington (${vq(f.LakeWashington)})`);
  if (parseInt(f.LakeSammamish||0)>0)    views.push(`Lake Sammamish (${vq(f.LakeSammamish)})`);
  if (parseInt(f.SeattleSkyline||0)>0)   views.push(`Seattle Skyline (${vq(f.SeattleSkyline)})`);
  if (parseInt(f.SmallLakeRiverCreek||0)>0) views.push(`Small Lake/River/Creek (${vq(f.SmallLakeRiverCreek)})`);
  if (parseInt(f.OtherView||0)>0)        views.push(`Other View (${vq(f.OtherView)})`);
  return views;
}

function decodeSaleWarnings(warningStr: string|null): string[] {
  if (!warningStr) return [];
  return warningStr.trim().split(/\s+/)
    .map(w => SALE_WARNING[parseInt(w)] || null)
    .filter(Boolean) as string[];
}

// ── AUTH ───────────────────────────────────────────────────────────────────
let _cachedToken = "";
let _tokenExpiry = 0;

async function tok(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiry - 60000) return _cachedToken;

  const b64 = Deno.env.get("GCP_SA_KEY") ?? "";
  if (!b64) throw new Error("GCP_SA_KEY not set");

  const sa = JSON.parse(atob(b64));

  // Build JWT for service account
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
  const claim = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    exp: Math.floor(now/1000) + 3600,
    iat: Math.floor(now/1000),
  })).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");

  const msg = `${header}.${claim}`;

  // Import private key and sign
  const pem = sa.private_key.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\n/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key,
    new TextEncoder().encode(msg)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");

  const jwt = `${msg}.${sigB64}`;

  // Exchange JWT for access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[tok] SA JWT exchange failed:", err);
    // Fallback to static token
    const staticToken = Deno.env.get("GCLOUD_ACCESS_TOKEN") ?? "";
    if (staticToken) {
      _cachedToken = staticToken;
      _tokenExpiry = now + 45 * 60 * 1000;
      return _cachedToken;
    }
    throw new Error("TOKEN_EXPIRED");
  }

  const d = await res.json();
  _cachedToken = d.access_token;
  _tokenExpiry = now + (d.expires_in ?? 3600) * 1000;
  console.log("[tok] SA key OK — expires in", d.expires_in, "s");
  return _cachedToken;
}

function pv(v: any, f: any): any {
  if (v === null || v === undefined) return null;
  const mode = f.mode ?? "NULLABLE", sub = f.fields ?? [];
  if (mode === "REPEATED") { if (!Array.isArray(v)) return []; return v.map((i: any) => pv(i.v, {...f, mode:"NULLABLE"})); }
  if (f.type === "RECORD") { if (!v || !v.f) return null; const r: any = {}; v.f.forEach((c: any,i: number) => { if(i<sub.length) r[sub[i].name] = pv(c.v, sub[i]); }); return r; }
  return v;
}

function parseRows(data: any) {
  const fields = data.schema?.fields ?? [], rows = data.rows ?? [];
  return rows.map((row: any) => { const r: any = {}; (row.f ?? []).forEach((c: any,i: number) => { if(i<fields.length) r[fields[i].name] = pv(c.v, fields[i]); }); return r; });
}

async function bq(sql: string, ms=55000) {
  const t = await tok();
  const res = await fetch(BQ_URL, {method:"POST", headers:{"Authorization":`Bearer ${t}`,"Content-Type":"application/json"}, body:JSON.stringify({query:sql,useLegacySql:false,timeoutMs:ms,location:"US"})});
  if (!res.ok) { const x=await res.text(); if(res.status===401) throw new Error("TOKEN_EXPIRED"); throw new Error(`BQ ${res.status}: ${x}`); }
  const d = await res.json();
  if (!d.jobComplete) {
    const jid = d.jobReference.jobId;
    for(let i=0;i<50;i++) { await new Promise(r=>setTimeout(r,3000)); const s=await fetch(`${JOBS_URL}/${jid}`,{headers:{"Authorization":`Bearer ${t}`}}); const sd=await s.json(); if(sd.status?.state==="DONE") break; }
    const r=await fetch(`${JOBS_URL}/${jid}/results?maxResults=1&location=US`,{headers:{"Authorization":`Bearer ${t}`}});
    return parseRows(await r.json());
  }
  return parseRows(d);
}

// ── PIN NORMALIZATION ──────────────────────────────────────────────────────
function norm(pin: string): [number, number] {
  const clean = pin.replace(/\s/g, "");
  if (/^\d{6}-\d{4}$/.test(clean)) return [parseInt(clean.slice(0,6)), parseInt(clean.slice(7))];
  if (/^\d{3}-\d{10}$/.test(clean)) { const d=clean.slice(4); return [parseInt(d.slice(0,6)), parseInt(d.slice(6))]; }
  if (/^\d{10}$/.test(clean)) return [parseInt(clean.slice(0,6)), parseInt(clean.slice(6))];
  const digits = clean.replace(/\D/g,"").slice(-10).padStart(10,"0");
  return [parseInt(digits.slice(0,6)), parseInt(digits.slice(6))];
}

function spatialPinToMajorMinor(pin: string): [number, number] {
  if (/^\d{3}-\d{10}$/.test(pin)) { const d=pin.slice(4); return [parseInt(d.slice(0,6)), parseInt(d.slice(6))]; }
  return norm(pin);
}

// ── COORD LOOKUP ───────────────────────────────────────────────────────────
// King County bounding box — fast check before spatial query
function isKingCounty(lat: number, lng: number): boolean {
  return lat >= 47.07 && lat <= 47.78 && lng >= -122.54 && lng <= -121.06;
}

async function coordPin(lat: number, lng: number): Promise<string|null> {
  try {
    if (isKingCounty(lat, lng)) {
      const r = await bq(`SELECT PIN FROM \`leafy-loader-492820-p7.rwabidask.king_county_parcels_polygons\` WHERE ST_WITHIN(ST_GEOGPOINT(${lng},${lat}), geometry) LIMIT 1`, 15000);
      if (r[0]?.PIN) return r[0].PIN;
      // Don't fallback to nearest King County parcel — let it fall through to statewide
    }
    // ── Pierce County spatial lookup ────────────────────────────────
    const isPierce = lat >= 46.8 && lat <= 47.4 && lng >= -122.7 && lng <= -121.9;
    if (isPierce) {
      const rP = await bq(`SELECT LPAD(CAST(TaxParcelNumber AS STRING), 10, '0') as parcel_id FROM \`leafy-loader-492820-p7.rwabidask.pierce_gis_tax_parcels\` WHERE ABS(Latitude - ${lat}) < 0.001 AND ABS(Longitude - ${lng}) < 0.001 ORDER BY ABS(Latitude - ${lat}) + ABS(Longitude - ${lng}) ASC LIMIT 1`, 15000);
      if (rP[0]?.parcel_id) return 'WA-' + rP[0].parcel_id;
    }
    // ── Statewide fallback for non-King County parcels ──────────────
    const rWA = await bq(`SELECT parcel_id, county, address, city, zip, value_land, value_bldg, lat, lng FROM \`leafy-loader-492820-p7.rwabidask.wa_parcels_statewide\` WHERE ABS(lat - ${lat}) < 0.01 AND ABS(lng - ${lng}) < 0.01 ORDER BY ABS(lat - ${lat}) + ABS(lng - ${lng}) ASC LIMIT 1`, 15000);
    if (rWA[0]) {
      // Encode WA parcel data in the return value using JSON
      (globalThis as any)._waParcelCache = { ...rWA[0], lat: rWA[0].lat || lat, lng: rWA[0].lng || lng };
      return 'WA-' + (rWA[0].parcel_id || `LATLON_${lat}_${lng}`);
    }
    return null;
  } catch(e) { console.error("coordPin error:", e); return null; }
}

// ── STATEWIDE PARCEL CARD ──────────────────────────────────────────────────
function waParcelCard(p: any) {
  if (!p) return null;
  return {
    PIN: p.parcel_id,
    address: p.address || 'Unknown Address',
    county: p.county,
    city: p.city || '',
    zip: p.zip || '',
    LAT: parseFloat(p.lat) || 0,
    LON: parseFloat(p.lng) || 0,
    latest_total_val: (parseInt(p.value_land||0) + parseInt(p.value_bldg||0)).toString(),
    latest_land_val: p.value_land || '0',
    latest_imps_val: p.value_bldg || '0',
    PropType: 'R',
    _statewide: true,
    _coverage: 'basic',
    _coverage_note: 'Full Intel Reports available for King County only. Pierce, Snohomish and all WA counties coming soon.'
  };
}

async function addrPin(addr: string): Promise<string|null> {
  if (!MAPS_KEY) return null;
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${MAPS_KEY}`);
    const g = await r.json();
    if (g.status !== "OK") return null;
    const l = g.results[0].geometry.location;
    return coordPin(l.lat, l.lng);
  } catch { return null; }
}

// ── SUPABASE CLIENT FOR CORRECTIONS ───────────────────────────────────────
const SB_URL_PROXY = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY_PROXY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function fetchCorrections(pin: string): Promise<Record<string, string>> {
  if (!pin || !SB_URL_PROXY || !SB_KEY_PROXY) return {};
  try {
    const resp = await fetch(
      `${SB_URL_PROXY}/rest/v1/parcel_data_corrections?apn=eq.${encodeURIComponent(pin)}&order=created_at.desc`,
      { headers: {
        "apikey": SB_KEY_PROXY,
        "Authorization": `Bearer ${SB_KEY_PROXY}`,
        "Content-Type": "application/json"
      }}
    );
    if (!resp.ok) return {};
    const rows = await resp.json();
    // Build override map — latest value wins per field
    const overrides: Record<string, string> = {};
    for (const row of rows) {
      if (row.field_name && row.new_value && !overrides[row.field_name]) {
        overrides[row.field_name] = row.new_value;
      }
    }
    return overrides;
  } catch(e) {
    console.warn("[corrections] fetch error:", e);
    return {};
  }
}

// ── FLAT TABLE LOOKUP ──────────────────────────────────────────────────────
async function fetchFlat(major: number, minor: number, pin?: string) {
  const rows = await bq(`SELECT * FROM \`leafy-loader-492820-p7.rwabidask.king_county_master_intel_flat\` WHERE Major = ${major} AND Minor = ${minor} LIMIT 1`, 20000);
  const flat = rows[0] ?? null;
  if (!flat) return null;
  // Apply any approved corrections from Supabase
  const pinStr = pin || `${String(major).padStart(6,'0')}${String(minor).padStart(4,'0')}`;
  const overrides = await fetchCorrections(pinStr);
  if (Object.keys(overrides).length > 0) {
    console.log(`[corrections] applying ${Object.keys(overrides).length} override(s) for PIN ${pinStr}`);
    return { ...flat, ...overrides, _has_corrections: true };
  }
  return flat;
}

// ── PARCEL POLYGON ─────────────────────────────────────────────────────────
async function fetchPolygon(pin: string) {
  try {
    const pinNoDash = pin.replace('-','');
    console.log('[polygon] querying PIN:', pinNoDash);
    const rows = await bq(`SELECT ST_ASGEOJSON(geometry) as geojson FROM \`leafy-loader-492820-p7.rwabidask.king_county_parcels_polygons\` WHERE PIN = '${pinNoDash}' LIMIT 1`, 10000);
    console.log('[polygon] rows returned:', rows.length, 'geojson length:', rows[0]?.geojson?.length);
    if (!rows[0]?.geojson) return null;
    return JSON.parse(rows[0].geojson);
  } catch(e) {
    console.error("[polygon] ERROR:", e);
    return null;
  }
}

// ── FREE CARD ──────────────────────────────────────────────────────────────
function freeCard(f: any) {
  if (!f) return null;
  const land = parseInt(f.latest_land_val||0);
  const imps = parseInt(f.latest_imps_val||0);
  const views = decodeViews(f);

  let trend: any[] = [];
  try { trend = JSON.parse(f.appraisal_history_json||"[]").slice(0,4).map((a: any)=>({year:a.RollYr,total:a.TotalVal})); } catch {}

  let lastSale: any = null;
  try {
    const sales = JSON.parse(f.sales_history_json||"[]").filter((s: any)=>parseInt(s.SalePrice||0)>0);
    if (sales[0]) lastSale = {
      price: parseInt(sales[0].SalePrice),
      date: sales[0].DocumentDate,
      instrument: dc(SALE_INSTRUMENT, sales[0].SaleInstrument),
      warnings: decodeSaleWarnings(sales[0].SaleWarning),
    };
  } catch {}

  // Waterfront
  const wfnt = parseInt(f.WfntLocation||0) > 0 ? {
    location_code: parseInt(f.WfntLocation),
    footage: parseInt(f.WfntFootage||0)||null,
    body_of_water: dc(WATERFRONT_BODY, f.WfntLocation),
    bank_type: dc(WATERFRONT_BANK, f.WfntLocation),
    access: dc(WATERFRONT_ACCESS, f.WfntLocation),
    tidelands: dc(TIDELANDS, f.TidelandShoreland),
    access_rights: f.WfntAccessRights === 'true' || f.WfntAccessRights === true,
  } : null;

  return {
    PIN: f.PIN,
    address: String(f.Address||"").trim(),
    city: String(f.DistrictName||"").trim(),
    state: "WA",
    zip_code: f.ZipCode,
    district: f.DistrictName,
    use_description: dc(PRESENT_USE, f.PresentUse) || String(f.PresentUse||""),
    prop_type: f.PropType,
    zoning: (f.CurrentZoning||'').replace(/\[.*?\]\(.*?\)/g,'').replace(/\s*\(.*?\)/g,'').trim()||null,
    levy_code: f.LevyCode,
    sqft_lot: f.SqFtLot,
    current_assessed_land: land,
    current_assessed_improvements: imps,
    current_assessed_total: land + imps,
    appraisal_year: f.latest_appraisal_year,
    value_trend: trend,
    building: f.YrBuilt ? {
      year_built: f.YrBuilt,
      year_renovated: f.YrRenovated && f.YrRenovated !== '0' ? f.YrRenovated : null,
      sqft_total: f.SqFtTotLiving,
      sqft_garage: f.SqFtGarageAttached && f.SqFtGarageAttached !== '0' ? f.SqFtGarageAttached : null,
      sqft_deck: f.SqFtDeck && f.SqFtDeck !== '0' ? f.SqFtDeck : null,
      sqft_basement_finished: f.SqFtFinBasement && f.SqFtFinBasement !== '0' ? f.SqFtFinBasement : null,
      bedrooms: f.Bedrooms,
      bath_full: f.BathFullCount,
      bath_3qtr: f.Bath3qtrCount && f.Bath3qtrCount !== '0' ? f.Bath3qtrCount : null,
      bath_half: f.BathHalfCount && f.BathHalfCount !== '0' ? f.BathHalfCount : null,
      stories: f.Stories,
      building_grade: dc(BLDG_GRADE, f.BldgGrade),
      building_grade_code: f.BldgGrade,
      condition: dc(CONDITION, f.Condition),
      heat_system: dc(HEAT_SYSTEM, f.HeatSystem),
      heat_source: dc(HEAT_SOURCE, f.HeatSource),
      fireplaces: (parseInt(f.FpSingleStory||0) + parseInt(f.FpMultiStory||0) + parseInt(f.FpFreestanding||0)) || null,
      living_units: f.NbrLivingUnits && f.NbrLivingUnits !== '1' ? f.NbrLivingUnits : null,
    } : null,
    last_sale: lastSale,
    permit_count: parseInt(f.permit_count||0),
    views: views.length > 0 ? views : null,
    waterfront: wfnt,
    water_system: dc(WATER_SYSTEM, f.WaterSystem),
    sewer_system: dc(SEWER_SYSTEM, f.SewerSystem),
    street_surface: dc(STREET_SURFACE, f.StreetSurface),
    topography: dc(TOPOGRAPHY, f.Topography),
    access: dc(ACCESS, f.Access),
    hazards: {
      seismic: f.SeismicHazard === 'true' || f.SeismicHazard === true,
      landslide: f.LandslideHazard === 'true' || f.LandslideHazard === true,
      erosion: f.ErosionHazard === 'true' || f.ErosionHazard === true,
      coal_mine: f.CoalMineHazard === 'true' || f.CoalMineHazard === true,
      flood_100yr: f.HundredYrFloodPlain === 'true' || f.HundredYrFloodPlain === true,
      tsunami: f.in_tsunami_zone === 'true' || f.in_tsunami_zone === true,
      steep_slope: f.SteepSlopeHazard === 'true' || f.SteepSlopeHazard === true,
      wetland: f.Wetland === 'true' || f.Wetland === true,
    },
    seismic_site_class: f.seismic_site_class,
    nearest_fault: f.nearest_fault_name ? `${f.nearest_fault_name} · ${Math.round(parseFloat(f.fault_distance_m||0))}m` : null,
    ems_agency: f.ems_agency,
    ems_distance_m: f.ems_distance_m,
    water_system_name: f.water_system_name,
    commercial: f.BldgGrossSqFt ? {
      gross_sqft: f.BldgGrossSqFt,
      net_sqft: f.BldgNetSqFt,
      stories: f.comm_stories,
      description: f.BldgDescr,
      quality: f.BldgQuality,
      quality_label: dc(BLDG_QUALITY, f.BldgQuality),
      constr_class: f.ConstrClass,
      constr_class_label: dc(CONSTR_CLASS, f.ConstrClass),
      sprinklers: f.Sprinklers,
      elevators: f.Elevators,
      year_built: f.comm_yr_built,
      nbr_bldgs: f.NbrBldgs,
    } : null,
    price_per_sqft: (f.latest_total_val && f.SqFtTotLiving && parseInt(f.SqFtTotLiving) > 0)
      ? Math.round(parseInt(f.latest_total_val) / parseInt(f.SqFtTotLiving))
      : (f.latest_total_val && f.BldgGrossSqFt && parseInt(f.BldgGrossSqFt) > 0)
      ? Math.round(parseInt(f.latest_total_val) / parseInt(f.BldgGrossSqFt))
      : null,
    brick_stone_pct: parseInt(f.BrickStone||0)||null,
    power: {
      nearest_transmission_voltage: f.nearest_transmission_voltage,
      nearest_transmission_class: f.nearest_transmission_class,
      nearest_transmission_owner: f.nearest_transmission_owner,
      nearest_transmission_status: f.nearest_transmission_status,
      transmission_distance_m: f.transmission_distance_m,
      substation_name: f.substation_name,
      substation_min_volt: f.substation_min_volt,
      substation_max_volt: f.substation_max_volt,
      substation_lines: f.substation_lines,
      substation_distance_m: f.substation_distance_m,
    },
    LAT: f.LAT,
    LON: f.LON,
  };
}

// ── INTEL CARD ─────────────────────────────────────────────────────────────
function intelCard(f: any) {
  if (!f) return null;
  let appraisal_history: any[]=[], sales_history: any[]=[], permits: any[]=[], appeals: any[]=[], value_history: any[]=[], env_restrictions: any[]=[];
  try { appraisal_history = JSON.parse(f.appraisal_history_json||"[]"); } catch {}
  try { sales_history = JSON.parse(f.sales_history_json||"[]").map((s: any) => ({
    ...s,
    instrument_decoded: dc(SALE_INSTRUMENT, s.SaleInstrument),
    reason_decoded: dc(SALE_REASON, s.SaleReason),
    warnings_decoded: decodeSaleWarnings(s.SaleWarning),
  })); } catch {}
  try { permits = JSON.parse(f.permits_json||"[]"); } catch {}
  try { appeals = JSON.parse(f.appeals_json||"[]"); } catch {}
  try { value_history = JSON.parse(f.value_history_json||"[]"); } catch {}
  try { env_restrictions = JSON.parse(f.env_restrictions_json||"[]"); } catch {}

  const views = decodeViews(f);
  const wfnt = parseInt(f.WfntLocation||0) > 0 ? {
    footage: parseInt(f.WfntFootage||0)||null,
    body_of_water: dc(WATERFRONT_BODY, f.WfntLocation),
    bank_type: dc(WATERFRONT_BANK, f.WfntLocation),
    access: dc(WATERFRONT_ACCESS, f.WfntLocation),
    tidelands: dc(TIDELANDS, f.TidelandShoreland),
    access_rights: f.WfntAccessRights === 'true' || f.WfntAccessRights === true,
    proximity_influence: f.WfntProximityInfluence === 'true' || f.WfntProximityInfluence === true,
  } : null;

  const armsSales = sales_history.filter((s: any) => parseInt(s.SalePrice||0) > 0);
  const lastSale = armsSales[0] || null;

  return {
    PIN: f.PIN,
    address: String(f.Address||"").trim(),
    city: String(f.DistrictName||"").trim(),
    state: "WA",
    zip_code: f.ZipCode,
    district: f.DistrictName,
    levy_code: f.LevyCode,
    zoning: (f.CurrentZoning||'').replace(/\[.*?\]\(.*?\)/g,'').replace(/\s*\(.*?\)/g,'').trim()||null,
    present_use: dc(PRESENT_USE, f.PresentUse),
    present_use_code: f.PresentUse,
    prop_type: f.PropType,
    sqft_lot: f.SqFtLot,
    plat_name: f.PlatName,
    plat_lot: f.PlatLot,
    legal_description: f.legal_description,
    water_system: dc(WATER_SYSTEM, f.WaterSystem),
    sewer_system: dc(SEWER_SYSTEM, f.SewerSystem),
    street_surface: dc(STREET_SURFACE, f.StreetSurface),
    topography: dc(TOPOGRAPHY, f.Topography),
    access: dc(ACCESS, f.Access),
    LAT: f.LAT,
    LON: f.LON,
    views: views.length > 0 ? views : null,
    waterfront: wfnt,
    rights: {
      easements: f.Easements === 'true' || f.Easements === true,
      deed_restrictions: f.DeedRestrictions === 'true' || f.DeedRestrictions === true,
      native_growth_protection: f.NativeGrowthProtEsmt === 'true' || f.NativeGrowthProtEsmt === true,
      development_rights_purchased: f.DevelopmentRightsPurch === 'true' || f.DevelopmentRightsPurch === true,
      dnr_lease: f.DNRLease === 'true' || f.DNRLease === true,
      historic_site: parseInt(f.HistoricSite||0) > 0,
      current_use_designation: parseInt(f.CurrentUseDesignation||0) > 0,
      species_of_concern: f.SpeciesOfConcern === 'true' || f.SpeciesOfConcern === true,
      sensitive_area_tract: f.SensitiveAreaTract === 'true' || f.SensitiveAreaTract === true,
    },
    nuisances: {
      power_lines: f.PowerLines === 'true' || f.PowerLines === true,
      traffic_noise: parseInt(f.TrafficNoise||0) > 0,
      airport_noise: parseInt(f.AirportNoise||0) > 0,
      contamination: parseInt(f.Contamination||0) > 0,
      adjacent_golf: f.AdjacentGolfFairway === 'true' || f.AdjacentGolfFairway === true,
      adjacent_greenbelt: f.AdjacentGreenbelt === 'true' || f.AdjacentGreenbelt === true,
      other_nuisances: f.OtherNuisances === 'true' || f.OtherNuisances === true,
    },
    building: {
      year_built: f.YrBuilt,
      year_renovated: f.YrRenovated && f.YrRenovated !== '0' ? f.YrRenovated : null,
      sqft_total_living: f.SqFtTotLiving,
      sqft_1st_floor: f.SqFt1stFloor,
      sqft_2nd_floor: f.SqFt2ndFloor,
      sqft_upper_floor: f.SqFtUpperFloor,
      sqft_basement_total: f.SqFtTotBasement,
      sqft_basement_finished: f.SqFtFinBasement,
      sqft_garage_attached: f.SqFtGarageAttached,
      sqft_garage_basement: f.SqFtGarageBasement,
      sqft_open_porch: f.SqFtOpenPorch,
      sqft_deck: f.SqFtDeck,
      bedrooms: f.Bedrooms,
      bath_full: f.BathFullCount,
      bath_3qtr: f.Bath3qtrCount,
      bath_half: f.BathHalfCount,
      stories: f.Stories,
      building_grade: dc(BLDG_GRADE, f.BldgGrade),
      building_grade_code: f.BldgGrade,
      condition: dc(CONDITION, f.Condition),
      heat_system: dc(HEAT_SYSTEM, f.HeatSystem),
      heat_source: dc(HEAT_SOURCE, f.HeatSource),
      fireplaces_single: parseInt(f.FpSingleStory||0)||null,
      fireplaces_multi: parseInt(f.FpMultiStory||0)||null,
      fireplaces_freestanding: parseInt(f.FpFreestanding||0)||null,
      total_fireplaces: (parseInt(f.FpSingleStory||0)+parseInt(f.FpMultiStory||0)+parseInt(f.FpFreestanding||0))||null,
      brick_stone: parseInt(f.BrickStone||0)||null,
      living_units: f.NbrLivingUnits,
    },
    valuation: {
      latest_land_val: parseInt(f.latest_land_val||0),
      latest_imps_val: parseInt(f.latest_imps_val||0),
      latest_total_val: parseInt(f.latest_total_val||0),
      appraisal_year: f.latest_appraisal_year,
      reval_or_maint: f.RevalOrMaint,
      tax_appr_land: parseInt(f.tax_appr_land||0),
      tax_appr_imps: parseInt(f.tax_appr_imps||0),
      taxable_land: parseInt(f.TaxableLandVal||0),
      taxable_imps: parseInt(f.TaxableImpsVal||0),
      tax_status: f.TaxStat === 'T' ? 'Taxable' : f.TaxStat,
      tax_bill_year: f.tax_bill_year,
      tax_assessed_total: parseInt(f.tax_assessed_total||0),
      new_construction: f.NewConstructionFlag === 'true' || f.NewConstructionFlag === true,
    },
    appraisal_history,
    value_history,
    sales_history,
    sale_count: parseInt(f.sale_count||0),
    last_sale: lastSale ? {
      price: parseInt(lastSale.SalePrice||0),
      date: lastSale.DocumentDate,
      instrument: dc(SALE_INSTRUMENT, lastSale.SaleInstrument),
      reason: dc(SALE_REASON, lastSale.SaleReason),
      warnings: decodeSaleWarnings(lastSale.SaleWarning),
    } : null,
    permits,
    permit_count: parseInt(f.permit_count||0),
    permit_total_value: parseInt(f.permit_total_value||0),
    appeals,
    appeal_count: parseInt(f.appeal_count||0),
    env_restrictions,
    env_restriction_count: parseInt(f.env_restriction_count||0),
    hazard_flags: {
      seismic: f.SeismicHazard === 'true' || f.SeismicHazard === true,
      landslide: f.LandslideHazard === 'true' || f.LandslideHazard === true,
      erosion: f.ErosionHazard === 'true' || f.ErosionHazard === true,
      coal_mine: f.CoalMineHazard === 'true' || f.CoalMineHazard === true,
      flood_100yr: f.HundredYrFloodPlain === 'true' || f.HundredYrFloodPlain === true,
      steep_slope: f.SteepSlopeHazard === 'true' || f.SteepSlopeHazard === true,
      wetland: f.Wetland === 'true' || f.Wetland === true,
      stream: f.Stream === 'true' || f.Stream === true,
      critical_drainage: f.CriticalDrainage === 'true' || f.CriticalDrainage === true,
      landfill_buffer: f.LandfillBuffer === 'true' || f.LandfillBuffer === true,
      contamination: parseInt(f.Contamination||0) > 0,
      unbuildable: f.Unbuildable === 'true' || f.Unbuildable === true,
      species_of_concern: f.SpeciesOfConcern === 'true' || f.SpeciesOfConcern === true,
    },
    geo: {
      in_tsunami_zone: f.in_tsunami_zone === 'true' || f.in_tsunami_zone === true,
      tsunami_description: f.tsunami_zone_description,
      seismic_site_class: f.seismic_site_class,
      seismic_site_class_desc: f.seismic_site_class_desc,
      geology_map_unit: f.geology_map_unit,
      geology_label: f.geology_label,
      geology_notes: f.geology_notes,
      nearest_fault_name: f.nearest_fault_name,
      nearest_fault_type: f.nearest_fault_type,
      fault_slip_rate: f.fault_slip_rate,
      fault_age: f.fault_age,
      fault_system: f.fault_system,
      fault_confidence: f.fault_confidence,
      fault_distance_m: f.fault_distance_m,
      vs30_mps: f.vs30_mps,
      shear_geologic_unit: f.shear_geologic_unit,
      shear_unit_description: f.shear_unit_description,
      in_landslide_zone: f.in_landslide_zone_geo === 'true' || f.in_landslide_zone_geo === true,
      landslide_material: f.landslide_material,
      landslide_movement: f.landslide_movement,
      landslide_confidence: f.landslide_confidence,
      landslide_slope_deg: f.landslide_slope_deg,
    },
    infrastructure: {
      ems_agency: f.ems_agency,
      ems_distance_m: f.ems_distance_m,
      water_system_name: f.water_system_name,
      commercial: f.BldgGrossSqFt ? {
        gross_sqft: f.BldgGrossSqFt,
        net_sqft: f.BldgNetSqFt,
        stories: f.comm_stories,
        description: f.BldgDescr,
        quality: f.BldgQuality,
        quality_label: dc(BLDG_QUALITY, f.BldgQuality),
        constr_class: f.ConstrClass,
        constr_class_label: dc(CONSTR_CLASS, f.ConstrClass),
        sprinklers: f.Sprinklers,
        elevators: f.Elevators,
        year_built: f.comm_yr_built,
        nbr_bldgs: f.NbrBldgs,
      } : null,
      price_per_sqft: (f.latest_total_val && f.SqFtTotLiving && parseInt(f.SqFtTotLiving) > 0)
        ? Math.round(parseInt(f.latest_total_val) / parseInt(f.SqFtTotLiving))
        : (f.latest_total_val && f.BldgGrossSqFt && parseInt(f.BldgGrossSqFt) > 0)
        ? Math.round(parseInt(f.latest_total_val) / parseInt(f.BldgGrossSqFt))
        : null,
      power: {
        nearest_transmission_voltage: f.nearest_transmission_voltage,
        nearest_transmission_class: f.nearest_transmission_class,
        nearest_transmission_owner: f.nearest_transmission_owner,
        nearest_transmission_status: f.nearest_transmission_status,
        transmission_distance_m: f.transmission_distance_m,
        substation_name: f.substation_name,
        substation_min_volt: f.substation_min_volt,
        substation_max_volt: f.substation_max_volt,
        substation_lines: f.substation_lines,
        substation_distance_m: f.substation_distance_m,
      },
      water_system_type: f.water_system_type,
      water_system_ownership: f.water_system_ownership,
      water_system_connections: f.water_system_connections,
      water_system_status: f.water_system_status,
      water_system_phone: f.water_system_phone,
    },
    mineral_water: {
      oil_gas_well: parseFloat(f.oil_gas_well_distance_m||99999) < 10000 ? {name:f.nearest_oil_gas_well_name,status:f.oil_gas_well_status,depth_ft:f.oil_gas_well_depth_ft,hydrocarbon_show:f.oil_gas_hydrocarbon_show,distance_m:f.oil_gas_well_distance_m} : null,
      metallic_mineral: parseFloat(f.mineral_site_distance_m||99999) < 5000 ? {name:f.nearest_mineral_site_name,primary_commodity:f.mineral_primary_commodity,commodities:f.mineral_commodities,distance_m:f.mineral_site_distance_m} : null,
      aggregate_resource: (f.on_aggregate_resource_area === 'true' || f.on_aggregate_resource_area === true) ? {on_resource_area:true,commodity:f.aggregate_commodity,classification:f.aggregate_classification} : null,
      nearest_well: parseFloat(f.well_distance_m||99999) < 500 ? {type:f.well_type,depth_ft:f.well_depth_ft,gpm:f.well_gpm,distance_m:f.well_distance_m} : null,
      geothermal: f.geothermal_distance_m && parseFloat(f.geothermal_distance_m) < 10000 ? {site:f.nearest_geothermal_site,temp_celsius:f.geothermal_temp_celsius,distance_m:f.geothermal_distance_m} : null,
      thermal_spring: f.thermal_spring_distance_m && parseFloat(f.thermal_spring_distance_m) < 10000 ? {name:f.nearest_thermal_spring,temp_celsius:f.thermal_spring_temp_celsius,flow_lpm:f.thermal_spring_flow_lpm,distance_m:f.thermal_spring_distance_m} : null,
    },
    mines: {
      abandoned: parseFloat(f.abandoned_mine_distance_m||99999) < 5000 ? {name:f.nearest_abandoned_mine_name,hazard:f.abandoned_mine_hazard,material:f.abandoned_mine_material,distance_m:f.abandoned_mine_distance_m} : null,
      active: parseFloat(f.active_mine_distance_m||99999) < 5000 ? {name:f.nearest_active_mine_name,commodity:f.active_mine_commodity,distance_m:f.active_mine_distance_m} : null,
    },
  };
}

// ── FETCH ACTIVE LISTING ─────────────────────────────────────────────────────
async function fetchComps(pin: string, lat: number, lon: number, presentUse: number, sqftLot: number, district: string, totalVal: number, sqftLiving: number, yrBuilt: number) {
  try {
    const sqftMin      = sqftLiving > 0 ? Math.round(sqftLiving * 0.70) : 0;
    const sqftMax      = sqftLiving > 0 ? Math.round(sqftLiving * 1.30) : 999999;
    const sqftBroadMin = sqftLiving > 0 ? Math.round(sqftLiving * 0.50) : 0;
    const sqftBroadMax = sqftLiving > 0 ? Math.round(sqftLiving * 1.50) : 999999;
    const yrMin        = yrBuilt > 0 ? yrBuilt - 15 : 0;
    const yrMax        = yrBuilt > 0 ? yrBuilt + 15 : 9999;
    const ppsf         = sqftLiving > 0 && totalVal > 0 ? Math.round(totalVal / sqftLiving) : 0;

    const sqftFilter      = sqftLiving > 0 ? `AND SqFtTotLiving BETWEEN ${sqftMin} AND ${sqftMax}` : '';
    const sqftBroadFilter = sqftLiving > 0 ? `AND SqFtTotLiving BETWEEN ${sqftBroadMin} AND ${sqftBroadMax}` : '';
    const yrFilter        = yrBuilt > 0 ? `AND CAST(YrBuilt AS INT64) BETWEEN ${yrMin} AND ${yrMax}` : '';

    const [c1, c2, c3, c4, c5, activeListings] = await Promise.all([

      // C1: Tight comps — same use, 0.5mi, ±30% sqft, ±15yr, closest assessed value
      bq(`SELECT PIN, Address, SqFtTotLiving, SqFtLot, latest_total_val, last_sale_price, last_sale_date, YrBuilt, BldgGrade, Bedrooms, BathFullCount,
          ROUND(SAFE_DIVIDE(latest_total_val, SqFtTotLiving)) as ppsf,
          ST_DISTANCE(ST_GEOGPOINT(LON, LAT), ST_GEOGPOINT(${lon}, ${lat})) as dist_m
          FROM \`leafy-loader-492820-p7.rwabidask.king_county_master_intel_flat\`
          WHERE PIN != '${pin}' AND LAT IS NOT NULL AND LON IS NOT NULL
          AND ST_DISTANCE(ST_GEOGPOINT(LON, LAT), ST_GEOGPOINT(${lon}, ${lat})) < 804
          AND PresentUse = ${presentUse} AND latest_total_val > 0
          ${sqftFilter} ${yrFilter}
          ORDER BY ABS(latest_total_val - ${totalVal}) ASC LIMIT 5`, 20000),

      // C2: Recent sales — same use, 1mi, ±30% sqft, sold last 12 months
      bq(`SELECT PIN, Address, SqFtTotLiving, SqFtLot, latest_total_val, last_sale_price, last_sale_date, YrBuilt, BldgGrade, Bedrooms, BathFullCount,
          ROUND(SAFE_DIVIDE(last_sale_price, SqFtTotLiving)) as sale_ppsf,
          ST_DISTANCE(ST_GEOGPOINT(LON, LAT), ST_GEOGPOINT(${lon}, ${lat})) as dist_m
          FROM \`leafy-loader-492820-p7.rwabidask.king_county_master_intel_flat\`
          WHERE PIN != '${pin}' AND LAT IS NOT NULL AND LON IS NOT NULL
          AND ST_DISTANCE(ST_GEOGPOINT(LON, LAT), ST_GEOGPOINT(${lon}, ${lat})) < 1609
          AND PresentUse = ${presentUse} AND last_sale_price > 10000
          AND last_sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
          ${sqftFilter}
          ORDER BY last_sale_date DESC LIMIT 5`, 20000),

      // C3: Broad market — same use, 2mi, ±50% sqft, sold last 24 months
      bq(`SELECT PIN, Address, SqFtTotLiving, SqFtLot, latest_total_val, last_sale_price, last_sale_date, YrBuilt, BldgGrade, Bedrooms, BathFullCount,
          ROUND(SAFE_DIVIDE(last_sale_price, SqFtTotLiving)) as sale_ppsf,
          ST_DISTANCE(ST_GEOGPOINT(LON, LAT), ST_GEOGPOINT(${lon}, ${lat})) as dist_m
          FROM \`leafy-loader-492820-p7.rwabidask.king_county_master_intel_flat\`
          WHERE PIN != '${pin}' AND LAT IS NOT NULL AND LON IS NOT NULL
          AND ST_DISTANCE(ST_GEOGPOINT(LON, LAT), ST_GEOGPOINT(${lon}, ${lat})) < 3218
          AND PresentUse = ${presentUse} AND last_sale_price > 10000
          AND last_sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 730 DAY)
          ${sqftBroadFilter}
          ORDER BY last_sale_date DESC LIMIT 5`, 20000),

      // C4: Price per sqft comps — same use, 1mi, closest $/sqft to subject
      bq(`SELECT PIN, Address, SqFtTotLiving, SqFtLot, latest_total_val, last_sale_price, last_sale_date, YrBuilt, BldgGrade, Bedrooms, BathFullCount,
          ROUND(SAFE_DIVIDE(latest_total_val, SqFtTotLiving)) as ppsf,
          ST_DISTANCE(ST_GEOGPOINT(LON, LAT), ST_GEOGPOINT(${lon}, ${lat})) as dist_m
          FROM \`leafy-loader-492820-p7.rwabidask.king_county_master_intel_flat\`
          WHERE PIN != '${pin}' AND LAT IS NOT NULL AND LON IS NOT NULL
          AND ST_DISTANCE(ST_GEOGPOINT(LON, LAT), ST_GEOGPOINT(${lon}, ${lat})) < 1609
          AND PresentUse = ${presentUse} AND latest_total_val > 0 AND SqFtTotLiving > 0
          ${sqftFilter}
          ORDER BY ABS(SAFE_DIVIDE(latest_total_val, SqFtTotLiving) - ${ppsf}) ASC LIMIT 5`, 20000),

      // C5: ZIP trend — same use, same ZIP code, sold last 24 months, up to 10
      // Uses ZIP not district — district names like 'SEATTLE' are too broad to be meaningful
      bq(`SELECT PIN, Address, SqFtTotLiving, SqFtLot, latest_total_val, last_sale_price, last_sale_date, YrBuilt, BldgGrade, Bedrooms, BathFullCount,
          ROUND(SAFE_DIVIDE(last_sale_price, SqFtTotLiving)) as sale_ppsf,
          ST_DISTANCE(ST_GEOGPOINT(LON, LAT), ST_GEOGPOINT(${lon}, ${lat})) as dist_m
          FROM \`leafy-loader-492820-p7.rwabidask.king_county_master_intel_flat\`
          WHERE PIN != '${pin}' AND LAT IS NOT NULL AND LON IS NOT NULL
          AND ZipCode = (SELECT ZipCode FROM \`leafy-loader-492820-p7.rwabidask.king_county_master_intel_flat\` WHERE PIN = '${pin}' LIMIT 1)
          AND PresentUse = ${presentUse} AND last_sale_price > 10000
          AND last_sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 730 DAY)
          ${sqftBroadFilter}
          ORDER BY last_sale_date DESC LIMIT 10`, 20000),

      // C6: Active listings from RWABidAsk network within 2 miles
      bq(`SELECT l.apn, l.asking_price, l.listing_type, l.description, l.contact_name,
          f.Address, f.SqFtTotLiving, f.SqFtLot, f.latest_total_val, f.YrBuilt, f.Bedrooms,
          ST_DISTANCE(ST_GEOGPOINT(f.LON, f.LAT), ST_GEOGPOINT(${lon}, ${lat})) as dist_m
          FROM \`leafy-loader-492820-p7.rwabidask.parcel_listings\` l
          JOIN \`leafy-loader-492820-p7.rwabidask.king_county_master_intel_flat\` f ON l.apn = f.PIN
          WHERE l.status = 'active' AND l.apn != '${pin}'
          AND f.LAT IS NOT NULL AND f.LON IS NOT NULL
          AND ST_DISTANCE(ST_GEOGPOINT(f.LON, f.LAT), ST_GEOGPOINT(${lon}, ${lat})) < 3218
          ORDER BY dist_m ASC LIMIT 5`, 15000),
    ]);

    // Comp methodology metadata — displayed in PDF so banks/appraisers can verify
    const methodology = {
      c1: { label: 'Tight Value Match', radius_m: 804, sqft_range: sqftLiving > 0 ? sqftMin+'-'+sqftMax : 'any', yr_range: yrBuilt > 0 ? yrMin+'-'+yrMax : 'any', sort: 'closest assessed value', window: 'current assessment' },
      c2: { label: 'Recent Sales', radius_m: 1609, sqft_range: sqftLiving > 0 ? sqftMin+'-'+sqftMax : 'any', yr_range: 'any', sort: 'most recent first', window: '12 months' },
      c3: { label: 'Broad Market', radius_m: 3218, sqft_range: sqftLiving > 0 ? sqftBroadMin+'-'+sqftBroadMax : 'any', yr_range: 'any', sort: 'most recent first', window: '24 months' },
      c4: { label: 'Price Per SqFt Match', radius_m: 1609, sqft_range: sqftLiving > 0 ? sqftMin+'-'+sqftMax : 'any', yr_range: 'any', sort: 'closest $/sqft to subject', window: 'current assessment' },
      c5: { label: 'District Sales Trend', radius_m: 'district', sqft_range: 'any', yr_range: 'any', sort: 'most recent first', window: '36 months' },
      subject_sqft: sqftLiving, subject_yr: yrBuilt, subject_ppsf: ppsf, subject_val: totalVal,
    };

    return { neighborhood: c1, recent_sales: c2, broad_market: c3, ppsf_comps: c4, district_trend: c5, active_listings: activeListings, methodology };
  } catch(e) {
    console.warn("[comps]", e);
    return null;
  }
}

async function fetchListing(apn: string) {
  try {
    const rows = await bq(
      `SELECT apn, asking_price, listing_type, role, description, video_url, tour_url,
              contact_name, contact_phone, contact_email, agent_photo_url,
              license_number, brokerage, media_urls, status, created_at
       FROM \`leafy-loader-492820-p7.rwabidask.parcel_listings\`
       WHERE apn = '${apn}' AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`, 10000);
    return rows[0] || null;
  } catch(e) {
    console.warn("[listing]", e);
    return null;
  }
}

// ── SERVE ──────────────────────────────────────────────────────────────────

// ── CRIME DATA ────────────────────────────────────────────────────────────────
async function fetchCrime(lat: number, lon: number) {
  try {
    const [radius_half, radius_one, trend, peak] = await Promise.all([

      // 0.5 mile radius — by category
      bq(`SELECT offense_category, 
          COUNT(*) as total_all_time,
          COUNTIF(report_date_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)) as last_12mo
          FROM \`leafy-loader-492820-p7.rwabidask.seattle_crimes_geo\`
          WHERE has_geo = TRUE
          AND ST_DISTANCE(ST_GEOGPOINT(${lon}, ${lat}), ST_GEOGPOINT(longitude, latitude)) < 804
          GROUP BY offense_category ORDER BY total_all_time DESC`, 15000),

      // 1 mile radius — by category
      bq(`SELECT offense_category,
          COUNT(*) as total_all_time,
          COUNTIF(report_date_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)) as last_12mo
          FROM \`leafy-loader-492820-p7.rwabidask.seattle_crimes_geo\`
          WHERE has_geo = TRUE
          AND ST_DISTANCE(ST_GEOGPOINT(${lon}, ${lat}), ST_GEOGPOINT(longitude, latitude)) < 1609
          GROUP BY offense_category ORDER BY total_all_time DESC`, 15000),

      // Year-over-year trend — 1 mile, all years
      bq(`SELECT incident_year, COUNT(*) as incidents
          FROM \`leafy-loader-492820-p7.rwabidask.seattle_crimes_geo\`
          WHERE has_geo = TRUE
          AND ST_DISTANCE(ST_GEOGPOINT(${lon}, ${lat}), ST_GEOGPOINT(longitude, latitude)) < 1609
          AND incident_year >= 2010
          GROUP BY incident_year ORDER BY incident_year ASC`, 15000),

      // Peak hours — 0.5 mile
      bq(`SELECT hour_of_day, COUNT(*) as incidents
          FROM \`leafy-loader-492820-p7.rwabidask.seattle_crimes_geo\`
          WHERE has_geo = TRUE
          AND ST_DISTANCE(ST_GEOGPOINT(${lon}, ${lat}), ST_GEOGPOINT(longitude, latitude)) < 804
          AND hour_of_day IS NOT NULL
          GROUP BY hour_of_day ORDER BY incidents DESC LIMIT 5`, 15000),
    ]);

    // Compute totals
    const total_half_all  = radius_half.reduce((s:number, r:any) => s + parseInt(r.total_all_time||0), 0);
    const total_half_12mo = radius_half.reduce((s:number, r:any) => s + parseInt(r.last_12mo||0), 0);
    const total_one_all   = radius_one.reduce((s:number,  r:any) => s + parseInt(r.total_all_time||0), 0);
    const total_one_12mo  = radius_one.reduce((s:number,  r:any) => s + parseInt(r.last_12mo||0), 0);

    // YoY change last 2 years
    const trendSorted = [...trend].sort((a:any,b:any) => parseInt(b.incident_year)-parseInt(a.incident_year));
    const yoy = trendSorted.length >= 2
      ? Math.round((parseInt(trendSorted[0].incidents)-parseInt(trendSorted[1].incidents))/parseInt(trendSorted[1].incidents)*100)
      : null;

    return {
      half_mile: { by_category: radius_half, total_all_time: total_half_all, last_12mo: total_half_12mo },
      one_mile:  { by_category: radius_one,  total_all_time: total_one_all,  last_12mo: total_one_12mo  },
      trend,
      peak_hours: peak,
      yoy_change_pct: yoy,
      data_source: 'Seattle Police Department + King County Sheriff — 2010 to present',
    };
  } catch(e) {
    console.warn("[crime]", e);
    return null;
  }
}

async function fetchPierceCrime(lat: number, lon: number) {
  try {
    const [radius_half, radius_one] = await Promise.all([
      bq(`SELECT offense_type as offense_category, COUNT(*) as total_all_time,
          COUNTIF(EXTRACT(DATE FROM PARSE_TIMESTAMP('%a, %d %b %Y %H:%M:%S GMT', OccurredOn)) >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)) as last_12mo
          FROM \`leafy-loader-492820-p7.rwabidask.pierce_crime_geo\`
          WHERE ST_DISTANCE(ST_GEOGPOINT(${lon}, ${lat}), ST_GEOGPOINT(lng, lat)) < 804
          GROUP BY offense_type ORDER BY total_all_time DESC`, 15000),
      bq(`SELECT offense_type as offense_category, COUNT(*) as total_all_time,
          COUNTIF(EXTRACT(DATE FROM PARSE_TIMESTAMP('%a, %d %b %Y %H:%M:%S GMT', OccurredOn)) >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)) as last_12mo
          FROM \`leafy-loader-492820-p7.rwabidask.pierce_crime_geo\`
          WHERE ST_DISTANCE(ST_GEOGPOINT(${lon}, ${lat}), ST_GEOGPOINT(lng, lat)) < 1609
          GROUP BY offense_type ORDER BY total_all_time DESC`, 15000),
    ]);
    const total_half_all  = radius_half.reduce((s:number, r:any) => s + parseInt(r.total_all_time||0), 0);
    const total_half_12mo = radius_half.reduce((s:number, r:any) => s + parseInt(r.last_12mo||0), 0);
    const total_one_all   = radius_one.reduce((s:number,  r:any) => s + parseInt(r.total_all_time||0), 0);
    const total_one_12mo  = radius_one.reduce((s:number,  r:any) => s + parseInt(r.last_12mo||0), 0);
    return {
      half_mile: { by_category: radius_half, total_all_time: total_half_all, last_12mo: total_half_12mo },
      one_mile:  { by_category: radius_one,  total_all_time: total_one_all,  last_12mo: total_one_12mo  },
      trend: [], peak_hours: [], yoy_change_pct: null,
      data_source: 'Pierce County Sheriff Department',
    };
  } catch(e) {
    console.warn("[pierce crime]", e);
    return null;
  }
}

serve(async(req) => {
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:CORS});


  // ── FAA AIRCRAFT QUERY ───────────────────────────────────────────────────
  if (new URL(req.url).searchParams.get("action") === "faa-aircraft") {
    const u = new URL(req.url);
    const latMin = parseFloat(u.searchParams.get("lat_min") || "24");
    const latMax = parseFloat(u.searchParams.get("lat_max") || "50");
    const lngMin = parseFloat(u.searchParams.get("lng_min") || "-125");
    const lngMax = parseFloat(u.searchParams.get("lng_max") || "-65");
    const limit  = Math.min(parseInt(u.searchParams.get("limit") || "200"), 500);
    try {
      const rows = await bq(`
        SELECT N_NUMBER, OWNER_NAME, CITY, STATE, ZIP_CODE, YEAR_MFR,
               MANUFACTURER, MODEL, NO_SEATS, AC_WEIGHT, SPEED,
               ENGINE_MFR, ENGINE_MODEL, HORSEPOWER, STATUS_CODE,
               EXPIRATION_DATE, TYPE_AIRCRAFT, TYPE_REGISTRANT,
               LAT, LNG
        FROM \`leafy-loader-492820-p7.rwabidask.faa_aircraft_enriched\`
        WHERE LAT BETWEEN ${latMin} AND ${latMax}
          AND LNG BETWEEN ${lngMin} AND ${lngMax}
        LIMIT ${limit}
      `, 15000);
      return new Response(JSON.stringify(rows), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" }
      });
    } catch(e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
  }

  // ── EBAY BROWSE API ─────────────────────────────────────────────────────────
  if (new URL(req.url).searchParams.get("action") === "ebay-listings") {
    const u = new URL(req.url);
    const EBAY_APP_ID  = Deno.env.get("EBAY_APP_ID")  ?? "";
    const EBAY_CERT_ID = Deno.env.get("EBAY_CERT_ID") ?? "";
    const category     = u.searchParams.get("category") ?? "";
    const keywords     = u.searchParams.get("keywords") ?? "";
    const limit        = u.searchParams.get("limit")    ?? "50";
    try {
      const tokenResp = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + btoa(`${EBAY_APP_ID}:${EBAY_CERT_ID}`)
        },
        body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope"
      });
      const tokenData = await tokenResp.json();
      const token = tokenData.access_token;
      if (!token) return new Response(JSON.stringify({error:"eBay auth failed",detail:tokenData}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});
      const params = new URLSearchParams({ limit });
      if (category) params.set("category_ids", category);
      if (keywords) params.set("q", keywords);
      const searchResp = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
        headers: { "Authorization": `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" }
      });
      const searchData = await searchResp.json();
      const items = (searchData.itemSummaries || []).map((item: any) => ({
        id:        "ebay-" + item.itemId,
        title:     item.title,
        price:     parseFloat(item.price?.value || "0"),
        currency:  item.price?.currency || "USD",
        url:       item.itemWebUrl,
        image:     item.image?.imageUrl || null,
        condition: item.condition || null,
        location:  (item.itemLocation?.city || "") + (item.itemLocation?.stateOrProvince ? ", " + item.itemLocation.stateOrProvince : ""),
        category:  item.categories?.[0]?.categoryName || null,
        _isEbay:   true,
      }));
      return new Response(JSON.stringify(items),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(e: any) {
      return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});
    }
  }

  // ── RSS PASSTHROUGH ──────────────────────────────────────────────────────
  if (new URL(req.url).searchParams.get("action") === "rss-fetch") {
    const feedUrl = new URL(req.url).searchParams.get("url") || "";
    if (!feedUrl) return new Response("url required",{status:400,headers:CORS});
    try {
      const r = await fetch(feedUrl, {
        headers: {"User-Agent":"Mozilla/5.0 (compatible; RWABidAsk/1.0)","Accept":"application/rss+xml,application/xml,text/xml,*/*"},
        signal: AbortSignal.timeout(8000), redirect: "follow",
      });
      const xml = await r.text();
      return new Response(xml, {status:200, headers:{...CORS,"Content-Type":"application/xml; charset=utf-8"}});
    } catch(e:any) {
      return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});
    }
  }



  // ── GSA AUCTIONS FEED (1-hour cache) ─────────────────────────
  if (req.method === "GET" && new URL(req.url).searchParams.get("action") === "gsa") {
    const now = Date.now();
    const cacheKey = "gsa_cache";
    const cacheTTL = 60 * 60 * 1000; // 1 hour
    const GSA_API_KEY = Deno.env.get("GSA_API_KEY") ?? "";

    // Simple in-memory cache using globalThis
    const cache = (globalThis as any)._gsaCache;
    const bustCache = new URL(req.url).searchParams.get("bust") === "1";
    if (!bustCache && cache && (now - cache.ts) < cacheTTL) {
      return new Response(JSON.stringify(cache.data), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const TRANSPORT_KW = ['aircraft','airplane','helicopter','jet','plane','vessel','boat','ship','yacht','vehicle','truck','bus','van','motorcycle','rv','motorhome','trailer','forklift','crane','tractor','car','sedan','suv','pickup'];
    const ENERGY_KW    = ['generator','solar','turbine','engine','compressor','transformer','fuel'];
    const HEALTH_KW    = ['medical','surgical','dental','xray','x-ray','mri','ultrasound','defibrillator','ventilator'];
    const ROBOT_KW     = ['robot','drone','uav','autonomous'];
    const INFRA_KW     = ['server','network','tower','antenna','radar'];
    const ART_KW       = ['artwork','painting','sculpture','antique','collectible'];

    function classifyGSA(name: string): string | null {
      const n = name.toLowerCase();
      if (TRANSPORT_KW.some(k => n.includes(k))) return 'transport';
      if (ENERGY_KW.some(k => n.includes(k)))    return 'energy';
      if (HEALTH_KW.some(k => n.includes(k)))    return 'healthcare';
      if (ROBOT_KW.some(k => n.includes(k)))     return 'robotics';
      if (INFRA_KW.some(k => n.includes(k)))     return 'infrastructure';
      if (ART_KW.some(k => n.includes(k)))       return 'art';
      return null;
    }

    try {
      const gsaResp = await fetch(
        `https://api.gsa.gov/assets/gsaauctions/v2/auctions?api_key=${GSA_API_KEY}&format=JSON`,
        { redirect: 'follow' }
      );
      const gsaData = await gsaResp.json();
      const lots = gsaData.Results || [];

      const relevant = lots.filter((lot: any) => classifyGSA(lot.itemName || ''));

      // Geocode all unique city/state combos in parallel
      const uniqueLocations = [...new Set(relevant.map((l: any) => `${l.propertyCity},${l.propertyState}`))];
      const geoCache: Record<string, {lat: number, lng: number}> = {};
      
      const batchSize = 10;
      for (let i = 0; i < uniqueLocations.length; i += batchSize) {
        const batch = uniqueLocations.slice(i, i + batchSize);
        await Promise.all(batch.map(async (loc: unknown) => {
          const locStr = loc as string;
          try {
            const geoResp = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locStr)}&key=${MAPS_KEY}`
            );
            const geoData = await geoResp.json();
            if (geoData.results?.[0]?.geometry?.location) {
              geoCache[locStr] = geoData.results[0].geometry.location;
            } else {
              console.warn('[GSA geo] no result:', locStr, geoData.status);
            }
          } catch(e) {
            console.error('[GSA geo] failed:', locStr, e);
          }
        }));
      }

      const filtered = relevant.map((lot: any) => {
        const locKey = `${lot.propertyCity},${lot.propertyState}`;
        const geo = geoCache[locKey] || null;
        return {
          id: `gsa-${lot.saleNo}-${lot.lotNo}`,
          name: lot.itemName,
          asset_class: classifyGSA(lot.itemName || ''),
          listing_type: 'Auction',
          address: `${lot.propertyCity}, ${lot.propertyState}`,
          city: lot.propertyCity,
          state: lot.propertyState,
          zip: lot.propertyZip,
          lat: geo?.lat || null,
          lng: geo?.lng || null,
          asking_price: parseFloat(lot.highBidAmount || '0'),
          start_date: lot.aucStartDt,
          end_date: lot.aucEndDt,
          agency: lot.agencyName,
          image_url: lot.imageURL,
          listing_url: lot.itemDescURL,
          auction_status: lot.auctionStatus,
          contact_email: lot.coEmail,
          source: 'GSA Auctions',
        };
      });

      (globalThis as any)._gsaCache = { ts: now, data: filtered };

      return new Response(JSON.stringify(filtered), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" }
      });
    } catch(e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
  }



  // ── LISTING SUBMIT ────────────────────────────────────────────
  // ── GCS SIGNED UPLOAD URL ─────────────────────────────────────
  // ── DELIST / UPDATE LISTING STATUS ──────────────────────────────────────────
  if (req.method === "POST" && new URL(req.url).searchParams.get("action") === "delist") {
    try {
      const body = await req.json();
      const { apn, status } = body;
      if (!apn) return new Response(JSON.stringify({error:"apn required"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
      const newStatus = status === 'active' ? 'active' : 'inactive';
      const sql = `UPDATE \`leafy-loader-492820-p7.rwabidask.parcel_listings\`
        SET status = '${newStatus}', updated_at = CURRENT_TIMESTAMP()
        WHERE apn = '${apn}'`;
      await bq(sql, 10000);
      return new Response(JSON.stringify({ok:true, apn, status:newStatus}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(e) {
      return new Response(JSON.stringify({error:String(e)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});
    }
  }


  // ── RSS LISTINGS HANDLER ─────────────────────────────────────────────────
  if (req.method === "GET" && new URL(req.url).searchParams.get("action") === "rss-listings") {
    const u = new URL(req.url);
    const bustCache = u.searchParams.get("bust") === "1";
    const boundsParam = u.searchParams.get("bounds") || "";
    const now = Date.now();
    const CACHE_TTL = 15 * 60 * 1000;

    const CL_CITIES: { slug: string; lat: number; lng: number }[] = [
      {slug:"seattle",lat:47.61,lng:-122.33},{slug:"sfbay",lat:37.77,lng:-122.41},
      {slug:"losangeles",lat:34.05,lng:-118.24},{slug:"newyork",lat:40.71,lng:-74.01},
      {slug:"miami",lat:25.77,lng:-80.19},{slug:"chicago",lat:41.85,lng:-87.65},
      {slug:"houston",lat:29.76,lng:-95.37},{slug:"phoenix",lat:33.45,lng:-112.07},
      {slug:"denver",lat:39.74,lng:-104.98},{slug:"boston",lat:42.36,lng:-71.06},
      {slug:"portland",lat:45.52,lng:-122.68},{slug:"sandiego",lat:32.72,lng:-117.16},
      {slug:"dallas",lat:32.78,lng:-96.80},{slug:"atlanta",lat:33.75,lng:-84.39},
      {slug:"minneapolis",lat:44.98,lng:-93.27},{slug:"detroit",lat:42.33,lng:-83.05},
      {slug:"cleveland",lat:41.50,lng:-81.69},{slug:"pittsburgh",lat:40.44,lng:-79.99},
      {slug:"philadelphia",lat:39.95,lng:-75.16},{slug:"baltimore",lat:39.29,lng:-76.61},
      {slug:"washingtondc",lat:38.89,lng:-77.03},{slug:"nashville",lat:36.17,lng:-86.78},
      {slug:"austin",lat:30.27,lng:-97.74},{slug:"saltlakecity",lat:40.76,lng:-111.89},
      {slug:"lasvegas",lat:36.17,lng:-115.14},{slug:"albuquerque",lat:35.08,lng:-106.65},
      {slug:"tucson",lat:32.22,lng:-110.97},{slug:"sacramento",lat:38.58,lng:-121.49},
      {slug:"fresno",lat:36.74,lng:-119.77},{slug:"reno",lat:39.53,lng:-119.81},
      {slug:"spokane",lat:47.66,lng:-117.43},{slug:"charlotte",lat:35.23,lng:-80.84},
      {slug:"raleigh",lat:35.77,lng:-78.64},{slug:"richmond",lat:37.54,lng:-77.43},
      {slug:"columbus",lat:39.96,lng:-82.99},{slug:"indianapolis",lat:39.77,lng:-86.16},
      {slug:"kansascity",lat:39.10,lng:-94.58},{slug:"stlouis",lat:38.63,lng:-90.20},
      {slug:"milwaukee",lat:43.04,lng:-87.91},{slug:"memphis",lat:35.15,lng:-90.05},
      {slug:"neworleans",lat:29.95,lng:-90.07},{slug:"tampa",lat:27.95,lng:-82.46},
      {slug:"orlando",lat:28.54,lng:-81.38},{slug:"jacksonville",lat:30.33,lng:-81.66},
      {slug:"buffalo",lat:42.89,lng:-78.86},{slug:"rochester",lat:43.16,lng:-77.61},
      {slug:"hartford",lat:41.76,lng:-72.68},{slug:"providence",lat:41.82,lng:-71.42},
      {slug:"anchorage",lat:61.22,lng:-149.90},{slug:"honolulu",lat:21.31,lng:-157.86},
      {slug:"puertorico",lat:18.22,lng:-66.59},{slug:"toronto",lat:43.65,lng:-79.38},
      {slug:"vancouver",lat:49.25,lng:-123.12},{slug:"calgary",lat:51.05,lng:-114.07},
      {slug:"montreal",lat:45.50,lng:-73.57},{slug:"ottawa",lat:45.42,lng:-75.69},
      {slug:"winnipeg",lat:49.90,lng:-97.14},{slug:"london",lat:51.51,lng:-0.13},
      {slug:"sydney",lat:-33.87,lng:151.21},{slug:"melbourne",lat:-37.81,lng:144.96},
      {slug:"brisbane",lat:-27.47,lng:153.02},{slug:"perth",lat:-31.95,lng:115.86},
      {slug:"amsterdam",lat:52.37,lng:4.90},{slug:"berlin",lat:52.52,lng:13.40},
      {slug:"paris",lat:48.86,lng:2.35},{slug:"barcelona",lat:41.39,lng:2.16},
      {slug:"vienna",lat:48.21,lng:16.37},{slug:"stockholm",lat:59.33,lng:18.07},
    ];

    const SPECIALTY_FEEDS = [
      {url:"https://www.controller.com/listings/aircraft/for-sale/rss",asset_class:"aviation",source:"Controller.com",lat:32.0,lng:-97.0},
      {url:"https://www.trade-a-plane.com/rss",asset_class:"aviation",source:"Trade-A-Plane",lat:32.0,lng:-97.0},
      {url:"https://www.boatshop24.com/rss",asset_class:"maritime",source:"Boatshop24",lat:51.5,lng:0.1},
      {url:"https://www.bizbuysell.com/rss/",asset_class:"business",source:"BizBuySell",lat:40.71,lng:-74.01},
    ];

    const CL_CATEGORIES = [
      {code:"boa",asset_class:"maritime"},
      {code:"rea",asset_class:"realestate"},
      {code:"cta",asset_class:"transport"},
      {code:"hea",asset_class:"equipment"},
      {code:"bfd",asset_class:"business"},
      {code:"for",asset_class:"realestate"},
      {code:"atq",asset_class:"art"},
      {code:"mcy",asset_class:"transport"},
      {code:"rvs",asset_class:"transport"},
      {code:"atp",asset_class:"aviation"},
    ];

    let citiesToFetch = CL_CITIES;
    if (boundsParam) {
      const parts = boundsParam.split(",").map(parseFloat);
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [latMin, lngMin, latMax, lngMax] = parts;
        const pad = Math.max(5, (latMax - latMin) * 0.5);
        const filtered = CL_CITIES.filter(c =>
          c.lat >= latMin - pad && c.lat <= latMax + pad &&
          c.lng >= lngMin - pad && c.lng <= lngMax + pad
        );
        citiesToFetch = filtered.length > 0 ? filtered : CL_CITIES.slice(0, 20);
      }
    }

    const cityCache = (globalThis as any)._rssCityCache || {};
    (globalThis as any)._rssCityCache = cityCache;

    function parseRSS(xml: string, asset_class: string, source: string, defaultLat: number, defaultLng: number): any[] {
      const items: any[] = [];
      const re = /<item>([\s\S]*?)<\/item>/g;
      let m;
      while ((m = re.exec(xml)) !== null) {
        const block = m[1];
        const get = (tag: string) => {
          const r = block.match(new RegExp(`<${tag}[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/${tag}>|<${tag}[^>]*>([^<]*)<\/${tag}>`));
          return r ? (r[1]||r[2]||"").trim() : "";
        };
        const title = get("title");
        const link = get("link") || (block.match(/<link>(.*?)<\/link>/)||[])[1] || "";
        const desc = get("description").replace(/<[^>]+>/g,"").slice(0,300);
        const priceMatch = (title+desc).match(/\$[\d,]+/);
        const price = priceMatch ? parseInt(priceMatch[0].replace(/[$,]/g,"")) : 0;
        const geoLat = block.match(/<geo:lat>(.*?)<\/geo:lat>/);
        const geoLng = block.match(/<geo:long>(.*?)<\/geo:long>/);
        const lat = geoLat ? parseFloat(geoLat[1]) : defaultLat + (Math.random()-0.5)*0.4;
        const lng = geoLng ? parseFloat(geoLng[1]) : defaultLng + (Math.random()-0.5)*0.4;
        if (!title) continue;
        const idBase = link.slice(-20).replace(/[^a-z0-9]/gi,"") || Math.random().toString(36).slice(2);
        items.push({
          id: `rss-${source.replace(/[^a-z0-9]/gi,"-").slice(0,20)}-${idBase}`,
          name: title, description: desc, asset_class, source, price, lat, lng,
          listing_url: link,
          image_url: (block.match(/<media:content[^>]+url="([^"]+)"/) || block.match(/<enclosure[^>]+url="([^"]+)"/) || [])[1] || null,
          _isRSS: true,
        });
      }
      return items;
    }

    const allResults: any[] = [];
    const fetchPromises: Promise<void>[] = [];

    for (const feed of SPECIALTY_FEEDS) {
      const cacheKey = `specialty_${feed.source}`;
      const cached = cityCache[cacheKey];
      if (!bustCache && cached && (now - cached.ts) < CACHE_TTL) {
        allResults.push(...cached.items); continue;
      }
      fetchPromises.push((async () => {
        try {
          const r = await fetch(feed.url, {headers:{"User-Agent":"Mozilla/5.0"},signal:AbortSignal.timeout(8000)});
          console.log("[RSS]", feed.source, "status:", r.status);
          if (!r.ok) return;
          const xml = await r.text();
          console.log("[RSS]", feed.source, "xml length:", xml.length);
          const items = parseRSS(xml, feed.asset_class, feed.source, feed.lat, feed.lng);
          console.log("[RSS]", feed.source, "items:", items.length);
          cityCache[cacheKey] = {ts:now, items};
          allResults.push(...items);
        } catch(e) { console.warn("[RSS]", feed.source, String(e)); }
      })());
    }

    for (const city of citiesToFetch) {
      for (const cat of CL_CATEGORIES) {
        const cacheKey = `cl_${city.slug}_${cat.code}`;
        const cached = cityCache[cacheKey];
        if (!bustCache && cached && (now - cached.ts) < CACHE_TTL) {
          allResults.push(...cached.items); continue;
        }
        fetchPromises.push((async () => {
          try {
            const url = `https://${city.slug}.craigslist.org/search/${cat.code}.rss`;
            const r = await fetch(url, {headers:{"User-Agent":"Mozilla/5.0"},signal:AbortSignal.timeout(6000)});
            if (!r.ok) return;
            const items = parseRSS(await r.text(), cat.asset_class, `Craigslist/${city.slug}`, city.lat, city.lng);
            cityCache[cacheKey] = {ts:now, items};
            allResults.push(...items);
          } catch(e) { /* city may not have category */ }
        })());
      }
    }

    await Promise.all(fetchPromises);

    return new Response(JSON.stringify(allResults), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" }
    });
  }


  // ── RSS LISTINGS HANDLER ─────────────────────────────────────────────────
  if (req.method === "GET" && new URL(req.url).searchParams.get("action") === "rss-listings") {
    const u = new URL(req.url);
    const bustCache = u.searchParams.get("bust") === "1";
    const boundsParam = u.searchParams.get("bounds") || "";
    const now = Date.now();
    const CACHE_TTL = 15 * 60 * 1000;

    const CL_CITIES: { slug: string; lat: number; lng: number }[] = [
      {slug:"seattle",lat:47.61,lng:-122.33},{slug:"sfbay",lat:37.77,lng:-122.41},
      {slug:"losangeles",lat:34.05,lng:-118.24},{slug:"newyork",lat:40.71,lng:-74.01},
      {slug:"miami",lat:25.77,lng:-80.19},{slug:"chicago",lat:41.85,lng:-87.65},
      {slug:"houston",lat:29.76,lng:-95.37},{slug:"phoenix",lat:33.45,lng:-112.07},
      {slug:"denver",lat:39.74,lng:-104.98},{slug:"boston",lat:42.36,lng:-71.06},
      {slug:"portland",lat:45.52,lng:-122.68},{slug:"sandiego",lat:32.72,lng:-117.16},
      {slug:"dallas",lat:32.78,lng:-96.80},{slug:"atlanta",lat:33.75,lng:-84.39},
      {slug:"minneapolis",lat:44.98,lng:-93.27},{slug:"detroit",lat:42.33,lng:-83.05},
      {slug:"cleveland",lat:41.50,lng:-81.69},{slug:"pittsburgh",lat:40.44,lng:-79.99},
      {slug:"philadelphia",lat:39.95,lng:-75.16},{slug:"baltimore",lat:39.29,lng:-76.61},
      {slug:"washingtondc",lat:38.89,lng:-77.03},{slug:"nashville",lat:36.17,lng:-86.78},
      {slug:"austin",lat:30.27,lng:-97.74},{slug:"saltlakecity",lat:40.76,lng:-111.89},
      {slug:"lasvegas",lat:36.17,lng:-115.14},{slug:"albuquerque",lat:35.08,lng:-106.65},
      {slug:"tucson",lat:32.22,lng:-110.97},{slug:"sacramento",lat:38.58,lng:-121.49},
      {slug:"fresno",lat:36.74,lng:-119.77},{slug:"reno",lat:39.53,lng:-119.81},
      {slug:"spokane",lat:47.66,lng:-117.43},{slug:"charlotte",lat:35.23,lng:-80.84},
      {slug:"raleigh",lat:35.77,lng:-78.64},{slug:"richmond",lat:37.54,lng:-77.43},
      {slug:"columbus",lat:39.96,lng:-82.99},{slug:"indianapolis",lat:39.77,lng:-86.16},
      {slug:"kansascity",lat:39.10,lng:-94.58},{slug:"stlouis",lat:38.63,lng:-90.20},
      {slug:"milwaukee",lat:43.04,lng:-87.91},{slug:"memphis",lat:35.15,lng:-90.05},
      {slug:"neworleans",lat:29.95,lng:-90.07},{slug:"tampa",lat:27.95,lng:-82.46},
      {slug:"orlando",lat:28.54,lng:-81.38},{slug:"jacksonville",lat:30.33,lng:-81.66},
      {slug:"buffalo",lat:42.89,lng:-78.86},{slug:"rochester",lat:43.16,lng:-77.61},
      {slug:"hartford",lat:41.76,lng:-72.68},{slug:"providence",lat:41.82,lng:-71.42},
      {slug:"anchorage",lat:61.22,lng:-149.90},{slug:"honolulu",lat:21.31,lng:-157.86},
      {slug:"puertorico",lat:18.22,lng:-66.59},{slug:"toronto",lat:43.65,lng:-79.38},
      {slug:"vancouver",lat:49.25,lng:-123.12},{slug:"calgary",lat:51.05,lng:-114.07},
      {slug:"montreal",lat:45.50,lng:-73.57},{slug:"ottawa",lat:45.42,lng:-75.69},
      {slug:"winnipeg",lat:49.90,lng:-97.14},{slug:"london",lat:51.51,lng:-0.13},
      {slug:"sydney",lat:-33.87,lng:151.21},{slug:"melbourne",lat:-37.81,lng:144.96},
      {slug:"brisbane",lat:-27.47,lng:153.02},{slug:"perth",lat:-31.95,lng:115.86},
      {slug:"amsterdam",lat:52.37,lng:4.90},{slug:"berlin",lat:52.52,lng:13.40},
      {slug:"paris",lat:48.86,lng:2.35},{slug:"barcelona",lat:41.39,lng:2.16},
      {slug:"vienna",lat:48.21,lng:16.37},{slug:"stockholm",lat:59.33,lng:18.07},
    ];

    const SPECIALTY_FEEDS = [
      {url:"https://www.controller.com/listings/aircraft/for-sale/rss",asset_class:"aviation",source:"Controller.com",lat:32.0,lng:-97.0},
      {url:"https://www.trade-a-plane.com/rss",asset_class:"aviation",source:"Trade-A-Plane",lat:32.0,lng:-97.0},
      {url:"https://www.boatshop24.com/rss",asset_class:"maritime",source:"Boatshop24",lat:51.5,lng:0.1},
      {url:"https://www.bizbuysell.com/rss/",asset_class:"business",source:"BizBuySell",lat:40.71,lng:-74.01},
    ];

    const CL_CATEGORIES = [
      {code:"boa",asset_class:"maritime"},
      {code:"rea",asset_class:"realestate"},
      {code:"cta",asset_class:"transport"},
      {code:"hea",asset_class:"equipment"},
      {code:"bfd",asset_class:"business"},
      {code:"for",asset_class:"realestate"},
      {code:"atq",asset_class:"art"},
      {code:"mcy",asset_class:"transport"},
      {code:"rvs",asset_class:"transport"},
      {code:"atp",asset_class:"aviation"},
    ];

    let citiesToFetch = CL_CITIES;
    if (boundsParam) {
      const parts = boundsParam.split(",").map(parseFloat);
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [latMin, lngMin, latMax, lngMax] = parts;
        const pad = Math.max(5, (latMax - latMin) * 0.5);
        const filtered = CL_CITIES.filter(c =>
          c.lat >= latMin - pad && c.lat <= latMax + pad &&
          c.lng >= lngMin - pad && c.lng <= lngMax + pad
        );
        citiesToFetch = filtered.length > 0 ? filtered : CL_CITIES.slice(0, 20);
      }
    }

    const cityCache = (globalThis as any)._rssCityCache || {};
    (globalThis as any)._rssCityCache = cityCache;

    function parseRSS(xml: string, asset_class: string, source: string, defaultLat: number, defaultLng: number): any[] {
      const items: any[] = [];
      const re = /<item>([\s\S]*?)<\/item>/g;
      let m;
      while ((m = re.exec(xml)) !== null) {
        const block = m[1];
        const get = (tag: string) => {
          const r = block.match(new RegExp(`<${tag}[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/${tag}>|<${tag}[^>]*>([^<]*)<\/${tag}>`));
          return r ? (r[1]||r[2]||"").trim() : "";
        };
        const title = get("title");
        const link = get("link") || (block.match(/<link>(.*?)<\/link>/)||[])[1] || "";
        const desc = get("description").replace(/<[^>]+>/g,"").slice(0,300);
        const priceMatch = (title+desc).match(/\$[\d,]+/);
        const price = priceMatch ? parseInt(priceMatch[0].replace(/[$,]/g,"")) : 0;
        const geoLat = block.match(/<geo:lat>(.*?)<\/geo:lat>/);
        const geoLng = block.match(/<geo:long>(.*?)<\/geo:long>/);
        const lat = geoLat ? parseFloat(geoLat[1]) : defaultLat + (Math.random()-0.5)*0.4;
        const lng = geoLng ? parseFloat(geoLng[1]) : defaultLng + (Math.random()-0.5)*0.4;
        if (!title) continue;
        const idBase = link.slice(-20).replace(/[^a-z0-9]/gi,"") || Math.random().toString(36).slice(2);
        items.push({
          id: `rss-${source.replace(/[^a-z0-9]/gi,"-").slice(0,20)}-${idBase}`,
          name: title, description: desc, asset_class, source, price, lat, lng,
          listing_url: link,
          image_url: (block.match(/<media:content[^>]+url="([^"]+)"/) || block.match(/<enclosure[^>]+url="([^"]+)"/) || [])[1] || null,
          _isRSS: true,
        });
      }
      return items;
    }

    const allResults: any[] = [];
    const fetchPromises: Promise<void>[] = [];

    for (const feed of SPECIALTY_FEEDS) {
      const cacheKey = `specialty_${feed.source}`;
      const cached = cityCache[cacheKey];
      if (!bustCache && cached && (now - cached.ts) < CACHE_TTL) {
        allResults.push(...cached.items); continue;
      }
      fetchPromises.push((async () => {
        try {
          const r = await fetch(feed.url, {headers:{"User-Agent":"Mozilla/5.0"},signal:AbortSignal.timeout(8000)});
          console.log("[RSS]", feed.source, "status:", r.status);
          if (!r.ok) return;
          const xml = await r.text();
          console.log("[RSS]", feed.source, "xml length:", xml.length);
          const items = parseRSS(xml, feed.asset_class, feed.source, feed.lat, feed.lng);
          console.log("[RSS]", feed.source, "items:", items.length);
          cityCache[cacheKey] = {ts:now, items};
          allResults.push(...items);
        } catch(e) { console.warn("[RSS]", feed.source, String(e)); }
      })());
    }

    for (const city of citiesToFetch) {
      for (const cat of CL_CATEGORIES) {
        const cacheKey = `cl_${city.slug}_${cat.code}`;
        const cached = cityCache[cacheKey];
        if (!bustCache && cached && (now - cached.ts) < CACHE_TTL) {
          allResults.push(...cached.items); continue;
        }
        fetchPromises.push((async () => {
          try {
            const url = `https://${city.slug}.craigslist.org/search/${cat.code}.rss`;
            const r = await fetch(url, {headers:{"User-Agent":"Mozilla/5.0"},signal:AbortSignal.timeout(6000)});
            if (!r.ok) return;
            const items = parseRSS(await r.text(), cat.asset_class, `Craigslist/${city.slug}`, city.lat, city.lng);
            cityCache[cacheKey] = {ts:now, items};
            allResults.push(...items);
          } catch(e) { /* city may not have category */ }
        })());
      }
    }

    await Promise.all(fetchPromises);

    return new Response(JSON.stringify(allResults), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" }
    });
  }

  if (req.method === "GET" && new URL(req.url).searchParams.get("action") === "polygon") {
    const pin = new URL(req.url).searchParams.get("pin") || "";
    const polygon = await fetchPolygon(pin);
    return new Response(JSON.stringify({polygon}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
  }


  // ── action=search — BigQuery parcel filter search ─────────────
  if (req.method === "GET" && new URL(req.url).searchParams.get("action") === "search") {
    const u = new URL(req.url);
    const token = await getAccessToken();

    const minPrice    = parseInt(u.searchParams.get("min_price") || "0");
    const maxPrice    = parseInt(u.searchParams.get("max_price") || "999999999999");
    const minBeds     = parseInt(u.searchParams.get("min_beds") || "0");
    const maxBeds     = parseInt(u.searchParams.get("max_beds") || "99");
    const minBaths    = parseFloat(u.searchParams.get("min_baths") || "0");
    const minSqft     = parseInt(u.searchParams.get("min_sqft") || "0");
    const maxSqft     = parseInt(u.searchParams.get("max_sqft") || "99999");
    const minYr       = parseInt(u.searchParams.get("min_year") || "0");
    const maxYr       = parseInt(u.searchParams.get("max_year") || "9999");
    const minLot      = parseInt(u.searchParams.get("min_lot") || "0");
    const waterfront  = u.searchParams.get("waterfront") || "";
    const waterfrontBody = u.searchParams.get("waterfront_body") || "";
    const waterSystem = u.searchParams.get("water_system") || "";
    const sewerSystem = u.searchParams.get("sewer_system") || "";
    const viewType    = u.searchParams.get("view_type") || "";
    const propType    = u.searchParams.get("prop_type") || "";
    const hasBasement = u.searchParams.get("has_basement") || "";
    const hasGarage   = u.searchParams.get("has_garage") || "";
    const floodRisk   = u.searchParams.get("flood_risk") || "";
    const seismicRisk = u.searchParams.get("seismic_risk") || "";
    const motivated   = u.searchParams.get("motivated") || "";
    const buildGrade  = parseInt(u.searchParams.get("min_grade") || "0");
    const limit       = Math.min(parseInt(u.searchParams.get("limit") || "150"), 200);

    const where: string[] = [];
    if (minPrice > 0) where.push(`SAFE_CAST(latest_total_val AS INT64) >= ${minPrice}`);
    if (maxPrice < 999999999999) where.push(`SAFE_CAST(latest_total_val AS INT64) <= ${maxPrice}`);
    if (minBeds > 0) where.push(`SAFE_CAST(Bedrooms AS INT64) >= ${minBeds}`);
    if (maxBeds < 99) where.push(`SAFE_CAST(Bedrooms AS INT64) <= ${maxBeds}`);
    if (minBaths > 0) where.push(`(SAFE_CAST(BathFullCount AS FLOAT64) + COALESCE(SAFE_CAST(Bath3qtrCount AS FLOAT64),0)*0.75) >= ${minBaths}`);
    if (minSqft > 0) where.push(`SAFE_CAST(SqFtTotLiving AS INT64) >= ${minSqft}`);
    if (maxSqft < 99999) where.push(`SAFE_CAST(SqFtTotLiving AS INT64) <= ${maxSqft}`);
    if (minYr > 0) where.push(`SAFE_CAST(YrBuilt AS INT64) >= ${minYr}`);
    if (maxYr < 9999) where.push(`SAFE_CAST(YrBuilt AS INT64) <= ${maxYr}`);
    if (minLot > 0) where.push(`SAFE_CAST(SqFtLot AS INT64) >= ${minLot}`);
    if (waterfront === "yes") where.push(`SAFE_CAST(WfntFrontFtg AS INT64) > 0`);
    if (waterfront === "no") where.push(`(WfntFrontFtg IS NULL OR WfntFrontFtg = '0')`);
    if (waterfrontBody === "lake_washington") where.push(`WfntWaterBody = '6'`);
    if (waterfrontBody === "lake_sammamish") where.push(`WfntWaterBody = '7'`);
    if (waterfrontBody === "puget_sound") where.push(`WfntWaterBody = '3'`);
    if (waterfrontBody === "elliott_bay") where.push(`WfntWaterBody = '2'`);
    if (waterfrontBody === "river") where.push(`WfntWaterBody IN ('1','9')`);
    if (waterSystem) where.push(`WaterSystem = '${waterSystem}'`);
    if (sewerSystem) where.push(`SewerSystem = '${sewerSystem}'`);
    if (viewType === "lake_washington") where.push(`SAFE_CAST(LakeWashington AS INT64) > 0`);
    if (viewType === "puget_sound") where.push(`SAFE_CAST(PugetSound AS INT64) > 0`);
    if (viewType === "mt_rainier") where.push(`SAFE_CAST(MtRainier AS INT64) > 0`);
    if (viewType === "seattle_skyline") where.push(`SAFE_CAST(SeattleSkyline AS INT64) > 0`);
    if (viewType === "cascades") where.push(`SAFE_CAST(Cascades AS INT64) > 0`);
    if (viewType === "olympics") where.push(`SAFE_CAST(Olympics AS INT64) > 0`);
    if (propType === "residential") where.push(`PropType = 'R'`);
    if (propType === "commercial") where.push(`PropType = 'C'`);
    if (propType === "vacant") where.push(`(SqFtTotLiving IS NULL OR SqFtTotLiving = '0')`);
    if (hasBasement === "yes") where.push(`SAFE_CAST(SqFtFinBasement AS INT64) > 0`);
    if (hasGarage === "yes") where.push(`SAFE_CAST(SqFtGarageAttached AS INT64) > 0`);
    if (buildGrade > 0) where.push(`SAFE_CAST(BldgGrade AS INT64) >= ${buildGrade}`);
    if (floodRisk === "no") where.push(`(Pcnt100YrFloodPlain IS NULL OR Pcnt100YrFloodPlain = '0')`);
    if (seismicRisk === "no") where.push(`(Pcnt_SeisSuscp IS NULL OR Pcnt_SeisSuscp = '0')`);
    if (motivated === "yes") where.push(`(DocumentDate IS NULL OR SAFE_CAST(DocumentDate AS DATE) < DATE_SUB(CURRENT_DATE(), INTERVAL 10 YEAR))`);
    where.push(`LAT IS NOT NULL AND LON IS NOT NULL`);
    where.push(`LAT != '0' AND LON != '0'`);

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const query = `
      SELECT PIN, Address,
        SAFE_CAST(LAT AS FLOAT64) as lat, SAFE_CAST(LON AS FLOAT64) as lng,
        SAFE_CAST(latest_total_val AS INT64) as assessed_value,
        SAFE_CAST(SqFtTotLiving AS INT64) as sqft,
        SAFE_CAST(Bedrooms AS INT64) as beds,
        SAFE_CAST(BathFullCount AS INT64) as baths,
        SAFE_CAST(YrBuilt AS INT64) as year_built,
        SAFE_CAST(SqFtLot AS INT64) as lot_sqft,
        CurrentZoning as zoning, PropType as prop_type,
        SAFE_CAST(WfntFrontFtg AS INT64) as waterfront_ft,
        SAFE_CAST(LakeWashington AS INT64) as view_lk_wash,
        SAFE_CAST(PugetSound AS INT64) as view_puget,
        SAFE_CAST(SeattleSkyline AS INT64) as view_seattle
      FROM \`leafy-loader-492820-p7.rwabidask.king_county_master_intel_flat\`
      ${whereClause}
      ORDER BY SAFE_CAST(latest_total_val AS INT64) DESC
      LIMIT ${limit}
    `;

    try {
      const bqResp = await fetch(BQ_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, useLegacySql: false, timeoutMs: 20000 })
      });
      const bqData = await bqResp.json();
      const rows = bqData.rows || [];
      const fields = (bqData.schema?.fields || []).map((f: any) => f.name);
      const parcels = rows.map((row: any) => {
        const vals = row.f.map((c: any) => c.v);
        const obj: Record<string, any> = {};
        fields.forEach((name: string, i: number) => obj[name] = vals[i]);
        return {
          pin: obj.PIN, address: obj.Address,
          lat: parseFloat(obj.lat) || 0, lng: parseFloat(obj.lng) || 0,
          assessed_value: parseInt(obj.assessed_value) || 0,
          sqft: parseInt(obj.sqft) || 0, beds: parseInt(obj.beds) || 0,
          baths: parseInt(obj.baths) || 0, year_built: parseInt(obj.year_built) || 0,
          lot_sqft: parseInt(obj.lot_sqft) || 0, zoning: obj.zoning || null,
          prop_type: obj.prop_type || null, waterfront_ft: parseInt(obj.waterfront_ft) || 0,
          has_view: (parseInt(obj.view_lk_wash)||0)>0||(parseInt(obj.view_puget)||0)>0||(parseInt(obj.view_seattle)||0)>0,
        };
      });
      return new Response(JSON.stringify({ results: parcels, count: parcels.length }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" }
      });
    } catch(e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  }


  if (req.method === "GET" && new URL(req.url).searchParams.get("action") === "upload_url") {
    try {
      const u3 = new URL(req.url);
      const apn = u3.searchParams.get("apn") || "unknown";
      const filename = u3.searchParams.get("filename") || "file";
      const contentType = u3.searchParams.get("content_type") || "application/octet-stream";
      const folder = u3.searchParams.get("folder") || "media";
      const saKey = JSON.parse(atob(Deno.env.get("GCP_SA_KEY") ?? ""));
      const bucket = "rwabidask-media";
      const object = `king-county/${apn}/${folder}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g,"-")}`;
      const expiry = Math.floor(Date.now()/1000) + 900; // 15 min

      // Build signed URL v4
      const host = `storage.googleapis.com`;
      const canonicalUri = `/${bucket}/${object}`;
      const datestamp = new Date().toISOString().slice(0,10).replace(/-/g,"");
      const credScope = `${datestamp}/auto/storage/goog4_request`;
      const signedHeaders = "content-type;host;x-goog-content-sha256";
      const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-goog-content-sha256:UNSIGNED-PAYLOAD\n`;
      const canonicalQuery = [
        `X-Goog-Algorithm=GOOG4-RSA-SHA256`,
        `X-Goog-Credential=${encodeURIComponent(saKey.client_email+"/"+credScope)}`,
        `X-Goog-Date=${datestamp}T000000Z`,
        `X-Goog-Expires=900`,
        `X-Goog-SignedHeaders=${signedHeaders}`,
      ].join("&");
      const canonicalRequest = ["PUT", canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
      const strToSign = ["GOOG4-RSA-SHA256", `${datestamp}T000000Z`, credScope,
        Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest)))).map(b=>b.toString(16).padStart(2,"0")).join("")].join("\n");
      const pem = saKey.private_key.replace("-----BEGIN PRIVATE KEY-----","").replace("-----END PRIVATE KEY-----","").replace(/\n/g,"");
      const der = Uint8Array.from(atob(pem), c=>c.charCodeAt(0));
      const key = await crypto.subtle.importKey("pkcs8", der, {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"}, false, ["sign"]);
      const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(strToSign));
      const sigHex = Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,"0")).join("");
      const uploadUrl = `https://${host}${canonicalUri}?${canonicalQuery}&X-Goog-Signature=${sigHex}`;
      const publicUrl = `https://storage.googleapis.com/${bucket}/${object}`;
      return new Response(JSON.stringify({upload_url:uploadUrl, public_url:publicUrl, object}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(e) {
      return new Response(JSON.stringify({error:String(e)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});
    }
  }

  if (req.method === "POST") {
    try {
      const u2 = new URL(req.url);
      if (u2.searchParams.get("action") === "list") {
        const body = await req.json();
        const { apn, type, price, video_url, tour_url, description,
                contact_name, contact_phone, contact_email, created_by } = body;
        if (!apn || !contact_email) return new Response(JSON.stringify({error:"apn and contact_email required"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
        const sql = `INSERT INTO \`leafy-loader-492820-p7.rwabidask.parcel_listings\`
          (apn,version,asking_price,listing_type,description,video_url,tour_url,
           contact_name,contact_phone,contact_email,status,created_by,created_at,updated_at)
          VALUES ('${apn}',1,${price||0},'${type||"for_sale"}',
          '${(description||"").replace(/'/g,"\'")}',
          '${(video_url||"").replace(/'/g,"\'")}',
          '${(tour_url||"").replace(/'/g,"\'")}',
          '${(contact_name||"").replace(/'/g,"\'")}',
          '${(contact_phone||"").replace(/'/g,"\'")}',
          '${(contact_email||"").replace(/'/g,"\'")}',
          'active','${(created_by||"anonymous").replace(/'/g,"\'")}',
          CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP())`;
        await bq(sql, 10000);
        return new Response(JSON.stringify({ok:true}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
      }
    } catch(e) {
      return new Response(JSON.stringify({error:String(e)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});
    }
  }
  try {
    const u = new URL(req.url);
    let pin = u.searchParams.get("pin") ?? "";
    const lat = u.searchParams.get("lat") ?? "";
    const lng = u.searchParams.get("lng") ?? "";
    const addr = u.searchParams.get("address") ?? "";
    const paid = u.searchParams.get("paid") === "true";

    let major: number, minor: number;

    if (!pin && lat && lng) {
      const spatialPin = await coordPin(parseFloat(lat), parseFloat(lng));
      if (!spatialPin) return new Response(JSON.stringify({error:"No parcel found at coordinates"}),{status:404,headers:{...CORS,"Content-Type":"application/json"}});
      // ── Statewide WA parcel (non-King County) ──────────────────────
      if (spatialPin.startsWith('WA-')) {
        const parcelId = spatialPin.replace('WA-', '');
        try {
          // Check Snohomish County enriched intel table
          // Snohomish statewide IDs are null — use lat/lng lookup instead
          const waCache = (globalThis as any)._waParcelCache;
          const snoLat = waCache?.lat || 0;
          const snoLng = waCache?.lng || 0;
          const snohomishRows = (snoLat && snoLng)
            ? await bq(`SELECT * FROM \`leafy-loader-492820-p7.rwabidask.snohomish_master_intel_enriched\` WHERE ABS(lat - ${snoLat}) < 0.001 AND ABS(lng - ${snoLng}) < 0.001 ORDER BY ABS(lat - ${snoLat}) + ABS(lng - ${snoLng}) ASC LIMIT 1`, 15000)
            : [];
          if (snohomishRows[0]) {
            const p = snohomishRows[0];
            const ownerRaw = p.owner || '';
            const isEntity = /\b(LLC|INC|CORP|LTD|LP|LLP|TRUST|FOUNDATION|ASSOC|CO\b|COMPANY|PROPERTIES|INVESTMENTS|DEVELOPMENT|GROUP|PARTNERS|HOLDINGS)/i.test(ownerRaw);
            const ownerDisplay = isEntity ? ownerRaw : null;
            const card = {
              PIN: p.parcel_id,
              address: p.address || p.parcel_id,
              county: 'Snohomish',
              city: p.city || '',
              state: 'WA',
              zip_code: p.zip || '',
              LAT: parseFloat(p.lat) || 0,
              LON: parseFloat(p.lng) || 0,
              PropType: 'R',
              use_code: 0,
              use_description: p.land_use || null,
              current_assessed_total: p.assessed_total ? parseInt(p.assessed_total) : 0,
              current_assessed_land: p.assessed_land ? parseInt(p.assessed_land) : 0,
              current_assessed_improvements: p.assessed_imps ? parseInt(p.assessed_imps) : 0,
              appraisal_year: p.tax_year || null,
              sqft_lot: p.lot_sqft ? Math.round(parseFloat(p.lot_sqft)) : null,
              owner_display: ownerDisplay,
              water_system_name: p.water_system_name || null,
              permit_count: p.permit_count || 0,
              building: {
                sqft_total: p.sqft_total || null,
                sqft_basement_finished: p.sqft_basement || null,
                sqft_garage: p.sqft_garage || null,
                sqft_deck: p.sqft_deck || null,
                year_built: (p.year_built && parseInt(p.year_built) > 1800 && parseInt(p.year_built) < 2030) ? p.year_built : null,
                bedrooms: p.beds || null,
                bath_full: null,
                bath_total: p.baths || null,
                stories: p.stories || null,
                condition: p.condition || null,
                construction_type: p.construction_type || null,
                heat_system: p.heat_system || null,
                central_ac: p.central_ac || null,
                fireplace_prefab: p.fireplace_prefab || null,
                fireplace_masonry: p.fireplace_masonry || null,
              },
              last_sale: {
                price: p.last_sale_price ? parseFloat(p.last_sale_price) : null,
                date: p.last_sale_date || null,
                instrument: p.instrument_type || null,
                seller: null,
                buyer: null,
                warnings: [],
              },
              hazards: {
                flood_100yr: false,
                landslide: false,
                erosion: false,
                coal_mine: false,
                tsunami: p.in_tsunami_zone === true,
                wetland: false,
                aquifer: false,
                lahar: null,
              },
              geo: {
                in_tsunami_zone: p.in_tsunami_zone === true,
                in_flood_zone: false,
                fiber_access: p.fiber_access === true,
                nearest_fault_name: p.nearest_fault_name || null,
                nearest_fault_miles: p.fault_distance_m ? (parseFloat(p.fault_distance_m) / 1609.34).toFixed(2) : null,
                nearest_transmission_class: p.nearest_transmission_class || null,
                nearest_transmission_miles: p.transmission_distance_m ? (parseFloat(p.transmission_distance_m) / 1609.34).toFixed(2) : null,
                seismic_site_class: p.seismic_site_class || null,
                vs30_mps: p.vs30_mps || null,
                geology_map_unit: p.geology_map_unit || null,
                geology_label: p.geology_label || null,
                water_system_name: p.water_system_name || null,
                water_system_type: p.water_system_type || null,
              },
              geology: {
                fault_name: p.nearest_fault_name || null,
                fault_type: p.nearest_fault_type || null,
                fault_system: p.fault_system || null,
                fault_age: p.fault_age || null,
                fault_confidence: p.fault_confidence || null,
                fault_slip_rate: p.fault_slip_rate || null,
                fault_distance_m: p.fault_distance_m || null,
                seismic_site_class: p.seismic_site_class || null,
                seismic_site_class_desc: p.seismic_site_class_desc || null,
                vs30_mps: p.vs30_mps || null,
                shear_geologic_unit: p.shear_geologic_unit || null,
                shear_unit_description: p.shear_unit_description || null,
                geology_map_unit: p.geology_map_unit || null,
                geology_label: p.geology_label || null,
                geology_notes: p.geology_notes || null,
              },
              resources: {
                nearest_abandoned_mine: p.nearest_abandoned_mine_name || null,
                abandoned_mine_hazard: p.abandoned_mine_hazard || null,
                abandoned_mine_distance_m: p.abandoned_mine_distance_m || null,
                nearest_active_mine: p.nearest_active_mine_name || null,
                active_mine_commodity: p.active_mine_commodity || null,
                active_mine_distance_m: p.active_mine_distance_m || null,
                nearest_mineral_site: p.nearest_mineral_site_name || null,
                mineral_commodity: p.mineral_primary_commodity || null,
                mineral_distance_m: p.mineral_site_distance_m || null,
                aggregate_commodity: p.aggregate_commodity || null,
                aggregate_classification: p.aggregate_classification || null,
                nearest_oil_gas_well: p.nearest_oil_gas_well_name || null,
                oil_gas_well_status: p.oil_gas_well_status || null,
                oil_gas_well_distance_m: p.oil_gas_well_distance_m || null,
                nearest_geothermal_site: p.nearest_geothermal_site || null,
                geothermal_temp_celsius: p.geothermal_temp_celsius || null,
                geothermal_distance_m: p.geothermal_distance_m || null,
                nearest_thermal_spring: p.nearest_thermal_spring || null,
                thermal_spring_temp_celsius: p.thermal_spring_temp_celsius || null,
                thermal_spring_distance_m: p.thermal_spring_distance_m || null,
              },
              proximity: {
                nearest_ems: p.ems_agency || null,
                nearest_ems_miles: p.ems_distance_m ? (parseFloat(p.ems_distance_m) / 1609.34).toFixed(2) : null,
              },
              _county: 'snohomish',
              _coverage: 'full',
              valuation: {
                latest_total_val: p.assessed_total ? parseInt(p.assessed_total) : 0,
                latest_land_val: p.assessed_land ? parseInt(p.assessed_land) : 0,
                latest_imps_val: p.assessed_imps ? parseInt(p.assessed_imps) : 0,
                appraisal_year: p.tax_year || null,
              },
              sales_history: [
                ...(p.last_sale_price && p.last_sale_date ? [{
                  SalePrice: p.last_sale_price,
                  DocumentDate: p.last_sale_date,
                  Instrument: p.instrument_type || null,
                  SaleReason: null,
                  SaleWarning: null,
                  SellerName: null,
                  BuyerName: null,
                }] : []),
                ...(p.prev_sale_price && p.prev_sale_date ? [{
                  SalePrice: p.prev_sale_price,
                  DocumentDate: p.prev_sale_date,
                  Instrument: null,
                  SaleReason: null,
                  SaleWarning: null,
                  SellerName: null,
                  BuyerName: null,
                }] : []),
              ],
            };
            if (paid) {
              const pierceCrime = await fetchPierceCrime(parseFloat(card.LAT), parseFloat(card.LON));
              return new Response(JSON.stringify({ tier: "intel_report", parcel: card, crime: pierceCrime }), {
                status: 200, headers: { ...CORS, "Content-Type": "application/json" }
              });
            }
            return new Response(JSON.stringify({ parcel: card }), {
              status: 200, headers: { ...CORS, "Content-Type": "application/json" }
            });
          }

          // Check Pierce County enriched intel table
          // Normalize parcel ID: strip county prefix (053-) and dashes
          const pierceId = parcelId.replace(/^053-/, '').replace(/-/g, '');
          const pierceRows = await bq(`SELECT * FROM \`leafy-loader-492820-p7.rwabidask.pierce_master_intel_enriched\` WHERE parcel_id = '${pierceId}' LIMIT 1`, 15000);
          const pierceGisRows = await bq(`SELECT Site_Address, City_State, Zipcode FROM \`leafy-loader-492820-p7.rwabidask.pierce_gis_tax_parcels\` WHERE TaxParcelNumber = ${parseInt(pierceId)} LIMIT 1`, 10000);
          const pierceGis = pierceGisRows[0] || null;
          if (pierceRows[0]) {
            const p = pierceRows[0];
            const ownerRaw = p.owner || '';
            const isEntity = /\b(LLC|INC|CORP|LTD|LP|LLP|TRUST|FOUNDATION|ASSOC|CO\b|COMPANY|PROPERTIES|INVESTMENTS|DEVELOPMENT|GROUP|PARTNERS|HOLDINGS)/i.test(ownerRaw);
            const ownerDisplay = isEntity ? ownerRaw : null;
            const bool = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
            // ── Pierce address: use waParcelCache address (from Google geocode) if available
            const waCache = (globalThis as any)._waParcelCache;
            const pierceAddr = pierceGis?.Site_Address || waCache?.address || p.plat_name || p.parcel_id;
            const pierceCity = (pierceGis?.City_State || '').replace(/,.*$/, '').trim() || waCache?.city || p.city || '';
            const pierceZip  = pierceGis?.Zipcode || waCache?.zip || p.zip || '';

            const card = {
              PIN: p.parcel_id,
              address: pierceAddr,
              county: 'Pierce',
              city: pierceCity,
              state: 'WA',
              zip_code: pierceZip,
              LAT: parseFloat(p.lat) || 0,
              LON: parseFloat(p.lng) || 0,
              PropType: p.prop_type || 'R',
              use_code: 0,
              use_description: p.land_use || null,
              current_assessed_total: p.assessed_total ? parseInt(p.assessed_total) : 0,
              current_assessed_land: p.assessed_land ? parseInt(p.assessed_land) : 0,
              current_assessed_improvements: p.assessed_imps ? parseInt(p.assessed_imps) : (p.assessed_total && p.assessed_land ? parseInt(p.assessed_total) - parseInt(p.assessed_land) : 0),
              appraisal_year: p.tax_year || null,
              sqft_lot: p.lot_sqft ? Math.round(parseFloat(p.lot_sqft)) : null,
              lot_acres: p.lot_acres ? parseFloat(p.lot_acres) : null,
              current_zoning: p.zoning_designation || p.zone || null,
              zoning: p.zoning_designation || p.zone || null,
              owner_display: ownerDisplay,
              water_system_name: p.water_purveyor || p.parcel_water || null,
              permit_count: p.permit_count || 0,
              last_permit_date: p.last_permit_date || null,
              permit_types: p.permit_types || null,
              building: {
                sqft_total: p.sqft_total ? parseFloat(p.sqft_total) : null,
                sqft_1st: p.sqft_1st ? parseFloat(p.sqft_1st) : null,
                sqft_2nd: p.sqft_2nd ? parseFloat(p.sqft_2nd) : null,
                sqft_basement_finished: p.sqft_basement ? parseFloat(p.sqft_basement) : null,
                sqft_garage: p.sqft_garage ? parseFloat(p.sqft_garage) : null,
                sqft_deck: p.sqft_deck ? parseFloat(p.sqft_deck) : null,
                year_built: (p.year_built && parseInt(p.year_built) > 1800 && parseInt(p.year_built) < 2030) ? p.year_built : null,
                bedrooms: p.beds || null,
                bath_full: null,
                bath_total: p.baths || null,
                stories: p.stories || null,
                building_grade: p.quality || null,
                condition: p.condition || null,
                style: p.style || null,
                exterior: p.exterior || null,
                roof: p.roof || null,
                heat_system: p.heat_system || null,
                heat_source: null,
                total_fireplaces: null,
              },
              last_sale: {
                price: p.last_sale_price ? parseFloat(p.last_sale_price) : null,
                date: p.last_sale_date || null,
                instrument: p.instrument_type || null,
                seller: p.last_seller || null,
                buyer: p.last_buyer || null,
                warnings: [],
              },
              sale_count: p.sale_count ? parseInt(p.sale_count) : null,
              hazards: {
                flood_100yr: bool(p.in_flood_zone),
                landslide: bool(p.erosion_hazard),
                erosion: bool(p.erosion_hazard),
                coal_mine: bool(p.mine_hazard),
                tsunami: bool(p.tsunami_hazard),
                wetland: bool(p.wetland_flag),
                aquifer: bool(p.aquifer_recharge_zone),
                wellhead: bool(p.wellhead_protection_zone),
                lahar: p.lahar_zone && p.lahar_zone !== 'NONE' ? p.lahar_zone : null,
              },
              geo: {
                in_tsunami_zone: bool(p.tsunami_hazard),
                in_flood_zone: bool(p.in_flood_zone),
                in_urban_growth_boundary: bool(p.in_urban_growth_boundary),
                in_sewer_service_area: bool(p.in_sewer_service_area),
                fiber_access: bool(p.fiber_access),
                historic_register: bool(p.historic_register),
                wetland: bool(p.wetland_flag),
                aquifer_recharge: bool(p.aquifer_recharge_zone),
                nearest_fault_miles: p.nearest_fault_miles || null,
                nearest_mine_miles: p.nearest_mine_miles || null,
                nearest_oil_gas_miles: p.nearest_oil_gas_miles || null,
                nearest_transmission_miles: p.nearest_transmission_miles || null,
                nearest_substation: p.nearest_substation || null,
                nearest_substation_miles: p.nearest_substation_miles || null,
              },
              proximity: {
                nearest_school: p.nearest_school || null,
                nearest_school_miles: p.nearest_school_miles || null,
                nearest_fire_station: p.nearest_fire_station || null,
                nearest_fire_station_miles: p.nearest_fire_station_miles || null,
                nearest_police: p.nearest_police || null,
                nearest_police_miles: p.nearest_police_miles || null,
                nearest_hospital: p.nearest_hospital || null,
                nearest_hospital_miles: p.nearest_hospital_miles || null,
                nearest_ems: p.nearest_ems || null,
                nearest_ems_miles: p.nearest_ems_miles || null,
                crime_count_half_mile: p.crime_count_half_mile || 0,
              },
              _county: 'pierce',
              _coverage: 'full',
            };
            // Pierce comps — same occupancy type, within 1mi (expand to 3mi if < 5 results)
            let pierceComps: any[] = [];
            try {
              const pLat = card.LAT, pLng = card.LON;
              const pOcc = p.occupancy || null;
              const pQual = p.quality || null;
              const compQ = (miles: number) => `
                SELECT parcel_id, occupancy, sqft_total, lot_sqft, quality, condition, year_built, assessed_total, lat, lng,
                  ROUND(ST_DISTANCE(ST_GEOGPOINT(lng, lat), ST_GEOGPOINT(${pLng}, ${pLat})) / 1609.34, 2) as miles
                FROM \`leafy-loader-492820-p7.rwabidask.pierce_master_intel_enriched\`
                WHERE lat IS NOT NULL AND lng IS NOT NULL
                  AND parcel_id != '${pierceId}'
                  ${pOcc ? `AND occupancy = '${pOcc}'` : ''}
                  AND ST_DISTANCE(ST_GEOGPOINT(lng, lat), ST_GEOGPOINT(${pLng}, ${pLat})) < ${miles * 1609.34}
                ORDER BY miles ASC LIMIT 10`;
              pierceComps = await bq(compQ(1), 15000);
              if (pierceComps.length < 5) pierceComps = await bq(compQ(3), 15000);
            } catch(e) { console.warn('[pierce comps]', e); }

            if (paid) {
              const pierceCrime = await fetchPierceCrime(parseFloat(card.LAT.toString()), parseFloat(card.LON.toString()));
              return new Response(JSON.stringify({ tier: "intel_report", parcel: card, comps: pierceComps, crime: pierceCrime }), {
                status: 200, headers: { ...CORS, "Content-Type": "application/json" }
              });
            }
            return new Response(JSON.stringify({ parcel: card }), {
              status: 200, headers: { ...CORS, "Content-Type": "application/json" }
            });
          }
          // Fall back to statewide basic data
          const waRows = await bq(`SELECT * FROM \`leafy-loader-492820-p7.rwabidask.wa_parcels_statewide\` WHERE parcel_id = '${parcelId.replace(/'/g, "\'")}' LIMIT 1`, 10000);
          const card = waParcelCard(waRows[0] || (globalThis as any)._waParcelCache);
          return new Response(JSON.stringify({ parcel: card }), {
            status: 200, headers: { ...CORS, "Content-Type": "application/json" }
          });
        } catch(e: any) {
          const card = waParcelCard((globalThis as any)._waParcelCache);
          if (card) return new Response(JSON.stringify({ parcel: card }), {
            status: 200, headers: { ...CORS, "Content-Type": "application/json" }
          });
          return new Response(JSON.stringify({error: e.message}), {status: 500, headers: CORS});
        }
      }
      [major, minor] = spatialPinToMajorMinor(spatialPin);
    } else if (!pin && addr) {
      const addrP = await addrPin(addr);
      if (!addrP) return new Response(JSON.stringify({error:"Address not found"}),{status:404,headers:{...CORS,"Content-Type":"application/json"}});
      [major, minor] = spatialPinToMajorMinor(addrP);
    } else if (pin) {
      [major, minor] = norm(pin);
    } else {
      return new Response(JSON.stringify({error:"Provide pin, lat+lng, or address"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
    }

    const flat = await fetchFlat(major, minor);
    if (!flat) return new Response(JSON.stringify({error:`No data for Major=${major} Minor=${minor}`}),{status:404,headers:{...CORS,"Content-Type":"application/json"}});

    const apnStr = `${major}-${String(minor).padStart(4,"0")}`;
    console.log('[listing] querying apnStr:', apnStr);
    const listing = await fetchListing(apnStr);

    // Fetch comps for intel report only (paid)
    const comps = paid ? await fetchComps(
      apnStr,
      parseFloat(flat.LAT||0),
      parseFloat(flat.LON||0),
      parseInt(flat.PresentUse||0),
      parseInt(flat.SqFtLot||0),
      flat.DistrictName||'',
      parseInt(flat.latest_total_val||0),
      parseInt(flat.SqFtTotLiving||0),
      parseInt(flat.YrBuilt||0)
    ) : null;
    const county_for_crime = (flat as any)._county || 'king';
    const crime = paid && flat.LAT && flat.LON
      ? (county_for_crime === 'pierce' ? await fetchPierceCrime(parseFloat(flat.LAT), parseFloat(flat.LON)) : await fetchCrime(parseFloat(flat.LAT), parseFloat(flat.LON)))
      : null;

    const payload = paid
      ? { tier:"intel_report", parcel: intelCard(flat), listing, comps, crime }
      : { tier:"free",         parcel: freeCard(flat),  listing };

    // ── Log parcel view event to BigQuery (async, non-blocking) ──
    try {
      const ip = (req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
      const ua = (req.headers.get("user-agent")||"unknown").replace(/'/g, "");
      const apnStr = `${major}-${String(minor).padStart(4,"0")}`;
      const eventSql = `INSERT INTO \`leafy-loader-492820-p7.rwabidask.parcel_events\`
        (apn,event_type,ip,user_agent,lat,lng,tier,ts) VALUES
        ('${apnStr}','PARCEL_VIEW','${ip}','${ua.substring(0,200)}',
        ${lat?lat:"NULL"},${lng?lng:"NULL"},'${paid?"intel":"free"}',CURRENT_TIMESTAMP())`;
      bq(eventSql, 10000).catch(e => console.warn("[event]", e.message));
    } catch(e) {}

    return new Response(JSON.stringify(payload),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
  } catch(err) {
    const msg = String(err);
    return new Response(JSON.stringify({error:msg.includes("TOKEN_EXPIRED")?"TOKEN_EXPIRED":"Error",detail:msg}),{status:msg.includes("TOKEN_EXPIRED")?401:500,headers:{...CORS,"Content-Type":"application/json"}});
  }
});

