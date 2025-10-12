const repoSelect = document.getElementById('repo');
const statusSelect = document.getElementById('status');
const labelInput = document.getElementById('label');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const searchBtn = document.getElementById('searchBtn');
const issueTable = document.getElementById('issueTable');

// Build API URL based on selected filters
function buildApiUrl() {
    const repo = repoSelect.value;
    const status = statusSelect.value;
    const label = labelInput.value.trim();

    let url = `https://api.github.com/repos/zaki746/${repo}/issues?per_page=100`;
    if (status !== 'all') url += `&state=${status}`;
    if (label) url += `&labels=${encodeURIComponent(label)}`;
    return url;
}
