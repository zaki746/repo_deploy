async function fetchIssues() {
    const repo = repoSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    const url = buildApiUrl();
    const token = getTokenForRepo(repo);
    const headers = token ? { Authorization: `token ${token}` } : {};
    console.log(url);
    console.log(headers);
    
    
    const response = await fetch(url);
    let issues = await response.json();

    // Filter by date
    if (startDate) issues = issues.filter(i => new Date(i.created_at) >= new Date(startDate));
    if (endDate) issues = issues.filter(i => new Date(i.created_at) <= new Date(endDate));

    return issues;
}
