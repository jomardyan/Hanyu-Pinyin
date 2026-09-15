import { resolve } from 'node:path';
import { ensureDirectories, storeDir, blue, deepBlue, ink, muted, white, font, cjk, annotated, render } from './shared.mjs';

await ensureDirectories();

const promoSmall = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${deepBlue}"/><stop offset="1" stop-color="${blue}"/></linearGradient></defs>
<rect width="440" height="280" fill="url(#g)"/>
<circle cx="380" cy="35" r="92" fill="#ffffff" opacity=".13"/><circle cx="28" cy="242" r="70" fill="#ffffff" opacity=".08"/>
<rect x="28" y="28" width="72" height="72" rx="16" fill="#3b82f6"/><text x="64" y="66" text-anchor="middle" font-family="${font}" font-size="30" font-weight="700" fill="${white}">P</text><text x="64" y="87" text-anchor="middle" font-family="${font}" font-size="12" fill="${white}">pīn</text>
<text x="120" y="62" font-family="${font}" font-size="30" font-weight="700" fill="${white}">Hanyu Pinyin</text>
<text x="120" y="91" font-family="${font}" font-size="16" fill="#dbeafe">Read Chinese with pronunciation</text>
<rect x="28" y="140" width="384" height="108" rx="18" fill="${white}"/>
${annotated([['我','wǒ'],['喜','xǐ'],['欢','huān'],['学','xué'],['习','xí'],['中','zhōng'],['文','wén']],62,176,30,13,49)}
</svg>`;

await render(promoSmall, resolve(storeDir, 'promo-small-440x280.png'), 440, 280);

const marquee = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560" viewBox="0 0 1400 560">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0f2a64"/><stop offset="1" stop-color="${blue}"/></linearGradient></defs>
<rect width="1400" height="560" fill="url(#g)"/>
<rect x="90" y="80" width="120" height="120" rx="26" fill="#3b82f6"/><text x="150" y="151" text-anchor="middle" font-family="${font}" font-size="54" font-weight="700" fill="${white}">P</text><text x="150" y="180" text-anchor="middle" font-family="${font}" font-size="17" fill="${white}">pīn</text>
<text x="235" y="130" font-family="${font}" font-size="54" font-weight="700" fill="${white}">Hanyu Pinyin Reader</text>
<text x="238" y="176" font-family="${font}" font-size="25" fill="#dbeafe">Phrase-aware pronunciation directly above Chinese text</text>
<rect x="735" y="58" width="585" height="447" rx="28" fill="${white}"/>
<rect x="760" y="87" width="535" height="41" rx="12" fill="#f1f5f9"/><circle cx="782" cy="108" r="6" fill="#f87171"/><circle cx="805" cy="108" r="6" fill="#fbbf24"/><circle cx="828" cy="108" r="6" fill="#34d399"/>
<text x="790" y="180" font-family="${cjk}" font-size="32" fill="${ink}">中文阅读</text>
<text x="790" y="217" font-family="${font}" font-size="18" font-weight="700" fill="${muted}">Study article</text>
${annotated([['今','jīn'],['天','tiān'],['我','wǒ'],['们','men'],['学','xué'],['习','xí'],['中','zhōng'],['文','wén']],815,275,28,13,58)}
${annotated([['这','zhè'],['个','ge'],['功','gōng'],['能','néng'],['很','hěn'],['方','fāng'],['便','biàn']],815,370,28,13,60)}
<text x="790" y="470" font-family="${font}" font-size="16" fill="${muted}">Local processing • No text leaves your browser</text>
</svg>`;

await render(marquee, resolve(storeDir, 'promo-marquee-1400x560.png'), 1400, 560);
