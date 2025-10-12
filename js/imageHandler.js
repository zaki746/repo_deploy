function extractEvidenceImages(body) {
    if (!body) return [];
    const sectionMatch = body.match(/### Evidences([\s\S]*)/i);
    const section = sectionMatch ? sectionMatch[1] : "";

    const imgUrls = [];
    const htmlRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    const mdRegex = /!\[[^\]]*\]\(([^)]+)\)/g;

    let match;
    while ((match = htmlRegex.exec(section)) !== null) imgUrls.push(match[1]);
    while ((match = mdRegex.exec(section)) !== null) imgUrls.push(match[1]);

    return imgUrls;
}

function enlargeImages(startIndex, images) {
    let currentIndex = startIndex;

    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const img = document.createElement('img');
    img.src = images[currentIndex];
    img.classList.add('lightbox-img');
    overlay.appendChild(img);

    // Arrows
    const leftArrow = document.createElement('div');
    const rightArrow = document.createElement('div');
    leftArrow.innerHTML = '&#10094;';
    rightArrow.innerHTML = '&#10095;';
    leftArrow.classList.add('arrow', 'left');
    rightArrow.classList.add('arrow', 'right');
    overlay.appendChild(leftArrow);
    overlay.appendChild(rightArrow);

    leftArrow.onclick = (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        img.src = images[currentIndex];
    };
    rightArrow.onclick = (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % images.length;
        img.src = images[currentIndex];
    };

    overlay.onclick = () => {
        document.body.removeChild(overlay);
        document.body.style.overflow = '';
    };

    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            if (overlay.parentNode) document.body.removeChild(overlay);
            document.body.style.overflow = '';
            document.removeEventListener('keydown', escHandler);
        }
        if (e.key === 'ArrowLeft') leftArrow.onclick();
        if (e.key === 'ArrowRight') rightArrow.onclick();
    });
}
