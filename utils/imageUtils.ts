import { PageData } from '../types';

export const cleanupPageBlobs = (pages: PageData[]) => {
  pages.forEach(page => {
    if (page.type === 'page' && page.content.startsWith('blob:')) {
      URL.revokeObjectURL(page.content);
    }
  });
};

export const discoverInitialImages = async (): Promise<string[]> => {
    const imageUrls: string[] = [];
    const extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'JPEG', 'JPG', 'PNG', 'GIF', 'WEBP'];
    let pageIndex = 1;

    const probeImage = (url: string): Promise<string> => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject();
      img.src = url;
    });

    while (true) {
      const pageNum = String(pageIndex).padStart(2, '0');
      const probes = extensions.map(ext => probeImage(`/images/page_${pageNum}.${ext}`));
      try {
        const foundUrl = await Promise.race(probes);
        imageUrls.push(foundUrl);
        pageIndex++;
      } catch (error) { break; }
    }
    return imageUrls;
}