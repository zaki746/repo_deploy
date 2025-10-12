async function fetchImageAsBase64(url) {
    const res = await fetch(url, {
        headers: { Authorization: `token ${token}` }
    });
    const blob = await res.blob();
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}
 function displayIssues(issues) {
    issueTable.innerHTML = '';

    issues.forEach(issue => {
        const labels = issue.labels.map(l => l.name).join(', ');
        const imgUrls = extractEvidenceImages(issue.body);
        console.log(imgUrls);
        
        const imgHtml = imgUrls.map((url, idx) =>
            `<img src="${url}" data-images='${JSON.stringify(imgUrls)}' data-index='${idx}' class="thumbnail">`
        ).join(' ');

        const row = `<tr>
            <td><a href="${issue.html_url}" target="_blank">${issue.title}</a></td>
            <td>${issue.state}</td>
            <td>${labels}</td>
            <td>${new Date(issue.created_at).toLocaleDateString()}</td>
            <td>${imgHtml}</td>
        </tr>`;
     
        // row.appendChild(imagesCell);
        issueTable.innerHTML += row;
    });

    // Attach click listeners for thumbnails
    document.querySelectorAll('.thumbnail').forEach(img => {
        img.addEventListener('click', () => {
            const images = JSON.parse(img.getAttribute('data-images'));
            const index = parseInt(img.getAttribute('data-index'), 10);
            enlargeImages(index, images);
        });
    });
}

// Attach search button
searchBtn.addEventListener('click', async () => {
    const issues = await fetchIssues();
    displayIssues(issues);
});
