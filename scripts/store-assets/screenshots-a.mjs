import { resolve } from 'node:path';
import { ensureDirectories, screenshotDir, font, cjk, blue, ink, muted, border, soft, white, annotated, screenshotBase, render } from './shared.mjs';

await ensureDirectories();

const shot1 = `${screenshotBase('example.cn/article')}
<text x="105" y="175" font-family="${cjk}" font-size="42" fill="${ink}">中文阅读</text>
<text x="105" y="218" font-family="${font}" font-size="19" fill="${muted}">Chinese text stays primary. Pinyin appears naturally above it.</text>
${annotated([['我','wǒ'],['喜','xǐ'],['欢','huān'],['学','xué'],['习','xí'],['中','zhōng'],['文','wén']],130,320,46,18,70)}
${annotated([['今','jīn'],['天','tiān'],['天','tiān'],['气','qì'],['很','hěn'],['好','hǎo']],130,445,40,16,72)}
<text x="105" y="570" font-family="${font}" font-size="19" fill="${ink}">Pronunciation is calculated locally and added without replacing page structure.</text>
<text x="105" y="610" font-family="${font}" font-size="18" fill="${muted}">Links, headings, paragraphs and interactions remain usable.</text>
<rect x="105" y="650" width="310" height="78" rx="15" fill="${soft}" stroke="#e2e8f0"/><text x="125" y="680" font-family="${font}" font-size="18" font-weight="700" fill="${ink}">Phrase-aware</text><text x="125" y="706" font-family="${font}" font-size="14" fill="${muted}">Better polyphonic pronunciation</text>
<rect x="450" y="650" width="310" height="78" rx="15" fill="${soft}" stroke="#e2e8f0"/><text x="470" y="680" font-family="${font}" font-size="18" font-weight="700" fill="${ink}">Fast</text><text x="470" y="706" font-family="${font}" font-size="14" fill="${muted}">Incremental page processing</text>
<rect x="795" y="650" width="310" height="78" rx="15" fill="${soft}" stroke="#e2e8f0"/><text x="815" y="680" font-family="${font}" font-size="18" font-weight="700" fill="${ink}">Private</text><text x="815" y="706" font-family="${font}" font-size="14" fill="${muted}">No page text leaves your browser</text>
</svg>`;

const shot2 = `${screenshotBase('news.example.cn')}
<text x="105" y="180" font-family="${cjk}" font-size="40" fill="${ink}">今日新闻</text>
${annotated([['中','zhōng'],['国','guó'],['文','wén'],['章','zhāng'],['阅','yuè'],['读','dú']],130,280,36,14,75)}
${[360,405,450,495,540].map(y => `<rect x="105" y="${y}" width="635" height="14" rx="7" fill="#e2e8f0"/>`).join('\n')}
<rect x="835" y="112" width="360" height="578" rx="18" fill="${white}" stroke="${border}" stroke-width="2"/>
<text x="859" y="162" font-family="${font}" font-size="24" font-weight="700" fill="${ink}">Hanyu Pinyin</text>
<text x="859" y="184" font-family="${font}" font-size="13" fill="${muted}">news.example.cn</text>
<rect x="1115" y="138" width="44" height="24" rx="12" fill="${blue}"/><circle cx="1147" cy="150" r="9" fill="${white}"/>
<rect x="859" y="204" width="312" height="40" rx="9" fill="#dbeafe"/><text x="873" y="229" font-family="${font}" font-size="13" fill="#1e40af">Active • 184 text segments processed</text>
${[['Annotation mode','Above Chinese'],['Granularity','Words and phrases'],['Tones','Tone marks'],['This website','Use global setting']].map((row,i)=>{ const y=286+i*67; return `<text x="859" y="${y+26}" font-family="${font}" font-size="14" fill="${ink}">${row[0]}</text><rect x="1005" y="${y}" width="166" height="40" rx="8" fill="${white}" stroke="${border}"/><text x="1019" y="${y+25}" font-family="${font}" font-size="12" fill="${ink}">${row[1]}</text>`; }).join('\n')}
<line x1="859" y1="567" x2="1171" y2="567" stroke="#e2e8f0"/><text x="859" y="600" font-family="${font}" font-size="14" font-weight="700" fill="${ink}">Appearance</text>
<rect x="859" y="632" width="132" height="38" rx="8" fill="${white}" stroke="${border}"/><text x="925" y="656" text-anchor="middle" font-family="${font}" font-size="12" fill="${ink}">Defaults</text>
<rect x="1003" y="632" width="168" height="38" rx="8" fill="${white}" stroke="${border}"/><text x="1087" y="656" text-anchor="middle" font-family="${font}" font-size="12" fill="${ink}">Advanced settings</text>
</svg>`;

for (const [name, svg] of [['01-pinyin-above-text-1280x800.png', shot1], ['02-popup-controls-1280x800.png', shot2]]) {
  await render(svg, resolve(screenshotDir, name), 1280, 800);
}
