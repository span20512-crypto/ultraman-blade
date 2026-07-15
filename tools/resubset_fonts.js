/* re-subset FusionPixel fonts: existing subset charset + new hero glyphs */
const fs = require('fs'), zlib = require('zlib');
const subsetFont = require('subset-font');
const SCRATCH = '/tmp';
const KNOWN=['cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca','prep','CFF ','VORG','EBDT','EBLC','gasp','hdmx','kern','LTSH','PCLT','VDMX','vhea','vmtx','BASE','GDEF','GPOS','GSUB','EBSC','JSTF','MATH','CBDT','CBLC','COLR','CPAL','SVG ','sbix','acnt','avar','bdat','bloc','bsln','cvar','fdsc','feat','fmtx','fvar','gvar','hsty','just','lcar','mort','morx','opbd','prop','trak','Zapf','Silf','Glat','Gloc','Feat','Sill'];
function u128(buf,o){let r=0;for(let i=0;i<5;i++){const b=buf[o+i];r=(r*128)+(b&0x7f);if(!(b&0x80))return[r,o+i+1];}throw 'bad128';}
function charset(file){
  const b=fs.readFileSync(file);
  const numTables=b.readUInt16BE(12);
  let o=48;const tables=[];
  for(let i=0;i<numTables;i++){
    const flags=b[o++];const ti=flags&0x3f;let tag;
    if(ti===0x3f){tag=b.toString('ascii',o,o+4);o+=4;}else tag=KNOWN[ti];
    const xform=(flags>>6)&3;
    let orig;[orig,o]=u128(b,o);
    let tlen=orig;
    const transformed=((tag==='glyf'||tag==='loca')?xform===0:xform!==0);
    if(transformed)[tlen,o]=u128(b,o);
    tables.push({tag,len:tlen});
  }
  const raw=zlib.brotliDecompressSync(b.subarray(o));
  let off=0,cmap=null;
  for(const t of tables){if(t.tag==='cmap')cmap=raw.subarray(off,off+t.len);off+=t.len;}
  const n=cmap.readUInt16BE(2);let best=null;
  for(let i=0;i<n;i++){
    const soff=cmap.readUInt32BE(8+i*8);
    const fmt=cmap.readUInt16BE(soff);
    if(fmt===12)best={fmt,soff};
    else if(fmt===4&&(!best||best.fmt!==12))best={fmt,soff};
  }
  const cps=new Set();
  const s=best.soff;
  if(best.fmt===4){
    const segX2=cmap.readUInt16BE(s+6);
    for(let i=0;i<segX2/2;i++){
      const end=cmap.readUInt16BE(s+14+i*2),start=cmap.readUInt16BE(s+16+segX2+i*2);
      if(start===0xffff)continue;
      for(let c=start;c<=end&&c<0xffff;c++)cps.add(c);
    }
  } else {
    const ng=cmap.readUInt32BE(s+12);
    for(let g=0;g<ng;g++){const gs=cmap.readUInt32BE(s+16+g*12),ge=cmap.readUInt32BE(s+20+g*12);for(let c=gs;c<=ge;c++)cps.add(c);}
  }
  return cps;
}
const ADD = '泰罗迪迦戴拿盖亚泽塔奥特曼赛兽怪一二号' +
  '燃えたぞ修行が足りん光は消えない闇深大地守った揺らぐ御唱和ください未熟勝利炎巨人勇者閃雷風のように継承まだよ、' ;
(async()=>{
  for(const lang of ['zh','ja']){
    const cur = charset(`assets/fonts/FusionPixel-${lang}.woff2`);
    for(const ch of ADD) cur.add(ch.codePointAt(0));
    const text = [...cur].map(c=>String.fromCodePoint(c)).join('');
    const full = fs.readFileSync(`${SCRATCH}/full-${lang}.woff2`);
    const out = await subsetFont(full, text, { targetFormat: 'woff2' });
    fs.writeFileSync(`assets/fonts/FusionPixel-${lang}.woff2`, out);
    console.log(lang, 'chars:', cur.size, 'size:', out.length);
  }
})();
