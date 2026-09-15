import { resolve } from 'node:path';
import { ensureDirectories, screenshotDir, font, cjk, ink, muted, border, soft, white, annotated, screenshotBase, render } from './shared.mjs';

await ensureDirectories();

const shot3 = `${screenshotBase('learn.example.cn/tones')}
<text x="105" y="175" font-family="${font}" font-size="36" font-weight="700" fill="${ink}">Choose how tones appear</text>
<text x="105" y="218" font-family="${font}" font-size="18" fill="${muted}">Switch formats instantly from the extension popup.</text>
${[['Tone marks',[['你','nǐ'],['好','hǎo'],['中','zhōng'],['文','wén']]],['Tone numbers',[['你','ni3'],['好','hao3'],['中','zhong1'],['文','wen2']]],['No tones',[['你','ni'],['好','hao'],['中','zhong'],['文','wen']]]].map((item,i)=>{ const y=275+i*150; return `<rect x="105" y="${y}" width="1050" height="120" rx="18" fill="${soft}" stroke="#e2e8f0"/><text x="135" y="${y+38}" font-family="${font}" font-size="18" font-weight="700" fill="${ink}">${item[0]}</text>${annotated(item[1],390,y+45,38,16,100)}`; }).join('\n')}
</svg>`;

const shot4 = `${screenshotBase('chrome-extension://…/options.html')}
<text x="92" y="165" font-family="${font}" font-size="34" font-weight="700" fill="${ink}">Hanyu Pinyin settings</text>
<text x="92" y="205" font-family="${font}" font-size="17" fill="${muted}">Advanced configuration</text>
${[['Annotation defaults',[['Mode','Pinyin above Chinese'],['Segmentation','Words and phrases'],['Tone format','Tone marks']]],['Website rules',[['news.example.cn','Always enable'],['code.example.cn','Never enable']]],['Performance',[['Batch size','60'],['Cache size','2,000 phrases'],['Selection helper','Enabled']]]].map((section,i)=>{ const x=92+i*363; let body=`<rect x="${x}" y="245" width="325" height="400" rx="18" fill="${white}" stroke="${border}" stroke-width="2"/><text x="${x+22}" y="285" font-family="${font}" font-size="19" font-weight="700" fill="${ink}">${section[0]}</text>`; section[1].forEach((row,j)=>{ const y=320+j*95; body+=`<text x="${x+22}" y="${y}" font-family="${font}" font-size="13" fill="${muted}">${row[0]}</text><rect x="${x+22}" y="${y+18}" width="281" height="44" rx="8" fill="${soft}" stroke="#e2e8f0"/><text x="${x+34}" y="${y+46}" font-family="${font}" font-size="13" fill="${ink}">${row[1]}</text>`; }); return body; }).join('\n')}
<text x="92" y="705" font-family="${font}" font-size="16" fill="${muted}">Settings are stored locally in the browser.</text>
</svg>`;

const shot5 = `${screenshotBase('zh.wikipedia.org/zh-hant/')}
<text x="105" y="178" font-family="${cjk}" font-size="40" fill="${ink}">繁體中文也可以</text>
<text x="105" y="216" font-family="${font}" font-size="17" font-weight="700" fill="${muted}">Traditional Chinese</text>
${annotated([['學','xué'],['習','xí'],['中','zhōng'],['文','wén'],['很','hěn'],['有','yǒu'],['趣','qù']],130,320,42,17,78)}
${annotated([['這','zhè'],['是','shì'],['一','yí'],['個','gè'],['測','cè'],['試','shì']],130,450,40,16,82)}
<rect x="105" y="560" width="775" height="116" rx="16" fill="${soft}" stroke="#e2e8f0"/>
<text x="130" y="598" font-family="${font}" font-size="17" font-weight="700" fill="${ink}">Works across articles, learning sites and dynamically loaded pages.</text>
<text x="130" y="635" font-family="${font}" font-size="16" fill="${muted}">Open Shadow DOM and SPA updates are handled incrementally.</text>
</svg>`;

for (const [name, svg] of [['03-tone-display-options-1280x800.png', shot3], ['04-advanced-settings-1280x800.png', shot4], ['05-traditional-chinese-1280x800.png', shot5]]) {
  await render(svg, resolve(screenshotDir, name), 1280, 800);
}
