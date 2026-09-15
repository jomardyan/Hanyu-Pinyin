const added = document.getElementById('added');
document.getElementById('add').onclick = () => { const p = document.createElement('p'); p.textContent = '动态加载的中文内容。'; added.append(p); };
document.getElementById('large').onclick = () => { const f = document.createDocumentFragment(); for (let i = 0; i < 2300; i++) { const p = document.createElement('p'); p.textContent = `第 ${i + 1} 段，学习中文。`; f.append(p); } added.append(f); };
document.getElementById('reveal').onclick = () => { document.getElementById('hidden').hidden = false; };
const root = document.getElementById('shadow').attachShadow({ mode: 'open' });
const p = document.createElement('p'); p.textContent = '开放式 Shadow DOM 中文内容。'; root.append(p);
