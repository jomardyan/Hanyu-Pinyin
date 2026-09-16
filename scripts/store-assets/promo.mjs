import { resolve } from 'node:path';
import { ensureDirectories, root, storeDir, resizeImage } from './shared.mjs';

await ensureDirectories();

await resizeImage(
	resolve(root, 'assets/promo-small-source.png'),
	resolve(storeDir, 'promo-small-440x280.png'),
	440,
	280
);
await resizeImage(
	resolve(root, 'assets/promo-marquee-source.png'),
	resolve(storeDir, 'promo-marquee-1400x560.png'),
	1400,
	560
);
