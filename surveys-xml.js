// =====================================================
// SURVEYS - FUNÇÕES PURAS PARA LER/EDITAR XML (sem DOM)
// =====================================================
// A edição é feita por texto (regex) e não por DOMParser/XMLSerializer
// de propósito: assim o restante do arquivo (indentação, ordem, cabeçalho,
// atributos) permanece exatamente como veio no zip original.

const ESC_RE = /[.*+?^${}()|[\]\\]/g;
export const escRe = (s) => s.replace(ESC_RE, '\\$&');

// Elemento "folha": <tag attrs>texto</tag>  ou  <tag attrs/>
const FOLHA = '<([A-Za-z_][\\w:.-]*)((?:\\s[^>]*?)?)(?:\\/>|>([^<]*)<\\/\\1>)';

export function decodificarEntidades(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
        const k = e.toLowerCase();
        if (k === 'amp') return '&';
        if (k === 'lt') return '<';
        if (k === 'gt') return '>';
        if (k === 'quot') return '"';
        if (k === 'apos') return "'";
        const cp = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
        try { return String.fromCodePoint(cp); } catch { return m; }
    });
}

export const codificarEntidades = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const normalizar = (s) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Lista todos os campos folha do XML, com o índice da ocorrência de cada tag
export function listarCampos(xml) {
    const re = new RegExp(FOLHA, 'g');
    const cont = {};
    const out = [];
    let m;
    while ((m = re.exec(xml))) {
        const tag = m[1];
        cont[tag] = (cont[tag] ?? -1) + 1;
        out.push({ tag, idx: cont[tag], valor: decodificarEntidades(m[3] ?? '') });
    }
    return out;
}

// op = { tag, modo: 'set'|'substituir', para, se?, de?, idx? }
//  - set:        troca todo o conteúdo da tag (se `se` vier preenchido, só onde o valor atual for igual)
//  - substituir: troca o trecho `de` por `para` dentro do conteúdo
//  - idx:        se informado, afeta só aquela ocorrência da tag
export function aplicarOp(xml, op) {
    const re = new RegExp('<(' + escRe(op.tag) + ')((?:\\s[^>]*?)?)(?:\\/>|>([^<]*)<\\/\\1>)', 'g');
    let i = -1;
    let alteradas = 0;
    const texto = xml.replace(re, (m, tag, attrs, conteudo) => {
        i++;
        if (op.idx !== undefined && op.idx !== null && op.idx !== i) return m;
        const atual = decodificarEntidades(conteudo ?? '');
        let novo;
        if (op.modo === 'substituir') {
            if (!op.de || !atual.includes(op.de)) return m;
            novo = atual.split(op.de).join(op.para ?? '');
        } else {
            if (op.se !== undefined && op.se !== '' && atual.trim() !== op.se.trim()) return m;
            novo = op.para ?? '';
        }
        if (novo === atual) return m;
        alteradas++;
        return `<${tag}${attrs}>${codificarEntidades(novo)}</${tag}>`;
    });
    return { texto, alteradas };
}

export function aplicarOps(xml, ops) {
    return ops.reduce((t, op) => aplicarOp(t, op).texto, xml);
}

export const GRAVADO = 'gravado';

export function gravadoAtual(xml) {
    const c = listarCampos(xml).filter((x) => x.tag === GRAVADO);
    return c.length ? c.map((x) => x.valor).join(' | ') : null;
}

export function definirGravado(xml, survey) {
    return aplicarOp(xml, { tag: GRAVADO, modo: 'set', para: survey }).texto;
}

// ---------- Catálogo de campos (para o editor em lote) ----------
export function montarCatalogo(textos) {
    const cat = new Map();
    textos.forEach((t, fi) => {
        for (const c of listarCampos(t)) {
            if (c.tag === GRAVADO) continue;
            let e = cat.get(c.tag);
            if (!e) { e = { tag: c.tag, total: 0, arquivos: new Set(), valores: new Map() }; cat.set(c.tag, e); }
            e.total++;
            e.arquivos.add(fi);
            e.valores.set(c.valor, (e.valores.get(c.valor) || 0) + 1);
        }
    });
    return cat;
}

export const ATALHOS = [
    { rotulo: 'Roteiros', re: /roteiro/ },
    { rotulo: 'Logradouros', re: /logradouro/ },
    { rotulo: 'Baixos', re: /baixo/ },
    { rotulo: 'Fachadas', re: /fachada/ }
];

// ---------- Pastas / ordenação ----------
export const ehPastaMoradia = (path) =>
    path.split('/').slice(0, -1).some((seg) => /moradia/i.test(seg));

export const compararNatural = (a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export function lerNumeros(texto) {
    return texto.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
}

// ---------- Encoding (preserva o encoding original do arquivo) ----------
const MAPA_1252 = (() => {
    const d = new TextDecoder('windows-1252');
    const m = new Map();
    for (let b = 0; b < 256; b++) m.set(d.decode(Uint8Array.of(b)), b);
    return m;
})();

export function decodificarBytes(bytes) {
    let enc = 'utf-8';
    let bom = null;
    let ini = 0;
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) { bom = [0xEF, 0xBB, 0xBF]; ini = 3; }
    else if (bytes[0] === 0xFF && bytes[1] === 0xFE) { bom = [0xFF, 0xFE]; enc = 'utf-16le'; ini = 2; }
    else if (bytes[0] === 0xFE && bytes[1] === 0xFF) { bom = [0xFE, 0xFF]; enc = 'utf-16be'; ini = 2; }
    else {
        const cab = new TextDecoder('windows-1252').decode(bytes.subarray(0, 200));
        const m = /<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i.exec(cab);
        if (m && /^(iso-?8859-?1|latin-?1|windows-1252|cp1252)$/i.test(m[1])) enc = 'windows-1252';
    }
    const corpo = bytes.subarray(ini);
    let texto;
    try {
        texto = new TextDecoder(enc, { fatal: true }).decode(corpo);
    } catch {
        // bytes inválidos para o encoding declarado: cai para windows-1252 (1 byte = 1 caractere, sem perdas)
        enc = 'windows-1252';
        texto = new TextDecoder(enc).decode(corpo);
    }
    return { texto, enc, bom };
}

export function codificarBytes(texto, { enc, bom }) {
    let corpo;
    if (enc === 'utf-8') {
        corpo = new TextEncoder().encode(texto);
    } else if (enc === 'windows-1252') {
        corpo = new Uint8Array(Array.from(texto, (ch) => MAPA_1252.get(ch) ?? 63));
    } else {
        const le = enc === 'utf-16le';
        corpo = new Uint8Array(texto.length * 2);
        for (let i = 0; i < texto.length; i++) {
            const u = texto.charCodeAt(i);
            corpo[i * 2] = le ? u & 0xFF : u >> 8;
            corpo[i * 2 + 1] = le ? u >> 8 : u & 0xFF;
        }
    }
    if (!bom) return corpo;
    const saida = new Uint8Array(bom.length + corpo.length);
    saida.set(bom, 0);
    saida.set(corpo, bom.length);
    return saida;
}
